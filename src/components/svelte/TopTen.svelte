<script>
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js';
  import { formatIsk } from '../../lib/filter-logic.js';

  let data = $state(null);
  let error = $state(null);
  let loading = $state(true);
  let dictionaryLoaded = $state(false);

  let initialized = $derived(!!data && $filterSource && dictionaryLoaded);

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

  const shipName   = (id) => $filterSource?.ships?.[id]?.name   ?? `Type ${id}`;
  const groupName  = (id) => $filterSource?.groups?.[id]?.name  ?? `Group ${id}`;
  const systemName = (id) => $filterSource?.systems?.[id]?.name ?? `Sys ${id}`;
  const regionName = (id) => $filterSource?.regions?.[id]?.name ?? `Region ${id}`;
  const itemName   = (id) => $filterSource?.items?.[id]?.name   ?? `Type ${id}`;

  // Sample count rolls when the 60s refresh lands
  const sampleTween = new Tween(0, { duration: 600, easing: cubicOut });
  $effect(() => { sampleTween.set(data?.sampleSize ?? 0); });
  const shownSample = $derived(Math.round(sampleTween.current).toLocaleString());
</script>

{#snippet metricCard(title, items, labelFn, accent = 'var(--color-neon-green)')}
  <section class="card fade-card flex flex-col overflow-hidden h-full" style="--card-c:{accent}">
    <header class="card-h">// {title}</header>
    <div class="flex-1 overflow-y-auto">
      {@render rankList(items || [], labelFn)}
    </div>
  </section>
{/snippet}

{#snippet rankList(items, labelFn)}
  {@const max = Math.max(...items.map(i => i.count), 1)}
  <ol class="flex flex-col h-full">
    {#each items as item, i (item.id + '-' + i)}
      <li class="relative flex items-center gap-2 px-3 py-1.5 border-b border-eve-border last:border-b-0 text-sm overflow-hidden group hover:bg-white/5 transition-colors">
        <span class="bar absolute inset-y-0 left-0 transition-all duration-500" style="width: {item.count / max * 100}%"></span>
        <span class="relative w-5 font-mono text-xs tabular-nums" style="color: color-mix(in srgb, var(--card-c) 45%, transparent)">{i + 1}</span>
        <span class="ui relative flex-1 truncate text-text-body/85 group-hover:text-white transition-colors">{labelFn(item)}</span>
        <span class="relative font-mono font-bold tabular-nums ml-auto" style="color: var(--card-c)">{item.count}</span>
      </li>
    {:else}
      <li class="ui px-3 py-4 text-xs text-white/20 uppercase tracking-[0.18em] text-center">No activity recorded</li>
    {/each}
  </ol>
{/snippet}

<div class="min-h-screen bg-eve-dark font-body text-text-body max-w-7xl mx-auto lg:p-6 space-y-6 select-none">

  <header class="flex flex-col sm:flex-row items-start sm:items-baseline justify-between border-b border-border-dim pb-4 gap-2">
    <div class="space-y-1">
      <h1 class="font-mono tracking-[0.18em] text-2xl text-neon-green glow">&gt; TOP 10 <span class="text-neon-green/40">// LAST HOUR</span></h1>
      <p class="ui text-[10px] tracking-[0.22em] text-text-faint uppercase">Rolling 1h window · auto-refreshes every 60s</p>
    </div>
    {#if data}
      <div class="text-right">
        <span class="font-mono text-sm tracking-[0.1em] tabular-nums text-text-body bg-feed-bg px-2.5 py-1 border-b-2 border-neon-green/50">
          {shownSample} <span class="ui text-[10px] text-text-faint uppercase tracking-[0.18em]">kills sampled</span>
        </span>
      </div>
    {/if}
  </header>

  {#if loading && !initialized}
    <div class="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-eve-border bg-eve-dark/20">
      <div class="text-neon-green glow font-mono text-sm tracking-[0.18em] animate-pulse uppercase">&gt; AWAITING STATS FROM ENGINE</div>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center min-h-[400px] border border-isk-billion/30 bg-eve-dark">
      <div class="text-isk-billion font-mono text-sm tracking-[0.18em] uppercase mb-2">&gt; CRITICAL EXCEPTION ENCOUNTERED</div>
      <div class="ui text-xs text-text-faint bg-black/40 px-4 py-2 border border-eve-border">{error}</div>
    </div>
  {:else if initialized}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">

      <!-- Most valuable kills: whale gold -->
      <section class="card fade-card overflow-hidden md:col-span-2 flex flex-col h-full" style="--card-c:var(--color-whale-accent)">
        <header class="card-h">// Most valuable kills</header>
        <ol class="flex flex-col flex-1 divide-y divide-eve-border">
          {#each data.topValue as k, i (k.killID)}
            <li class="h-full">
              <a href={`/kill/${k.killID}`} target="_blank" rel="noopener"
                 class="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors h-full">
                <span class="w-4 flex-shrink-0 font-mono text-xs tabular-nums text-whale-accent/45">{i + 1}</span>
                <div class="relative w-9 h-9 flex-shrink-0 bg-black border border-eve-border overflow-hidden">
                  <img src={`https://api.socketkill.com/render/ship/${k.shipID}?size=64`}
                       alt="" loading="lazy" width="36" height="36"
                       class="w-full h-full object-cover"
                       onerror={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <span class="ui truncate text-white text-sm font-semibold group-hover:text-neon-green transition-colors">{shipName(k.shipID)}</span>
                  <span class="ui truncate text-text-body/70 text-xs mt-0.5">{k.victimName ?? 'Unknown Capsuleer'} · <span class="text-text-faint">{systemName(k.systemID)}</span></span>
                </div>
                <span class="flex-shrink-0 text-whale-accent font-bold font-mono tabular-nums text-sm border-b-2 border-whale-accent/60 px-1 pb-0.5">{formatIsk(k.value)}</span>
              </a>
            </li>
          {/each}
        </ol>
      </section>

      {@render metricCard("Top ships destroyed", data.ships, (it) => shipName(it.id))}
      {@render metricCard("Top hull classes", data.shipGroups, (it) => groupName(it.id))}
      {@render metricCard("Most active systems", data.systems, (it) => systemName(it.id))}
      {@render metricCard("Most active regions", data.regions, (it) => regionName(it.id))}
      {@render metricCard("Top corp losses", data.victimCorp, (it) => it.name ?? `Corp ${it.id}`)}
      {@render metricCard("Top alliance losses", data.victimAlliance, (it) => it.name ?? `Alliance ${it.id}`)}

      {@render metricCard("Top final-blow weapons", data.finalBlowWeapon, (it) => itemName(it.id), 'var(--color-isk-billion)')}
      {@render metricCard("Top killing ships", data.killerShip, (it) => shipName(it.id), 'var(--color-isk-billion)')}
      {@render metricCard("Top killer corps", data.killerCorp, (it) => it.name ?? `Corp ${it.id}`, 'var(--color-isk-billion)')}
      {@render metricCard("Top killer alliances", data.killerAlliance, (it) => it.name ?? `Alliance ${it.id}`, 'var(--color-isk-billion)')}

    </div>
  {/if}
</div>

<style>
  .card {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--card-c) 4%, transparent), transparent 48px),
      var(--color-glass-bg);
    border: 1px solid var(--color-border-dim);
    box-shadow: var(--shadow-feed);
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  }

  .card-h {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--card-c);
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--card-c) 25%, transparent);
    text-shadow: 0 0 8px color-mix(in srgb, var(--card-c) 40%, transparent);
  }

  .bar {
    background: color-mix(in srgb, var(--card-c) 7%, transparent);
  }

  .ui { font-family: var(--font-body); }
  .glow { text-shadow: var(--shadow-phosphor); }
</style>