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

  <ul class="flex flex-col">
    {#each $searchResults?.kills ?? [] as k (k.killID)}
      <li class="border-b border-[var(--color-eve-border)]">
        <a href={`/kill/${k.killID}`} target="_blank" rel="noopener noreferrer"
          class="group grid grid-cols-1 md:grid-cols-12 gap-3 p-3 hover:bg-white/5 transition-colors items-center text-sm cursor-pointer block w-full">

          <div class="md:col-span-2 text-xs text-gray-500 tracking-widest">{formatTime(k.time)}</div>

          <div class="md:col-span-5 flex flex-col min-w-0">
            <span class="font-bold text-white group-hover:text-[var(--color-eve-accent)] transition-colors truncate">{shipName(k)}</span>
            <span class="text-xs text-gray-500 truncate">{k.victimName ?? '—'} ({k.corpName ?? '—'})</span>
          </div>

          <div class="md:col-span-3 text-xs text-gray-400 truncate">
            {systemName(k)} <span class="text-gray-600">/ {regionName(k)}</span>
          </div>

          <div class="md:col-span-2 flex flex-col items-end text-right">
            <span class="text-[var(--color-eve-accent)] eve-accent-glow font-bold">{formatIsk(k.totalValue)}</span>
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