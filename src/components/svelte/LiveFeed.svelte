<script>
    import { onMount } from 'svelte'
    import { io } from 'socket.io-client'
    import KillRow from './KillRow.svelte'
    import ChipFacet from './ChipFacet.svelte'
    import QueryBuilder from './QueryBuilder.svelte'
    import BootSequence from './BootSequence.svelte'
    import { killCount, serverStatus, iskDestroyed, connectionStatus } from '../../lib/stats-store.js'
    import {
        passesFilter,
        getUtcTimestamp,
        MAX_FEED_SIZE,
        KILL_BUFFER_SIZE,
        MAX_CORPS,
        MAX_ALLIANCES,
        MAX_SYSTEMS
    } from '../../lib/filter-logic.js'

    let killBuffer = $state([])
    let regionCache = $state([])
    let corpCache = $state(new Set())
    let allianceCache = $state(new Set())
    let systemCache = $state(new set())

    let filters = $state({
        minValue: 0,
        regions: [],
        corps: [],
        alliances: [],
        systems: [],
        bands: []
    })
    const regionSuggestions = $derived(Array.from(regionCache))
    const allianceSuggestions = $derived(Array.from(allianceCache))
    const systemSuggestions = $derived(Array.from(systemCache))
    const corpSuggestions = $derived(Array.from(corpCache))

    const filteredFeed = $derived(
        killBuffer.filter(k => passesFilter(k, filters)).slice(0, MAX_FEED_SIZE)
    )

    const hasActiveFilters = $derived(
        filters.minValue > 0 || filters.regions.length > 0 || filters.corps.length > 0 || filters.alliances.length > 0 || filters.systems.length > 0 || filters.bands.length > 0
    )

    const valuePresets = [
        { label: 'ANY', value: 0 },
        { label: '100M', value: 100_000_000 },
        { label: '1B', value: 1_000_000_000 },
        { label: '10B', value: 10_000_000_000 }
    ]

    

onMount(async () => {
    // Hydrate stats from backend before connecting socket
    try {
        const res = await fetch('https://ws.socketkill.com/api/stats')
        if (res.ok) {
            const stats = await res.json()
            if (stats.totalScanned != null) killCount.set(stats.totalScanned)
            if (stats.totalIsk != null) iskDestroyed.set(stats.totalIsk)
        }
    } catch (e) {
        console.warn('Stats hydration failed:', e)
    }

    const socket = io('https://ws.socketkill.com')

    socket.on('connect', () => {
        connectionStatus.set('online')
    })

    socket.on('disconnect', () => {
        connectionStatus.set('offline')
    })

    socket.on('region-list', (regions) => {
        regionCache = regions || []
    })

    socket.on('raw-kill', (kill) => {
        kill.timestamp = getUtcTimestamp()

        if (kill.corpName) corpCache.add(kill.corpName)
        if (kill.finalBlowCorp) corpCache.add(kill.finalBlowCorp)
        corpCache = new Set(corpCache)

        if (kill.allianceName) allianceCache.add(kill.allianceName)
        if (kill.finalBlowAlliance) allianceCache.add(kill.finalBlowAlliance)
        allianceCache = new Set(allianceCache)
        if (kill.systemName) systemCache.add(kill.systemName)
        systemCache = new Set(systemCache)

        killBuffer = [kill, ...killBuffer].slice(0, KILL_BUFFER_SIZE)
    })

    socket.on('player-count', (payload) => {
    serverStatus.set({
        count: payload.count || 0,
        version: payload.version || 'UNKNOWN',
        vip: payload.vip === true,
        active: payload.active === true,
    });
});

    socket.on('nebula-update', (data) => {
    if (!data || !data.url) return
    const tempImg = new Image()
    tempImg.src = data.url
    tempImg.onload = () => {
        document.body.style.backgroundImage = `linear-gradient(rgba(13,17,23,0.8), rgba(13,17,23,0.8)), url('${data.url}')`
        document.body.style.backgroundSize = 'cover'
        document.body.style.backgroundAttachment = 'fixed'
        document.body.style.backgroundPosition = 'center'
    }
})

    socket.on('gatekeeper-stats', (stats) => {
        if (stats?.totalScanned != null) killCount.set(stats.totalScanned)
        if (stats?.totalIsk != null) iskDestroyed.set(stats.totalIsk)
    })

    return () => socket.disconnect()
})
</script>

<div class="flex flex-col lg:flex-row gap-4">
    <div class="filter-panel-enter border border-[var(--color-border-dim)] bg-black/60 rounded-sm p-3 flex flex-col gap-4 lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">
        <div class="flex items-center gap-2 pb-2 border-b border-[var(--color-border-dim)]">
            <span class="text-[var(--color-neon-green)] text-xs">&gt;</span>
            <span class="text-[var(--color-neon-green)] font-mono text-sm tracking-widest">STREAM FILTER</span>
        </div>

        <div class="flex flex-col gap-2">
            <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
                MIN VALUE
            </label>
            <div class="flex gap-1 flex-wrap">
                {#each valuePresets as preset}
                   <button
    type="button"
    class="filter-btn flex-1 bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)]/60 font-mono text-xs px-2 py-1 cursor-pointer hover:border-[var(--color-border-mid)] hover:text-[var(--color-neon-green)]"
    class:selected={filters.minValue === preset.value}
    onclick={() => filters.minValue = preset.value}
>
    {preset.label}
</button>
                {/each}
            </div>
        </div>

        <div class="flex flex-col gap-2">
    <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
        SEC STATUS
    </label>
    <div class="flex gap-1 flex-wrap">
        {#each [
            { label: 'HS', value: 'high' },
            { label: 'LS', value: 'low' },
            { label: 'NULL', value: 'null' },
            { label: 'WH', value: 'wh' },
            { label: 'POCH', value: 'pochven' }
        ] as band}
            {@const active = filters.bands.includes(band.value)}
            <button
    type="button"
    class="filter-btn flex-1 bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)]/60 font-mono text-xs px-2 py-1 cursor-pointer hover:border-[var(--color-border-mid)] hover:text-[var(--color-neon-green)]"
    class:selected={active}
    onclick={() => {
        if (active) {
            filters.bands = filters.bands.filter(b => b !== band.value)
        } else {
            filters.bands = [...filters.bands, band.value]
        }
    }}
>
    {band.label}
</button>
        {/each}
    </div>
</div>

        <ChipFacet
            label="REGIONS"
            bind:items={filters.regions}
            suggestions={regionCache}
            placeholder="ADD REGION"
        />

        <ChipFacet
            label="CORPS (MAX 5)"
            bind:items={filters.corps}
            suggestions={corpSuggestions}
            placeholder="ADD CORP NAME"
            maxItems={MAX_CORPS}
            allowFreeText={true}
        />
        <ChipFacet
            label="SYSTEMS (MAX 5)"
            bind:items={filters.systems}
            suggestions={systemSuggestions}
            placeholder="ADD SYSTEM NAME"
            maxItems={MAX_SYSTEMS}
            allowFreeText={true}
        />

        <ChipFacet
            label="ALLIANCES (MAX 5)"
            bind:items={filters.alliances}
    suggestions={allianceSuggestions}
    placeholder="ADD ALLIANCE NAME"
    maxItems={MAX_ALLIANCES}
    allowFreeText={true}
/>
    </div>

    <div class="lg:flex-1 lg:self-start">
        {#if filteredFeed.length === 0}
            {#if hasActiveFilters}
                <div class="p-8 text-center text-[var(--color-neon-green)] font-mono text-sm tracking-widest opacity-60">
                    &gt; AWAITING DATA...
                </div>
            {:else}
                <div class="flex items-center justify-center min-h-[400px]">
                    <BootSequence />
                </div>
            {/if}
        {:else}
            <div class="kill-feed-panel">
                {#each filteredFeed as kill (kill.zkillUrl)}
                    <KillRow {kill} />
                {/each}
            </div>
        {/if}
    </div>

    <QueryBuilder />
</div>