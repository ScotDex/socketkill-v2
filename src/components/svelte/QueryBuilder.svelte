<script>
  import { connectionStatus } from '../../lib/stats-store.js'
  import { searchFilters, searchResults } from '../../lib/search-store.js'

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
    { label: 'HS',   value: 'high' },
    { label: 'LS',   value: 'low' },
    { label: 'NULL', value: 'null' },
    { label: 'WH',   value: 'wh' },
    { label: 'POCH', value: 'pochven' },
  ]

  const SHIP_CLASSES = [
    { label: 'FRIG',    value: 25 },
    { label: 'DESTR',   value: 420 },
    { label: 'CRUISER', value: 26 },
    { label: 'BC',      value: 419 },
    { label: 'BS',      value: 27 },
    { label: 'INDY',    value: 28 },
    { label: 'CARR',    value: 547 },
    { label: 'DREAD',   value: 485 },
    { label: 'SUPER',   value: 659 },
    { label: 'TITAN',   value: 30 },
  ]

  const VALUE_PRESETS = [
    { label: 'ALL',   value: null },
    { label: '1B+',   value: 1_000_000_000 },
    { label: '5B+',   value: 5_000_000_000 },
    { label: '10B+',  value: 10_000_000_000 },
    { label: '100B+', value: 100_000_000_000 },
  ]

  function toggleSpace(value) {
    searchFilters.update(f => {
      const next = new Set(f.space)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...f, space: [...next] }
    })
  }

  function toggleShipGroup(value) {
    searchFilters.update(f => {
      const next = new Set(f.shipGroup)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...f, shipGroup: [...next] }
    })
  }

  function setMinIsk(value) {
    searchFilters.update(f => ({
      ...f,
      minIsk: f.minIsk === value ? null : value
    }))
  }

  function runQuery() {
    const params = new URLSearchParams()

    if ($searchFilters.space.length > 0) {
      params.set('space', $searchFilters.space.join(','))
    }

    if ($searchFilters.shipGroup.length > 0) {
      params.set('shipGroup', $searchFilters.shipGroup.join(','))
    }

    if ($searchFilters.minIsk != null) {
      params.set('minIsk', $searchFilters.minIsk)
    }

    if ($searchFilters.date) {
      params.set('date', $searchFilters.date)
    }

    window.open(`/search?${params.toString()}`, '_blank')
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
    <span class="text-[var(--color-neon-green)] font-mono text-sm tracking-widest">ARCHIVE SCANNER</span>
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

  <!-- SEC BAND -->
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

  <!-- SHIP CLASS — wired -->
  <div class="flex flex-col gap-2">
    <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
      SHIP CLASS
    </label>
    <div class="grid grid-cols-5 gap-1">
      {#each SHIP_CLASSES as ship}
        {@const active = $searchFilters.shipGroup.includes(ship.value)}
        <button
          type="button"
          onclick={() => toggleShipGroup(ship.value)}
          class="border px-1 py-1 font-mono text-[10px] text-center transition-colors
            {active
              ? 'border-[var(--color-neon-green)] bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)]'
              : 'border-[var(--color-border-dim)] text-[var(--color-neon-green)]/40 hover:text-[var(--color-neon-green)]/70 hover:border-[var(--color-neon-green)]/30'}"
        >
          {ship.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- MIN VALUE — wired -->
  <div class="flex flex-col gap-2">
    <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
      MIN VALUE
    </label>
    <div class="flex gap-1">
      {#each VALUE_PRESETS as preset}
        {@const active = $searchFilters.minIsk === preset.value}
        <button
          type="button"
          onclick={() => setMinIsk(preset.value)}
          class="flex-1 border px-1 py-1 font-mono text-[10px] text-center transition-colors
            {active
              ? 'border-[var(--color-neon-green)] bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)]'
              : 'border-[var(--color-border-dim)] text-[var(--color-neon-green)]/40 hover:text-[var(--color-neon-green)]/70 hover:border-[var(--color-neon-green)]/30'}"
        >
          {preset.label}
        </button>
      {/each}
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
      &gt; KILLMAIL STORE
    </div>
  </div>
</div>