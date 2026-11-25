// @ts-check
import { parseSettings } from './core/settings.js';
import { ChatStore } from './core/store.js';
import { Roster } from './core/roster.js';
import { AvatarLookup } from './core/avatars.js';
import { startConnection } from './core/connection.js';
import {
  renderMessage,
  renderSystemLine,
  createRosterRow,
  updateRosterRow,
  showAvatar,
} from './skins/eve/render.js';

/** @typedef {import('./core/connection.js').ChannelRef} ChannelRef */
/** @typedef {import('./core/roster.js').RosterEntry} RosterEntry */
/** @typedef {import('../src/types.ts').ChatMessage} ChatMessage */

const CONNECTOR_URL = location.pathname.startsWith('/overlay/')
  ? location.origin
  : 'https://chat.socketkill.com';
const SOCKET_IO_CLIENT = './vendor/socket.io.esm.min.js';

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in the page`);
  return found;
}

const settings = parseSettings(location.search);
const root = document.documentElement;
const windowEl = byId('window');
const listEl = byId('list');

// ---------- Apply settings ----------
if (settings.fontSize)
  root.style.setProperty('--font-size', `${settings.fontSize}px`);
if (settings.rosterWidth)
  root.style.setProperty('--roster-w', `${settings.rosterWidth}px`);
if (settings.portraitSize)
  root.style.setProperty('--portrait', `${settings.portraitSize}px`);
if (settings.opacity !== null)
  root.style.setProperty('--panel-opacity', String(settings.opacity));
if (settings.theme) root.dataset.theme = settings.theme;
if (settings.previewBackground) document.body.classList.add('preview-bg');
if (settings.legacyWidth) {
  root.style.setProperty(
    '--panel-w',
    `min(${settings.legacyWidth}px, calc(100vw - 48px))`,
  );
}
if (settings.legacyMaxHeight) {
  root.style.setProperty(
    '--panel-max-h',
    `min(${settings.legacyMaxHeight}px, calc(100vh - 48px))`,
  );
}
if (settings.legacyWidth || settings.legacyMaxHeight)
  windowEl.classList.add('fixed-size');
if (!settings.roster) {
  byId('rosterCol').style.display = 'none';
  windowEl.classList.add('no-roster');
}
if (!settings.portraits) windowEl.classList.add('no-portrait');
windowEl.classList.add('active');

// ---------- Chat list ----------
const store = new ChatStore({
  maxMessages: settings.maxMessages,
  showBots: settings.showBots,
  hiddenNames: settings.hiddenNames,
});

/** @type {Map<string, HTMLElement>} */
const rows = new Map();

/** @param {ChatMessage} m */
const keyOf = (m) => `${m.platform}:${m.channel}:${m.id}`;

/** Drop rows from the top while the list overflows its window, as the previous overlay did. */
function trimToFit() {
  while (
    listEl.children.length > 1 &&
    listEl.scrollHeight > listEl.clientHeight
  ) {
    listEl.firstElementChild?.remove();
    listEl.classList.add('overflowing');
  }
}

/** Make the screen match the store: remove deleted rows, append new ones. */
function syncList() {
  const current = new Set(store.messages.map(keyOf));
  for (const [key, row] of rows) {
    if (!current.has(key)) {
      row.remove();
      rows.delete(key);
    }
  }
  for (const message of store.messages) {
    const key = keyOf(message);
    if (!rows.has(key)) {
      const row = renderMessage(message);
      rows.set(key, row);
      listEl.append(row);
    }
  }
  trimToFit();
}

/** @param {string} text */
function systemLine(text) {
  listEl.append(renderSystemLine(text));
  trimToFit();
}

// ---------- Roster ----------
const roster = new Roster({
  maxEntries: settings.rosterMax,
  showBots: settings.showBots,
  hiddenNames: settings.hiddenNames,
});
const avatars = new AvatarLookup();
const rosterListEl = byId('rosterList');
const tabCountEl = byId('tabCount');
const rosterCountEl = byId('rosterCount');

/** @type {Map<string, HTMLElement>} */
const rosterRows = new Map();

/** @param {RosterEntry} entry */
const rosterKey = (entry) => `${entry.platform}:${entry.login}`;

/**
 * Twitch sends no avatars, so look them up; other platforms include theirs.
 * @param {RosterEntry} entry
 */
function requestAvatar(entry) {
  if (!settings.portraits || entry.platform !== 'twitch' || entry.avatarUrl)
    return;
  const key = rosterKey(entry);
  avatars.request(entry.login, (url) => {
    const row = rosterRows.get(key);
    if (row) showAvatar(row, url);
  });
}

/** Make the roster on screen match the roster logic, in order. */
function syncRoster() {
  const count = String(roster.count);
  tabCountEl.textContent = count;
  rosterCountEl.textContent = count;
  if (!settings.roster) return;

  const shown = roster.entries;
  const keep = new Set(shown.map(rosterKey));
  for (const [key, row] of rosterRows) {
    if (!keep.has(key)) {
      row.remove();
      rosterRows.delete(key);
    }
  }
  for (const entry of shown) {
    const key = rosterKey(entry);
    let row = rosterRows.get(key);
    if (row) {
      updateRosterRow(row, entry);
    } else {
      row = createRosterRow(entry);
      rosterRows.set(key, row);
      requestAvatar(entry);
    }
    if (entry.avatarUrl && settings.portraits) showAvatar(row, entry.avatarUrl);
    rosterListEl.append(row); // appending an existing row moves it, which keeps the order
  }
}

// ---------- Connect ----------
/** @type {ChannelRef[]} */
const channels = [];
if (settings.twitch)
  channels.push({ platform: 'twitch', channel: settings.twitch });

if (channels.length === 0) {
  systemLine('No channel set. Add ?channel=yourname to the URL.');
} else {
  const { io } = await import(SOCKET_IO_CLIENT);
  const socket = io(CONNECTOR_URL, {
    transports: ['websocket'],
    autoConnect: false,
  });

  startConnection({
    socket,
    channels,
    onEvent: (event) => {
      if (store.apply(event)) syncList();
      if (roster.apply(event)) syncRoster();
    },
    onStatus: (live) => {
      byId('statusDot').classList.toggle('live', live);
      if (live) {
        for (const ref of channels)
          systemLine(`Channel changed to Local : ${ref.channel}`);
      } else {
        roster.clear();
        syncRoster();
      }
    },
    onError: (message) => systemLine(message),
  });
}
