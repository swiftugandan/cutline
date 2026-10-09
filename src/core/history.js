/** The document store: one document, labelled transactions, and undo/redo built from leaf patches. Every commit is
 * validated; a commit that breaks a rule rolls back atomically and leaves history untouched. Each workspace keeps its
 * own store: the lamp design, the photometry study and the vehicle. */

/** @typedef {{ path: string[], before: unknown, after: unknown }} Patch */
/** @typedef {{ label: string, patches: Patch[], bytes: number }} Command */
/** @typedef {'commit' | 'preview' | 'rollback' | 'undo' | 'redo' | 'load'} ChangeKind */
/** @typedef {{ kind: ChangeKind, label: string, revision: number }} ChangeDetail */

/** @template T @param {T} value @returns {T} */
const clone = value => (value === undefined ? value : structuredClone(value));

/**
 * Leaf-object diff. Arrays are compared and replaced as a whole.
 * @param {unknown} before @param {unknown} after @param {string[]} [path] @param {Patch[]} [out]
 * @returns {Patch[]}
 */
export function diff(before, after, path = [], out = []) {
  if (Object.is(before, after)) return out;
  const objects = before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after);
  if (objects) {
    const a = /** @type {Record<string, unknown>} */ (before), b = /** @type {Record<string, unknown>} */ (after);
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], [...path, key], out);
  } else if (JSON.stringify(before) !== JSON.stringify(after)) {
    out.push({ path, before: clone(before), after: clone(after) });
  }
  return out;
}

/** @param {Record<string, unknown>} doc @param {Patch[]} patches @param {boolean} forward */
export function applyPatches(doc, patches, forward) {
  for (const patch of forward ? patches : [...patches].reverse()) {
    /** @type {Record<string, unknown>} */
    let node = doc;
    for (let i = 0; i < patch.path.length - 1; i++) node = /** @type {Record<string, unknown>} */ (node[patch.path[i]]);
    const key = /** @type {string} */ (patch.path.at(-1));
    const value = forward ? patch.after : patch.before;
    if (value === undefined) delete node[key]; else node[key] = clone(value);
  }
}

/** @template T */
export class DocumentStore extends EventTarget {
  /**
   * @param {T} doc @param {(raw: unknown) => T} validate checks a whole document and returns a clean copy, or throws
   * @param {{ maxCommands?: number, maxBytes?: number }} [limits]
   */
  constructor(doc, validate, { maxCommands = 200, maxBytes = 24 * 1024 * 1024 } = {}) {
    super();
    this.validate = validate;
    /** @type {T} */
    this.doc = validate(doc);
    /** @type {Command[]} */
    this.undoStack = [];
    /** @type {Command[]} */
    this.redoStack = [];
    this.maxCommands = maxCommands;
    this.maxBytes = maxBytes;
    this.bytes = 0;
    this.revision = 0;
    /** @type {{ label: string, before: T } | null} */
    this.pending = null;
  }

  /** @param {ChangeKind} kind @param {string} [label] */
  notify(kind, label = '') {
    /** @type {ChangeDetail} */
    const detail = { kind, label, revision: this.revision };
    this.dispatchEvent(new CustomEvent('change', { detail }));
  }

  /** Starts a transaction. Edits to `doc` until commit or cancel become one history entry. @param {string} label */
  begin(label) {
    if (this.pending) throw new Error('A transaction is already in progress.');
    this.pending = { label, before: structuredClone(this.doc) };
  }

  /** Tells listeners about an uncommitted edit, for example during a drag. */
  preview() {
    if (this.pending) this.notify('preview', this.pending.label);
  }

  /** Validates and records the pending transaction. Returns false when nothing changed. */
  commit() {
    const pending = this.pending;
    if (!pending) return false;
    this.pending = null;
    try {
      this.doc = this.validate(this.doc);
    } catch (error) {
      this.doc = pending.before;
      this.notify('rollback', pending.label);
      throw error;
    }
    const patches = diff(pending.before, this.doc);
    if (!patches.length) return false;
    const command = { label: pending.label, patches, bytes: JSON.stringify(patches).length * 2 };
    this.undoStack.push(command);
    this.redoStack = [];
    this.bytes += command.bytes;
    while (this.undoStack.length > 1 && (this.bytes > this.maxBytes || this.undoStack.length > this.maxCommands)) {
      this.bytes -= /** @type {Command} */ (this.undoStack.shift()).bytes;
    }
    this.revision++;
    this.notify('commit', pending.label);
    return true;
  }

  /** Abandons the pending transaction and restores the document as it was. */
  cancel() {
    if (!this.pending) return;
    this.doc = this.pending.before;
    const label = this.pending.label;
    this.pending = null;
    this.notify('rollback', label);
  }

  /**
   * Runs `mutate` as one transaction.
   * @param {string} label @param {(doc: T) => void} mutate
   */
  transact(label, mutate) {
    this.begin(label);
    try { mutate(this.doc); } catch (error) { this.cancel(); throw error; }
    return this.commit();
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get undoLabel() { return this.undoStack.at(-1)?.label ?? ''; }
  get redoLabel() { return this.redoStack.at(-1)?.label ?? ''; }

  undo() {
    if (this.pending) this.cancel();
    const command = this.undoStack.pop();
    if (!command) return;
    applyPatches(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (this.doc)), command.patches, false);
    this.redoStack.push(command);
    this.bytes -= command.bytes;
    this.revision++;
    this.notify('undo', command.label);
  }

  redo() {
    if (this.pending) this.cancel();
    const command = this.redoStack.pop();
    if (!command) return;
    applyPatches(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (this.doc)), command.patches, true);
    this.undoStack.push(command);
    this.bytes += command.bytes;
    this.revision++;
    this.notify('redo', command.label);
  }

  /** Replaces the whole document (open, new) and clears history. @param {T} doc */
  replace(doc) {
    this.doc = this.validate(doc);
    this.pending = null;
    this.undoStack = [];
    this.redoStack = [];
    this.bytes = 0;
    this.revision++;
    this.notify('load');
  }
}
