<script>
  import { onMount } from 'svelte'
  import { connectionStatus } from '../../lib/stats-store.js'
  import { searchFilters } from '../../lib/search-store.js'
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js'
  import ChipFacet from './ChipFacet.svelte'

  onMount(() => { if (!$filterSource.loaded) loadFilterSource() })

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
    { label: 'HS',   value: 'high',    color: '#3fb950' },
    { label: 'LS',   value: 'low',     color: '#f39c12' },
    { label: 'NULL', value: 'null',    color: '#ff6b6b' },
    { label: 'WH',   value: 'wh',      color: '#58a6ff' },
    { label: 'POCH', value: 'pochven', color: '#9b59b6' },
  ]

  const VALUE_PRESETS = [
    { label: 'ANY',  value: null },
    { label: '100M', value: 100_000_000 },
    { label: '1B',   value: 1_000_000_000 },
    { label: '10B',  value: 10_000_000_000 },
  ]

  const systemNames = $derived($filterSource.loaded ? Object.values($filterSource.systems).map(s => s.name).sort() : [])
  const regionNames = $derived($filterSource.loaded ? Object.values($filterSource.regions).map(r => r.name).sort() : [])
  const groupNames  = $derived($filterSource.loaded ? Object.values($filterSource.groups).map(g => g.name).sort()  : [])

  let selectedGroups  = $state([])
  let selectedSystems = $state([])
  let selectedRegions = $state([])

  const setMinValue = (v) => searchFilters.update(f => ({ ...f, minIsk: v }))
  const toggleSolo  = () => searchFilters.update(f => ({ ...f, solo: !f.solo }))
  function setNum(key, e) {
    const v = e.target.value === '' ? null : Number(e.target.value)
    searchFilters.update(f => ({ ...f, [key]: v }))
  }

  function namesToIDs(map, names) {
    const out = []
    for (const [id, v] of Object.entries(map)) if (names.includes(v.name)) out.push(Number(id))
    return out
  }

  function runQuery() {
    const f = $searchFilters
    const src = $filterSource
    const params = new URLSearchParams()

    if (f.space.length) params.set('space', f.space.join(','))

    const groupIDs  = namesToIDs(src.groups,  selectedGroups)
    const systemIDs = namesToIDs(src.systems, selectedSystems)
    const regionIDs = namesToIDs(src.regions, selectedRegions)
    if (groupIDs.length)  params.set('shipGroup', groupIDs.join(','))
    if (systemIDs.length) params.set('system', systemIDs.join(','))
    if (regionIDs.length) params.set('region', regionIDs.join(','))

    if (f.minIsk != null)       params.set('minValue', f.minIsk)
    if (f.maxIsk != null)       params.set('maxValue', f.maxIsk)
    if (f.minAttackers != null) params.set('minAttackers', f.minAttackers)
    if (f.maxAttackers != null) params.set('maxAttackers', f.maxAttackers)
    if (f.solo)                 params.set('solo', 'true')

    window.open(`/search?${params}`, '_blank')
  }

  const labelCls = 'font-mono text-sm tracking-widest uppercase text-[var(--color-neon-green)]/70'
  const btnActive = 'border-[var(--color-neon-green)] bg-[var(--color-neon-green)]/10 text-[var(--color-neon-green)]'
  const btnIdle = 'border-[var(--color-border-dim)] text-[var(--color-neon-green)]/40 hover:text-[var(--color-neon-green)]/70 hover:border-[var(--color-neon-green)]/30'
</script>

<div class="query-builder border border-[var(--color-border-dim)] bg-black/60 rounded-sm p-3 flex flex-col gap-4 lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">

  <div class="flex items-center justify-between pb-2 border-b border-[var(--color-border-dim)]">
    <span class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/50">UPLINK</span>
    <span class="font-mono text-sm {statusClasses[$connectionStatus]}">{statusText[$connectionStatus]}</span>
  </div>

  <div class="flex items-center gap-2 pb-2 border-b border-[var(--color-border-dim)]">
    <span class="text-[var(--color-neon-green)] text-sm">&gt;</span>
    <span class="text-[var(--color-neon-green)] font-mono text-sm tracking-widest">RUN A QUERY</span>
  </div>

  <div class="flex flex-col gap-2">
    <label class={labelCls}>SEC STATUS</label>
    <div class="flex gap-1">
      {#each SEC_BANDS as band}
        {@const active = $searchFilters.space.includes(band.value)}
        <button type="button"
          onclick={() => searchFilters.update(f => {
            const next = new Set(f.space)
            next.has(band.value) ? next.delete(band.value) : next.add(band.value)
            return { ...f, space: [...next] }
          })}
          class="flex-1 border px-2 py-1 font-mono text-sm text-center transition-colors"
          style="border-color:{active ? band.color : 'var(--color-border-dim)'};
                 color:{active ? band.color : 'rgba(255,255,255,0.4)'};
                 background:{active ? band.color + '1a' : 'transparent'};">
          {band.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <label class={labelCls}>VALUE</label>
    <div class="flex gap-1">
      {#each VALUE_PRESETS as p}
        {@const active = ($searchFilters.minIsk ?? null) === p.value}
        <button type="button" onclick={() => setMinValue(p.value)}
          class="flex-1 border px-2 py-1 font-mono text-sm transition-colors {active ? btnActive : btnIdle}">
          {p.label}
        </button>
      {/each}
    </div>
  </div>

  <ChipFacet label="HULL" bind:items={selectedGroups}  suggestions={groupNames}  placeholder="HULL CLASS" maxItems={5} />
  <ChipFacet label="SYSTEM"     bind:items={selectedSystems} suggestions={systemNames} placeholder="ADD SYSTEM"     maxItems={5} />
  <ChipFacet label="REGION"     bind:items={selectedRegions} suggestions={regionNames} placeholder="ADD REGION"     maxItems={3} />

  <div class="flex flex-col gap-2">
    <label class={labelCls}>ATTACKERS</label>
    <div class="flex gap-1">
      <input type="number" min="0" placeholder="MIN" value={$searchFilters.minAttackers ?? ''} oninput={(e) => setNum('minAttackers', e)}
        class="w-full bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)] font-mono text-sm px-2 py-1 outline-none focus:border-[var(--color-border-bright)] placeholder:text-[var(--color-neon-green)]/30" />
      <input type="number" min="0" placeholder="MAX" value={$searchFilters.maxAttackers ?? ''} oninput={(e) => setNum('maxAttackers', e)}
        class="w-full bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)] font-mono text-sm px-2 py-1 outline-none focus:border-[var(--color-border-bright)] placeholder:text-[var(--color-neon-green)]/30" />
    </div>
    <button type="button" onclick={toggleSolo}
      class="border px-2 py-1 font-mono text-sm tracking-widest uppercase transition-colors {$searchFilters.solo ? btnActive : btnIdle}">
      SOLO {$searchFilters.solo ? '◉' : '○'}
    </button>
  </div>

  <div class="mt-auto pt-2 border-t border-[var(--color-border-dim)] flex flex-col gap-2">
    <button type="button" onclick={runQuery}
      class="border border-[var(--color-neon-green)] bg-[var(--color-neon-green)]/10 hover:bg-[var(--color-neon-green)]/20 text-[var(--color-neon-green)] font-mono text-sm tracking-widest uppercase py-2 transition-colors">
      &gt; EXECUTE QUERY
    </button>
    <div class="font-mono text-xs tracking-widest text-[var(--color-neon-green)]/40 uppercase"></div>
  </div>
</div>