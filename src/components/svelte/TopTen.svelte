<script>
  import { onMount } from 'svelte';
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js';
  import { formatIsk } from '../../lib/filter-logic.js';
 
  // --- Reactive States ---
  let data = $state(null);
  let error = $state(null);
  let loading = $state(true);
  let dictionaryLoaded = $state(false);

  // --- Derived State (Svelte 5 Performance Optimization) ---
  // Ensures lists do not calculate recalculation loops on random UI re-renders
  let initialized = $derived(!!data && $filterSource && dictionaryLoaded);

  // --- Decoupled Data Fetching ---
  async function fetchMetrics() {
    try {
      const res = await fetch('https://ws.socketkill.com/api/top10');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      error = null;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Pipeline initialization: Hydrate dictionary first, then kick off polling loop
    let intervalId;
    
    Promise.resolve(loadFilterSource())
      .then(() => {
        dictionaryLoaded = true;
        return fetchMetrics();
      })
      .then(() => {
        intervalId = setInterval(fetchMetrics, 60_000);
      })
      .catch((e) => {
        error = `Initialization failed: ${e.message}`;
        loading = false;
      });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });

  // --- Safe Mapping Lookups ---
  const shipName   = (id) => $filterSource?.ships?.[id]?.name   ?? `Type ${id}`;
  const groupName  = (id) => $filterSource?.groups?.[id]?.name  ?? `Group ${id}`;
  const systemName = (id) => $filterSource?.systems?.[id]?.name ?? `Sys ${id}`;
  const regionName = (id) => $filterSource?.regions?.[id]?.name ?? `Region ${id}`;
  const itemName   = (id) => $filterSource?.items?.[id]?.name   ?? `Type ${id}`;
</script>

{#snippet metricCard(title, items, labelFn, variantClass = "text-[var(--color-eve-accent)] eve-accent-glow")}
  <section class="fade-card flex flex-col bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden h-full">
    <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest {variantClass} uppercase">
      {title}
    </header>
    <div class="flex-1 overflow-y-auto">
      {@render rankList(items || [], labelFn)}
    </div>
  </section>
{/snippet}

{#snippet rankList(items, labelFn)}
  {@const max = Math.max(...items.map(i => i.count), 1)}
  <ol class="flex flex-col h-full">
    {#each items as item, i (item.id + '-' + i)}
      <li class="relative flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-eve-border)] last:border-b-0 text-sm font-mono overflow-hidden group hover:bg-white/5 transition-colors">
        <span class="absolute inset-y-0 left-0 bg-[var(--color-neon-green)]/5 transition-all duration-300" style="width: {item.count / max * 100}%"></span>
        <span class="relative w-5 text-[var(--color-neon-green)]/40 text-xs tabular-nums">{i + 1}</span>
        <span class="relative flex-1 truncate text-gray-300 group-hover:text-white transition-colors">{labelFn(item)}</span>
        <span class="relative text-[var(--color-neon-green)] font-bold tabular-nums ml-auto">{item.count}</span>
      </li>
    {:else}
      <li class="px-3 py-4 text-sm text-white/20 uppercase tracking-wider text-center">No Activity Recorded</li>
    {/each}
  </ol>
{/snippet}

<div class="min-h-screen bg-eve-dark font-body text-text-body max-w-7xl mx-auto lg:p-6 space-y-6 select-none relative">
  <header class="flex flex-col sm:flex-row items-start sm:items-baseline justify-between border-b border-border-dim pb-4 gap-2">
    <div class="space-y-1">
      <h1 class="text-neon-green font-mono tracking-widest text-2xl font bold">TOP 10 // LAST HOUR</h1>
      <p class="text-[10px] font-mono tracking-wider text-text-faint uppercase">Rolling 1h window ·  auto-refreshes every 60s</p>
    </div>
    {#if data}
      <div class="text-right">
        <span class="text-sm font-mono tracking-widest text-text-body bg-feed-bg border border-border-dim px-2 py-1 rounded-xs uppercase font-semibold">
          {data.sampleSize.toLocaleString()} kills sampled
        </span>
      </div>
    {/if}
  </header>

  {#if loading && !initialized}
    <div class="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-[var(--color-eve-border)] rounded-sm bg-[var(--color-eve-dark)]/20">
      <div class="text-[var(--color-eve-accent)] eve-accent-glow text-sm tracking-widest animate-pulse uppercase">&gt; ESTABLISHING INTEL UPLINK...</div>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center min-h-[400px] border border-[var(--color-isk-billion)]/30 rounded-sm bg-[var(--color-eve-dark)]">
      <div class="text-[var(--color-isk-billion)] text-sm tracking-widest uppercase mb-2">&gt; CRITICAL EXCEPTION ENCOUNTERED</div>
      <div class="text-xs text-white/40 font-mono bg-black/40 px-4 py-2 border border-white/5 rounded-sm">{error}</div>
    </div>
  {:else if initialized}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">

      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden md:col-span-2 flex flex-col h-full shadow-lg">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-whale-accent)] uppercase font-semibold">
          MOST VALUABLE KILLS
        </header>
        <ol class="flex flex-col flex-1 divide-y divide-[var(--color-eve-border)]">
          {#each data.topValue as k, i (k.killID)}
            <li class="h-full">
              <a href={`/kill/${k.killID}`} target="_blank" rel="noopener"
                 class="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors h-full">
                <span class="w-4 flex-shrink-0 text-[var(--color-neon-green)]/40 text-xs tabular-nums">{i + 1}</span>
                <div class="relative w-9 h-9 flex-shrink-0 bg-black border border-[var(--color-eve-border)] rounded-sm overflow-hidden">
                  <img src={`https://api.socketkill.com/render/ship/${k.shipID}?size=64`}
                       alt="" loading="lazy" width="36" height="36"
                       class="w-full h-full object-cover"
                       onerror={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <span class="truncate text-white text-sm font-semibold group-hover:text-[var(--color-eve-accent)] transition-colors">{shipName(k.shipID)}</span>
                  <span class="truncate text-gray-400 text-xs mt-0.5">{k.victimName ?? 'Unknown Capsuleer'} · <span class="text-gray-500">{systemName(k.systemID)}</span></span>
                </div>
                <span class="flex-shrink-0 text-[var(--color-whale-accent)] font-bold tabular-nums text-sm bg-[var(--color-whale-accent)]/5 border border-[var(--color-whale-accent)]/10 px-2 py-0.5 rounded-sm">{formatIsk(k.value)}</span>
              </a>
            </li>
          {/each}
        </ol>
      </section>

      {@render metricCard("Top Ships Destroyed", data.ships, (it) => shipName(it.id))}
      {@render metricCard("Top Ship Classes", data.shipGroups, (it) => groupName(it.id))}
      {@render metricCard("Busiest Systems", data.systems, (it) => systemName(it.id))}
      {@render metricCard("Busiest Regions", data.regions, (it) => regionName(it.id))}
      {@render metricCard("Top Corps Losing Ships", data.victimCorp, (it) => it.name ?? `Corp ${it.id}`)}
      {@render metricCard("Top Alliances Losing Ships", data.victimAlliance, (it) => it.name ?? `Alliance ${it.id}`)}
      
      {@render metricCard("Top Final-Blow Weapons", data.finalBlowWeapon, (it) => itemName(it.id), "text-[var(--color-isk-billion)]")}
      {@render metricCard("Top Killing Ships", data.killerShip, (it) => shipName(it.id), "text-[var(--color-isk-billion)]")}
      {@render metricCard("Top Killer Corps", data.killerCorp, (it) => it.name ?? `Corp ${it.id}`, "text-[var(--color-isk-billion)]")}
      {@render metricCard("Top Killer Alliances", data.killerAlliance, (it) => it.name ?? `Alliance ${it.id}`, "text-[var(--color-isk-billion)]")}

    </div>
  {/if}
</div>