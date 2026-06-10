<script>
    import { onMount } from 'svelte'
    import { fly, fade } from 'svelte/transition'
    import { flip } from 'svelte/animate'
    import { io } from 'socket.io-client'
    import KillRow from './KillRow.svelte'
    import ChipFacet from './ChipFacet.svelte'
    import QueryBuilder from './QueryBuilder.svelte'
    import BootSequence from './BootSequence.svelte'
    import WeaponKeywordFacet from './WeaponKeywordFacet.svelte'
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
    import {
        filterSource,
        itemsFuse,
        loadFilterSource,
        resolveWeaponKeyword
    } from '../../lib/filter-source-store.js'

    let killBuffer = $state([])
    let corpCache = $state(new Set())
    let allianceCache = $state(new Set())

    let filters = $state({
        minValue: 0,
        regions: [],
        corps: [],
        alliances: [],
        systems: [],
        bands: [],
        weaponKeyword: ''
    })

    const sdeRegionNames = $derived(
        $filterSource.loaded
            ? Object.values($filterSource.regions).map(r => r.name).sort()
            : []
    )
    const sdeSystemNames = $derived(
        $filterSource.loaded
            ? Object.values($filterSource.systems).map(s => s.name).sort()
            : []
    )
    const allianceSuggestions = $derived(Array.from(allianceCache))
    const corpSuggestions = $derived(Array.from(corpCache))
    const weaponMatchedIDs = $derived(resolveWeaponKeyword(filters.weaponKeyword, $itemsFuse))

    const filteredFeed = $derived(
        killBuffer
            .filter(k => passesFilter(k, filters, { weaponTypeIDs: weaponMatchedIDs }))
            .slice(0, MAX_FEED_SIZE)
    )

    const hasActiveFilters = $derived(
        filters.minValue > 0 ||
        filters.regions.length > 0 ||
        filters.corps.length > 0 ||
        filters.alliances.length > 0 ||
        filters.systems.length > 0 ||
        filters.bands.length > 0 ||
        weaponMatchedIDs.size > 0
    )

    function clearFilters() {
        filters.minValue = 0
        filters.regions = []
        filters.corps = []
        filters.alliances = []
        filters.systems = []
        filters.bands = []
        filters.weaponKeyword = ''
    }

    const valuePresets = [
        { label: 'ANY', value: 0 },
        { label: '100M', value: 100_000_000 },
        { label: '1B', value: 1_000_000_000 },
        { label: '10B', value: 10_000_000_000 }
    ]

    const secBands = [
        { label: 'HS',   value: 'high',    color: 'var(--color-neon-green)' },
        { label: 'LS',   value: 'low',     color: 'var(--color-whale-accent)' },
        { label: 'NULL', value: 'null',    color: 'var(--color-isk-billion)' },
        { label: 'WH',   value: 'wh',      color: 'var(--color-terminal-blue)' },
        { label: 'POCH', value: 'pochven', color: '#b07ce8' }
    ]

    function toggleBand(value) {
        filters.bands = filters.bands.includes(value)
            ? filters.bands.filter(b => b !== value)
            : [...filters.bands, value]
    }

    onMount(async () => {
        loadFilterSource()
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

        let pendingKills = []

        socket.on('raw-kill', (kill) => {
            kill.timestamp = getUtcTimestamp()
            pendingKills.push(kill)
        })

        const flushInterval = setInterval(() => {
            if (pendingKills.length === 0) return
            const batch = pendingKills
            pendingKills = []

            for (const kill of batch) {
                if (kill.corpName) corpCache.add(kill.corpName)
                if (kill.finalBlowCorp) corpCache.add(kill.finalBlowCorp)
                if (kill.allianceName) allianceCache.add(kill.allianceName)
                if (kill.finalBlowAlliance) allianceCache.add(kill.finalBlowAlliance)
            }
            corpCache = new Set(corpCache)
            allianceCache = new Set(allianceCache)

            killBuffer = [...batch.reverse(), ...killBuffer].slice(0, KILL_BUFFER_SIZE)
        }, 300)

        socket.on('player-count', (payload) => {
            serverStatus.set({
                count: payload.count || 0,
                version: payload.version || 'UNKNOWN',
                vip: payload.vip === true,
                active: payload.active === true,
            })
        })

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

        return () => {
            clearInterval(flushInterval)
            socket.disconnect()
        }
    })
</script>

<div class="flex flex-col lg:flex-row gap-4">

    <!-- Live filter panel -->
    <aside class="lf lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">

        <header class="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-dim)]">
            <span class="font-mono text-[13px] tracking-[0.14em] text-[var(--color-neon-green)] glow">&gt; LIVE FILTER</span>
            <span class="ui text-[10px] tracking-[0.14em] tabular-nums"
                class:text-[var(--color-neon-green)]={hasActiveFilters}
                class:text-[var(--color-text-faint)]={!hasActiveFilters}>
                {filteredFeed.length}/{killBuffer.length}
            </span>
        </header>

        <div class="flex flex-col gap-6 p-3 pt-4">

            <section class="flex flex-col gap-1.5">
                <span class="lbl">// value threshold <span class="lbl-unit">isk</span></span>
                <div class="flex gap-px bg-[var(--color-eve-border)] p-px">
                    {#each valuePresets as preset}
                        <button type="button" class="seg" class:on={filters.minValue === preset.value}
                            style="--seg-c:var(--color-whale-accent)"
                            onclick={() => filters.minValue = preset.value}>
                            {preset.label}
                        </button>
                    {/each}
                </div>
            </section>

            <section class="flex flex-col gap-1.5">
                <span class="lbl">// sec status</span>
                <div class="flex gap-px bg-[var(--color-eve-border)] p-px">
                    {#each secBands as band}
                        <button type="button" class="seg" class:on={filters.bands.includes(band.value)}
                            style="--seg-c:{band.color}"
                            onclick={() => toggleBand(band.value)}>
                            {band.label}
                        </button>
                    {/each}
                </div>
            </section>

            <ChipFacet
                label="REGIONS"
                bind:items={filters.regions}
                suggestions={sdeRegionNames}
                placeholder="ADD REGION"
            />

            <ChipFacet
                label="CORPORATIONS (MAX 5)"
                bind:items={filters.corps}
                suggestions={corpSuggestions}
                placeholder="ADD CORP NAME"
                maxItems={MAX_CORPS}
                allowFreeText={true}
            />

            <ChipFacet
                label="SOLAR SYSTEMS (MAX 5)"
                bind:items={filters.systems}
                suggestions={sdeSystemNames}
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

            <WeaponKeywordFacet bind:keyword={filters.weaponKeyword} />
        </div>

        {#if hasActiveFilters}
            <footer class="p-3 pt-0" transition:fade={{ duration: 120 }}>
                <button type="button" class="flush" onclick={clearFilters}>Flush filters ✕</button>
            </footer>
        {/if}

    </aside>

    <!-- Feed -->
    <div class="lg:flex-1 lg:self-start">
        {#if filteredFeed.length === 0}
            <div class="flex items-center justify-center min-h-[400px]">
                <BootSequence />
            </div>
        {:else}
            <div class="kill-feed-panel">
                {#each filteredFeed as kill (kill.zkillUrl)}
                    <div
                        in:fly={{ x: -20, duration: 200 }}
                        out:fade={{ duration: 80 }}
                        animate:flip={{ duration: 150 }}
                    >
                        <KillRow {kill} />
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <QueryBuilder />
</div>

<style>
    .lf {
        font-family: var(--font-mono);
        background:
            linear-gradient(180deg, rgba(63, 185, 80, 0.04), transparent 56px),
            var(--color-glass-bg);
        border: 1px solid var(--color-border-dim);
        box-shadow: var(--shadow-feed);
        /* mirrored notch: this panel sits on the left edge */
        clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px);
    }

    .ui, .lbl, .seg, .flush { font-family: var(--font-body); }
    .glow { text-shadow: var(--shadow-phosphor); }

    .lbl {
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--color-border-bright);
        user-select: none;
    }
    .lbl-unit { color: var(--color-text-faint); letter-spacing: 0.14em; font-weight: 400; }

    .seg {
        flex: 1;
        padding: 0.45rem 0.25rem;
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.06em;
        color: var(--color-text-faint);
        background: var(--color-feed-bg);
        border: 0;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: color 0.15s, background 0.15s, border-color 0.15s, text-shadow 0.15s;
    }
    .seg:hover { color: var(--color-text-body); background: #1b212b; }
    .seg.on {
        --c: var(--seg-c, var(--color-neon-green));
        color: var(--c);
        border-bottom-color: var(--c);
        background: color-mix(in srgb, var(--c) 10%, var(--color-feed-bg));
        text-shadow: 0 0 8px color-mix(in srgb, var(--c) 55%, transparent);
    }

    .flush {
        width: 100%;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--color-text-faint);
        background: var(--color-feed-bg);
        border: 0;
        border-bottom: 2px solid transparent;
        padding: 0.5rem;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
    }
    .flush:hover { color: var(--color-isk-billion); border-bottom-color: var(--color-isk-billion); }

    .seg:focus-visible, .flush:focus-visible {
        outline: 1px solid var(--color-neon-green);
        outline-offset: 2px;
    }
</style>