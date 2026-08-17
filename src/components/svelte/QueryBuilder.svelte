<script>
  import { onMount } from 'svelte'
  import { Tween } from 'svelte/motion'
  import { connectionStatus } from '../../lib/stats-store.js'
  import { searchFilters } from '../../lib/search-store.js'
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js'
  import ChipFacet from './ChipFacet.svelte'

  onMount(() => { if (!$filterSource.loaded) loadFilterSource() })

  const STATUS = {
    connecting: { color: 'var(--color-whale-accent)', text: 'CONNECTING', pulse: true },
    online:     { color: 'var(--color-neon-green)',   text: 'ONLINE',     pulse: false },
    offline:    { color: 'var(--color-isk-billion)',  text: 'OFFLINE',    pulse: false }
  }

  const SEC_BANDS = [
    { label: 'HS',   value: 'high',    color: 'var(--color-neon-green)' },
    { label: 'LS',   value: 'low',     color: 'var(--color-whale-accent)' },
    { label: 'NULL', value: 'null',    color: 'var(--color-isk-billion)' },
    { label: 'WH',   value: 'wh',      color: 'var(--color-terminal-blue)' },
    { label: 'POCH', value: 'pochven', color: 'var(--color-isk-billion)' }
  ]

  const VALUE_PRESETS = [
    { label: 'ANY',  value: null },
    { label: '100M', value: 100_000_000 },
    { label: '1B',   value: 1_000_000_000 },
    { label: '10B',  value: 10_000_000_000 }
  ]

  const systemNames = $derived($filterSource.loaded ? Object.values($filterSource.systems).map(s => s.name).sort() : [])
  const regionNames = $derived($filterSource.loaded ? Object.values($filterSource.regions).map(r => r.name).sort() : [])
  const groupNames  = $derived($filterSource.loaded ? Object.values($filterSource.groups).filter(g => g.categoryID === 6).map(g => g.name).sort() : [])

  let selectedGroups  = $state([])
  let selectedSystems = $state([])
  let selectedRegions = $state([])

  const setMinValue = (v) => searchFilters.update(f => ({ ...f, minIsk: v }))
  const toggleSolo  = () => searchFilters.update(f => ({ ...f, solo: !f.solo }))
  const toggleSpace = (v) => searchFilters.update(f => {
    const next = new Set(f.space)
    next.has(v) ? next.delete(v) : next.add(v)
    return { ...f, space: [...next] }
  })
  function setNum(key, e) {
    const v = e.target.value === '' ? null : Number(e.target.value)
    searchFilters.update(f => ({ ...f, [key]: v }))
  }

  function namesToIDs(map, names) {
    const out = []
    for (const [id, v] of Object.entries(map)) if (names.includes(v.name)) out.push(Number(id))
    return out
  }
  const queryString = $derived.by(() => {
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

    return params.toString()
  })
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const target = $derived(`/search${queryString ? '?' + queryString : ''}`)
  const t = new Tween(1, { duration: 0 })

  $effect(() => {
    const dur = reduceMotion ? 0 : Math.min(400, target.length * 4)
    t.set(0, { duration: 0 }).then(() => t.set(1, { duration: dur }))
  })

  const typed = $derived(target.slice(0, Math.ceil(t.current * target.length)))

  const runQuery = () => window.open(`/search?${queryString}`, '_blank')
</script>

<aside class="qb lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">

  <header class="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-dim)]">
    <span class="font-mono text-[13px] tracking-[0.14em] text-[var(--color-neon-green)] glow">&gt; SEARCH KILLMAILS</span>
    <span class="ui flex items-center gap-1.5 text-[10px] tracking-[0.14em]"
      style="color:{STATUS[$connectionStatus].color}">
      <span class="status-dot" class:pulse={STATUS[$connectionStatus].pulse}
        style="background:{STATUS[$connectionStatus].color}"></span>
      {STATUS[$connectionStatus].text}
    </span>
  </header>

  <div class="flex flex-col gap-6 p-3 pt-4">

    <section class="flex flex-col gap-1.5">
      <span class="lbl">sec status</span>
      <div class="flex gap-px bg-[var(--color-eve-border)] p-px">
        {#each SEC_BANDS as band}
          <button type="button" class="seg" class:on={$searchFilters.space.includes(band.value)}
            style="--seg-c:{band.color}" onclick={() => toggleSpace(band.value)}>
            {band.label}
          </button>
        {/each}
      </div>
    </section>

    <section class="flex flex-col gap-1.5">
      <span class="lbl">value threshold <span class="lbl-unit">isk</span></span>
      <div class="flex gap-px bg-[var(--color-eve-border)] p-px">
        {#each VALUE_PRESETS as p}
          <button type="button" class="seg" class:on={($searchFilters.minIsk ?? null) === p.value}
            style="--seg-c:var(--color-whale-accent)" onclick={() => setMinValue(p.value)}>
            {p.label}
          </button>
        {/each}
      </div>
    </section>

    <ChipFacet label="HULL"         bind:items={selectedGroups}  suggestions={groupNames}  placeholder="HULL CLASS" maxItems={5} />
    <ChipFacet label="SOLAR SYSTEM" bind:items={selectedSystems} suggestions={systemNames} placeholder="ADD SYSTEM" maxItems={5} />
    <ChipFacet label="REGION"       bind:items={selectedRegions} suggestions={regionNames} placeholder="ADD REGION" maxItems={3} />

    <section class="flex flex-col gap-1.5">
      <span class="lbl">attackers</span>
      <div class="flex items-end gap-3">
        <input class="field" type="number" min="0" placeholder="MIN"
          value={$searchFilters.minAttackers ?? ''} oninput={(e) => setNum('minAttackers', e)} />
        <span class="text-[var(--color-text-faint)] text-[11px] pb-1.5">—</span>
        <input class="field" type="number" min="0" placeholder="MAX"
          value={$searchFilters.maxAttackers ?? ''} oninput={(e) => setNum('maxAttackers', e)} />
      </div>
      <button type="button" class="seg solo" class:on={$searchFilters.solo} onclick={toggleSolo}>
        {$searchFilters.solo ? '◉' : '○'}&nbsp; SOLO KILLS ONLY
      </button>
    </section>

  </div>

  <footer class="flex flex-col gap-2.5 p-3 pt-2.5 border-t border-[var(--color-border-dim)]">
    <div class="readout" aria-live="polite">
      <span class="text-[var(--color-neon-green)]">&gt;</span> {typed}<span class="caret">█</span>
    </div>
    <button type="button" class="run" onclick={runQuery}>View results ↗</button>
  </footer>

</aside>

