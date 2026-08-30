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
    import { filtersToParams, paramsToFilters } from '../../lib/filter-url.js'
    import { internalLink } from '../../lib/entity-links.js'
    import Fuse from 'fuse.js'
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

let searchTerm = $state('')
let lookupError = $state('')
let lookupSuggestion = $state('')
let lookupBusy = $state(false)

const WHALE_THRESHOLD = 10_000_000_000
let glitching = $state(false)
let glitchTimer = null

const LOOKUP_ORDER = [
    ['characters',   'character'],
    ['corporations', 'corp'],
    ['alliances',    'alliance'],
]

async function runSearch() {
    const term = searchTerm.trim()
    if (!term || lookupBusy) return

    lookupBusy = true
lookupError = ''
lookupSuggestion = ''

    try {
        const res = await fetch('https://esi.evetech.net/latest/universe/ids/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([term]),
        })

        if (!res.ok) {
            lookupError = 'LOOKUP UNAVAILABLE'
            return
        }

        const data = await res.json()

        for (const [bucket, kind] of LOOKUP_ORDER) {
            const hit = data[bucket]?.[0]
            if (hit) {
                window.location.href = internalLink(kind, hit.id)
                return
            }
        }

    const guess = lookupFuse.search(term)[0]?.item
if (guess && guess.toLowerCase() !== term.toLowerCase()) {
    lookupSuggestion = guess
    lookupError = 'NO MATCH'
} else {
    lookupError = 'NO MATCH — EXACT NAME REQUIRED'
}
    } catch {
        lookupError = 'LOOKUP FAILED'
    } finally {
        lookupBusy = false
    }
}
let filterCopied = $state(false)

async function copyFilterUrl() {
    try {
        await navigator.clipboard.writeText(window.location.href)
        filterCopied = true
        setTimeout(() => filterCopied = false, 1500)
    } catch (e) {
        console.warn('Clipboard write failed:', e)
    }
}

let urlSyncReady = $state(false)
$effect(() => {
    const qs = filtersToParams(filters).toString()
    if (!urlSyncReady) return
    const url = qs ? `?${qs}` : window.location.pathname
    history.replaceState(null, '', url)
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
    const lookupFuse = $derived(
    new Fuse([...corpCache, ...allianceCache], {
        threshold: 0.3,
        ignoreLocation: true
    })
)

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
        { label: 'POCH', value: 'pochven', color: 'var(--color-isk-billion)' }
    ]

    function toggleBand(value) {
        filters.bands = filters.bands.includes(value)
            ? filters.bands.filter(b => b !== value)
            : [...filters.bands, value]
    }

    onMount(async () => {
        loadFilterSource()
        if (window.location.search) {
        filters = paramsToFilters(window.location.search)
        }
        urlSyncReady = true
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
            if (!glitching && batch.some(k => k.val >= WHALE_THRESHOLD)) {
    glitching = true
    glitchTimer = setTimeout(() => { glitching = false }, 400)
}

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
    clearTimeout(glitchTimer)
    socket.disconnect()
}
    })
</script>

<div class="flex flex-col lg:flex-row gap-4" class:signal-interference={glitching}>
    <aside class="lf lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">

        <header class="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border-dim)]">
            <span class="lbl glow text-[var(--color-neon-green)] !text-[13px]">&gt; LIVE FILTER</span>
            <span class="ui text-[10px] tracking-[0.14em] tabular-nums"
                class:text-[var(--color-neon-green)]={hasActiveFilters}
                class:text-[var(--color-text-faint)]={!hasActiveFilters}>
                {filteredFeed.length}/{killBuffer.length}
            </span>
        </header>

        <div class="flex flex-col gap-6 p-3 pt-4">

            <section class="flex flex-col gap-1.5">
                <span class="lbl">value threshold <span class="lbl-unit">isk</span></span>
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
                <span class="lbl">sec status</span>
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
                placeholder="ADD CORPORATIONS"
                maxItems={MAX_CORPS}
                allowFreeText={true}
            />

            <ChipFacet
                label="SOLAR SYSTEMS (MAX 5)"
                bind:items={filters.systems}
                suggestions={sdeSystemNames}
                placeholder="ADD SYSTEM"
                maxItems={MAX_SYSTEMS}
                allowFreeText={true}
            />

            <ChipFacet
                label="ALLIANCES (MAX 5)"
                bind:items={filters.alliances}
                suggestions={allianceSuggestions}
                placeholder="ADD ALLIANCE"
                maxItems={MAX_ALLIANCES}
                allowFreeText={true}
            />

            <WeaponKeywordFacet bind:keyword={filters.weaponKeyword} />

<section class="flex flex-col gap-1.5">
    <span class="lbl">entity lookup</span>
    <div class="lookup">
        <input
            type="text"
            class="lookup-input"
            placeholder="EXACT NAME"
            bind:value={searchTerm}
            oninput={() => { lookupError = ''; lookupSuggestion = '' }}
            onkeydown={(e) => e.key === 'Enter' && runSearch()}
        />
        <button type="button" class="lookup-go" onclick={runSearch}
            disabled={lookupBusy} aria-label="Look up entity">
            {lookupBusy ? '·' : '>'}
        </button>
    </div>
{#if lookupError}
    <span class="lookup-err" transition:fade={{ duration: 120 }}>{lookupError}</span>
{/if}
{#if lookupSuggestion}
    <button type="button" class="flush"
        transition:fade={{ duration: 120 }}
        onclick={() => { searchTerm = lookupSuggestion; runSearch() }}>
        DID YOU MEAN {lookupSuggestion}?
    </button>
{/if}
</section>


        </div>

        {#if hasActiveFilters}
    <footer class="p-3 pt-0 flex flex-col gap-1.5" transition:fade={{ duration: 120 }}>
        <button type="button" class="flush share" onclick={copyFilterUrl}>
            {filterCopied ? 'LINK COPIED ✓' : 'SHARE FILTER ⧉'}
        </button>
        <button type="button" class="flush" onclick={clearFilters}>Flush filters ✕</button>
    </footer>
{/if}



    </aside>
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


