<script>
  import { searchFilters, searchResults, runSearch } from '../../lib/search-store.js';

  let filters = $state();
  let results = $state();

  $effect(() => {
    const unsubF = searchFilters.subscribe(v => filters = v);
    const unsubR = searchResults.subscribe(v => results = v);
    return () => { unsubF(); unsubR(); };
  });

  function nextPage() { runSearch(filters, results.page + 1); }
  function prevPage() { runSearch(filters, results.page - 1); }

  function formatTime(iso) {
    return new Date(iso).toISOString().slice(11, 19);
  }
</script>

<section class="search-results">
  <header class="results-header">
    <span>Results: {results?.total ?? 0}</span>
    <span class="status">
      {#if results?.loading}Loading…
      {:else if results?.error}Error: {results.error}
      {:else}Showing {results?.kills?.length ?? 0} of {results?.total ?? 0}
      {/if}
    </span>
  </header>

  <ul class="kill-list">
    {#each results?.kills ?? [] as k (k.killID)}
      <li class="row">
        <span class="col time">{formatTime(k.time)}</span>
        <span class="col victim">
          <a href={`/kill/${k.killID}`}>{k.victim.ship}</a>
          <span class="muted">{k.victim.name} ({k.victim.corp})</span>
        </span>
        <span class="col system">{k.system.name} <span class="muted">/ {k.system.region}</span></span>
        <span class="col attackers">{k.attackerCount}</span>
        <span class="col isk">{k.formattedValue}</span>
      </li>
    {/each}
    {#if !results?.loading && results?.kills?.length === 0}
      <li class="empty">No kills match these filters.</li>
    {/if}
  </ul>

  <footer class="pagination">
    <button onclick={prevPage} disabled={!results?.hasPrev}>← Newer</button>
    <span>Page {results?.page ?? 1}</span>
    <button onclick={nextPage} disabled={!results?.hasMore}>Older →</button>
  </footer>
</section>

<style>
  .search-results { padding: 1rem; }
  .results-header { display: flex; justify-content: space-between; font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.75rem; }
  .kill-list { list-style: none; padding: 0; margin: 0; }
  .row { display: grid; grid-template-columns: 80px 1.5fr 1.2fr 80px 140px; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.9rem; }
  .col.attackers, .col.isk { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { opacity: 0.5; font-size: 0.85em; margin-left: 0.5rem; }
  .empty { padding: 2rem; text-align: center; opacity: 0.5; }
  .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); }
  button { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: inherit; padding: 0.4rem 0.9rem; cursor: pointer; }
  button:disabled { opacity: 0.3; cursor: not-allowed; }
  @media (max-width: 768px) {
    .row { grid-template-columns: 1fr 80px; }
    .col.time, .col.system, .col.attackers { display: none; }
  }
</style>