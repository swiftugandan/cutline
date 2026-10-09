/** The design panel. Sections and fields are generated from a document's spec, so labels, units, ranges and help
 * text have one source. Every edit goes through the store as a labelled transaction. Each workspace configures it with
 * its own spec and sections, and may add content of its own to a section. */

import { getPath, setPath } from '../core/model.js';
import { specAt, ValidationError, rangeText } from '../core/spec.js';
import { h, fmt } from './dom.js';
import { hydrateIcons } from './icons.js';

/** @import { Spec, NumberSpec, ObjectSpec, UnionSpec } from '../core/spec.js' */
/** @import { DocumentStore } from '../core/history.js' */

/**
 * A derived figure shown in a section, such as the lens's focal length.
 * @typedef {{ label: string, value: number, unit: string, digits: number, help: string }} Figure
 */

/**
 * @template T
 * @typedef {{ id: string, title: string, paths: string[], summary?: (d: T) => string, visible?: (d: T) => boolean,
 *   extra?: (d: T) => (Node | null)[] }} Section
 *   extra: content of the workspace's own, added below the section's fields.
 */

/**
 * @template T
 * @typedef {{ spec: Spec, sections: Section<T>[], visible?: Record<string, (d: T) => boolean>,
 *   unavailable?: Record<string, (d: T, tag: string) => string | null>, switchVariant?: (d: T, path: string, tag: string) => void,
 *   options?: Record<string, (d: T) => [string, string][]>, setters?: Record<string, (d: T, value: string) => void> }} InspectorConfig
 *   visible: fields and groups shown only in some states. unavailable: union variants that cannot be chosen, with the
 *   reason. options: the choices of an enum field narrowed to those that apply in the current document. setters: an
 *   enum field whose change brings other fields along, such as a lamp's role choosing its markets.
 */

/** Decimal places for a number field in display units. @param {NumberSpec} spec */
function digitsFor(spec) {
  if (spec.integer) return 0;
  if (spec.display) return spec.display.digits;
  const step = spec.step ?? 0.01;
  return Math.max(0, Math.min(6, Math.ceil(-Math.log10(step) - 1e-9)));
}

/** @template T */
export class Inspector {
  /**
   * @param {HTMLElement} root
   * @param {{ store: DocumentStore<T>, config: InspectorConfig<T>, onError: (message: string) => void }} options
   */
  constructor(root, { store, config, onError }) {
    this.root = root;
    this.store = store;
    this.config = config;
    this.onError = onError;
    /** @type {Map<string, boolean>} */
    this.open = new Map();
    /** @type {Map<string, (doc: T, keepErrors: boolean) => void>} */
    this.updaters = new Map();
  }

  /** Rebuilds the inspector, keeping scroll position, open sections and the focused field. */
  render() {
    const design = this.store.doc;
    const scroll = this.root.scrollTop;
    const focused = /** @type {HTMLElement | null} */ (this.root.querySelector(':focus'))?.dataset.path ?? null;
    this.updaters.clear();
    const sections = this.config.sections.filter(section => !section.visible || section.visible(design)).map(section => this.section(section, design));
    this.root.replaceChildren(...sections);
    hydrateIcons(this.root);
    this.root.scrollTop = scroll;
    if (focused) /** @type {HTMLElement | null} */ (this.root.querySelector(`[data-path="${focused}"]`))?.focus();
  }

  /**
   * Refreshes displayed values without rebuilding, for live previews and rolled-back edits. With keepErrors, a field
   * showing a refused value keeps its text and message so the user can correct it.
   * @param {boolean} [keepErrors]
   */
  refreshValues(keepErrors = false) {
    for (const update of this.updaters.values()) update(this.store.doc, keepErrors);
  }

  /** @param {Section<T>} section @param {T} design */
  section(section, design) {
    const open = this.open.get(section.id) ?? true;
    const body = h('div', { class: 'section-body' });
    for (const path of section.paths) this.renderPath(body, path, design, section.paths.length > 1 && !path.includes('.'));
    if (section.extra) for (const node of section.extra(design)) if (node) body.append(node);
    const head = h('button', { class: 'section-head', type: 'button', 'aria-expanded': String(open) }, [
      h('span', { 'data-icon': 'chevron' }), section.title,
      section.summary ? h('span', { class: 'section-summary', text: section.summary(design) }) : null,
    ]);
    const el = h('section', { class: 'section', 'data-open': String(open), 'data-section': section.id }, [head, body]);
    head.addEventListener('click', () => {
      const next = el.dataset.open !== 'true';
      this.open.set(section.id, next);
      el.dataset.open = String(next);
      head.setAttribute('aria-expanded', String(next));
    });
    return el;
  }

  /**
   * Renders the fields under a path into a container.
   * @param {HTMLElement} into @param {string} path @param {T} design @param {boolean} withHeading
   */
  renderPath(into, path, design, withHeading) {
    const spec = specAt(this.config.spec, design, path);
    if (!spec) return;
    if (spec.kind === 'union') {
      into.append(this.variantField(path, spec, design, !path.includes('.')));
      const tag = /** @type {Record<string, unknown>} */ (getPath(design, path))[spec.tag];
      this.renderObject(into, path, spec.variants[String(tag)], design, spec.tag);
      return;
    }
    if (spec.kind === 'object') {
      if (withHeading) into.append(h('div', { class: 'subhead', text: spec.label }));
      this.renderObject(into, path, spec, design, null);
      return;
    }
    this.renderField(into, path, spec, design);
  }

  /** @param {HTMLElement} into @param {string} path @param {ObjectSpec} spec @param {T} design @param {string | null} skip */
  renderObject(into, path, spec, design, skip) {
    for (const [key, field] of Object.entries(spec.fields)) {
      if (key === skip || field.kind === 'const' || field.kind === 'array' || field.kind === 'list') continue;
      const child = `${path}.${key}`;
      if (field.kind === 'object') {
        const visible = this.config.visible?.[child];
        if (visible && !visible(design)) continue;
        into.append(h('div', { class: 'subhead', text: field.label }));
        this.renderObject(into, child, field, design, null);
        continue;
      }
      if (field.kind === 'union') { this.renderPath(into, child, design, false); continue; }
      this.renderField(into, child, field, design);
    }
  }

  /** @param {HTMLElement} into @param {string} path @param {Spec} spec @param {T} design */
  renderField(into, path, spec, design) {
    const visible = this.config.visible?.[path];
    if (visible && !visible(design)) return;
    if (spec.kind === 'number') into.append(this.numberField(path, spec));
    else if (spec.kind === 'enum') {
      const options = this.config.options?.[path]?.(design) ?? spec.values.map(v => /** @type {[string, string]} */ ([v, spec.labels[v]]));
      const setter = this.config.setters?.[path];
      into.append(this.enumField(path, spec.label, options, String(getPath(design, path)), tag => this.commit(`Set ${spec.label.toLowerCase()}`, d => (setter ? setter(d, tag) : setPath(d, path, tag))), spec.help));
    }
    else if (spec.kind === 'string') into.append(this.textField(path, spec.label));
  }

  /** @param {string} path @param {UnionSpec} spec @param {T} design @param {boolean} [unlabelled] the section title already names it */
  variantField(path, spec, design, unlabelled = false) {
    const current = String(/** @type {Record<string, unknown>} */ (getPath(design, path))[spec.tag]);
    const options = Object.keys(spec.variants).map(tag => /** @type {[string, string]} */ ([tag, spec.labels[tag]]));
    const unavailable = this.config.unavailable?.[path];
    const switchVariant = this.config.switchVariant;
    return this.enumField(path, spec.label, options, current, tag => {
      if (tag === current || !switchVariant) return;
      this.commit(`Choose ${spec.label.toLowerCase()}: ${spec.labels[tag]}`, d => switchVariant(d, path, tag));
    }, undefined, tag => (unavailable ? unavailable(design, tag) : null), unlabelled);
  }

  /**
   * Segmented control for up to four options, a select beyond that.
   * @param {string} path @param {string} label @param {[string, string][]} options @param {string} current
   * @param {(value: string) => void} choose @param {string} [help] @param {(value: string) => string | null} [disabledReason]
   * @param {boolean} [unlabelled]
   */
  enumField(path, label, options, current, choose, help, disabledReason = () => null, unlabelled = false) {
    // A segmented control holds up to four choices whose names fit the share of the panel each gets; longer lists,
    // or longer names, get a select.
    const room = [0, 40, 25, 15, 11][options.length] ?? 0;
    if (options.every(([, text]) => text.length <= room)) {
      const group = h('div', { class: 'segmented', role: 'group', 'aria-label': label });
      for (const [value, text] of options) {
        const reason = disabledReason(value);
        const button = h('button', { type: 'button', 'aria-pressed': String(value === current), 'data-path': `${path}:${value}`, disabled: !!reason, 'data-tip': reason ?? undefined, text });
        button.addEventListener('click', () => choose(value));
        group.append(button);
      }
      return h('div', { class: 'field wide' }, [unlabelled ? null : h('span', { class: 'field-label', text: label, 'data-tip': help }), group]);
    }
    const select = h('select', { class: 'select', 'data-path': path, 'aria-label': label });
    for (const [value, text] of options) select.append(h('option', { value, text, selected: value === current }));
    select.addEventListener('change', () => choose(select.value));
    // Long choices get the panel's full width, with the label above.
    const wide = options.some(([, text]) => text.length > 16);
    return h('label', { class: wide ? 'field wide' : 'field' }, [h('span', { class: 'field-label', text: label, 'data-tip': help }), select]);
  }

  /** @param {string} path @param {string} label */
  textField(path, label) {
    const input = h('input', { class: 'text-input', 'data-path': path, 'aria-label': label, value: String(getPath(this.store.doc, path)) });
    input.addEventListener('change', () => this.commit(`Rename ${label.toLowerCase()}`, d => setPath(d, path, input.value.trim())));
    this.updaters.set(path, d => { if (document.activeElement !== input) input.value = String(getPath(d, path)); });
    return h('label', { class: 'field wide' }, [h('span', { class: 'field-label', text: label }), input]);
  }

  /** @param {string} path @param {NumberSpec} spec */
  numberField(path, spec) {
    const factor = spec.display?.factor ?? 1;
    const unit = spec.display?.unit ?? spec.unit;
    const digits = digitsFor(spec);
    const step = (spec.step ?? 10 ** -digits) * factor;
    /** @param {T} d */
    const shown = d => fmt(/** @type {number} */ (getPath(d, path)) * factor, digits).replace(/,/g, '');
    const input = h('input', {
      'data-path': path, inputmode: spec.integer ? 'numeric' : 'decimal', autocomplete: 'off', spellcheck: 'false',
      'aria-label': `${spec.label}${unit ? ` (${unit})` : ''}`, value: shown(this.store.doc),
    });
    const label = h('span', { class: 'field-label scrub', text: spec.label, 'data-tip': `${spec.help ? `${spec.help}. ` : ''}Drag to adjust; ${rangeText(spec)}` });
    const error = h('div', { class: 'field-error', hidden: true });
    const field = h('div', { class: 'field', 'data-invalid': 'false' }, [
      label, h('div', { class: 'number-input' }, [input, unit ? h('span', { class: 'unit', text: unit }) : null]), error,
    ]);
    /** @param {string | null} message */
    const setError = message => {
      field.dataset.invalid = String(!!message);
      error.hidden = !message;
      error.textContent = message ?? '';
    };
    /** @param {number} displayValue @param {boolean} [quiet] */
    const apply = (displayValue, quiet = false) => {
      let value = displayValue / factor;
      if (spec.integer) value = Math.round(value);
      try {
        this.store.transact(`Change ${spec.label.toLowerCase()}`, d => setPath(d, path, value));
        setError(null);
        return true;
      } catch (e) {
        const message = describeError(e, path, spec.label);
        if (quiet) this.onError(message); else setError(message);
        return false;
      }
    };
    input.addEventListener('change', () => {
      const parsed = Number(input.value.replace(',', '.').trim());
      if (!Number.isFinite(parsed) || input.value.trim() === '') { setError('Enter a number.'); return; }
      apply(parsed);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = shown(this.store.doc); setError(null); input.blur(); }
      if (e.key === 'Enter') input.blur();
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const current = /** @type {number} */ (getPath(this.store.doc, path)) * factor;
        const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
        const next = clamp(current + delta, spec, factor);
        if (apply(+next.toFixed(Math.max(digits, 6)), true)) input.value = shown(this.store.doc);
      }
    });
    this.scrub(label, path, spec, factor, step);
    this.updaters.set(path, (d, keepErrors) => {
      if (document.activeElement === input || (keepErrors && field.dataset.invalid === 'true')) return;
      input.value = shown(d); setError(null);
    });
    return field;
  }

  /**
   * Dragging a label changes the value: one step per 4 px, Shift for ×10, Alt for ×0.1. The drag is one
   * transaction with live previews.
   * @param {HTMLElement} label @param {string} path @param {NumberSpec} spec @param {number} factor @param {number} step
   */
  scrub(label, path, spec, factor, step) {
    label.addEventListener('pointerdown', down => {
      if (down.button !== 0) return;
      down.preventDefault();
      label.setPointerCapture(down.pointerId);
      const start = /** @type {number} */ (getPath(this.store.doc, path)) * factor;
      let begun = false;
      /** @param {PointerEvent} e */
      const move = e => {
        const steps = Math.round((e.clientX - down.clientX) / 4);
        if (!begun) { if (steps === 0) return; this.store.begin(`Change ${spec.label.toLowerCase()}`); begun = true; }
        const k = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
        let value = clamp(start + steps * step * k, spec, factor) / factor;
        if (spec.integer) value = Math.round(value);
        setPath(this.store.doc, path, value);
        this.store.preview();
        this.refreshValues();
      };
      const end = () => {
        label.removeEventListener('pointermove', move);
        label.removeEventListener('pointerup', end);
        label.removeEventListener('pointercancel', cancel);
        if (!begun) return;
        try { this.store.commit(); } catch (e) { this.onError(describeError(e, path, spec.label)); }
      };
      const cancel = () => { label.removeEventListener('pointermove', move); label.removeEventListener('pointerup', end); if (begun) this.store.cancel(); };
      label.addEventListener('pointermove', move);
      label.addEventListener('pointerup', end);
      label.addEventListener('pointercancel', cancel);
    });
  }

  /** @param {string} label @param {(d: T) => void} mutate */
  commit(label, mutate) {
    try { this.store.transact(label, mutate); } catch (e) { this.onError(e instanceof Error ? e.message : String(e)); }
  }
}

/** Keeps a display value inside the spec's range. @param {number} v @param {NumberSpec} spec @param {number} factor */
function clamp(v, spec, factor) {
  const lo = spec.min * factor, hi = spec.max * factor;
  const eps = (hi - lo) * 1e-9;
  return Math.min(spec.exclusiveMax ? hi - eps : hi, Math.max(spec.exclusiveMin ? lo + eps : lo, v));
}

/** @param {string} reason */
function sentence(reason) {
  const text = reason.endsWith('.') ? reason : `${reason}.`;
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * A message for a rejected edit. Range errors on the edited field read "Focal length must be …"; rule errors from
 * other fields stand on their own.
 * @param {unknown} error @param {string} path @param {string} label
 */
function describeError(error, path, label) {
  if (!(error instanceof ValidationError)) return error instanceof Error ? error.message : String(error);
  if (error.path === path) return `${label} ${error.reason.endsWith('.') ? error.reason : `${error.reason}.`}`;
  return sentence(error.reason);
}
