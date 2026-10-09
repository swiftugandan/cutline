/** Shell furniture shared by every view: commands, ribbon, command palette, dialogs, toasts and tooltips. */

import { h, byId, escapeHtml } from './dom.js';
import { hydrateIcons } from './icons.js';

/**
 * A user command. Every button, palette entry and shortcut runs one of these.
 * @typedef {{ id: string, label: string, icon?: string, shortcut?: string, run: () => void | Promise<void>,
 *   enabled?: () => boolean, pressed?: () => boolean, hint?: string, palette?: boolean, workspace?: string }} Command
 *   workspace: the workspace a command belongs to; it runs only while that workspace is active.
 */

/**
 * Ribbon layout: tabs of groups of items. Items name commands; `size` picks large or stacked small buttons.
 * @typedef {{ caption: string, items: { cmd: string, size?: 'large' | 'small', label?: string, className?: string }[] }} RibbonGroup
 * @typedef {{ id: string, label: string, groups: RibbonGroup[] }} RibbonTab
 */

export class Commands {
  constructor() {
    /** @type {Map<string, Command>} */
    this.map = new Map();
    /** @type {(() => void) | null} Called after every command, so pressed and enabled states stay current. */
    this.onRun = null;
    /** Whether a command applies now; the shell refuses a workspace's commands while another is active. @type {(id: string) => boolean} */
    this.allowed = () => true;
  }

  /** @param {Command[]} list */
  register(list) { for (const c of list) this.map.set(c.id, c); }

  /** @param {string} id */
  get(id) { return this.map.get(id); }

  /** @param {string} id */
  async run(id) {
    const command = this.map.get(id);
    if (!command || !this.allowed(id) || (command.enabled && !command.enabled())) return;
    await command.run();
    this.onRun?.();
  }
}

export class Ribbon {
  /**
   * @param {{ tabs: HTMLElement, ribbon: HTMLElement, commands: Commands, layout: RibbonTab[], onShow: () => void }} options
   */
  constructor({ tabs, ribbon, commands, layout, onShow }) {
    this.tabsEl = tabs;
    this.ribbonEl = ribbon;
    this.commands = commands;
    this.layout = layout;
    this.onShow = onShow;
    this.active = layout[1]?.id ?? layout[0].id;
  }

  render() {
    this.tabsEl.replaceChildren(...this.layout.map(tab => {
      const button = h('button', { class: 'tab', role: 'tab', type: 'button', 'aria-selected': String(tab.id === this.active), text: tab.label, 'data-tab': tab.id });
      button.addEventListener('click', () => { this.active = tab.id; this.onShow(); this.render(); });
      return button;
    }));
    const tab = this.layout.find(t => t.id === this.active) ?? this.layout[0];
    this.ribbonEl.replaceChildren(...tab.groups.map(group => {
      const large = group.items.filter(i => i.size !== 'small');
      const small = group.items.filter(i => i.size === 'small');
      const items = h('div', { class: 'ribbon-items' }, large.map(i => this.button(i, 'tool')));
      for (let k = 0; k < small.length; k += 2) items.append(h('div', { class: 'tool-stack' }, small.slice(k, k + 2).map(i => this.button(i, 'tool-small'))));
      return h('div', { class: 'ribbon-group', role: 'group', 'aria-label': group.caption }, [items, h('div', { class: 'ribbon-caption', text: group.caption })]);
    }));
    hydrateIcons(this.ribbonEl);
    this.refresh();
  }

  /** Updates enabled and pressed states without rebuilding. */
  refresh() {
    for (const button of /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('[data-cmd]'))) {
      const command = this.commands.get(button.dataset.cmd ?? '');
      if (!command || !this.commands.allowed(command.id)) continue;
      button.disabled = command.enabled ? !command.enabled() : false;
      if (command.pressed) button.setAttribute('aria-pressed', String(command.pressed()));
    }
  }

  /** @param {{ cmd: string, label?: string, className?: string }} item @param {string} cls */
  button(item, cls) {
    const command = this.commands.get(item.cmd);
    if (!command) throw new Error(`Unknown command ${item.cmd}`);
    const tipText = [command.hint ?? command.label, command.shortcut ? `(${command.shortcut})` : ''].filter(Boolean).join(' ');
    return h('button', { class: `${cls}${item.className ? ` ${item.className}` : ''}`, type: 'button', 'data-cmd': item.cmd, 'data-tip': tipText }, [
      command.icon ? h('span', { 'data-icon': command.icon }) : null,
      h('span', { text: item.label ?? command.label }),
    ]);
  }
}

/**
 * A context menu entry: a registered command (with an optional label for this menu), a heading, a separator ('-'),
 * or a submenu.
 * @typedef {{ cmd: string, label?: string } | { heading: string } | '-' | { label: string, icon?: string, items: MenuEntry[] }} MenuEntry
 */

/** A context menu. Its items are [data-cmd] buttons for registered commands; the menu reads each command's enabled
 * and pressed state, icon and shortcut. The menu's own delegated listener runs a chosen command, while the place the
 * menu was opened at is still known, and then closes. */
export class Menu {
  /** @param {Commands} commands @param {(error: unknown) => void} onError */
  constructor(commands, onError) {
    this.commands = commands;
    this.onError = onError;
    /** The open menus, outermost first. @type {HTMLElement[]} */
    this.levels = [];
    /** @type {(() => void) | null} */
    this.onClose = null;
    /** @type {Element | null} */
    this.returnFocus = null;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    this.hoverTimer = undefined;
    this.typed = '';
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    this.typedTimer = undefined;
    const closeOutside = (/** @type {Event} */ e) => { if (this.open && !(e.target instanceof Node && this.levels.some(l => l.contains(/** @type {Node} */ (e.target))))) this.close(); };
    document.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('blur', () => this.close());
    window.addEventListener('resize', () => this.close());
  }

  get open() { return this.levels.length > 0; }

  /**
   * Opens a menu at a window point.
   * @param {MenuEntry[]} entries @param {number} x @param {number} y
   * @param {{ keyboard?: boolean, onClose?: () => void }} [options] keyboard: focus the first item
   */
  show(entries, x, y, { keyboard = false, onClose } = {}) {
    this.close();
    const root = this.build(entries);
    if (!root) return false;
    this.returnFocus = document.activeElement;
    this.onClose = onClose ?? null;
    this.levels = [root];
    document.body.append(root);
    place(root, x, y);
    if (keyboard) this.focusItem(root, 0); else root.focus({ preventScroll: true });
    return true;
  }

  close() {
    if (!this.open) return;
    clearTimeout(this.hoverTimer);
    const inside = this.levels.some(l => l.contains(document.activeElement));
    for (const l of this.levels) l.remove();
    this.levels = [];
    if (inside && this.returnFocus instanceof HTMLElement && this.returnFocus.isConnected) this.returnFocus.focus({ preventScroll: true });
    const done = this.onClose;
    this.onClose = null;
    done?.();
  }

  /** Builds one level, leaving out commands that do not apply now, empty submenus, and separators and headings with
   * nothing under them. @param {MenuEntry[]} entries @returns {HTMLElement | null} */
  build(entries) {
    /** @type {HTMLElement[]} */
    const nodes = [];
    for (const entry of entries) {
      if (entry === '-') { nodes.push(h('div', { class: 'menu-separator', role: 'separator' })); continue; }
      if ('heading' in entry) { nodes.push(h('div', { class: 'menu-heading', role: 'presentation', text: entry.heading })); continue; }
      if ('items' in entry) {
        const sub = this.build(entry.items);
        if (!sub) continue;
        const item = h('button', { class: 'menu-item', type: 'button', role: 'menuitem', 'aria-haspopup': 'menu', 'aria-expanded': 'false', tabindex: '-1' }, [
          h('span', { 'data-icon': entry.icon ?? '' }), h('span', { class: 'menu-label', text: entry.label }), h('span', { class: 'menu-more', 'data-icon': 'chevron-right' }),
        ]);
        /** @type {HTMLElement & { submenu?: HTMLElement }} */ (item).submenu = sub;
        nodes.push(item);
        continue;
      }
      const command = this.commands.get(entry.cmd);
      if (!command || !this.commands.allowed(command.id)) continue;
      const pressed = command.pressed?.();
      const item = h('button', {
        class: 'menu-item', type: 'button', role: pressed === undefined ? 'menuitem' : 'menuitemcheckbox', 'aria-checked': pressed === undefined ? undefined : String(pressed),
        'data-cmd': command.id, tabindex: '-1', disabled: command.enabled ? !command.enabled() : false,
      }, [h('span', { 'data-icon': pressed ? 'check' : pressed === false ? '' : command.icon ?? '' }), h('span', { class: 'menu-label', text: entry.label ?? command.label }), command.shortcut ? h('kbd', { text: command.shortcut }) : null]);
      nodes.push(item);
    }
    // Headings only over an item; separators only between groups.
    /** @param {HTMLElement | undefined} n @param {string} cls */
    const is = (n, cls) => !!n && n.classList.contains(cls);
    /** @type {HTMLElement[]} */
    const kept = [];
    nodes.forEach((n, i) => {
      if (is(n, 'menu-heading') && !is(nodes[i + 1], 'menu-item')) return;
      if (is(n, 'menu-separator') && (!kept.length || is(kept.at(-1), 'menu-separator'))) return;
      kept.push(n);
    });
    while (is(kept.at(-1), 'menu-separator')) kept.pop();
    if (!kept.some(n => n.classList.contains('menu-item'))) return null;
    const menu = h('div', { class: 'context-menu', role: 'menu', tabindex: '-1' }, kept);
    hydrateIcons(menu);
    menu.addEventListener('pointermove', e => this.hover(menu, e));
    menu.addEventListener('click', e => this.activate(menu, e));
    menu.addEventListener('keydown', e => this.key(menu, e));
    menu.addEventListener('contextmenu', e => e.preventDefault());
    return menu;
  }

  /** @param {HTMLElement} menu */
  items(menu) { return /** @type {HTMLButtonElement[]} */ ([...menu.children].filter(n => n.classList.contains('menu-item') && !(/** @type {HTMLButtonElement} */ (n)).disabled)); }

  /** @param {HTMLElement} menu @param {number} index */
  focusItem(menu, index) {
    const items = this.items(menu);
    if (!items.length) return;
    items[(index + items.length) % items.length].focus({ preventScroll: false });
  }

  /** Closes the submenus deeper than a level. @param {HTMLElement} menu */
  closeBelow(menu) {
    const depth = this.levels.indexOf(menu);
    if (depth < 0) return;
    for (const l of this.levels.splice(depth + 1)) l.remove();
    for (const b of menu.querySelectorAll('[aria-expanded="true"]')) b.setAttribute('aria-expanded', 'false');
  }

  /** @param {HTMLElement} menu @param {HTMLElement} item @param {boolean} focus */
  openSub(menu, item, focus) {
    const sub = /** @type {HTMLElement & { submenu?: HTMLElement }} */ (item).submenu;
    if (!sub) return;
    if (this.levels.includes(sub)) { if (focus) this.focusItem(sub, 0); return; }
    this.closeBelow(menu);
    item.setAttribute('aria-expanded', 'true');
    this.levels.push(sub);
    document.body.append(sub);
    const r = item.getBoundingClientRect();
    const w = sub.offsetWidth;
    const right = r.right + w - 2 <= window.innerWidth - 4;
    place(sub, right ? r.right - 2 : r.left - w + 2, r.top - 5);
    if (focus) this.focusItem(sub, 0);
  }

  /** @param {HTMLElement} menu @param {PointerEvent} e */
  hover(menu, e) {
    if (e.pointerType === 'touch') return;
    const item = e.target instanceof Element ? /** @type {HTMLButtonElement | null} */ (e.target.closest('.menu-item')) : null;
    if (!item || item.disabled || document.activeElement === item) return;
    item.focus({ preventScroll: true });
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => { if (item.getAttribute('aria-haspopup')) this.openSub(menu, item, false); else this.closeBelow(menu); }, 140);
  }

  /** A click: a submenu opens, or the command runs and the menu closes. @param {HTMLElement} menu @param {MouseEvent} e */
  activate(menu, e) {
    const item = e.target instanceof Element ? /** @type {HTMLButtonElement | null} */ (e.target.closest('.menu-item')) : null;
    if (!item || item.disabled) return;
    if (item.getAttribute('aria-haspopup')) { this.openSub(menu, item, e.detail === 0); return; }
    // The command runs here rather than in the page's listener for [data-cmd], so it starts while the menu's place is
    // still set; closing clears it.
    e.stopPropagation();
    const run = this.commands.run(item.dataset.cmd ?? '');
    this.close();
    run.catch(this.onError);
  }

  /** @param {HTMLElement} menu @param {KeyboardEvent} e */
  key(menu, e) {
    const items = this.items(menu);
    const at = items.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    const depth = this.levels.indexOf(menu);
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (e.key === 'ArrowDown') { stop(); this.focusItem(menu, at + 1); }
    else if (e.key === 'ArrowUp') { stop(); this.focusItem(menu, at < 0 ? -1 : at - 1); }
    else if (e.key === 'Home') { stop(); this.focusItem(menu, 0); }
    else if (e.key === 'End') { stop(); this.focusItem(menu, -1); }
    else if (e.key === 'ArrowRight') { stop(); const item = items[at]; if (item?.getAttribute('aria-haspopup')) this.openSub(menu, item, true); }
    else if ((e.key === 'ArrowLeft' || e.key === 'Escape') && depth > 0) { stop(); const parent = this.levels[depth - 1]; this.closeBelow(parent); this.focusParent(parent, menu); }
    else if (e.key === 'Escape') { stop(); this.close(); }
    else if (e.key === 'Tab') { stop(); this.close(); }
    else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      stop();
      // Type to jump: the next item whose label starts with what was typed in the last half second.
      clearTimeout(this.typedTimer);
      this.typed += e.key.toLowerCase();
      this.typedTimer = setTimeout(() => { this.typed = ''; }, 500);
      const label = (/** @type {HTMLElement} */ b) => (b.querySelector('.menu-label')?.textContent ?? '').toLowerCase();
      const order = [...items.slice(at + (this.typed.length > 1 ? 0 : 1)), ...items.slice(0, at + (this.typed.length > 1 ? 0 : 1))];
      order.find(b => label(b).startsWith(this.typed))?.focus();
    }
  }

  /** Focuses the item in parent that opened sub. @param {HTMLElement} parent @param {HTMLElement} sub */
  focusParent(parent, sub) {
    const opener = this.items(parent).find(b => /** @type {HTMLElement & { submenu?: HTMLElement }} */ (b).submenu === sub);
    opener?.focus();
  }
}

/** Places a floating element at a window point, flipped and clamped to stay in the window. @param {HTMLElement} el @param {number} x @param {number} y */
function place(el, x, y) {
  const w = el.offsetWidth, ht = el.offsetHeight;
  const left = x + w > window.innerWidth - 4 ? Math.max(4, Math.min(x - w, window.innerWidth - w - 4)) : x;
  const top = y + ht > window.innerHeight - 4 ? Math.max(4, window.innerHeight - ht - 4) : y;
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

/** Short-lived messages at the bottom of the window. */
export class Toasts {
  constructor() { this.root = byId('toasts'); }

  /** @param {string} message @param {{ kind?: 'info' | 'error', action?: { label: string, run: () => void }, ms?: number }} [options] */
  show(message, { kind = 'info', action, ms = 4200 } = {}) {
    const toast = h('div', { class: 'toast', 'data-kind': kind, role: kind === 'error' ? 'alert' : 'status' }, [h('span', { text: message })]);
    if (action) {
      const button = h('button', { type: 'button', text: action.label });
      button.addEventListener('click', () => { action.run(); toast.remove(); });
      toast.append(button);
    }
    this.root.append(toast);
    setTimeout(() => toast.remove(), ms);
  }
}

/** Hover tooltips for any element with data-tip. */
export function installTooltips() {
  const tip = byId('tooltip');
  /** @type {HTMLElement | null} */
  let current = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const hide = () => { clearTimeout(timer); tip.hidden = true; current = null; };
  document.addEventListener('pointerover', e => {
    const target = /** @type {HTMLElement | null} */ (e.target instanceof Element ? e.target.closest('[data-tip]') : null);
    if (target === current) return;
    hide();
    if (!target || !target.dataset.tip) return;
    current = target;
    timer = setTimeout(() => {
      if (current !== target || !target.isConnected) return;
      tip.textContent = target.dataset.tip ?? '';
      tip.hidden = false;
      const r = target.getBoundingClientRect();
      const w = tip.offsetWidth, ht = tip.offsetHeight;
      const below = r.bottom + 8 + ht < window.innerHeight;
      tip.style.left = `${Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2))}px`;
      tip.style.top = `${below ? r.bottom + 8 : r.top - ht - 8}px`;
    }, 420);
  });
  document.addEventListener('pointerdown', hide, true);
  window.addEventListener('blur', hide);
}

/** Modal dialogs on the native <dialog> element. */
export class Dialogs {
  constructor() { this.el = /** @type {HTMLDialogElement} */ (byId('dialog')); }

  /**
   * @param {{ title: string, body: (Node | string)[], actions: { label: string, value: string, primary?: boolean }[], className?: string }} options
   * @returns {Promise<string>} the chosen action's value, or '' when dismissed
   */
  open({ title, body, actions, className = '' }) {
    const el = this.el;
    el.className = `dialog ${className}`.trim();
    const close = h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Close' }, [h('span', { 'data-icon': 'close' })]);
    const foot = h('div', { class: 'dialog-foot' }, actions.map(a => h('button', { class: a.primary ? 'primary-button' : 'outline-button', type: 'button', value: a.value, text: a.label })));
    el.replaceChildren(h('div', { class: 'dialog-head' }, [h('h2', { text: title }), close]), h('div', { class: 'dialog-body' }, body), foot);
    hydrateIcons(el);
    return new Promise(resolve => {
      /** @param {string} value */
      const finish = value => { el.close(); resolve(value); };
      close.addEventListener('click', () => finish(''));
      for (const button of foot.querySelectorAll('button')) button.addEventListener('click', () => finish(button.value));
      el.addEventListener('cancel', () => resolve(''), { once: true });
      el.showModal();
      /** @type {HTMLElement | null} */ (foot.querySelector('.primary-button'))?.focus();
    });
  }

  /** @param {string} title @param {string} label @param {string} value @returns {Promise<string | null>} */
  async prompt(title, label, value) {
    const input = h('input', { class: 'text-input', value, 'aria-label': label });
    const form = h('label', { class: 'field wide' }, [h('span', { class: 'field-label', text: label }), input]);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); /** @type {HTMLButtonElement | null} */ (this.el.querySelector('.primary-button'))?.click(); } });
    const result = this.open({ title, body: [form], actions: [{ label: 'Cancel', value: '' }, { label: 'Save', value: 'ok', primary: true }] });
    queueMicrotask(() => { input.focus(); input.select(); });
    return (await result) === 'ok' ? input.value : null;
  }

  /**
   * Ctrl+K: type to filter commands, Enter to run.
   * @param {Commands} commands @param {(id: string) => boolean} available the commands that apply now
   */
  palette(commands, available) {
    const el = this.el;
    el.className = 'dialog palette';
    const input = h('input', { placeholder: 'Find a command', 'aria-label': 'Find a command', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'paletteList' });
    const list = h('div', { class: 'palette-list', role: 'listbox', id: 'paletteList' });
    el.replaceChildren(input, list);
    let index = 0;
    /** @type {import('./shell.js').Command[]} */
    let matches = [];
    const render = () => {
      const q = input.value.trim().toLowerCase();
      matches = [...commands.map.values()].filter(c => c.palette !== false && available(c.id) && (!c.enabled || c.enabled()) && (!q || c.label.toLowerCase().includes(q) || c.id.includes(q)));
      index = Math.min(index, Math.max(0, matches.length - 1));
      list.replaceChildren(...(matches.length ? matches.map((c, i) => {
        const item = h('button', { class: 'palette-item', type: 'button', role: 'option', 'aria-selected': String(i === index) }, [c.icon ? h('span', { 'data-icon': c.icon }) : h('span', { 'data-icon': 'chevron-right' }), c.label, c.shortcut ? h('kbd', { text: c.shortcut }) : null]);
        item.addEventListener('click', () => { el.close(); commands.run(c.id); });
        return item;
      }) : [h('div', { class: 'palette-empty', text: 'No command matches. Try “trace”, “export” or “fit”.' })]));
      hydrateIcons(list);
      /** @type {HTMLElement | undefined} */ (list.children[index])?.scrollIntoView({ block: 'nearest' });
    };
    input.addEventListener('input', () => { index = 0; render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); index = Math.min(matches.length - 1, index + 1); render(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); index = Math.max(0, index - 1); render(); }
      if (e.key === 'Enter' && matches[index]) { e.preventDefault(); el.close(); commands.run(matches[index].id); }
    });
    render();
    el.showModal();
    input.focus();
  }

  /** @param {[string, string][]} shortcuts @param {string} workspace the active workspace's name */
  help(shortcuts, workspace) {
    const table = h('table', { class: 'shortcut-table' }, [h('tbody', {}, shortcuts.map(([action, keys]) => h('tr', {}, [h('td', { text: action }), h('td', { text: keys })])))]);
    const intro = h('p', {});
    intro.innerHTML = escapeHtml(`Cutline has three workspaces, switched at the top left. Lamp design traces light through a headlamp and checks it against UN R149. Photometry opens a light distribution file and checks it against every market and your own targets. Vehicle places lamps on a vehicle model and checks where they sit. You are in ${workspace}. Every document is kept in this browser; download a copy to keep it safe.`);
    return this.open({ title: 'Help and keyboard shortcuts', body: [intro, table], actions: [{ label: 'Done', value: 'ok', primary: true }] });
  }
}
