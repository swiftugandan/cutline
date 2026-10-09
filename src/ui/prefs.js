/** Per-browser preferences in localStorage: the theme, the view and panel sizes. They are conveniences, so a browser
 * that refuses storage simply forgets them. */

/** @param {string} key @returns {string | null} */
export function readPref(key) { try { return localStorage.getItem(key); } catch { return null; } }

/** @param {string} key @param {string} value */
export function writePref(key, value) { try { localStorage.setItem(key, value); } catch { /* preferences are optional */ } }
