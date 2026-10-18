// ============================================================
// DEMO MODE - fake chat so streamers can see the look.
// Loaded by script.js only when the URL has ?demo=1.
// ============================================================

const USERS = [
  { name: 'Kador_Pilot',      color: '#e8c165', badges: 'broadcaster/1' },
  { name: 'WormholeWanderer', color: '#6fd7ff', badges: 'moderator/1' },
  { name: 'JitaTrader',       color: '#59c97a', badges: 'vip/1' },
  { name: 'RustyMinmatar',    color: '#ff7f50', badges: 'subscriber/12' },
  { name: 'NullsecNomad',     color: '#a970ff', badges: 'subscriber/3' },
  { name: 'HighsecHauler',    color: '#9ad0ec', badges: '' },
  { name: 'CapsuleerCait',    color: '#ff6fae', badges: '' }
];

const SILENT = ['AFKcloaky', 'LocalLurker', 'ProbeScanner', 'GateCamper', 'MiningMarv', 'Undock_Andy'];

const LINES = [
  'o7', 'gf', 'local spike, dock up', 'anyone selling PLEX?', 'nice fit',
  'is that a Rifter?', 'fly safe', 'rip ship', 'check your overview',
  'jita prices are wild today', 'warping to you now', 'gate is camped',
  'what implants are you running?', 'that was a clean kill', 'welcome to New Eden'
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

  labelEl.textContent = 'demo';
  dotEl.classList.add('live');
  setViewers(42);

  // Fake accounts are marked as looked up so they never hit the Twitch API
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