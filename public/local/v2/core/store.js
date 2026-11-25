// @ts-check

/** @typedef {import('../../src/types.ts').ChatEvent} ChatEvent */
/** @typedef {import('../../src/types.ts').ChatMessage} ChatMessage */

/**
 * @typedef {object} StoreOptions
 * @property {number} [maxMessages] How many lines to keep (oldest dropped first).
 * @property {boolean} [showBots] Keep bot messages; hidden by default.
 * @property {readonly string[]} [hiddenNames] Extra names to hide, matched without regard to case.
 */

const DEFAULT_MAX_MESSAGES = 50;

export class ChatStore {
  /** @type {ChatMessage[]} */
  #messages = [];
  /** @type {number} */
  #maxMessages;
  /** @type {boolean} */
  #showBots;
  /** @type {Set<string>} */
  #hiddenNames;

  /** @param {StoreOptions} [options] */
  constructor(options = {}) {
    this.#maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
    this.#showBots = options.showBots ?? false;
    this.#hiddenNames = new Set(
      (options.hiddenNames ?? []).map((name) => name.toLowerCase()),
    );
  }

  /** @returns {readonly ChatMessage[]} */
  get messages() {
    return this.#messages;
  }

  /**
   * Applies one event from the connector.
   * @param {ChatEvent} event
   * @returns {boolean} Whether the visible messages changed.
   */
  apply(event) {
    switch (event.type) {
      case 'chat':
        if (event.isBot && !this.#showBots) return false;
        if (
          this.#hiddenNames.has(event.login) ||
          this.#hiddenNames.has(event.name.toLowerCase())
        ) {
          return false;
        }
        this.#messages.push(event);
        if (this.#messages.length > this.#maxMessages) this.#messages.shift();
        return true;
      case 'delete':
        return this.#removeWhere(
          (m) =>
            m.platform === event.platform &&
            m.channel === event.channel &&
            m.id === event.messageId,
        );
      case 'ban':
        return this.#removeWhere(
          (m) =>
            m.platform === event.platform &&
            m.channel === event.channel &&
            m.userId === event.userId,
        );
      case 'clear':
        return this.#removeWhere(
          (m) => m.platform === event.platform && m.channel === event.channel,
        );
      default:
        // Event types this overlay doesn't handle yet (join, part, and future ones
        // like subs and raids) are ignored, so older overlays keep working
        return false;
    }
  }

  /**
   * @param {(message: ChatMessage) => boolean} shouldRemove
   * @returns {boolean} Whether anything was removed.
   */
  #removeWhere(shouldRemove) {
    const before = this.#messages.length;
    this.#messages = this.#messages.filter((m) => !shouldRemove(m));
    return this.#messages.length !== before;
  }
}
