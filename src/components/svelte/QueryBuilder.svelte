<script>
  import { onMount } from 'svelte'
  import { connectionStatus } from '../../lib/stats-store.js'
  import { searchFilters } from '../../lib/search-store.js'
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js'
  import ChipFacet from './ChipFacet.svelte'

  onMount(() => { if (!$filterSource.loaded) loadFilterSource() })

  const STATUS = {
    connecting: { color: 'var(--qb-amber)', text: 'CONNECTING', pulse: true },
    online:     { color: 'var(--qb-green)', text: 'ONLINE',     pulse: false },
    offline:    { color: 'var(--qb-red)',   text: 'OFFLINE',    pulse: false }
  }

  const SEC_BANDS = [
    { label: 'HS',   value: 'high',    color: '#3fb950' },
    { label: 'LS',   value: 'low',     color: '#f0a73a' },
    { label: 'NULL', value: 'null',    color: '#ff6b6b' },
    { label: 'WH',   value: 'wh',      color: '#58a6ff' },
    { label: 'POCH', value: 'pochven', color: '#b07ce8' }
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

  // Live query string — drives both the readout and the results button
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

  const runQuery = () => window.open(`/search?${queryString}`, '_blank')
</script>

<aside class="qb font-mono lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">

  <!-- Header: title + socket status -->
  <header class="flex items-center justify-between px-3 py-2.5 border-b border-[var(--qb-line)]">
    <span class="text-[13px] tracking-[0.18em] text-[var(--qb-green)]">&gt; SEARCH KILLMAILS</span>
    <span class="flex items-center gap-1.5 text-[10px] tracking-[0.14em]"
      style="color:{STATUS[$connectionStatus].color}">
      <span class="status-dot" class:pulse={STATUS[$connectionStatus].pulse}
        style="background:{STATUS[$connectionStatus].color}"></span>
      {STATUS[$connectionStatus].text}
    </span>
  </header>

  <div class="flex flex-col gap-6 p-3 pt-4">

    <!-- Sec status -->
    <section class="flex flex-col gap-1.5">
      <span class="lbl">// sec status</span>
      <div class="flex gap-px bg-[var(--qb-line)] p-px">
        {#each SEC_BANDS as band}
          <button type="button" class="seg" class:on={$searchFilters.space.includes(band.value)}
            style="--seg-c:{band.color}" onclick={() => toggleSpace(band.value)}>
            {band.label}
          </button>
        {/each}
      </div>
    </section>

    <!-- Value threshold -->
    <section class="flex flex-col gap-1.5">
      <span class="lbl">// value threshold <span class="lbl-unit">isk</span></span>
      <div class="flex gap-px bg-[var(--qb-line)] p-px">
        {#each VALUE_PRESETS as p}
          <button type="button" class="seg" class:on={($searchFilters.minIsk ?? null) === p.value}
            style="--seg-c:var(--qb-amber)" onclick={() => setMinValue(p.value)}>
            {p.label}
          </button>
        {/each}
      </div>
    </section>

    <ChipFacet label="HULL"         bind:items={selectedGroups}  suggestions={groupNames}  placeholder="HULL CLASS" maxItems={5} />
    <ChipFacet label="SOLAR SYSTEM" bind:items={selectedSystems} suggestions={systemNames} placeholder="ADD SYSTEM" maxItems={5} />
    <ChipFacet label="REGION"       bind:items={selectedRegions} suggestions={regionNames} placeholder="ADD REGION" maxItems={3} />

    <!-- Attackers -->
    <section class="flex flex-col gap-1.5">
      <span class="lbl">// attackers</span>
      <div class="flex items-end gap-3">
        <input class="field" type="number" min="0" placeholder="MIN"
          value={$searchFilters.minAttackers ?? ''} oninput={(e) => setNum('minAttackers', e)} />
        <span class="text-[var(--qb-ink)] text-[11px] pb-1.5">—</span>
        <input class="field" type="number" min="0" placeholder="MAX"
          value={$searchFilters.maxAttackers ?? ''} oninput={(e) => setNum('maxAttackers', e)} />
      </div>
      <button type="button" class="seg solo" class:on={$searchFilters.solo} onclick={toggleSolo}>
        {$searchFilters.solo ? '◉' : '○'}&nbsp; SOLO KILLS ONLY
      </button>
    </section>

  </div>

  <!-- Footer: live query readout + run -->
  <footer class="flex flex-col gap-2.5 p-3 pt-2.5 border-t border-[var(--qb-line)]">
    <div class="readout" aria-live="polite">
      <span class="text-[var(--qb-green)]">&gt;</span> /search{queryString ? `?${queryString}` : ''}<span class="caret">█</span>
    </div>
    <button type="button" class="run" onclick={runQuery}>View results ↗</button>
  </footer>

</aside>

<style>
  .qb {
    --qb-green: #3ef08b;
    --qb-green-dim: rgba(62, 240, 139, 0.38);
    --qb-amber: #f0a73a;
    --qb-red: #ff5d5d;
    --qb-ink: #93a89b;
    --qb-line: rgba(62, 240, 139, 0.12);
    --qb-well: rgba(255, 255, 255, 0.03);

    background:
      linear-gradient(180deg, rgba(62, 240, 139, 0.04), transparent 56px),
      #0b100d;
    border: 1px solid var(--qb-line);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  }

  /* ---- labels ---- */
  .lbl {
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--qb-green-dim);
    user-select: none;
  }
  .lbl-unit { color: var(--qb-ink); opacity: 0.6; letter-spacing: 0.14em; }

  /* ---- segmented buttons ---- */
  .seg {
    flex: 1;
    padding: 0.45rem 0.25rem;
    font: inherit;
    font-size: 12.5px;
    color: var(--qb-ink);
    background: #0e1410;
    border: 0;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s, background 0.15s, border-color 0.15s, text-shadow 0.15s;
  }
  .seg:hover { color: #cfe5d6; background: #121a15; }
  .seg.on {
    --c: var(--seg-c, var(--qb-green));
    color: var(--c);
    border-bottom-color: var(--c);
    background: color-mix(in srgb, var(--c) 9%, #0e1410);
    text-shadow: 0 0 8px color-mix(in srgb, var(--c) 55%, transparent);
  }
  .seg.solo { letter-spacing: 0.14em; font-size: 11.5px; --seg-c: var(--qb-green); }

  /* ---- inputs ---- */
  .field {
    width: 100%;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--qb-line);
    color: var(--qb-green);
    font: inherit;
    font-size: 13px;
    padding: 0.35rem 0.1rem;
    outline: 0;
    transition: border-color 0.15s;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .field::-webkit-outer-spin-button,
  .field::-webkit-inner-spin-button { -webkit-appearance: none; }
  .field:focus { border-bottom-color: var(--qb-green); }
  .field::placeholder { color: rgba(147, 168, 155, 0.4); letter-spacing: 0.1em; font-size: 11px; }

  /* ---- footer ---- */
  .readout {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--qb-ink);
    word-break: break-all;
    min-height: 2.6em;
  }
  .caret { color: var(--qb-green); animation: blink 1.1s steps(2) infinite; }

  .run {
    font: inherit;
    font-size: 12px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--qb-green);
    background: rgba(62, 240, 139, 0.08);
    border: 1px solid var(--qb-green);
    padding: 0.6rem;
    cursor: pointer;
    box-shadow: 0 0 14px rgba(62, 240, 139, 0.14), inset 0 0 14px rgba(62, 240, 139, 0.05);
    transition: background 0.15s, box-shadow 0.15s;
  }
  .run:hover {
    background: rgba(62, 240, 139, 0.16);
    box-shadow: 0 0 22px rgba(62, 240, 139, 0.3), inset 0 0 18px rgba(62, 240, 139, 0.1);
  }

  /* ---- status ---- */
  .status-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }
  .status-dot.pulse { animation: blink 1s steps(2) infinite; }

  /* ---- a11y ---- */
  .seg:focus-visible, .run:focus-visible, .field:focus-visible {
    outline: 1px solid var(--qb-green);
    outline-offset: 2px;
  }
  @keyframes blink { 50% { opacity: 0.15; } }
  @media (prefers-reduced-motion: reduce) {
    .caret, .status-dot.pulse { animation: none; }
  }
</style>