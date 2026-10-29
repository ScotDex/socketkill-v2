const params = new URLSearchParams(location.search);
const maxMessages = Number(params.get('max')) || 30;
const channel = (params.get('channel') || '')
  .trim()
  .toLowerCase()
  .replace(/^#/, '');
const kickId = parseInt(params.get('kick'), 10);
const ytParam = params.get('yt') || '';
const ytId = /^UC[A-Za-z0-9_-]{22}$/.test(ytParam) ? ytParam : null;
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
setPx('rosterwidth', '--roster-w');
setPx('portrait', '--portrait');


const panelW = parseInt(params.get('width'), 10);
if (panelW > 0) rootStyle.setProperty('--panel-w', `min(${panelW}px, calc(100vw - 48px))`);

const maxH = parseInt(params.get('maxheight'), 10);
if (maxH > 0) rootStyle.setProperty('--panel-max-h', `min(${maxH}px, calc(100vh - 48px))`);

const opacity = parseFloat(params.get('opacity'));
if (opacity >= 0 && opacity <= 1) rootStyle.setProperty('--panel-opacity', opacity);

const theme = params.get('theme');
if (/^(amarr|caldari|gallente|minmatar)$/.test(theme)) document.documentElement.dataset.theme = theme;

if (!rosterEnabled) {
  rosterColEl.style.display = 'none';
  windowEl.classList.add('no-roster');
}

const portraitsOff = params.get('portrait') === '0';
if (portraitsOff) windowEl.classList.add('no-portrait');

function showOverlay() {
  setupEl.style.display = 'none';
  windowEl.classList.add('active');
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
    appendText(frag, text);
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
    if (r.start > cursor) appendText(frag, chars.slice(cursor, r.start).join(''));
    const img = document.createElement('img');
    img.className = 'emote';
    img.alt = chars.slice(r.start, r.end + 1).join('');
    img.src = `https://static-cdn.jtvnw.net/emoticons/v2/${r.id}/default/dark/2.0`;
    frag.append(img);
    cursor = r.end + 1;
  }
  if (cursor < chars.length) appendText(frag, chars.slice(cursor).join(''));

  return frag;
}

function addMessage(msg) {
  const row = document.createElement('li');
  row.className = 'row';

  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = msg.tags['display-name'] || msg.user;
  if (msg.tags.color) who.style.color = msg.tags.color;
  if (msg.system) {
  row.classList.add('system');
  who.textContent = `[${new Date().toISOString().slice(11, 19)}] ${who.textContent}`;
}

  const text = document.createElement('span');
  text.className = 'text';
  text.append(buildText(msg.text, msg.tags.emotes));

  row.append(who, text);
  listEl.appendChild(row);

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
  return STANDING.none;
}



const roster = new Map();   
const present = new Set();  
const isAnon = login => /^justinfan\d+$/i.test(login);

function updateCounts() {
  tabCountEl.textContent = present.size;
  rosterCountEl.textContent = present.size;
}

function rosterAdd(login, name) {
  if (isAnon(login)) return;
  present.add(login);
  if (!rosterEnabled || roster.has(login)) return;
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
  rosterAdd(login, name);
  const entry = roster.get(login);
  if (!entry) return;
  entry.spoken = true;
  entry.last = Date.now();
  if (name) entry.name = name;
  Object.assign(entry, parseRoles(badges));
}

function rosterRemove(login) {
  present.delete(login);
  const entry = roster.get(login);
  if (!entry) return;
  if (entry.el) entry.el.remove();
  roster.delete(login);
}

function rosterClear() {
  roster.forEach(entry => { if (entry.el) entry.el.remove(); });
  roster.clear();
  present.clear();
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

  if (!portraitsOff && !entry.lookedUp) {
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
  updateCounts();
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
         addMessage({ system: true, user: 'EVE System', text: 'Channel changed to Local : ' + ch, tags: {} });
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

function connectKick(id) {
  const s = document.createElement('script');
  s.src = 'https://ws.socketkill.com/socket.io/socket.io.js';
  s.onload = () => {
    const query = {};
    if (id > 0) query.kick = String(id);
    if (ytId) query.yt = ytId;
    const sock = io('https://ws.socketkill.com', { query, transports: ['websocket'] });
    sock.on('connect', () => dotEl.classList.add('live'));

    const handle = msg => {
      addMessage(msg);
      rosterSpoke(msg.user, msg.tags['display-name'], msg.tags.badges);
      const entry = roster.get(msg.user);
      if (entry) {
        entry.lookedUp = true;
        if (msg.tags.avatar) entry.avatar = msg.tags.avatar;
      }
      renderRoster();
    };
    sock.on('kick:chat', handle);
    sock.on('yt:chat', handle);
  };
  s.onerror = () => console.warn('Relay unavailable');
  document.head.appendChild(s);
}



const channelInput = document.getElementById('channelInput');
const urlOutput    = document.getElementById('urlOutput');
const setupError   = document.getElementById('setupError');
const optionsForm  = document.getElementById('options');
const kickInput  = document.getElementById('kickInput');
const kickError  = document.getElementById('kickError');
const ytInput = document.getElementById('ytInput');
const ytError = document.getElementById('ytError');
let kickResolvedId = null;
let kickTimer;
let ytResolvedId = null;
let ytTimer;

function buildUrl() {
  const ch = channelInput.value.trim().toLowerCase().replace(/^#/, '');
  const twitchOk = /^[a-z0-9_]{3,25}$/.test(ch);
  setupError.textContent = ch && !twitchOk ? 'Not a valid Twitch channel name' : '';

  if ((ch && !twitchOk) || (!twitchOk && !kickResolvedId && !ytResolvedId)) {
    urlOutput.value = '';
    return null;
  }

  const out = optionParams();
  if (twitchOk) out.set('channel', ch);
  if (kickResolvedId) out.set('kick', String(kickResolvedId));
  if (ytResolvedId) out.set('yt', ytResolvedId);
  out.sort();

  urlOutput.value = location.origin + location.pathname + '?' + out;
  return urlOutput.value;
}

function optionParams() {
  const out = new URLSearchParams();
  for (const el of optionsForm.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      if (!el.checked) out.set(el.name, '0');
    } else if (el.type === 'radio') {
      if (el.checked && !el.defaultChecked) out.set(el.name, el.value);
    } else if (el.tagName === 'SELECT') {
      const def = [...el.options].find(o => o.defaultSelected)?.value ?? '';
      if (el.value !== def) out.set(el.name, el.value);
    } else if (el.value.trim() && el.value !== el.defaultValue) {
      out.set(el.name, el.value.trim());
    }
  }
  return out;
}

const previewBox   = document.getElementById('previewBox');
const previewFrame = document.getElementById('previewFrame');
let previewTimer;

function fitPreview() {
  previewFrame.style.transform = `scale(${previewBox.clientWidth / 700})`;
}

function updatePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const p = optionParams();
    p.set('demo', '1');
    p.set('bg', '1');
    previewFrame.src = location.pathname + '?' + p;
  }, 400);
}



if (params.get('demo') === '1') {
  showOverlay();
  import('./demo.js').then(({ runDemo }) => runDemo({
    addMessage, rosterAdd, rosterSpoke, renderRoster, roster, labelEl, dotEl,
    setViewers: () => {}   
  }));
} else if (channel || kickId > 0 || ytId) {
  showOverlay();

  if (channel) {
    connect(channel);
    try {
      navigator.sendBeacon(
        'https://ws.socketkill.com/api/overlay-ping',
        JSON.stringify({ channel, v: 1 })
      );
    } catch {}
  }

  if (kickId > 0 || ytId) connectKick(kickId);
} else {
  channelInput.addEventListener('input', buildUrl);
  optionsForm.addEventListener('input', () => { buildUrl(); if (previewFrame) updatePreview(); });
    kickInput.addEventListener('input', () => {
    clearTimeout(kickTimer);
    kickResolvedId = null;
    kickError.textContent = '';
    buildUrl();

    const slug = kickInput.value.trim().toLowerCase();
    if (!slug) return;

    kickTimer = setTimeout(async () => {
      try {
        const res = await fetch('https://ws.socketkill.com/api/kick/resolve?slug=' + encodeURIComponent(slug));
        const data = await res.json();
        if (kickInput.value.trim().toLowerCase() !== slug) return;
        if (res.ok && Number.isInteger(data.id)) {
          kickResolvedId = data.id;
          buildUrl();
        } else {
          kickError.textContent = data.error || 'Kick lookup failed';
        }
      } catch {
        kickError.textContent = 'Kick lookup failed';
      }
    }, 600);
  });

  ytInput.addEventListener('input', () => {
  clearTimeout(ytTimer);
  ytResolvedId = null;
  ytError.textContent = '';
  buildUrl();

  const handle = ytInput.value.trim()
    .replace(/^https?:\/\/(www\.)?youtube\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  if (!handle) return;

  ytTimer = setTimeout(async () => {
    try {
      const res = await fetch('https://ws.socketkill.com/api/yt/resolve?handle=' + encodeURIComponent(handle));
      const data = await res.json();
      if (ytInput.value.trim().toLowerCase().indexOf(handle) === -1) return;
      if (res.ok && /^UC[A-Za-z0-9_-]{22}$/.test(data.id || '')) {
        ytResolvedId = data.id;
        buildUrl();
      } else {
        ytError.textContent = data.error || 'YouTube lookup failed';
      }
    } catch {
      ytError.textContent = 'YouTube lookup failed';
    }
  }, 600);
});

  if (previewFrame) {
    fitPreview();
    window.addEventListener('resize', fitPreview);
    updatePreview();
  }
  const copyBtn = document.getElementById('copyBtn');
  let copyTimer;

  copyBtn.addEventListener('click', async () => {
    const url = buildUrl();
    clearTimeout(copyTimer);
    copyBtn.classList.remove('copied', 'failed');
    void copyBtn.offsetWidth;

    if (!url) {
      copyBtn.classList.add('failed');
      copyBtn.textContent = 'Enter channel';
      channelInput.focus();
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        urlOutput.select();
        document.execCommand('copy');
      }
      copyBtn.classList.add('copied');
      copyBtn.textContent = 'Copied ✓';
      urlOutput.classList.add('flash');
      setTimeout(() => urlOutput.classList.remove('flash'), 600);
    }

    copyTimer = setTimeout(() => {
      copyBtn.classList.remove('copied', 'failed');
      copyBtn.textContent = 'Copy';
    }, 1600);
  });
}