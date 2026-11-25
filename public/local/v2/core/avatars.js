// @ts-check

const IVR_USER_URL = 'https://api.ivr.fi/v2/twitch/user?login=';
const DEFAULT_SPACING_MS = 350;

/**
 * @typedef {object} AvatarOptions
 * @property {typeof fetch} [fetchFn]
 * @property {(ms: number) => Promise<void>} [wait]
 * @property {number} [spacingMs] Pause between lookups, to go easy on the service.
 */

/**
 * IVR returns the user as an object or a one-item list; take its logo if it is an https URL.
 * @param {unknown} body
 * @returns {string | null}
 */
function logoFrom(body) {
  const user = Array.isArray(body) ? body[0] : body;
  if (typeof user !== 'object' || user === null) return null;
  const logo = /** @type {Record<string, unknown>} */ (user).logo;
  return typeof logo === 'string' && logo.startsWith('https://') ? logo : null;
}

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class AvatarLookup {
  /** Login → avatar URL, or null once looked up and none found. */
  /** @type {Map<string, string | null>} */
  #known = new Map();
  /** @type {{ login: string, onFound: (url: string) => void }[]} */
  #queue = [];
  #busy = false;
  /** @type {Promise<void>} */
  #draining = Promise.resolve();
  /** @type {typeof fetch} */
  #fetch;
  /** @type {(ms: number) => Promise<void>} */
  #wait;
  /** @type {number} */
  #spacingMs;

  /** @param {AvatarOptions} [options] */
  constructor(options = {}) {
    this.#fetch = options.fetchFn ?? ((input, init) => fetch(input, init));
    this.#wait = options.wait ?? sleep;
    this.#spacingMs = options.spacingMs ?? DEFAULT_SPACING_MS;
  }

  /**
   * Finds a Twitch avatar for this login, once. onFound is called only if there is one.
   * @param {string} login
   * @param {(url: string) => void} onFound
   */
  request(login, onFound) {
    const known = this.#known.get(login);
    if (known) {
      onFound(known);
      return;
    }
    if (this.#known.has(login)) return; // looked up before; no avatar
    this.#queue.push({ login, onFound });
    if (!this.#busy) this.#draining = this.#drain();
  }

  /** Resolves when every queued lookup has finished. */
  whenIdle() {
    return this.#draining;
  }

  async #drain() {
    this.#busy = true;
    try {
      while (this.#queue.length > 0) {
        const next = this.#queue.shift();
        if (!next) break;
        let fetched = false;
        if (!this.#known.has(next.login)) {
          this.#known.set(next.login, await this.#fetchLogo(next.login));
          fetched = true;
        }
        const url = this.#known.get(next.login);
        if (url) next.onFound(url);
        if (fetched && this.#queue.length > 0)
          await this.#wait(this.#spacingMs);
      }
    } finally {
      this.#busy = false;
    }
  }

  /**
   * @param {string} login
   * @returns {Promise<string | null>}
   */
  async #fetchLogo(login) {
    try {
      const res = await this.#fetch(IVR_USER_URL + encodeURIComponent(login));
      return res.ok ? logoFrom(await res.json()) : null;
    } catch {
      return null; // portraits are cosmetic: a failed lookup leaves the initial showing
    }
  }
}
