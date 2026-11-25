// @ts-check
import { toSegments } from '../../core/text.js';

/** @typedef {import('../../../src/types.ts').ChatMessage} ChatMessage */
/** @typedef {import('../../core/roster.js').RosterEntry} RosterEntry */

/**
 * @param {ChatMessage} message
 
 * @returns {HTMLLIElement}
 */
export function renderMessage(message) {
  const row = document.createElement('li');
  row.className = 'row';

  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = message.name;
  if (message.color) who.style.color = message.color;

  const text = document.createElement('span');
  text.className = 'text';
  for (const segment of toSegments(message.parts)) {
    if (segment.kind === 'emote') {
      const img = document.createElement('img');
      img.className = 'emote';
      img.alt = segment.name;
      img.src = segment.url;
      text.append(img);
    } else if (segment.kind === 'link') {
      const span = document.createElement('span');
      span.className = 'link';
      span.textContent = segment.text;
      text.append(span);
    } else {
      text.append(segment.text);
    }
  }

  row.append(who, text);
  return row;
}

/**
 * A red EVE System line with a UTC timestamp, as in the previous overlay.
 * @param {string} text
 * @returns {HTMLLIElement}
 */
export function renderSystemLine(text) {
  const row = document.createElement('li');
  row.className = 'row system';

  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = `[${new Date().toISOString().slice(11, 19)}] EVE System`;

  const body = document.createElement('span');
  body.className = 'text';
  body.textContent = text;

  row.append(who, body);
  return row;
}

/** @typedef {import('../../../src/types.ts').Role} Role */

const STANDING = {
  mod: '#59c97a',
  vip: '#e04e4e',
  sub: '#a970ff',
  none: '#4a5358',
};

/**
 * The standing square's colour; the broadcaster counts as a mod, as before.
 * @param {readonly Role[]} roles
 */
export function standingColour(roles) {
  if (roles.includes('broadcaster') || roles.includes('mod'))
    return STANDING.mod;
  if (roles.includes('vip')) return STANDING.vip;
  if (roles.includes('sub')) return STANDING.sub;
  return STANDING.none;
}

/**
 * @param {RosterEntry} entry
 * @returns {HTMLLIElement}
 */
export function createRosterRow(entry) {
  const row = document.createElement('li');
  row.className = 'roster-row';

  const portrait = document.createElement('div');
  portrait.className = 'portrait';
  portrait.textContent = entry.name.charAt(0).toUpperCase();

  const name = document.createElement('span');
  name.className = 'roster-name';

  const standing = document.createElement('span');
  standing.className = 'standing';

  row.append(portrait, name, standing);
  updateRosterRow(row, entry);
  return row;
}

/**
 * Refreshes a row in place, so it never flickers.
 * @param {HTMLElement} row
 * @param {RosterEntry} entry
 */
export function updateRosterRow(row, entry) {
  row.classList.toggle('spoken', entry.spoken);
  const name = row.querySelector('.roster-name');
  if (name) name.textContent = entry.name;
  const standing = row.querySelector('.standing');
  if (standing instanceof HTMLElement) {
    standing.style.setProperty('--standing', standingColour(entry.roles));
  }
}

/**
 * Swaps the initial for the picture once it has actually loaded.
 * @param {HTMLElement} row
 * @param {string} url
 */
export function showAvatar(row, url) {
  const portrait = row.querySelector('.portrait');
  if (!portrait || portrait.querySelector('img')) return;
  const img = new Image();
  img.alt = '';
  img.onload = () => {
    portrait.textContent = '';
    portrait.append(img);
  };
  img.src = url;
}
