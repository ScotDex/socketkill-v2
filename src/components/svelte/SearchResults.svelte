<script>
  import { onMount } from 'svelte';
  import { searchFilters, searchResults, runSearch } from '../../lib/search-store.js';
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js';
  import { formatIsk } from '../../lib/filter-logic.js';

  onMount(() => {
    loadFilterSource();
    const params = new URLSearchParams(window.location.search);
    if (params.has('space')) searchFilters.update(f => ({ ...f, space: params.get('space').split(',') }));
    if (params.has('date'))  searchFilters.update(f => ({ ...f, date: params.get('date') }));
    runSearch($searchFilters, 1);
  });

  function nextPage() { runSearch($searchFilters, $searchResults.page + 1); }
  function prevPage() { runSearch($searchFilters, $searchResults.page - 1); }
  function formatTime(iso) { return iso ? new Date(iso).toISOString().slice(11, 19) : ''; }

  const shipName   = (k) => $filterSource.ships?.[k.shipID]?.name   ?? `Ship ${k.shipID}`;
  const systemName = (k) => $filterSource.systems?.[k.systemID]?.name ?? `Sys ${k.systemID}`;
  const regionName = (k) => $filterSource.regions?.[k.regionID]?.name ?? '';
</script>

<section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden font-mono mt-4">
  
  <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] flex justify-between items-center text-xs tracking-widest text-gray-400 uppercase">
    <span class="eve-card-title">RESULTS LOGGED: {$searchResults?.total ?? 0}</span>
    <span class="text-[var(--color-eve-accent)] eve-accent-glow">
      {#if $searchResults?.loading}
        > SCANNING WRECKAGE...
      {:else if $searchResults?.error}
        > ERR: {$searchResults.error}
      {:else}
        > SHOWING {$searchResults?.kills?.length ?? 0}
      {/if}
    </span>
  </header>

  <ul class="flex flex-col">
    {#each $searchResults?.kills ?? [] as k (k.killID)}
      <li class="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border-b border-[var(--color-eve-border)] hover:bg-white/5 transition-colors items-center text-sm">
        
        <div class="md:col-span-2 text-xs text-gray-500 tracking-widest">
          {formatTime(k.time)}
        </div>

        <div class="md:col-span-5 flex flex-col min-w-0">
          <a href={`/kill/${k.killID}`} class="font-bold text-white hover:text-[var(--color-eve-accent)] transition-colors truncate">
            {k.shipName || k.ship}
          </a>
          <span class="text-xs text-gray-500 truncate">{k.victimName} ({k.corpName})</span>
        </div>

        <div class="md:col-span-3 text-xs text-gray-400 truncate">
          {k.locationLabel}
        </div>

        <div class="md:col-span-2 flex flex-col items-end text-right">
          <span class="text-[var(--color-eve-accent)] eve-accent-glow font-bold">{k.formattedValue}</span>
          <span class="text-[10px] text-gray-500 tracking-widest">{k.attackerCount} ATTACKERS</span>
        </div>
        
      </li>
    {/each}
    
    {#if !$searchResults?.loading && $searchResults?.kills?.length === 0}
      <li class="p-8 text-center text-gray-500 text-xs tracking-widest uppercase">
        &gt; NO WRECKAGE MATCHES QUERY &lt;
      </li>
    {/if}
  </ul>

  <footer class="bg-black/20 p-3 flex justify-between items-center text-xs tracking-widest text-gray-500 border-t border-[var(--color-eve-border)]">
    <button 
      onclick={prevPage} 
      disabled={!$searchResults?.hasPrev}
      class="border border-[var(--color-eve-border)] px-3 py-1 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:border-[var(--color-eve-border)] cursor-pointer disabled:cursor-not-allowed">
      &lt; NEWER
    </button>
    
    <span class="text-[var(--color-eve-accent)] eve-accent-glow">
      PAGE {$searchResults?.page ?? 1}
    </span>
    
    <button 
      onclick={nextPage} 
      disabled={!$searchResults?.hasMore}
      class="border border-[var(--color-eve-border)] px-3 py-1 hover:text-white hover:border-white transition-colors disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:border-[var(--color-eve-border)] cursor-pointer disabled:cursor-not-allowed">
      OLDER &gt;
    </button>
  </footer>
</section>