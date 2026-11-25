// @ts-check

/** @typedef {import('../../src/types.ts').MessagePart} MessagePart */

/**
 * What a skin draws: plain text, a link, or an emote image.
 * @typedef {{ kind: 'text', text: string }
 *   | { kind: 'link', text: string }
 *   | { kind: 'emote', name: string, url: string }} Segment
 */

// Same pattern as the previous overlay: http(s):// or www., trailing punctuation left out
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S*[^\s.,!?)\]]/gi;

/**
 * @param {string} text
 * @returns {Segment[]}
 */
function splitLinks(text) {
  /** @type {Segment[]} */
  const segments = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last)
      segments.push({ kind: 'text', text: text.slice(last, start) });
    segments.push({ kind: 'link', text: match[0] });
    last = start + match[0].length;
  }
  if (last < text.length)
    segments.push({ kind: 'text', text: text.slice(last) });
  return segments;
}

/**
 * Turns a message's parts into display segments, finding links inside text parts.
 * @param {readonly MessagePart[]} parts
 * @returns {Segment[]}
 */
export function toSegments(parts) {
  return parts.flatMap((part) =>
    part.kind === 'text' ? splitLinks(part.text) : [part],
  );
}
