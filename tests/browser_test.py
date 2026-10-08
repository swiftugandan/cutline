#!/usr/bin/env python3
"""End-to-end checks of Cutline in a real browser.

Usage: python3 tests/browser_test.py
Environment:
  CUTLINE_URL    page to test (default http://127.0.0.1:8766/, the dev server from `npm start`)
  CHROMIUM_PATH  Chromium executable to use instead of Playwright's own

Writes test-results/browser-report.json and screenshots, and exits non-zero if any check fails."""
import json, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get('CUTLINE_URL', 'http://127.0.0.1:8766/')
OUT = Path(__file__).resolve().parent.parent / 'test-results'
OUT.mkdir(exist_ok=True)
results = []
# A full trace takes a couple of seconds on a laptop and longer on a small CI runner.
SLOW = 120000


def check(name, ok, detail=None):
    results.append({'check': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or detail is None else f' ({detail})'))


def wait_ready(page):
    page.wait_for_function('window.cutline && window.cutline.ready && window.cutline.analysis', timeout=SLOW)


def wait_settled(page):
    page.wait_for_function('!window.cutline.running && window.cutline.analysisRevision === window.cutline.store.revision && window.cutline.traced.quality === "full"', timeout=SLOW)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or None)
    # The dev server sends a strict Content Security Policy; Playwright's own evaluation needs it bypassed.
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True, bypass_csp=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL)
    page.evaluate('() => { indexedDB.deleteDatabase("cutline"); localStorage.clear(); }')
    page.reload()
    wait_ready(page)
    wait_settled(page)

    # The default design meets the regulation, and the dock lists every requirement.
    verdict = page.evaluate('() => { const e = window.cutline.analysis.evaluation; return { pass: e.pass, items: e.items.length, failing: e.items.filter(i => i.status === "fail" || i.status === "blocked").map(i => i.label) }; }')
    check('the default projector meets UN R149 as a Class C passing beam', verdict['pass'], verdict['failing'])
    check('the compliance table lists every requirement', page.locator('.req-row').count() == verdict['items'], page.locator('.req-row').count())

    # Every enabled button on every ribbon tab must reach its command when clicked.
    page.evaluate('''() => { const c = window.cutline.commands; const run = c.run.bind(c); window.__ran = [];
      c.run = id => { window.__ran.push(id); return run(id); }; }''')
    # Commands that open a file picker, start a download or replace the design are clicked elsewhere or skipped;
    # quality and design changes would start long traces, so they are checked through their pressed state instead.
    skip = {'open', 'save', 'export-report', 'export-candela', 'export-png', 'new-projector', 'new-reflector', 'trace', 'new-seed'}
    unrouted = []
    tabs = page.evaluate("() => [...document.querySelectorAll('.tab')].map(t => t.dataset.tab)")
    for tab in tabs:
        page.click(f'.tab[data-tab="{tab}"]')
        for cmd in page.evaluate("() => [...document.querySelectorAll('.ribbon [data-cmd]')].filter(b => !b.disabled).map(b => b.dataset.cmd)"):
            if cmd in skip:
                continue
            before = page.evaluate('() => window.__ran.length')
            page.click(f'.ribbon [data-cmd="{cmd}"]')
            if page.evaluate('() => document.getElementById("dialog").open'):
                page.keyboard.press('Escape')
            if page.evaluate('() => window.__ran.length') == before:
                unrouted.append(f'{tab}:{cmd}')
            # Undo anything the click changed so later checks start from the default design.
            page.evaluate('() => { const s = window.cutline.store; while (s.canUndo) s.undo(); }')
            if cmd.startswith('toggle-'):
                page.evaluate(f'() => window.cutline.commands.run("{cmd}")')
    check('every enabled ribbon button runs its command', not unrouted, unrouted)
    page.click('.study[data-study="compliance"]')
    page.click('#viewSwitch [data-cmd="view-beam"]')
    wait_settled(page)

    # Pointing at a requirement picks it out on the beam.
    first = page.locator('.req-row').first
    first.hover()
    check('pointing at a requirement selects it in the beam view', page.evaluate('() => window.cutline.beamView.selected') == first.get_attribute('data-id'))

    # Type a value, then an out-of-range value.
    default_flux = page.evaluate('() => window.cutline.store.design.led.flux')
    page.fill('[data-path="led.flux"]', '1400'); page.keyboard.press('Enter')
    wait_settled(page)
    traced = page.evaluate('() => window.cutline.analysis.emitted')
    check('typing a flux applies it and traces again', page.evaluate('() => window.cutline.store.design.led.flux') == 1400 and abs(traced - 1400) < 1e-6, traced)
    page.fill('[data-path="led.flux"]', '-5'); page.keyboard.press('Enter')
    message = page.locator('.field-error:not([hidden])').first.text_content(timeout=3000)
    check('an out-of-range value is refused with a message', 'must be' in (message or '') and page.evaluate('() => window.cutline.store.design.led.flux') == 1400, message)
    page.keyboard.press('Escape')
    page.locator('#viewport canvas').click(position={'x': 300, 'y': 120})
    page.keyboard.press('Control+z')
    check('undo restores the previous flux', page.evaluate('() => window.cutline.store.design.led.flux') == default_flux)
    wait_settled(page)

    # Each view draws, and the screenshots are kept for review.
    for view in ['beam', 'road', 'lamp']:
        page.click(f'#viewSwitch [data-cmd="view-{view}"]')
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / f'desktop-{view}.png'))
    check('the view switch shows each view', page.evaluate('() => window.cutline.view') == 'lamp')

    # Every study shows its results.
    shown = []
    for study, title in [('budget', 'Light budget'), ('road', 'Road'), ('compliance', 'Compliance')]:
        page.click(f'.study[data-study="{study}"]')
        shown.append(page.locator('.dock h3', has_text=title).count() == 1)
    check('every study shows its results', all(shown), shown)

    # Autosave and restore.
    page.evaluate('() => window.cutline.store.transact("Rename design", d => { d.title = "Browser test lamp"; })')
    page.wait_for_function("document.getElementById('saveState').textContent === 'Saved on this device'", timeout=5000)
    page.reload(); wait_ready(page)
    check('the design is restored after a reload', page.evaluate('() => window.cutline.store.design.title') == 'Browser test lamp')
    wait_settled(page)

    # Command palette.
    page.keyboard.press('Control+k'); page.keyboard.type('dark theme'); page.keyboard.press('Enter')
    check('the command palette runs a command', page.evaluate('() => document.documentElement.dataset.theme') == 'dark')
    page.click('#viewSwitch [data-cmd="view-beam"]')
    page.screenshot(path=str(OUT / 'desktop-dark.png'))
    page.keyboard.press('Control+k'); page.keyboard.type('dark theme'); page.keyboard.press('Enter')

    # Downloads: the design and the compliance report.
    with page.expect_download() as download:
        page.keyboard.press('Control+s')
    saved = json.loads(Path(download.value.path()).read_text())
    check('the downloaded design is a valid Cutline file', saved.get('format') == 'cutline.design' and saved.get('version') == 1, download.value.suggested_filename)
    with page.expect_download() as report:
        page.evaluate('() => window.cutline.commands.run("export-report")')
    text = Path(report.value.path()).read_text()
    check('the compliance report lists every requirement with its citation', text.count('R149 01 series') >= verdict['items'], report.value.suggested_filename)

    # The optimiser starts, shows its progress and stops when asked.
    page.click('.study[data-study="optimise"]')
    page.click('.opt-actions .primary-button')
    page.wait_for_function('window.cutline.optimisation.history.length >= 3', timeout=SLOW)
    page.click('.opt-actions .outline-button')
    page.wait_for_function('!window.cutline.optimisation.running', timeout=SLOW)
    check('the optimiser runs and stops when asked', page.locator('.dock .chart').count() >= 1)
    check('no console or page errors on desktop', not errors, errors)

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, bypass_csp=True)
    mpage = mobile.new_page()
    merrors = []
    mpage.on('pageerror', lambda e: merrors.append(str(e)))
    mpage.goto(URL); wait_ready(mpage)
    overflow = mpage.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
    check('the phone layout has no horizontal overflow', overflow <= 0, overflow)
    mpage.screenshot(path=str(OUT / 'mobile.png'))
    check('no page errors on a phone', not merrors, merrors)
    browser.close()

(OUT / 'browser-report.json').write_text(json.dumps({'url': URL, 'results': results}, indent=2) + '\n')
failed = [r for r in results if not r['ok']]
print(f"\n{len(results) - len(failed)} of {len(results)} checks passed")
sys.exit(1 if failed else 0)
