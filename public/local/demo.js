const USERS = [
  { name: 'schadsquatch',      color: '#e8c165', badges: 'broadcaster/1' },
  { name: 'lynnerankin', color: '#6fd7ff', badges: 'moderator/1' },
  { name: 'vinnegar_dooshay',       color: '#59c97a', badges: 'vip/1' },
  { name: 'Erst',    color: '#ff7f50', badges: 'subscriber/12' },
  { name: 'BombeldoTheWizard',     color: '#a970ff', badges: 'subscriber/3' },
  { name: 'MagicalGeek',    color: '#9ad0ec', badges: '' },
  { name: 'TheMadRambo',    color: '#ff6fae', badges: '' }
];

const SILENT = ['AFKcloaky', 'LocalLurker', 'ProbeScanner', 'GateCamper', 'MiningMarv', 'Undock_Andy'];

const LINES = [
  'o7', 'gf', 'uWu Daddy', 'I can double your ISK?', 'trash fit',
  'is that a Lancer?', 'IM PRACTICING SAYING THINGS IN A COMMANDING TONE', 'die quietly', 'check your overview',
  'Use code wizard', 'Dont talk in local', 'tama is camped AGAIN',
  'Would you like to hold my moustache?', 'Check zkill', 'welcome to New Eden'
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Start the fake chat.
 * @param {object} api - functions and elements handed over by script.js
 */
export function runDemo(api) {
  const { addMessage, rosterAdd, rosterSpoke, renderRoster, roster, setViewers, labelEl, dotEl } = api;

  function fakeMessage() {
    const u = pick(USERS);
    const login = u.name.toLowerCase();
    addMessage({ user: login, text: pick(LINES), tags: { 'display-name': u.name, color: u.color, badges: u.badges } });
    rosterSpoke(login, u.name, u.badges);
    renderRoster();
  }

  addMessage({ system: true, user: 'EVE System', text: 'Channel changed to Local : demo', tags: {} });
  dotEl.classList.add('live');
  setViewers(42);

  [...USERS.map(u => u.name), ...SILENT].forEach(name => {
    const login = name.toLowerCase();
    rosterAdd(login, name);
    const entry = roster.get(login);
    if (entry) entry.lookedUp = true;
  });

  for (let i = 0; i < 8; i++) fakeMessage();
  renderRoster();

  (function loop() {
    setTimeout(() => { fakeMessage(); loop(); }, 1200 + Math.random() * 1800);
  })();
}