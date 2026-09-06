// Entry point. Holds the application state and connects data → calc → ui.
// This is the only module that knows about all three.

import { loadDatabase } from "./data.js";
import { filterShips } from "./calc.js";
import * as ui from "./ui.js";

const state = {
  query: "",
  faction: "all",
  class: "all",
  selectedId: null
};

let db = null;

function refresh() {
  const visible = filterShips(db.ships, state);
  ui.renderCount(visible.length, db.ships.length);
  ui.renderGrid(visible, state.selectedId, selectShip);
  ui.markSidebarActive(state);
}

function applyFilters(patch) {
  Object.assign(state, patch);
  ui.syncControls(state);
  refresh();
}

function selectShip(id) {
  const ship = db.ships.find(s => s.id === id);
  if (!ship) return;
  state.selectedId = id;
  ui.markSelected(id);
  ui.renderDetail(ship, db);
}

async function start() {
  try {
    db = await loadDatabase();
  } catch (error) {
    console.error(error);
    ui.renderError("Ship database failed to load. Check that data/frigates.json is being served.");
    return;
  }

  ui.populateDropdowns(db.ships);
  ui.buildSidebar(db.ships, applyFilters);
  ui.bindControls(applyFilters);
  refresh();
}

start();
