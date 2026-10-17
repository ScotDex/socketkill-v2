
const params = new URLSearchParams(location.search);
const maxMessages = Number(params.get('max')) || 30;
const channel = (params.get('channel') || '')
  .trim()
  .toLowerCase()
  .replace(/^#/, '');

const rosterEnabled = params.get('roster') !== '0';
const maxRoster = Number(params.get('rostermax')) || 80;


const setupEl       = document.getElementById('setup');
const windowEl      = document.getElementById('window');
const listEl        = document.getElementById('list');
const dotEl         = document.getElementById('statusDot');
const labelEl       = document.getElementById('channelLabel');
const tabCountEl    = document.getElementById('tabCount');
const rosterColEl   = document.getElementById('rosterCol');
const rosterListEl  = document.getElementById('rosterList');
const rosterCountEl = document.getElementById('rosterCount');


if (params.get('bg') === '1') document.body.classList.add('preview-bg');

const rootStyle = document.documentElement.style;

function setPx(param, cssVar) {
  const n = parseInt(params.get(param), 10);
  if (n > 0) rootStyle.setProperty(cssVar, n + 'px');
}

setPx('size', '--font-size');
setPx('width', '--panel-w');
setPx('rosterwidth', '--roster-w');

const maxH = parseInt(params.get('maxheight'), 10);
if (maxH > 0) rootStyle.setProperty('--panel-max-h', `min(${maxH}px, calc(100vh - 48px))`);

if (!rosterEnabled) {
  rosterColEl.style.display = 'none';
  windowEl.classList.add('no-roster');
}


function showOverlay() {
  setupEl.style.display = 'none';
  windowEl.classList.add('active');
}


const chatters = new Set();
let viewers = null;

function updateTabCount() {
  tabCountEl.textContent = viewers ?? chatters.size;
}

async function pollViewers() {
  try {
    const res = await fetch('https://api.ivr.fi/v2/twitch/user?login=' + encodeURIComponent(channel));
    if (!res.ok) return;
    const data = await res.json();
    const user = Array.isArray(data) ? data[0] : data;
    if (!user) return;
    viewers = user.stream ? (user.stream.viewersCount ?? user.stream.viewers ?? null) : 0;
    updateTabCount();
  } catch {}
}

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S*[^\s.,!?)\]]/gi;

function appendText(frag, str) {
  let last = 0;
  for (const match of str.matchAll(URL_PATTERN)) {
    if (match.index > last) frag.append(str.slice(last, match.index));
    const span = document.createElement('span');
    span.className = 'link';
    span.textContent = match[0];
    frag.append(span);
    last = match.index + match[0].length;
  }
  if (last < str.length) frag.append(str.slice(last));
}


function buildText(text, emoteTag) {
  const frag = document.createDocumentFragment();
  if (!emoteTag) {
    frag.append(text);
    return frag;
  }

  const ranges = [];
  for (const group of emoteTag.split('/')) {
    const [id, positions] = group.split(':');
    if (!positions) continue;
    for (const p of positions.split(',')) {
      const [start, end] = p.split('-').map(Number);
      ranges.push({ id, start, end });
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const chars = [...text];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) frag.append(chars.slice(cursor, r.start).join(''));
    const img = document.createElement('img');
    img.className = 'emote';
    img.alt = chars.slice(r.start, r.end + 1).join('');
    img.src = `https://static-cdn.jtvnw.net/emoticons/v2/${r.id}/default/dark/2.0`;
    frag.append(img);
    cursor = r.end + 1;
  }
  if (cursor < chars.length) frag.append(chars.slice(cursor).join(''));

  return frag;
}

function addMessage(msg) {
  const row = document.createElement('li');
  row.className = 'row';

  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = msg.tags['display-name'] || msg.user;
  if (msg.tags.color) who.style.color = msg.tags.color;

  const text = document.createElement('span');
  text.className = 'text';
  text.append(buildText(msg.text, msg.tags.emotes));

  row.append(who, text);
  listEl.appendChild(row);

  chatters.add(msg.user);
  updateTabCount();

  while (listEl.children.length > maxMessages) {
    listEl.firstElementChild.remove();
    listEl.classList.add('overflowing');
  }

  while (listEl.children.length > 1 && listEl.scrollHeight > listEl.clientHeight) {
    listEl.firstElementChild.remove();
    listEl.classList.add('overflowing');
  }
}


const STANDING = {
  mod: '#59c97a',
  vip: '#e04e4e',
  sub: '#a970ff',
  follower: '#4a9eff',
  none: '#4a5358'
};

function parseRoles(badges) {
  const names = (badges || '').split(',').map(b => b.split('/')[0]);
  return {
    mod: names.includes('moderator') || names.includes('broadcaster'),
    vip: names.includes('vip'),
    sub: names.includes('subscriber') || names.includes('founder')
  };
}

function standingColor(entry) {
  if (entry.mod) return STANDING.mod;
  if (entry.vip) return STANDING.vip;
  if (entry.sub) return STANDING.sub;
  if (entry.follower) return STANDING.follower;
  return STANDING.none;
}


const roster = new Map();
const isAnon = login => /^justinfan\d+$/i.test(login);

function rosterAdd(login, name) {
  if (!rosterEnabled || isAnon(login) || roster.has(login)) return;
  roster.set(login, {
    login,
    name: name || login,
    spoken: false,
    joined: Date.now(),
    last: 0,
    el: null
  });
}

function rosterSpoke(login, name, badges) {
  if (!rosterEnabled) return;
  rosterAdd(login, name);
  const entry = roster.get(login);
  if (!entry) return;
  entry.spoken = true;
  entry.last = Date.now();
  if (name) entry.name = name;
  Object.assign(entry, parseRoles(badges));
}

function rosterRemove(login) {
  const entry = roster.get(login);
  if (!entry) return;
  if (entry.el) entry.el.remove();
  roster.delete(login);
}

function rosterClear() {
  roster.forEach(entry => { if (entry.el) entry.el.remove(); });
  roster.clear();
}


function buildRosterRow(entry) {
  const li = document.createElement('li');
  li.className = 'roster-row';

  const portrait = document.createElement('div');
  portrait.className = 'portrait';
  portrait.textContent = entry.name.charAt(0).toUpperCase();

  const name = document.createElement('span');
  name.className = 'roster-name';

  const standing = document.createElement('span');
  standing.className = 'standing';

  li.append(portrait, name, standing);
  entry.el = li;
  entry.nameEl = name;
  entry.portraitEl = portrait;
  entry.standingEl = standing;
  entry.avatarShown = false;

  if (!entry.lookedUp) {
    entry.lookedUp = true;
    lookupQueue.push(entry.login);
    runLookups();
  }
}

function updateRosterRow(entry) {
  if (!entry.el) return;
  entry.el.classList.toggle('spoken', entry.spoken);
  entry.nameEl.textContent = entry.name;
  entry.standingEl.style.setProperty('--standing', standingColor(entry));

  if (entry.avatar && !entry.avatarShown) {
    entry.avatarShown = true;
    const img = new Image();
    img.alt = '';
    img.onload = () => {
      entry.portraitEl.textContent = '';
      entry.portraitEl.appendChild(img);
    };
    img.src = entry.avatar;
  }
}

function renderRoster() {
  if (!rosterEnabled) return;

  const sorted = [...roster.values()].sort((a, b) => {
    if (a.spoken !== b.spoken) return a.spoken ? -1 : 1;
    return a.spoken ? b.last - a.last : a.joined - b.joined;
  });

  sorted.forEach((entry, i) => {
    if (i < maxRoster) {
      if (!entry.el) buildRosterRow(entry);
      updateRosterRow(entry);
      rosterListEl.appendChild(entry.el);
    } else if (entry.el) {
      entry.el.remove();
      entry.el = null;
      if (!entry.spoken) roster.delete(entry.login);
    }
  });

  rosterCountEl.textContent = roster.size;
}


const lookupQueue = [];
let lookupBusy = false;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function lookupUser(entry) {
  try {
    const res = await fetch('https://api.ivr.fi/v2/twitch/user?login=' + encodeURIComponent(entry.login));
    if (res.ok) {
      const data = await res.json();
      const user = Array.isArray(data) ? data[0] : data;
      if (user && user.logo) entry.avatar = user.logo;
    }
  } catch {}

  try {
    const res = await fetch('https://api.ivr.fi/v2/twitch/subage/' + encodeURIComponent(entry.login) + '/' + encodeURIComponent(channel));
    if (res.ok) {
      const data = await res.json();
      entry.follower = !!data.followedAt;
      if (data.subscribed === true || data.meta?.type) entry.sub = true;
    }
  } catch {}
}

async function runLookups() {
  if (lookupBusy) return;
  lookupBusy = true;

  while (lookupQueue.length) {
    const login = lookupQueue.shift();
    const entry = roster.get(login);
    if (entry) {
      await lookupUser(entry);
      updateRosterRow(entry);
    }
    await wait(350);
  }

  lookupBusy = false;
}


function parseLine(line) {
  const msg = { tags: {}, prefix: '', command: '', params: [], text: '' };
  let rest = line;

  if (rest.startsWith('@')) {
    const space = rest.indexOf(' ');
    const rawTags = rest.slice(1, space);
    for (const pair of rawTags.split(';')) {
      const eq = pair.indexOf('=');
      msg.tags[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
    rest = rest.slice(space + 1);
  }

  if (rest.startsWith(':')) {
    const space = rest.indexOf(' ');
    msg.prefix = rest.slice(1, space);
    rest = rest.slice(space + 1);
  }

  const textStart = rest.indexOf(' :');
  if (textStart !== -1) {
    msg.text = rest.slice(textStart + 2);
    rest = rest.slice(0, textStart);
  }

  const parts = rest.split(' ');
  msg.command = parts[0];
  msg.params = parts.slice(1);
  msg.user = msg.prefix.split('!')[0];

  return msg;
}

function connect(ch) {
  labelEl.textContent = ch;
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

  ws.onopen = () => {
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
    ws.send('NICK justinfan' + Math.floor(Math.random() * 100000));
    ws.send('JOIN #' + ch);
  };

  ws.onmessage = (event) => {
    const lines = event.data.split('\r\n');

    for (const line of lines) {
      if (!line) continue;
      const msg = parseLine(line);

      if (msg.command === 'PING') {
        ws.send('PONG :' + msg.text);
        continue;
      }

      if (msg.command === 'RECONNECT') {
        ws.close();
        continue;
      }

      if (msg.command === '001') {
        dotEl.classList.add('live');
        continue;
      }

      if (msg.command === 'PRIVMSG') {
        addMessage(msg);
        rosterSpoke(msg.user, msg.tags['display-name'], msg.tags.badges);
        renderRoster();
        continue;
      }

      if (msg.command === '353') {
        msg.text.split(' ').filter(Boolean).forEach(login => rosterAdd(login));
        renderRoster();
        continue;
      }

      if (msg.command === 'JOIN') {
        rosterAdd(msg.user);
        renderRoster();
        continue;
      }

      if (msg.command === 'PART') {
        rosterRemove(msg.user);
        renderRoster();
      }
    }
  };

  ws.onclose = () => {
    dotEl.classList.remove('live');
    rosterClear();
    renderRoster();
    console.warn('Disconnected from Twitch IRC - reconnecting in 4s');
    setTimeout(() => connect(ch), 4000);
  };
}


if (channel) {
  showOverlay();
  connect(channel);
  pollViewers();
  setInterval(pollViewers, 30000);
}