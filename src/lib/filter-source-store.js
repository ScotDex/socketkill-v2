import { writable, derived } from 'svelte/store';
import Fuse from 'fuse.js';

// Replace with your existing backend URL config if you have one centralised.
// V2 likely has this in an env var or config file already.
const API_BASE = 'https://ws.socketkill.com';

const EMPTY = {
  loaded: false,
  error: null,
  buildNumber: null,
  syncedAt: null,
  systems: {},
  regions: {},
  groups: {},
  ships: {},
  items: {},
};

export const filterSource = writable(EMPTY);

export async function loadFilterSource() {
  try {
    const res = await fetch(`${API_BASE}/api/filter-source`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    filterSource.set({ loaded: true, error: null, ...data });
    return data;
  } catch (err) {
    console.error('[filter-source] load failed:', err);
    filterSource.update((s) => ({ ...s, error: err.message }));
    return null;
  }
}


export const itemsFuse = derived(filterSource, ($fs) => {
  if (!$fs.loaded) return null;
  const list = Object.entries($fs.items).map(([id, item]) => ({
    typeID: Number(id),
    name: item.name,
    groupID: item.groupID,
  }));
  return new Fuse(list, {
    keys: ['name'],
    threshold: 0.3,         // looser = more permissive substring matching
    minMatchCharLength: 3,
    ignoreLocation: true,   // "smartbomb" matches "Large Smartbomb II" anywhere in name
  });
});

export const systemsFuse = derived(filterSource, ($fs) => {
  if (!$fs.loaded) return null;
  const list = Object.entries($fs.systems).map(([id, sys]) => ({
    systemID: Number(id),
    name: sys.name,
    regionID: sys.regionID,
    security: sys.security,
  }));
  return new Fuse(list, {
    keys: ['name'],
    threshold: 0.2,        
    minMatchCharLength: 2,
    ignoreLocation: true,
  });
});

export const regionsFuse = derived(filterSource, ($fs) => {
  if (!$fs.loaded) return null;
  const list = Object.entries($fs.regions).map(([id, r]) => ({
    regionID: Number(id),
    name: r.name,
  }));
  return new Fuse(list, {
    keys: ['name'],
    threshold: 0.2,
    minMatchCharLength: 2,
    ignoreLocation: true,
  });
});

export function resolveWeaponKeyword(keyword, fuse) {
  if (!fuse || !keyword) return new Set();
  const trimmed = keyword.trim();
  if (trimmed.length < 3) return new Set();
  const results = fuse.search(trimmed, { limit: 500 });
  return new Set(results.map((r) => r.item.typeID));
}