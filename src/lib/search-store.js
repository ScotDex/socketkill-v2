import { writable } from 'svelte/store';

export const searchFilters = writable({
  date: new Date().toISOString().slice(0, 10),
  shipType: [],
  shipGroup: [],
  system: [],
  region: [],
  space: [],
  minIsk: null,
  maxIsk: null,
  minAttackers: null,
  maxAttackers: null,
  victimCorp: [],
  victimAlliance: [],
  attackerCorp: [],
  attackerAlliance: [],
  solo: false,
});

export const searchResults = writable({
  kills: [],
  total: 0,
  page: 1,
  hasMore: false,
  hasPrev: false,
  loading: false,
  error: null,
});

export async function runSearch(filters, page = 1) {
  searchResults.update(r => ({ ...r, loading: true, error: null }));

  const params = new URLSearchParams();
  params.set('date', filters.date);
  if (filters.shipType.length) params.set('shipType', filters.shipType.join(','));
  if (filters.shipGroup.length) params.set('shipGroup', filters.shipGroup.join(','));
  if (filters.system.length) params.set('system', filters.system.join(','));
  if (filters.region.length) params.set('region', filters.region.join(','));
  if (filters.space.length) params.set('space', filters.space.join(','));
  if (filters.minIsk != null) params.set('minIsk', filters.minIsk);
  if (filters.maxIsk != null) params.set('maxIsk', filters.maxIsk);
  if (filters.minAttackers != null) params.set('minAttackers', filters.minAttackers);
  if (filters.maxAttackers != null) params.set('maxAttackers', filters.maxAttackers);
  if (filters.victimCorp.length) params.set('victimCorp', filters.victimCorp.join(','));
  if (filters.victimAlliance.length) params.set('victimAlliance', filters.victimAlliance.join(','));
  if (filters.attackerCorp.length) params.set('attackerCorp', filters.attackerCorp.join(','));
  if (filters.attackerAlliance.length) params.set('attackerAlliance', filters.attackerAlliance.join(','));
  if (filters.solo) params.set('solo', '1');
  params.set('page', page);

  try {
    const res = await fetch(`https://ws.socketkill.com/api/kills/search?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    searchResults.set({
      kills: data.kills,
      total: data.total,
      page: data.page,
      hasMore: data.hasMore,
      hasPrev: data.hasPrev,
      loading: false,
      error: null,
    });
  } catch (err) {
    searchResults.update(r => ({ ...r, loading: false, error: err.message }));
  }
}