// @ts-check

/** @typedef {import('../../src/types.ts').ChatEvent} ChatEvent */
/** @typedef {import('../../src/types.ts').Platform} Platform */
/** @typedef {import('../../src/types.ts').Role} Role */

/**
 * @typedef {object} RosterEntry
 * @property {Platform} platform
 * @property {string} login
 * @property {string} name
 * @property {boolean} spoken
 * @property {number} joinedAt
 * @property {number} lastSpokeAt
 * @property {readonly Role[]} roles
 * @property {string | null} avatarUrl
 */

/**
 * @typedef {object} RosterOptions
 * @property {number} [maxEntries] How many entries to show.
 * @property {boolean} [showBots]
 * @property {readonly string[]} [hiddenNames]
 * @property {() => number} [now]
 */

const DEFAULT_MAX_ENTRIES = 80;
// The connector reads Twitch anonymously as justinfan<number>; never list it
const ANONYMOUS = /^justinfan\d+$/i;

/**
 * @param {Platform} platform
 * @param {string} login
 */
const keyOf = (platform, login) => `${platform}:${login}`;

/**
 * Chatters first (most recent first), then lurkers (longest present first).
 * @param {RosterEntry} a
 * @param {RosterEntry} b
 */
function byRosterOrder(a, b) {
  if (a.spoken !== b.spoken) return a.spoken ? -1 : 1;
  return a.spoken ? b.lastSpokeAt - a.lastSpokeAt : a.joinedAt - b.joinedAt;
}

export class Roster {
  /** @type {Map<string, RosterEntry>} */
  #entries = new Map();
  /** Everyone present, including lurkers dropped from the list by the limit. */
  /** @type {Set<string>} */
  #present = new Set();
  /** @type {number} */
  #maxEntries;
  /** @type {boolean} */
  #showBots;
  /** @type {Set<string>} */
  #hiddenNames;
  /** @type {() => number} */
  #now;

  /** @param {RosterOptions} [options] */
  constructor(options = {}) {
    this.#maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.#showBots = options.showBots ?? false;
    this.#hiddenNames = new Set(
      (options.hiddenNames ?? []).map((name) => name.toLowerCase()),
    );
    this.#now = options.now ?? Date.now;
  }

  /** How many viewers are present, for the Local [N] count. */
  get count() {
    return this.#present.size;
  }

  /** @returns {RosterEntry[]} The entries to show, in order. */
  get entries() {
    return [...this.#entries.values()]
      .sort(byRosterOrder)
      .slice(0, this.#maxEntries);
  }

  /** Forget everyone, e.g. when the connection drops and presence can't be trusted. */
  clear() {
    this.#entries.clear();
    this.#present.clear();
  }

  /**
   * @param {ChatEvent} event
   * @returns {boolean} Whether the roster changed.
   */
  apply(event) {
    switch (event.type) {
      case 'join': {
        if (!this.#accepts(event.login, event.isBot)) return false;
        const key = keyOf(event.platform, event.login);
        if (this.#present.has(key)) return false;
        this.#present.add(key);
        this.#entries.set(key, {
          platform: event.platform,
          login: event.login,
          name: event.login,
          spoken: false,
          joinedAt: this.#now(),
          lastSpokeAt: 0,
          roles: [],
          avatarUrl: null,
        });
        this.#dropExcessLurkers();
        return true;
      }
      case 'chat': {
        if (!this.#accepts(event.login, event.isBot)) return false;
        if (this.#hiddenNames.has(event.name.toLowerCase())) return false;
        const key = keyOf(event.platform, event.login);
        const existing = this.#entries.get(key);
        const now = this.#now();
        this.#present.add(key);
        this.#entries.set(key, {
          platform: event.platform,
          login: event.login,
          name: event.name,
          spoken: true,
          joinedAt: existing?.joinedAt ?? now,
          lastSpokeAt: now,
          roles: event.roles,
          avatarUrl: event.avatarUrl ?? existing?.avatarUrl ?? null,
        });
        this.#dropExcessLurkers();
        return true;
      }
      case 'part':
        return this.#remove(keyOf(event.platform, event.login));
      case 'ban':
        // A timeout keeps them in the roster; only a permanent ban removes them
        if (event.durationSeconds !== null) return false;
        return this.#remove(keyOf(event.platform, event.login));
      default:
        return false;
    }
  }

  /**
   * @param {string} login
   * @param {boolean} isBot
   */
  #accepts(login, isBot) {
    if (ANONYMOUS.test(login)) return false;
    if (isBot && !this.#showBots) return false;
    return !this.#hiddenNames.has(login);
  }

  /** @param {string} key */
  #remove(key) {
    const wasPresent = this.#present.delete(key);
    const wasListed = this.#entries.delete(key);
    return wasPresent || wasListed;
  }

  /** Over the limit, forget the lurkers that wouldn't be shown; they still count as present. */
  #dropExcessLurkers() {
    if (this.#entries.size <= this.#maxEntries) return;
    const shown = new Set(
      this.entries.map((entry) => keyOf(entry.platform, entry.login)),
    );
    for (const [key, entry] of this.#entries) {
      if (!entry.spoken && !shown.has(key)) this.#entries.delete(key);
    }
  }
}
