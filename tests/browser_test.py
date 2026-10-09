#!/usr/bin/env python3
"""End-to-end checks of Cutline in a real browser.

Usage: python3 tests/browser_test.py
Environment:
  CUTLINE_URL    page to test (default http://127.0.0.1:8766/, the dev server from `npm start`)
  CHROMIUM_PATH  Chromium executable to use instead of Playwright's own

Writes test-results/browser-report.json and screenshots, and exits non-zero if any check fails."""
import json, math, os, sys
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
    page.wait_for_function('window.cutline && window.cutline.ready && window.cutline.design.analysis', timeout=SLOW)


def wait_settled(page):
    page.wait_for_function('!window.cutline.design.running && window.cutline.design.analysisRevision === window.cutline.design.store.revision && window.cutline.design.traced.quality === "full"', timeout=SLOW)


def wait_study(page):
    try:
        page.wait_for_function('window.cutline.photometry.analysis && !window.cutline.photometry.running && window.cutline.photometry.analysed === window.cutline.photometry.fingerprint()', timeout=SLOW)
    except Exception:
        state = page.evaluate('() => { const p = window.cutline.photometry; return { analysis: !!p.analysis, running: p.running, error: p.error, current: p.analysed === p.fingerprint(), file: p.store.doc.source.name, undo: p.store.undoStack.map(c => c.label), redo: p.store.redoStack.map(c => c.label) }; }')
        raise AssertionError(f'the photometry study did not settle: {state}')


def canvas_point(page, expr):
    """The window position of a canvas point given by a JavaScript expression of the active view."""
    return page.evaluate(f'() => {{ const v = window.cutline.active.current, r = v.canvas.getBoundingClientRect(), p = {expr}; return [r.left + p[0], r.top + p[1]]; }}')


def lamp_point(page, index):
    return canvas_point(page, f'(() => {{ const l = window.cutline.vehicle.doc.lamps[{index}]; return v.project([l.x, l.y, l.z]); }})()')


def menu_labels(page):
    return page.evaluate("() => [...document.querySelectorAll('.context-menu .menu-heading, .context-menu .menu-label')].map(e => e.textContent)")


def walk_ribbon(page, skip, undo_to):
    """Clicks every enabled ribbon button on every tab of the active workspace; returns the ones that ran nothing.
    After each click the active workspace's store is undone back to undo_to commands."""
    page.evaluate('''() => { const c = window.cutline.commands; if (window.__ran) return; const run = c.run.bind(c); window.__ran = [];
      c.run = id => { window.__ran.push(id); return run(id); }; }''')
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
            if os.environ.get('DEBUG_WALK'):
                print(cmd, page.evaluate("() => { const s = window.cutline.active.store; return [s.undoStack.map(x => x.label + '=' + x.bytes), s.bytes]; }"))
            page.evaluate(f'() => {{ const s = window.cutline.active.store; while (s.undoStack.length > {undo_to}) s.undo(); }}')
            if cmd.startswith('toggle-') or cmd in ('ph-pick-target', 'ph-contours', 'measure', 'veh-ortho', 'veh-xray', 'veh-dims', 'veh-fields'):
                page.evaluate(f'() => window.cutline.commands.run("{cmd}")')
    return unrouted


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
    verdict = page.evaluate('() => { const e = window.cutline.design.analysis.evaluation; return { pass: e.pass, items: e.items.length, failing: e.items.filter(i => i.status === "fail" || i.status === "blocked").map(i => i.label) }; }')
    check('the default projector meets UN R149 as a Class C passing beam', verdict['pass'], verdict['failing'])
    check('the compliance table lists every requirement', page.locator('.req-row').count() == verdict['items'], page.locator('.req-row').count())

    # Every enabled button on every ribbon tab must reach its command when clicked.
    # Commands that open a file picker, start a download or replace the design are clicked elsewhere or skipped;
    # quality and design changes would start long traces, so they are checked through their pressed state instead.
    skip = {'open', 'save', 'export-report', 'export-candela', 'export-ies', 'export-png', 'new-projector', 'new-reflector', 'trace', 'new-seed', 'analyse-photometry'}
    unrouted = walk_ribbon(page, skip, 0)
    check('every enabled ribbon button of the lamp design runs its command', not unrouted, unrouted)
    page.click('.study[data-study="compliance"]')
    page.click('#viewSwitch [data-cmd="view-beam"]')
    wait_settled(page)

    # Pointing at a requirement picks it out on the beam.
    first = page.locator('.req-row').first
    first.hover()
    check('pointing at a requirement selects it in the beam view', page.evaluate('() => window.cutline.design.beamView.selected') == first.get_attribute('data-id'))

    # Right-click a test point on the beam: its menu finds it in the table.
    marker = page.evaluate('() => { const m = window.cutline.design.beamView.markers.find(m => m.id !== window.cutline.design.beamView.markers[0].id) ?? window.cutline.design.beamView.markers[0]; return { id: m.id, label: m.label, h: m.h, v: m.v }; }')
    at = canvas_point(page, f'v.toScreen({marker["h"]}, {marker["v"]})')
    page.mouse.move(at[0], at[1]); page.mouse.click(at[0], at[1], button='right')
    labels = menu_labels(page)
    check('right-clicking a test point opens a menu headed by it', labels[:2] == [marker['label'], 'Show it in the table'], labels)
    page.screenshot(path=str(OUT / 'desktop-beam-menu.png'))
    page.locator('.context-menu .menu-item', has_text='Show it in the table').click()
    page.wait_for_function('!document.querySelector(".context-menu")', timeout=2000)
    check('"Show it in the table" picks out its row', page.evaluate(f'() => document.activeElement?.dataset?.id') == marker['id'] and page.evaluate('() => window.cutline.design.beamView.selected') == marker['id'])
    page.keyboard.press('Shift+F10')
    check('Shift+F10 opens the canvas menu from the keyboard, focused on its first item', page.evaluate('() => document.activeElement?.classList.contains("menu-item")'))
    page.keyboard.press('Escape')
    check('Escape closes the menu', page.locator('.context-menu').count() == 0)
    # The measure tool: the angle between two directions.
    page.keyboard.press('d')
    # Well away from the test points, which the tool snaps to.
    a = canvas_point(page, 'v.toScreen(-38, 6)'); b = canvas_point(page, 'v.toScreen(-35, 2)')
    page.mouse.click(a[0], a[1]); page.mouse.move(b[0], b[1]); page.mouse.click(b[0], b[1])
    measured = page.evaluate('() => window.cutline.measure.text()')
    check('the measure tool gives the angle between two directions on the beam', measured.startswith('5.00° apart') or measured.startswith('4.99° apart'), measured)
    page.screenshot(path=str(OUT / 'desktop-beam-measure.png'))
    page.keyboard.press('Escape')
    check('Escape ends measuring', not page.evaluate('() => window.cutline.measure.active'))

    # Type a value, then an out-of-range value.
    default_flux = page.evaluate('() => window.cutline.design.store.doc.led.flux')
    page.fill('[data-path="led.flux"]', '1400'); page.keyboard.press('Enter')
    wait_settled(page)
    traced = page.evaluate('() => window.cutline.design.analysis.emitted')
    check('typing a flux applies it and traces again', page.evaluate('() => window.cutline.design.store.doc.led.flux') == 1400 and abs(traced - 1400) < 1e-6, traced)
    page.fill('[data-path="led.flux"]', '-5'); page.keyboard.press('Enter')
    message = page.locator('.field-error:not([hidden])').first.text_content(timeout=3000)
    check('an out-of-range value is refused with a message', 'must be' in (message or '') and page.evaluate('() => window.cutline.design.store.doc.led.flux') == 1400, message)
    page.keyboard.press('Escape')
    page.locator('#view').click(position={'x': 300, 'y': 120})
    page.keyboard.press('Control+z')
    check('undo restores the previous flux', page.evaluate('() => window.cutline.design.store.doc.led.flux') == default_flux)
    wait_settled(page)

    # Each view draws, and the screenshots are kept for review.
    for view in ['beam', 'road', 'lamp']:
        page.click(f'#viewSwitch [data-cmd="view-{view}"]')
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / f'desktop-{view}.png'))
    check('the view switch shows each view', page.evaluate('() => window.cutline.design.view') == 'lamp')

    # Every study shows its results.
    shown = []
    for study, title in [('budget', 'Light budget'), ('road', 'Road'), ('compliance', 'Compliance')]:
        page.click(f'.study[data-study="{study}"]')
        shown.append(page.locator('.dock h3', has_text=title).count() == 1)
    check('every study shows its results', all(shown), shown)

    # Autosave and restore.
    page.evaluate('() => window.cutline.design.store.transact("Rename design", d => { d.title = "Browser test lamp"; })')
    page.wait_for_function("document.getElementById('saveState').textContent === 'Saved on this device'", timeout=5000)
    page.reload(); wait_ready(page)
    check('the design is restored after a reload', page.evaluate('() => window.cutline.design.store.doc.title') == 'Browser test lamp')
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
    page.wait_for_function('window.cutline.design.optimisation.history.length >= 3', timeout=SLOW)
    page.click('.opt-actions .outline-button')
    page.wait_for_function('!window.cutline.design.optimisation.running', timeout=SLOW)
    check('the optimiser runs and stops when asked', page.locator('.dock .chart').count() >= 1)

    # ---------- Photometry ----------
    page.click('[data-cmd="workspace-photometry"]')
    check('the photometry workspace starts with a way to open a file', page.locator('#viewportEmpty .empty-card').is_visible())
    page.screenshot(path=str(OUT / 'photometry-empty.png'))
    page.click('#viewportEmpty [data-cmd="ph-use-design"]')
    wait_study(page)
    markets = page.evaluate('() => window.cutline.photometry.analysis.markets.map(m => ({ key: m.key, pass: m.pass, short: m.pack.short }))')
    by_key = {m['key']: m for m in markets}
    check('the traced design is checked against every market for a passing beam', len(markets) >= 6 and {'r149', 'r123', 'fmvss108', 'cmvss108'} <= {m['key'].split(':')[0] for m in markets}, [m['key'] for m in markets])
    check('the design that meets R149 in its own workspace meets it here too, for both traffic sides', by_key.get('r149:passing-C:right', {}).get('pass') and by_key.get('r149:passing-C:left', {}).get('pass'), markets)
    check('the matrix lists every market', page.locator('.market-row').count() == len(markets))
    page.screenshot(path=str(OUT / 'photometry-markets.png'))
    page.locator('.market-row').nth(2).click()
    check('picking a market shows its requirements', page.locator('.dock h3', has_text='UN R123').count() >= 1)

    undo_to = page.evaluate('() => window.cutline.photometry.store.undoStack.length')
    skip = {'open', 'save', 'undo', 'redo', 'ph-report', 'ph-csv', 'export-png', 'ph-new', 'ph-use-design', 'ph-add-market'}
    unrouted = walk_ribbon(page, skip, undo_to)
    check('every enabled ribbon button of photometry runs its command', not unrouted, unrouted)
    page.evaluate('() => window.cutline.photometry.showStudy("markets")')
    wait_study(page)

    # The colour scale: typing a top value fixes the range.
    page.click('#viewSwitch [data-cmd="view-ph-beam"]')
    top = page.locator('#scalePanel .scale-end').first
    top.fill('5000'); top.press('Enter')
    page.wait_for_function('window.cutline.photometry.store.doc.display.beam.auto === "no"', timeout=5000)
    check('typing the top of the scale fixes the range there', page.evaluate('() => window.cutline.photometry.beamView.range.max') == 5000)
    page.click('#scalePanel .outline-button')
    check('Fit returns the scale to the data', page.evaluate('() => window.cutline.photometry.store.doc.display.beam.auto') == 'yes')

    # Uniformity, and a target picked on the beam.
    page.evaluate('() => window.cutline.commands.run("ph-mode-uniformity")')
    page.click('.study[data-study="uniformity"]')
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'photometry-uniformity.png'))
    check('the uniformity map lists its dark patches', page.evaluate('() => window.cutline.photometry.dips.length') == page.locator('#dock .req-row').count())
    page.evaluate('() => window.cutline.commands.run("ph-mode-light")')
    page.click('.study[data-study="targets"]')
    page.evaluate('() => window.cutline.commands.run("ph-pick-target")')
    page.locator('#view').click(position={'x': 440, 'y': 170})
    wait_study(page)
    target = page.evaluate('() => window.cutline.photometry.analysis.targets[0]')
    check('a target picked on the beam is added and judged', target is not None and target['status'] in ('pass', 'near'), target)
    targets = page.evaluate('() => window.cutline.photometry.store.doc.targets.length')
    page.locator('#view').click(position={'x': 520, 'y': 150}, button='right')
    page.locator('.context-menu .menu-item', has_text='Add a target here').click()
    page.wait_for_function(f'window.cutline.photometry.store.doc.targets.length === {targets + 1}', timeout=5000)
    added = page.evaluate('() => { const t = window.cutline.photometry.store.doc.targets.at(-1), [h, v] = window.cutline.photometry.beamView.toAngles(520, 150); return Math.hypot(t.h0 - h, t.v0 - v); }')
    check('"Add a target here" adds a target where the menu was opened', added < 0.01, added)
    wait_study(page)
    page.screenshot(path=str(OUT / 'photometry-targets.png'))
    page.click('.study[data-study="road"]')
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'photometry-road.png'))

    # The report holds every market and says which markets it could not check.
    with page.expect_download() as report:
        page.evaluate('() => window.cutline.commands.run("ph-report")')
    html = Path(report.value.path()).read_text()
    check('the market report lists every market, the targets and the markets not checked', all(m['short'] in html for m in markets) and 'Your targets' in html and 'Markets not checked' in html, report.value.suggested_filename)

    # A real file replaces the traced beam and keeps the markets and targets.
    ies = OUT / 'signal.ies'
    vertical = ' '.join(str(v) for v in range(0, 181, 5))
    horizontal = ' '.join(str(c) for c in range(0, 360, 15))
    # A fan of light around the horizon, the same in every C-plane.
    rows = '\n'.join(' '.join(str(round(400 * max(0.0, math.sin(math.radians(g))) ** 8, 1)) for g in range(0, 181, 5)) for _ in range(0, 360, 15))
    ies.write_text(f'IESNA:LM-63-2002\n[TEST] signal\nTILT=NONE\n1 -1 1 37 24 1 2 0 0 0\n1 1 0\n{vertical}\n{horizontal}\n{rows}\n')
    page.set_input_files('#fileInput', str(ies))
    page.wait_for_function('window.cutline.photometry.store.doc.source.name === "signal.ies"', timeout=10000)
    wait_study(page)
    opened = page.evaluate('() => [window.cutline.photometry.store.doc.source.name, window.cutline.photometry.analysis.file.type]')
    check('opening an IES file checks it in place of the traced beam', opened == ['signal.ies', 'C'], opened)
    page.evaluate('() => window.cutline.photometry.edit("Use it as a front direction indicator", s => { s.lamp.role = "turn-front"; s.markets = [{ pack: "r148", fn: "direction-indicator-1", traffic: "right" }]; })')
    wait_study(page)
    page.click('.study[data-study="markets"]')
    page.screenshot(path=str(OUT / 'photometry-signal.png'))
    check('a signal lamp is checked against R148', page.evaluate('() => window.cutline.photometry.analysis.markets[0].items.some(i => i.group === "field")'))

    # ---------- Vehicle ----------
    page.click('[data-cmd="workspace-vehicle"]')
    check('the vehicle workspace starts with a way to open a model', page.locator('#viewportEmpty .empty-card').is_visible())
    step = OUT / 'car.stp'
    step.write_text('ISO-10303-21;\nEND-ISO-10303-21;\n')
    page.set_input_files('#fileInput', str(step))
    page.wait_for_selector('#viewportEmpty .error-note', timeout=5000)
    check('a STEP file is turned away with advice to export a mesh', 'STL' in page.locator('#viewportEmpty .error-note').text_content())
    page.click('#viewportEmpty [data-cmd="veh-sample"]')
    page.wait_for_function('window.cutline.vehicle.bounds && window.cutline.vehicle.bvh', timeout=10000)
    check('the sample vehicle draws in 3D', page.evaluate('() => window.cutline.vehicle.current.unavailable') is None)
    # Lamps are placed as a click on the model places them.
    page.evaluate('''() => { const w = window.cutline.vehicle;
      const add = (role, p, n) => { w.mode = { kind: 'placing', target: { role } }; w.place(p, n); };
      add('passing', [70, 620, 650], [1, 0, 0]); w.mirror();
      add('turn-front', [70, 780, 420], [1, 0, 0]); w.mirror();
      add('stop', [-4450, 600, 700], [-1, 0, 0]); w.mirror();
      w.select(0); }''')
    page.wait_for_function('window.cutline.vehicle.results.length === 2 && window.cutline.vehicle.doc.lamps.length === 6', timeout=10000)
    heights = page.evaluate('() => window.cutline.vehicle.results[0].items.filter(i => i.id.startsWith("passing:0:height")).map(i => i.value)')
    check('R48 measures a lamp\'s height to the edges of its apparent surface', heights == [620, 680], heights)
    check('the installation table lists every check', page.locator('#dock .req-row').count() == page.evaluate('() => window.cutline.vehicle.results.find(r => r.pack === window.cutline.vehicle.pack).items.length'))
    page.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")
    page.screenshot(path=str(OUT / 'vehicle-checks.png'))
    with page.expect_download() as image:
        page.evaluate('() => window.cutline.commands.run("export-png")')
    shot = page.evaluate('''async url => { const img = new Image(); img.src = url; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); const d = ctx.getImageData(0, 0, c.width, c.height).data; let opaque = 0; for (let i = 3; i < d.length; i += 4) if (d[i] === 255) opaque++; return opaque / (d.length / 4); }''',
      'data:image/png;base64,' + __import__('base64').b64encode(Path(image.value.path()).read_bytes()).decode())
    check('the image of the 3D view holds the model, not only its labels', shot > 0.99, shot)

    # The 3D canvas: menus, zoom and orbit about the pointer, the view cube, dragging and nudging a lamp, measuring.
    vw = 'window.cutline.vehicle'
    at = lamp_point(page, 2)
    page.mouse.move(at[0], at[1])
    check('pointing at a lamp lights it', page.evaluate(f'() => {vw}.current.hover') == 2)
    page.mouse.click(at[0], at[1], button='right')
    labels = menu_labels(page)
    check('right-clicking a lamp selects it and opens its menu', page.evaluate(f'() => {vw}.selected') == 2 and labels[0] == page.evaluate(f'() => {vw}.doc.lamps[2].name') and 'Zoom to the lamp' in labels, labels)
    page.screenshot(path=str(OUT / 'vehicle-lamp-menu.png'))
    page.keyboard.press('Escape')
    before = lamp_point(page, 2)
    page.mouse.move(before[0], before[1]); page.mouse.wheel(0, -400); page.wait_for_timeout(100)
    after = lamp_point(page, 2)
    check('the wheel zooms about the point under the pointer', math.dist(before, after) < 1.5 and page.evaluate(f'() => {vw}.current.camera.distance') < 9000, [before, after])
    page.keyboard.press('f'); page.wait_for_timeout(450)
    distance = page.evaluate(f'() => {vw}.current.camera.distance')
    page.keyboard.press('z'); page.wait_for_timeout(450)
    check('Z zooms to the selected lamp', page.evaluate(f'() => {vw}.current.camera.distance') < distance / 3)
    page.screenshot(path=str(OUT / 'vehicle-dimensions.png'))
    dims = page.evaluate(f'''() => {{ const w = {vw}, r = w.results.find(r => r.pack === w.pack), l = w.doc.lamps[2];
      const values = r.items.filter(i => (i.lamp === 2 && (i.check === "height" || i.check === "width")) || (i.check === "separation" && i.role === l.role)).map(i => Math.round(i.value).toLocaleString("en-GB") + " mm");
      return {{ drawn: w.current.dims.map(d => d.text), values }}; }}''')
    check('the selected lamp\'s dimensions are drawn with its results\' values', len(dims['drawn']) >= 2 and all(t in dims['values'] for t in dims['drawn']), dims)
    page.keyboard.press('f'); page.wait_for_timeout(450)
    # Drag a lamp across the model: it follows the surface, and the move is one undo step.
    undo_count = page.evaluate(f'() => {vw}.store.undoStack.length')
    start = page.evaluate(f'() => {{ const l = {vw}.doc.lamps[0]; return [l.x, l.y, l.z]; }}')
    at = lamp_point(page, 0)
    page.mouse.move(at[0], at[1]); page.mouse.down()
    for k in range(1, 9): page.mouse.move(at[0] - k * 2, at[1] - k * 2)
    page.mouse.up()
    moved = page.evaluate(f'() => {{ const l = {vw}.doc.lamps[0]; return [l.x, l.y, l.z]; }}')
    check('dragging a lamp moves it across the model as one undo step', moved != start and page.evaluate(f'() => {vw}.store.undoStack.length') == undo_count + 1 and page.evaluate(f'() => {vw}.store.undoLabel') == 'Move a lamp', [start, moved])
    page.keyboard.press('Control+z')
    check('undo puts the dragged lamp back', page.evaluate(f'() => {{ const l = {vw}.doc.lamps[0]; return [l.x, l.y, l.z]; }}') == start)
    # Hold an arrow: the nudges are one undo step.
    page.evaluate(f'() => {vw}.select(0)')
    page.evaluate('() => document.activeElement?.blur()')
    z0 = page.evaluate(f'() => {vw}.doc.lamps[0].z')
    undo_count = page.evaluate(f'() => {vw}.store.undoStack.length')
    page.keyboard.down('ArrowUp'); page.keyboard.down('ArrowUp'); page.keyboard.down('ArrowUp'); page.keyboard.up('ArrowUp')
    check('holding an arrow nudges the lamp up 1 mm a step, as one undo step', page.evaluate(f'() => {vw}.doc.lamps[0].z') == z0 + 3 and page.evaluate(f'() => {vw}.store.undoStack.length') == undo_count + 1)
    page.keyboard.press('Control+z')
    # Right-click the model: add a lamp there.
    count = page.evaluate(f'() => {vw}.doc.lamps.length')
    at = canvas_point(page, 'v.project([-2200, 0, 1290])')
    page.mouse.click(at[0], at[1], button='right')
    page.locator('.context-menu .menu-item', has_text='Add a lamp here').hover()
    page.locator('.context-menu .menu-item', has_text='High-mounted stop lamp').click()
    page.wait_for_function(f'{vw}.doc.lamps.length === {count + 1}', timeout=3000)
    placed = page.evaluate(f'''() => {{ const w = {vw}, l = w.doc.lamps.at(-1), r = w.current.canvas.getBoundingClientRect(), p = w.pick({at[0]} - r.left, {at[1]} - r.top).point;
      return [l.role, Math.hypot(l.x - p[0], l.y - p[1], l.z - p[2])]; }}''')
    check('"Add a lamp here" places the chosen function on the model where the menu was opened', placed[0] == 'high-mounted-stop' and placed[1] < 2, placed)
    page.keyboard.press('Control+z')
    # The view cube's front face gives the front view.
    face = page.evaluate(f'() => {{ const c = {vw}.current.cube(), f = c.faces.find(f => f.id === "front"); const r = {vw}.current.canvas.getBoundingClientRect(); return [r.left + f.centre[0], r.top + f.centre[1]]; }}')
    page.mouse.click(face[0], face[1]); page.wait_for_timeout(450)
    check('clicking the view cube\'s front face looks from the front', abs(math.cos(page.evaluate(f'() => {vw}.current.camera.yaw')) - 1) < 1e-6)
    # Measure between two lamp centres.
    page.keyboard.press('d')
    a = lamp_point(page, 0); b = lamp_point(page, 1)
    page.mouse.click(a[0], a[1]); page.mouse.move(b[0], b[1]); page.mouse.click(b[0], b[1])
    span = page.evaluate(f'() => {{ const [p, q] = {vw}.doc.lamps; return Math.round(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)).toLocaleString("en-GB"); }}')
    measured = page.evaluate('() => window.cutline.measure.text()')
    check('the measure tool snaps to lamp centres and gives the distance between them', measured.startswith(f'{span} mm'), [measured, span])
    page.screenshot(path=str(OUT / 'vehicle-measure.png'))
    page.keyboard.press('Escape')
    page.evaluate(f'() => {{ {vw}.current.preset("iso", false); {vw}.select(0); }}')
    page.click('.study[data-study="visibility"]')
    check('the selected lamp shows its visibility map', page.locator('#dock .visibility-map rect').count() > 20)
    page.screenshot(path=str(OUT / 'vehicle-visibility.png'))
    undo_to = page.evaluate('() => window.cutline.vehicle.store.undoStack.length')
    skip = {'open', 'save', 'undo', 'redo', 'export-png', 'veh-new', 'veh-sample', 'veh-report', 'veh-add', 'veh-move', 'veh-remove'}
    unrouted = walk_ribbon(page, skip, undo_to)
    check('every enabled ribbon button of the vehicle runs its command', not unrouted, unrouted)
    with page.expect_download() as report:
        page.evaluate('() => window.cutline.commands.run("veh-report")')
    html = Path(report.value.path()).read_text()
    check('the installation report lists both regulations, every lamp and pictures', 'UN R48' in html and 'FMVSS 108' in html and 'Passing beam left' in html and html.count('data:image/png') == 3, report.value.suggested_filename)
    check('no console or page errors on desktop', not errors, errors)

    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, bypass_csp=True)
    mpage = mobile.new_page()
    merrors = []
    mpage.on('pageerror', lambda e: merrors.append(str(e)))
    mpage.goto(URL); wait_ready(mpage)
    overflow = mpage.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
    check('the phone layout has no horizontal overflow', overflow <= 0, overflow)
    mpage.screenshot(path=str(OUT / 'mobile.png'))
    # A long press opens the canvas menu, inside the screen.
    box = mpage.locator('#view').bounding_box()
    cdp = mobile.new_cdp_session(mpage)
    point = {'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2}
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
    mpage.wait_for_timeout(750)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    menu = mpage.locator('.context-menu').bounding_box() if mpage.locator('.context-menu').count() else None
    check('a long press opens the canvas menu on a phone, inside the screen', menu is not None and menu['x'] >= 0 and menu['x'] + menu['width'] <= 390, menu)
    mpage.screenshot(path=str(OUT / 'mobile-menu.png'))
    check('no page errors on a phone', not merrors, merrors)
    browser.close()

(OUT / 'browser-report.json').write_text(json.dumps({'url': URL, 'results': results}, indent=2) + '\n')
failed = [r for r in results if not r['ok']]
print(f"\n{len(results) - len(failed)} of {len(results)} checks passed")
sys.exit(1 if failed else 0)
