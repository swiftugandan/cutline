/** Browser-local storage of each workspace's current document: IndexedDB, falling back to localStorage when IndexedDB
 * is not available. A downloaded file is the portable copy. Large binary data, such as a vehicle model, is stored next
 * to its document under its own key and only in IndexedDB. */

const DB_NAME = 'cutline';
const STORE = 'designs';

/** @type {Promise<IDBDatabase | null> | null} One connection shared by every workspace. */
let connection = null;

function openDatabase() {
  connection ??= new Promise(resolve => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return connection;
}

/** @param {IDBDatabase} db @param {string} key @returns {Promise<unknown>} */
function get(db, key) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** @param {IDBDatabase} db @param {string} key @param {unknown} value */
function put(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    if (value === undefined) tx.objectStore(STORE).delete(key); else tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('The save was aborted.'));
  });
}

/** @template T */
export class Persistence {
  /**
   * @param {{ key: string, fallbackKey: string, parse: (text: string) => T, serialize: (doc: T) => string }} options
   */
  constructor({ key, fallbackKey, parse, serialize }) {
    this.key = key;
    this.fallbackKey = fallbackKey;
    this.parse = parse;
    this.serialize = serialize;
    /** Saves run one at a time, in order. */
    this.queue = Promise.resolve();
  }

  /** @returns {Promise<T | null>} */
  async load() {
    const db = await openDatabase();
    const text = db ? await get(db, this.key) : localStorage.getItem(this.fallbackKey);
    return typeof text === 'string' && text ? this.parse(text) : null;
  }

  /** @param {T} doc */
  save(doc) {
    const text = this.serialize(doc);
    this.queue = this.queue.catch(() => {}).then(async () => {
      const db = await openDatabase();
      if (db) await put(db, this.key, text); else localStorage.setItem(this.fallbackKey, text);
    });
    return this.queue;
  }

  /** Binary data stored beside the document, or null. @param {string} name @returns {Promise<ArrayBuffer | null>} */
  async loadBlob(name) {
    const db = await openDatabase();
    if (!db) return null;
    const value = await get(db, `${this.key}:${name}`);
    return value instanceof ArrayBuffer ? value : null;
  }

  /** Stores binary data beside the document; undefined removes it. @param {string} name @param {ArrayBuffer | undefined} data */
  async saveBlob(name, data) {
    const db = await openDatabase();
    if (!db) throw new Error('This browser cannot store large files, so the model must be opened again next time.');
    await put(db, `${this.key}:${name}`, data);
  }
}
