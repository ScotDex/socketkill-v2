<script>
  import { onMount } from 'svelte';
  import { searchFilters, searchResults, runSearch } from '../../lib/search-store.js';
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js';
  import { formatIsk } from '../../lib/filter-logic.js';

  onMount(() => {
    loadFilterSource();
    const p = new URLSearchParams(window.location.search);
    const ints = (s) => s.split(',').map(Number);

    searchFilters.update(f => ({
      ...f,
      space:        p.has('space')        ? p.get('space').split(',')     : f.space,
      shipGroup:    p.has('shipGroup')    ? ints(p.get('shipGroup'))      : f.shipGroup,
      system:       p.has('system')       ? ints(p.get('system'))         : f.system,
      region:       p.has('region')       ? ints(p.get('region'))         : f.region,
      minIsk:       p.has('minValue')     ? Number(p.get('minValue'))     : f.minIsk,
      maxIsk:       p.has('maxValue')     ? Number(p.get('maxValue'))     : f.maxIsk,
      minAttackers: p.has('minAttackers') ? Number(p.get('minAttackers')) : f.minAttackers,
      maxAttackers: p.has('maxAttackers') ? Number(p.get('maxAttackers')) : f.maxAttackers,
      solo:         p.has('solo')         ? p.get('solo') === 'true'      : f.solo,
    }));

    runSearch($searchFilters, 1);
  });

  function nextPage() { runSearch($searchFilters, $searchResults.page + 1); }
  function prevPage() { runSearch($searchFilters, $searchResults.page - 1); }
  function formatTime(iso) { return iso ? new Date(iso).toISOString().slice(11, 19) : ''; }

  const shipName   = (k) => $filterSource.ships?.[k.shipID]?.name     ?? `Ship ${k.shipID}`;
  const systemName = (k) => $filterSource.systems?.[k.systemID]?.name ?? `Sys ${k.systemID}`;
  const regionName = (k) => $filterSource.regions?.[k.regionID]?.name ?? '';

  const SEC_LABEL_FULL = { high:'HIGHSEC', low:'LOWSEC', null:'NULLSEC', wh:'WORMHOLE', pochven:'POCHVEN' };

const filterSummary = $derived.by(() => {
  const f = $searchFilters;
  const src = $filterSource;
  const parts = [];

  if (f.space.length)        parts.push(f.space.map(s => SEC_LABEL_FULL[s] ?? s.toUpperCase()).join('/'));
  if (f.shipGroup.length)    parts.push(f.shipGroup.map(id => src.groups?.[id]?.name  ?? `Grp ${id}`).join(', '));
  if (f.system.length)       parts.push('in ' + f.system.map(id => src.systems?.[id]?.name ?? `Sys ${id}`).join(', '));
  if (f.region.length)       parts.push('in ' + f.region.map(id => src.regions?.[id]?.name ?? `Rgn ${id}`).join(', '));
  if (f.minIsk != null)      parts.push('≥ ' + formatIsk(f.minIsk));
  if (f.maxIsk != null)      parts.push('≤ ' + formatIsk(f.maxIsk));
  if (f.minAttackers != null) parts.push('≥' + f.minAttackers + ' atk');
  if (f.maxAttackers != null) parts.push('≤' + f.maxAttackers + ' atk');
  if (f.solo)                parts.push('SOLO');

  return parts.length ? parts.join('  ·  ') : 'ALL KILLS';
});

  const SEC_COLORS = { high:'#3fb950', low:'#f39c12', null:'#ff0000', wh:'#58a6ff', pochven:'#ff0000' };
  const SEC_LABEL  = { high:'HS', low:'LS', null:'NULL', wh:'WH', pochven:'POCH' };
  const valueColor = (v) =>
    v >= 10_000_000_000 ? 'var(--color-whale-accent)'
    : v >= 1_000_000_000 ? 'var(--color-isk-billion)'
    : 'var(--color-eve-accent)';
</script>

<section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden font-mono mt-4">

  <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] flex justify-between items-center text-sm tracking-widest text-gray-400 uppercase">
    <span class="eve-card-title">RESULTS GENERATED: {$searchResults?.total ?? 0}</span>
    <span class="text-[var(--color-eve-accent)] eve-accent-glow">
      {#if $searchResults?.loading}
        &gt; SCANNING WRECKAGE...
      {:else if $searchResults?.error}
        &gt; ERR: {$searchResults.error}
      {:else}
        &gt; SHOWING {$searchResults?.kills?.length ?? 0}
      {/if}
    </span>
  </header>

  <div class="px-3 py-1.5 border-b border-[var(--color-eve-border)] bg-black/20 text-xs font-mono tracking-widest text-[var(--color-eve-accent)] eve-accent-glow uppercase">
    &gt; FILTER: {filterSummary}
  </div>

  <ul class="flex flex-col">
    {#each $searchResults?.kills ?? [] as k (k.killID)}
      {@const whale = k.totalValue >= 10_000_000_000}
      <li class="border-b border-[var(--color-eve-border)]"
          style={whale ? 'box-shadow: inset 3px 0 0 var(--color-whale-accent);' : ''}>
        <a href={`/kill/${k.killID}`} target="_blank" rel="noopener noreferrer"
          class="group grid grid-cols-1 md:grid-cols-12 gap-3 p-3 hover:bg-white/5 transition-colors items-center text-sm cursor-pointer block w-full">

          <!-- time + sec band -->
          <div class="md:col-span-2 flex flex-col gap-0.5">
            <span class="text-xs text-gray-500 tracking-widest">{formatTime(k.time)}</span>
            <span class="text-[10px] font-bold tracking-widest" style="color:{SEC_COLORS[k.space] ?? '#c9d1d9'}">
              {SEC_LABEL[k.space] ?? (k.space ?? '—').toUpperCase()}
            </span>
          </div>

          <!-- ship image + name + victim/corp -->
          <div class="md:col-span-5 flex items-center gap-3 min-w-0">
            <img src={`https://api.socketkill.com/render/ship/${k.shipID}?size=64`}
              alt="" loading="lazy" width="48" height="48"
              class="w-12 h-12 flex-shrink-0 bg-black border border-[var(--color-eve-border)] rounded-sm object-cover"
              onerror={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
            <div class="flex flex-col min-w-0">
              <span class="font-bold text-white group-hover:text-[var(--color-eve-accent)] transition-colors truncate">{shipName(k)}</span>
              <span class="text-xs text-gray-500 truncate flex items-center gap-1.5">
                {#if k.victimCorpID}
                  <img src={`https://api.socketkill.com/render/corp/${k.victimCorpID}?size=32`}
                    alt="" loading="lazy" width="16" height="16" class="w-4 h-4 flex-shrink-0"
                    onerror={(e) => { e.currentTarget.style.display = 'none' }} />
                {/if}
                <span class="truncate">{k.victimName ?? '—'} ({k.corpName ?? '—'})</span>
              </span>
            </div>
          </div>

          <!-- location -->
          <div class="md:col-span-3 flex flex-col min-w-0 text-xs">
            <span class="text-gray-400 truncate">{systemName(k)}</span>
            <span class="text-gray-600 truncate">{regionName(k)}</span>
          </div>

          <!-- value + attackers -->
          <div class="md:col-span-2 flex flex-col items-end text-right">
            <span class="font-bold" style="color:{valueColor(k.totalValue)}">{formatIsk(k.totalValue)}</span>
            <span class="text-[10px] text-gray-500 tracking-widest">{k.attackerCount} ATTACKERS</span>
          </div>

        </a>
      </li>
    {/each}

    {#if !$searchResults?.loading && $searchResults?.kills?.length === 0}
      <li class="p-8 text-center text-gray-500 text-sm tracking-widest uppercase">&gt; NO RESULTS &lt;</li>
    {/if}
  </ul>

  <footer class="bg-black/20 p-3 flex justify-between items-center text-sm tracking-widest text-gray-500 border-t border-[var(--color-eve-border)]">
    <button onclick={prevPage} disabled={!$searchResults?.hasPrev}
      class="border border-[var(--color-eve-border)] px-3 py-1 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:border-[var(--color-eve-border)] cursor-pointer disabled:cursor-not-allowed">
      &lt; NEWER
    </button>
    <span class="text-[var(--color-eve-accent)] eve-accent-glow">PAGE {$searchResults?.page ?? 1}</span>
    <button onclick={nextPage} disabled={!$searchResults?.hasMore}
      class="border border-[var(--color-eve-border)] px-3 py-1 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:border-[var(--color-eve-border)] cursor-pointer disabled:cursor-not-allowed">
      OLDER &gt;
    </button>
  </footer>
</section>