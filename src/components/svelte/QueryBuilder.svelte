<script>
  import { connectionStatus } from '../../lib/stats-store.js'
  import { searchFilters, searchResults, runSearch } from '../../lib/search-store.js'

  const statusClasses = {
    connecting: 'text-red-400',
    online: 'text-[var(--color-neon-green)]',
    offline: 'text-yellow-400'
  }

  const statusText = {
    connecting: '● CONNECTING...',
    online: '● ONLINE',
    offline: '● OFFLINE'
  }

  const SEC_BANDS = [
    { label: 'HI',   value: 'high' },
    { label: 'LO',   value: 'low' },
    { label: 'NUL',  value: 'null' },
    { label: 'WH',   value: 'wh' },
    { label: 'POCH', value: 'pochven' },
  ]

  function toggleSpace(value) {
    searchFilters.update(f => {
      const next = new Set(f.space)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...f, space: [...next] }
    })
  }

  function runQuery() {
    if (window.location.pathname !== '/search') {
      // 1. Serialize active parameters to survive the Astro page load
      const params = new URLSearchParams()
      
      if ($searchFilters.space.length > 0) {
        params.set('space', $searchFilters.space.join(','))
      }
      
      if ($searchFilters.date) {
        params.set('date', $searchFilters.date)
      }

      // Add future filter serializations here (shipType, region, etc.) as you wire them.

      // 2. Force hard browser navigation
      window.location.href = `/search?${params.toString()}`
    } else {
      // 3. Already on the Search route, execute native store update
      runSearch($searchFilters, 1)
    }
  }
</script>

<div class="query-builder border border-[var(--color-border-dim)] bg-black/60 rounded-sm p-3 flex flex-col gap-4 lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">

  <div class="flex items-center justify-between pb-2 border-b border-[var(--color-border-dim)]">
    <span class="font-mono text-[10px] tracking-widest uppercase text-[var(--color-neon-green)]/50">UPLINK</span>
    <span class="font-mono text-xs {statusClasses[$connectionStatus]}">
      {statusText[$connectionStatus]}
    </span>
  </div>

  <div class="flex items-center gap-2 pb-2 border-b border-[var(--color-border-dim)]">
    <span class="text-[var(--color-neon-green)] text-xs">&gt;</span>
    <span class="text-[var(--color-neon-green)] font-mono text-sm tracking-widest">QUERY BUILDER</span>
  </div>

  <!-- DATE RANGE — placeholder, wire later -->
  <div class="flex flex-col gap-2 opacity-40">
    <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
      DATE RANGE
    </label>
    <div class="border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-[var(--color-neon-green)]/40">
      TODAY (UTC)
    </div>
  </div>

  <!-- SEC BAND — wired -->
  <div class="flex flex-col gap-2">
    <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
      SEC BAND
    </label>
    <div class="flex gap-1">
      {#each SEC_BANDS as band}
        {@const active = $searchFilters.space.includes(band.value)}
        <button
          type="button"
          onclick={() => toggleSpace(band.value)}
          class="flex-1 border px-2 py-1 font-mono text-xs text-center transition-colors
            {active
              ? 'border-[var(--color-neon-green)] bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)]'
              : 'border-[var(--color-border-dim)] text-[var(--color-neon-green)]/40 hover:text-[var(--color-neon-green)]/70 hover:border-[var(--color-neon-green)]/30'}"
        >
          {band.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- SHIP CLASS — placeholder, wire later -->
  <div class="flex flex-col gap-2 opacity-40">
    <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
      SHIP CLASS
    </label>
    <div class="border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-[var(--color-neon-green)]/40 italic">
      SELECT CLASS
    </div>
  </div>

  <!-- EXECUTE / FOOTER -->
  <div class="mt-auto pt-2 border-t border-[var(--color-border-dim)] flex flex-col gap-2">
    <button
      type="button"
      onclick={runQuery}
      disabled={$searchResults.loading}
      class="border border-[var(--color-neon-green)] bg-[var(--color-neon-green)]/10 hover:bg-[var(--color-neon-green)]/20 text-[var(--color-neon-green)] font-mono text-xs tracking-widest uppercase py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {$searchResults.loading ? 'QUERYING...' : '> EXECUTE QUERY'}
    </button>
    <div class="font-mono text-[10px] tracking-widest text-[var(--color-neon-green)]/40 uppercase">
      &gt; HISTORICAL ARCHIVE
    </div>
  </div>
</div>