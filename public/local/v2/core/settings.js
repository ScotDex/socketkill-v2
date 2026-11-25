// @ts-check

/** @typedef {'amarr' | 'caldari' | 'gallente' | 'minmatar'} Theme */

/**
 * Everything an overlay URL can set. Null means "not set: use the skin's default".
 * @typedef {object} Settings
 * @property {string | null} twitch Twitch channel, normalised.
 * @property {number | null} kick Kick chatroom ID.
 * @property {string | null} youtube YouTube channel ID (UC…).
 * @property {number} maxMessages
 * @property {boolean} roster
 * @property {number} rosterMax
 * @property {boolean} showBots
 * @property {string[]} hiddenNames
 * @property {number | null} fontSize In px.
 * @property {number | null} rosterWidth In px.
 * @property {boolean} portraits
 * @property {number | null} portraitSize In px.
 * @property {number | null} legacyWidth From old width= URLs, in px.
 * @property {number | null} legacyMaxHeight From old maxheight= URLs, in px.
 * @property {number | null} opacity From 0 to 1.
 * @property {Theme | null} theme
 * @property {boolean} previewBackground
 * @property {boolean} demo
 */

const DEFAULT_MAX_MESSAGES = 30;
const DEFAULT_ROSTER_MAX = 80;
const YOUTUBE_ID = /^UC[A-Za-z0-9_-]{22}$/;
/** @type {readonly Theme[]} */
const THEMES = ['amarr', 'caldari', 'gallente', 'minmatar'];

/**
 * @param {string | null} value
 * @returns {number | null}
 */
function positiveInt(value) {
  const n = Number.parseInt(value ?? '', 10);
  return n > 0 ? n : null;
}

/**
 * @param {string | null} value
 * @returns {Theme | null}
 */
function theme(value) {
  return THEMES.find((t) => t === value) ?? null;
}

/**
 * @param {string} search The page's query string, e.g. location.search.
 * @returns {Settings}
 */
export function parseSettings(search) {
  const params = new URLSearchParams(search);
  const portrait = params.get('portrait');
  const opacity = Number.parseFloat(params.get('opacity') ?? '');
  const twitch = (params.get('channel') ?? '')
    .trim()
    .toLowerCase()
    .replace(/^#/, '');
  const youtube = params.get('yt') ?? '';

  return {
    twitch: twitch || null,
    kick: positiveInt(params.get('kick')),
    youtube: YOUTUBE_ID.test(youtube) ? youtube : null,
    maxMessages: positiveInt(params.get('max')) ?? DEFAULT_MAX_MESSAGES,
    roster: params.get('roster') !== '0',
    rosterMax: positiveInt(params.get('rostermax')) ?? DEFAULT_ROSTER_MAX,
    showBots: params.get('bots') === '1',
    hiddenNames: (params.get('hide') ?? '')
      .split(',')
      .map((name) => name.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean),
    fontSize: positiveInt(params.get('size')),
    rosterWidth: positiveInt(params.get('rosterwidth')),
    portraits: portrait !== '0',
    portraitSize: positiveInt(portrait),
    legacyWidth: positiveInt(params.get('width')),
    legacyMaxHeight: positiveInt(params.get('maxheight')),
    opacity: opacity >= 0 && opacity <= 1 ? opacity : null,
    theme: theme(params.get('theme')),
    previewBackground: params.get('bg') === '1',
    demo: params.get('demo') === '1',
  };
}
