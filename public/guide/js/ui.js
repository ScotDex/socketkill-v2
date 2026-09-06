// Presentation layer. Owns every DOM read and write.
// It computes nothing — all figures arrive already calculated.

import { WEAPON_FAMILIES, averageResistances, weakestIndex, rankAmmo, countBy } from "./calc.js";

const el = {
  grid: document.getElementById("grid"),
  detail: document.getElementById("detail"),
  count: document.getElementById("count"),
  search: document.getElementById("search"),
  faction: document.getElementById("faction"),
  class: document.getElementById("class"),
  classList: document.getElementById("classList"),
  factionList: document.getElementById("factionList"),
  sideTotal: document.getElementById("sideTotal"),
  sideAll: document.getElementById("sideAll")
};

const RENDER_URL = id => `https://images.evetech.net/types/${id}/render?size=256`;

function esc(value) {
  return String(value).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// Replaces the old inline onerror="" attributes — markup stays free of behaviour.
function wireImageFallbacks(root) {
  root.querySelectorAll("img[data-fallback]").forEach(img => {
    img.addEventListener("error", () => {
      img.style.display = "none";
      if (img.nextElementSibling) img.nextElementSibling.style.display = "block";
    });
  });
}

export function populateDropdowns(ships) {
  const fill = (select, values) => {
    for (const v of values) {
      const option = document.createElement("option");
      option.value = v;
      option.textContent = v;
      select.appendChild(option);
    }
  };
  fill(el.faction, [...new Set(ships.map(s => s.faction))].sort());
  fill(el.class, [...new Set(ships.map(s => s.class))].sort());
}

export function buildSidebar(ships, onChange) {
  el.sideTotal.textContent = ships.length;

  const item = kind => ([name, n]) =>
    `<div class="sideitem" data-kind="${kind}" data-value="${esc(name)}">` +
    `<span>${esc(name)}</span><span class="sidecount">${n}</span></div>`;

  el.classList.innerHTML = countBy(ships, "group").map(item("class")).join("");
  el.factionList.innerHTML = countBy(ships, "faction").map(item("faction")).join("");

  el.sideAll.addEventListener("click", () =>
    onChange({ query: "", faction: "all", class: "all" })
  );

  document.querySelectorAll(".sideitem").forEach(node => {
    node.addEventListener("click", () => {
      const { kind, value } = node.dataset;
      onChange(kind === "class"
        ? { class: value, faction: "all" }
        : { faction: value, class: "all" });
    });
  });
}

export function bindControls(onChange) {
  el.search.addEventListener("input", () => onChange({ query: el.search.value }));
  el.faction.addEventListener("change", () => onChange({ faction: el.faction.value }));
  el.class.addEventListener("change", () => onChange({ class: el.class.value }));
}

// Push state back into the inputs after a sidebar click or a reset.
export function syncControls(state) {
  if (el.search.value !== state.query) el.search.value = state.query;
  if (el.faction.value !== state.faction) el.faction.value = state.faction;
  if (el.class.value !== state.class) el.class.value = state.class;
}

export function renderCount(shown, total) {
  el.count.textContent = `${shown} / ${total} ships`;
}

export function renderGrid(ships, selectedId, onSelect) {
  el.grid.innerHTML = ships.length
    ? ships.map(s => `
      <button type="button" class="card ${selectedId === s.id ? "active" : ""}" data-id="${s.id}">
        <span class="badge">${esc(s.class)}</span>
        <div class="shippic">
          <img class="ship-img" data-fallback loading="lazy" alt="${esc(s.name)}" src="${RENDER_URL(s.id)}">
          <div class="fallback" style="display:none">◈</div>
        </div>
        <div class="cardbody">
          <div class="name">${esc(s.name)}</div>
          <div class="meta">${esc(s.faction)} · ${esc(s.group)}</div>
        </div>
      </button>`).join("")
    : `<div class="empty">No frigates match your filters.</div>`;

  el.grid.querySelectorAll(".card").forEach(button =>
    button.addEventListener("click", () => onSelect(Number(button.dataset.id)))
  );
  wireImageFallbacks(el.grid);
}

export function markSelected(id) {
  el.grid.querySelectorAll(".card").forEach(button =>
    button.classList.toggle("active", Number(button.dataset.id) === id)
  );
}

export function markSidebarActive(state) {
  document.querySelectorAll(".sideitem").forEach(node => {
    const { kind, value } = node.dataset;
    const active =
      (kind === "class" && state.class === value) ||
      (kind === "faction" && state.faction === value);
    node.classList.toggle("active", active);
  });
  el.sideAll.classList.toggle(
    "active",
    state.faction === "all" && state.class === "all" && !state.query
  );
}

export function renderDetail(ship, db) {
  const averages = averageResistances(ship.res);
  const wi = weakestIndex(averages);
  const types = db.damageTypes;

  const resCards = types.map((d, i) => `
    <div class="res"><span>${esc(d)}</span><b>${averages[i].toFixed(1)}%</b>
      <div class="bar"><i style="width:${Math.max(0, Math.min(100, averages[i]))}%"></i></div>
    </div>`).join("");

  const layerRow = (label, values) =>
    `<tr><td>${label}</td>${values.map(v => `<td>${v.toFixed(1)}%</td>`).join("")}</tr>`;

  const ammoCards = WEAPON_FAMILIES.map(family => {
    const top = rankAmmo(db.ammo, averages, family);
    if (!top.length) return "";
    return `<div class="ammoitem">
      <b>${esc(family)}</b>
      <div style="margin-top:6px">🥇 ${esc(top[0].name)}</div>
      <div class="meta">🥈 ${esc(top[1] ? top[1].name : "—")}</div>
      <div class="score">Damage score: ${top[0].score.toFixed(2)}</div>
    </div>`;
  }).join("");

  el.detail.innerHTML = `
    <div class="hero">
      <div>
        <div class="sub">${esc(ship.faction)} · ${esc(ship.class)} · ${esc(ship.group)}</div>
        <h2>${esc(ship.name)}</h2>
        <div class="weak">
          <small>WEAKEST AVERAGE RESISTANCE</small>
          <strong>${esc(types[wi])}</strong>
          <span>${averages[wi].toFixed(1)}% average resistance across Shield + Armour + Hull</span>
        </div>
      </div>
      <div class="heroimg">
        <img data-fallback alt="${esc(ship.name)}" src="${RENDER_URL(ship.id)}">
        <div class="fallback" style="display:none">◈</div>
      </div>
    </div>
    <div class="section"><h3>Average resistance</h3><div class="resgrid">${resCards}</div></div>
    <div class="section"><h3>Resistance by layer</h3>
      <table>
        <thead><tr><th>Layer</th>${types.map(t => `<th>${esc(t)}</th>`).join("")}</tr></thead>
        <tbody>
          ${layerRow("Shield", ship.res.shield)}
          ${layerRow("Armour", ship.res.armor)}
          ${layerRow("Hull", ship.res.hull)}
          <tr><td><b>Average</b></td>${averages.map(v => `<td><b>${v.toFixed(1)}%</b></td>`).join("")}</tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <h3>Best ammunition by frigate weapon type</h3>
      <p class="note">Ranked from the embedded CCP SDE ammunition damage values against this ship's average resistance. This is a damage-only ranking; range, tracking, explosion radius/velocity, skills and target fit are not included.</p>
      <div class="ammo">${ammoCards}</div>
    </div>
    <div class="section"><div class="note">Data source: CCP Static Data Export build ${esc(db.sdeBuild)}. Resistance values use CCP Dogma resonance attributes (1.0 = 0% resistance).</div></div>`;

  wireImageFallbacks(el.detail);
}

export function renderError(message) {
  el.grid.innerHTML = `<div class="empty">${esc(message)}</div>`;
}
