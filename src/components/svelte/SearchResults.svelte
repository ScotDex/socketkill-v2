<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
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

  const shipName = (k) => {
    const hit = $filterSource.ships?.[k.shipID]?.name;
    if (!hit && $filterSource.loaded) console.warn('[SDE MISS] typeID', k.shipID);
    return hit ?? `Type ${k.shipID}`;
  };
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

  const SEC_COLORS = {
    high:    'var(--color-neon-green)',
    low:     'var(--color-whale-accent)',
    null:    'var(--color-isk-billion)',
    wh:      'var(--color-terminal-blue)',
    pochven: '#b07ce8'
  };
  const SEC_LABEL = { high:'HS', low:'LS', null:'NULL', wh:'WH', pochven:'POCH' };

  const valueColor = (v) =>
    v >= 10_000_000_000 ? 'var(--color-whale-accent)'
    : v >= 1_000_000_000 ? 'var(--color-isk-billion)'
    : 'var(--color-eve-accent)';
  const totalTween = new Tween(0, { duration: 600, easing: cubicOut });
  $effect(() => { totalTween.set($searchResults?.total ?? 0); });
  const shownTotal = $derived(Math.round(totalTween.current).toLocaleString());
</script>

<section class="sr mt-4">

  <header class="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-dim)]">
    <span class="font-mono text-[13px] tracking-[0.14em] text-[var(--color-neon-green)] glow">
      &gt; SEARCH RESULTS <span class="tabular-nums">[{shownTotal}]</span>
    </span>
    <span class="ui text-[10px] tracking-[0.14em]"
      class:text-[var(--color-whale-accent)]={$searchResults?.loading}
      class:text-[var(--color-isk-billion)]={$searchResults?.error}
      class:text-[var(--color-text-faint)]={!$searchResults?.loading && !$searchResults?.error}>
      {#if $searchResults?.loading}
        SCANNING WRECKAGE…
      {:else if $searchResults?.error}
        ERR: {$searchResults.error}
      {:else}
        SHOWING {$searchResults?.kills?.length ?? 0}
      {/if}
    </span>
  </header>

  <div class="readout px-3 py-2 border-b border-[var(--color-border-dim)]">
    <span class="text-[var(--color-neon-green)]">&gt;</span> filter: {filterSummary}
  </div>

  <ul class="flex flex-col" class:loading={$searchResults?.loading}>
    {#each $searchResults?.kills ?? [] as k, i (k.killID)}
      {@const whale = k.totalValue >= 10_000_000_000}
      <li in:fly={{ y: 6, duration: 150, delay: Math.min(i * 20, 300) }}
        class="border-b border-[var(--color-eve-border)]"
        style={whale ? 'box-shadow: inset 3px 0 0 var(--color-whale-accent); background: var(--color-whale);' : ''}>
        <a href={`/kill/${k.killID}`} target="_blank" rel="noopener noreferrer"
          class="group grid grid-cols-1 md:grid-cols-12 gap-3 p-3 hover:bg-white/5 transition-colors items-center text-sm cursor-pointer block w-full">

          <div class="md:col-span-2 flex flex-col gap-1">
            <span class="font-mono text-xs tabular-nums text-[var(--color-text-faint)]">{formatTime(k.time)}</span>
            <span class="sec-chip" style="--c:{SEC_COLORS[k.space] ?? 'var(--color-text-faint)'}">
              {SEC_LABEL[k.space] ?? (k.space ?? '—').toUpperCase()}
            </span>
          </div>

          <div class="md:col-span-5 flex items-center gap-3 min-w-0">
            <img src={`https://images.evetech.net/types/${k.shipID}/render?size=64`}
              alt="" loading="lazy" width="48" height="48"
              class="w-12 h-12 flex-shrink-0 bg-black border border-[var(--color-eve-border)] object-cover"
              onerror={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
            <div class="flex flex-col min-w-0">
              <span class="ui font-semibold text-[15px] text-[var(--color-text-body)] group-hover:text-[var(--color-neon-green)] transition-colors truncate">{shipName(k)}</span>
              <span class="ui text-xs text-[var(--color-text-faint)] truncate flex items-center gap-1.5">
                {#if k.victimCorpID}
                  <img src={`https://images.evetech.net/corporations/${k.victimCorpID}/logo?size=32`}
                    alt="" loading="lazy" width="16" height="16" class="w-4 h-4 flex-shrink-0"
                    onerror={(e) => { e.currentTarget.style.display = 'none' }} />
                {/if}
                <span class="truncate">{k.victimName ?? '—'} ({k.corpName ?? '—'})</span>
              </span>
            </div>
          </div>
          <div class="md:col-span-3 flex flex-col min-w-0 text-xs">
            <span class="ui text-[var(--color-text-body)]/70 truncate">{systemName(k)}</span>
            <span class="ui text-[var(--color-text-faint)]/60 truncate">{regionName(k)}</span>
          </div>
          <div class="md:col-span-2 flex flex-col items-end text-right">
            <span class="font-mono font-bold tabular-nums" style="color:{valueColor(k.totalValue)}">{formatIsk(k.totalValue)}</span>
            <span class="ui text-[10px] tracking-[0.12em] text-[var(--color-text-faint)] tabular-nums">{k.attackerCount} ATTACKERS</span>
          </div>

        </a>
      </li>
    {/each}

    {#if !$searchResults?.loading && $searchResults?.kills?.length === 0}
      <li class="ui p-8 text-center text-[var(--color-text-faint)] text-xs tracking-[0.2em] uppercase">&gt; no results &lt;</li>
    {/if}
  </ul>

  <footer class="flex justify-between items-center p-3 border-t border-[var(--color-border-dim)]">
    <button class="page-btn" onclick={prevPage} disabled={!$searchResults?.hasPrev}>&lt; NEWER</button>
    <span class="font-mono text-xs tracking-[0.18em] text-[var(--color-neon-green)] glow tabular-nums">PAGE {$searchResults?.page ?? 1}</span>
    <button class="page-btn" onclick={nextPage} disabled={!$searchResults?.hasMore}>OLDER &gt;</button>
  </footer>
</section>

