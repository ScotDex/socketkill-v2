<script>
    import { onMount } from 'svelte'
    import { io } from 'socket.io-client'
    import KillRow from './KillRow.svelte'
    import ChipFacet from './ChipFacet.svelte'
    import QueryBuilder from './QueryBuilder.svelte'
    import {
        passesFilter,
        getUtcTimestamp,
        MAX_FEED_SIZE,
        KILL_BUFFER_SIZE,
        MAX_CORPS
    } from '../../lib/filter-logic.js'

    let killBuffer = $state([])
    let regionCache = $state([])
    let corpCache = $state(new Set())

    let filters = $state({
        minValue: 0,
        regions: [],
        corps: []
    })

    let connectionStatus = $state('connecting')

    const filteredFeed = $derived(
        killBuffer.filter(k => passesFilter(k, filters)).slice(0, MAX_FEED_SIZE)
    )

    const hasActiveFilters = $derived(
        filters.minValue > 0 || filters.regions.length > 0 || filters.corps.length > 0
    )

    const valuePresets = [
        { label: 'ANY', value: 0 },
        { label: '100M', value: 100_000_000 },
        { label: '1B', value: 1_000_000_000 },
        { label: '10B', value: 10_000_000_000 }
    ]

    const corpSuggestions = $derived(Array.from(corpCache))

    onMount(() => {
        const socket = io('https://ws.socketkill.com')

        socket.on('connect', () => {
            connectionStatus = 'online'
        })

        socket.on('disconnect', () => {
            connectionStatus = 'offline'
        })

        socket.on('region-list', (regions) => {
            regionCache = regions || []
        })

        socket.on('raw-kill', (kill) => {
            kill.timestamp = getUtcTimestamp()

            if (kill.corpName) corpCache.add(kill.corpName)
            if (kill.finalBlowCorp) corpCache.add(kill.finalBlowCorp)
            corpCache = new Set(corpCache)

            killBuffer = [kill, ...killBuffer].slice(0, KILL_BUFFER_SIZE)
        })

        return () => socket.disconnect()
    })
</script>

<div class="flex flex-col lg:flex-row gap-4">
    <div class="border border-[var(--color-border-dim)] bg-black/60 rounded-sm p-3 flex flex-col gap-4 lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">
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
                        class="flex-1 bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)]/60 font-mono text-xs px-2 py-1 cursor-pointer hover:border-[var(--color-border-mid)] hover:text-[var(--color-neon-green)]"
                        class:bg-[var(--color-neon-green)]={filters.minValue === preset.value}
                        class:text-black={filters.minValue === preset.value}
                        class:border-[var(--color-neon-green)]={filters.minValue === preset.value}
                        onclick={() => filters.minValue = preset.value}
                    >
                        {preset.label}
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
    </div>

    <div class="feed-container lg:flex-1 lg:self-start">
        {#if filteredFeed.length === 0}
            <div class="p-8 text-center text-[var(--color-neon-green)] font-mono text-sm tracking-widest opacity-60">
                &gt; {hasActiveFilters ? 'AWAITING DATA' : 'WAITING FOR NEXT KILL'}...
            </div>
        {:else}
            {#each filteredFeed as kill (kill.zkillUrl)}
                <KillRow {kill} />
            {/each}
        {/if}
    </div>
    <QueryBuilder />
</div>