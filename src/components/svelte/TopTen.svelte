<script>
  import { onMount } from 'svelte';
  import { filterSource, loadFilterSource } from '../../lib/filter-source-store.js';
  import { formatIsk } from '../../lib/filter-logic.js';

  let data = $state(null);
  let error = $state(null);
  let loading = $state(true);

  async function load() {
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
    loadFilterSource();
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  });

  const shipName   = (id) => $filterSource.ships?.[id]?.name   ?? `Type ${id}`;
  const groupName  = (id) => $filterSource.groups?.[id]?.name  ?? `Group ${id}`;
  const systemName = (id) => $filterSource.systems?.[id]?.name ?? `Sys ${id}`;
  const regionName = (id) => $filterSource.regions?.[id]?.name ?? `Region ${id}`;
</script>

{#snippet rankList(items, labelFn)}
  {@const max = Math.max(...items.map(i => i.count), 1)}
  <ol class="flex flex-col">
    {#each items as item, i (item.id + '-' + i)}
      <li class="relative flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-eve-border)] last:border-b-0 text-sm font-mono overflow-hidden">
        <span class="absolute inset-y-0 left-0 bg-[var(--color-neon-green)]/8" style="width: {item.count / max * 100}%"></span>
        <span class="relative w-5 text-[var(--color-neon-green)]/40 text-xs">{i + 1}</span>
        <span class="relative flex-1 truncate text-white">{labelFn(item)}</span>
        <span class="relative text-[var(--color-neon-green)] font-bold tabular-nums">{item.count}</span>
      </li>
    {/each}
  </ol>
{/snippet}

<div class="font-mono">
  <header class="flex items-baseline justify-between border-b border-white/10 pb-3 mb-4">
    <h1 class="text-[var(--color-neon-green)] tracking-widest text-2xl">TOP 10 // LAST HOUR</h1>
    {#if data}
      <span class="text-xs tracking-widest text-white/30 uppercase">{data.sampleSize} kills sampled</span>
    {/if}
  </header>

  {#if loading && !data}
    <div class="text-[var(--color-eve-accent)] eve-accent-glow text-sm tracking-widest py-12 text-center uppercase">&gt; AGGREGATING WRECKAGE...</div>
  {:else if error}
    <div class="text-[var(--color-isk-billion)] text-sm tracking-widest py-12 text-center uppercase">&gt; ERR: {error}</div>
  {:else if data}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

      <!-- Top value kills (marquee) -->
      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden md:col-span-2 lg:col-span-1">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-whale-accent)] uppercase">MOST VALUABLE KILLS</header>
        <ol class="flex flex-col">
          {#each data.topValue as k, i (k.killID)}
            <li class="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-eve-border)] last:border-b-0 text-sm">
              <span class="w-5 text-[var(--color-neon-green)]/40 text-xs">{i + 1}</span>
              <a href={`/kill/${k.killID}`} target="_blank" rel="noopener" class="flex-1 truncate text-white hover:text-[var(--color-eve-accent)] transition-colors">#{k.killID}</a>
              <span class="text-[var(--color-whale-accent)] font-bold tabular-nums">{formatIsk(k.value)}</span>
            </li>
          {/each}
        </ol>
      </section>

      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-eve-accent)] eve-accent-glow uppercase">TOP SHIPS DESTROYED</header>
        {@render rankList(data.ships, (it) => shipName(it.id))}
      </section>

      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-eve-accent)] eve-accent-glow uppercase">TOP SHIP CLASSES</header>
        {@render rankList(data.shipGroups, (it) => groupName(it.id))}
      </section>

      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-eve-accent)] eve-accent-glow uppercase">BUSIEST SYSTEMS</header>
        {@render rankList(data.systems, (it) => systemName(it.id))}
      </section>

      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-eve-accent)] eve-accent-glow uppercase">BUSIEST REGIONS</header>
        {@render rankList(data.regions, (it) => regionName(it.id))}
      </section>

      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-eve-accent)] eve-accent-glow uppercase">TOP CORPS LOSING SHIPS</header>
        {@render rankList(data.victimCorp, (it) => it.name ?? `Corp ${it.id}`)}
      </section>

      <section class="fade-card bg-[var(--color-eve-dark)] border border-[var(--color-eve-border)] rounded-sm overflow-hidden">
        <header class="bg-black/40 px-3 py-2 border-b border-[var(--color-eve-border)] text-xs tracking-widest text-[var(--color-eve-accent)] eve-accent-glow uppercase">TOP ALLIANCES LOSING SHIPS</header>
        {@render rankList(data.victimAlliance, (it) => it.name ?? `Alliance ${it.id}`)}
      </section>

    </div>

    <p class="text-[10px] tracking-widest text-white/20 uppercase mt-4 text-center">
      Rolling 1h window · victim-side only · killer boards coming soon
    </p>
  {/if}
</div>