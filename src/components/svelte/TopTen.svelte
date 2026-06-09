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

{#snippet metricCard(title, items, labelFn, variantClass = "text-eve-accent")}
  <section class="fade-card flex flex-col bg-eve-dark border border-eve-border rounded-xs overflow-hidden h-full shadow-feed">
    <header class="bg-black/40 px-3 py-2 border-b border-eve-border font-mono text-xs tracking-widest {variantClass} uppercase">
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
      <li class="relative flex items-center gap-2 px-3 py-1.5 border-b border-eve-border last:border-b-0 text-sm font-mono overflow-hidden group hover:bg-white/5 transition-colors">
        <span class="absolute inset-y-0 left-0 bg-neon-green/5 transition-all duration-300" style="width: {item.count / max * 100}%"></span>
        <span class="relative w-5 text-neon-green/40 text-xs tabular-nums">{i + 1}</span>
        <span class="relative flex-1 truncate text-gray-300 group-hover:text-white transition-colors">{labelFn(item)}</span>
        <span class="relative text-neon-green font-bold tabular-nums ml-auto">{item.count}</span>
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
    <div class="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-eve-border rounded-xs bg-eve-dark/20">
      <div class="text-eve-accent font-mono text-sm tracking-widest animate-pulse uppercase">&gt; AWAITING STATS FROM ENGINE</div>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center min-h-[400px] border border-isk-billion/30 rounded-xs bg-eve-dark">
      <div class="text-isk-billion font-mono text-sm tracking-widest uppercase mb-2">&gt; CRITICAL EXCEPTION ENCOUNTERED</div>
      <div class="text-xs text-text-faint font-mono bg-black/40 px-4 py-2 border border-eve-border rounded-xs">{error}</div>
    </div>
  {:else if initialized}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">

      <section class="fade-card bg-eve-dark border border-eve-border rounded-xs overflow-hidden md:col-span-2 flex flex-col h-full shadow-feed">
        <header class="bg-black/40 px-3 py-2 border-b border-eve-border font-mono text-xs tracking-widest text-whale-accent uppercase font-semibold">
          MOST VALUABLE KILLS
        </header>
        <ol class="flex flex-col flex-1 divide-y divide-eve-border">
          {#each data.topValue as k, i (k.killID)}
            <li class="h-full">
              <a href={`/kill/${k.killID}`} target="_blank" rel="noopener"
                 class="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors h-full">
                <span class="w-4 flex-shrink-0 text-neon-green/40 text-xs tabular-nums">{i + 1}</span>
                <div class="relative w-9 h-9 flex-shrink-0 bg-black border border-eve-border rounded-xs overflow-hidden">
                  <img src={`https://api.socketkill.com/render/ship/${k.shipID}?size=64`}
                       alt="" loading="lazy" width="36" height="36"
                       class="w-full h-full object-cover"
                       onerror={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <span class="truncate text-white text-sm font-semibold group-hover:text-eve-accent transition-colors">{shipName(k.shipID)}</span>
                  <span class="truncate text-text-body/70 text-xs mt-0.5">{k.victimName ?? 'Unknown Capsuleer'} · <span class="text-text-faint">{systemName(k.systemID)}</span></span>
                </div>
                <span class="flex-shrink-0 text-whale-accent font-bold font-mono tabular-nums text-sm bg-whale-accent/5 border border-whale-accent/10 px-2 py-0.5 rounded-xs">{formatIsk(k.value)}</span>
                
              </a>
            </li>
          {/each}
        </ol>
      </section>

      {@render metricCard("Top Ships Destroyed", data.ships, (it) => shipName(it.id))}
      {@render metricCard("Top Hull Classes", data.shipGroups, (it) => groupName(it.id))}
      {@render metricCard("Most Active Systems", data.systems, (it) => systemName(it.id))}
      {@render metricCard("Most Active Regions", data.regions, (it) => regionName(it.id))}
      {@render metricCard("Top Corps Losses", data.victimCorp, (it) => it.name ?? `Corp ${it.id}`)}
      {@render metricCard("Top Alliances Losses", data.victimAlliance, (it) => it.name ?? `Alliance ${it.id}`)}
      
      {@render metricCard("Top Final-Blow Weapons", data.finalBlowWeapon, (it) => itemName(it.id), "text-isk-billion")}
      {@render metricCard("Top Killing Ships", data.killerShip, (it) => shipName(it.id), "text-isk-billion")}
      {@render metricCard("Top Killer Corps", data.killerCorp, (it) => it.name ?? `Corp ${it.id}`, "text-isk-billion")}
      {@render metricCard("Top Killer Alliances", data.killerAlliance, (it) => it.name ?? `Alliance ${it.id}`, "text-isk-billion")}

    </div>
  {/if}
</div>