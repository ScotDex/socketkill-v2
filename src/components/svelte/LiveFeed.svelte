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
                <span class="lbl">// network</span>
                <div class="flex gap-2">
                    <a href="https://discord.gg/dpgmEm9REc" target="_blank" rel="noopener noreferrer"
                       class="icon-link" title="Discord" aria-label="Join the Discord">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                            <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0a12.6 12.6 0 0 0-.617-1.25a.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.1 13.1 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.3 12.3 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.84 19.84 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                    </a>
                    <a href="https://github.com/ScotDex/socketkill-v2" target="_blank" rel="noopener noreferrer"
                       class="icon-link" title="GitHub" aria-label="View source on GitHub">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                            <path d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                        </svg>
                    </a>
                    <a href="https://x.com/scottishdex" target="_blank" rel="noopener noreferrer"
                       class="icon-link" title="X" aria-label="Follow on X">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                            <path d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </a>
                </div>
            </section>


        </div>

        {#if hasActiveFilters}
            <footer class="p-3 pt-0" transition:fade={{ duration: 120 }}>
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

    .icon-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px; height: 32px;
        color: var(--color-text-faint);
        background: var(--color-feed-bg);
        border-bottom: 2px solid transparent;
        transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .icon-link:hover {
        color: var(--color-neon-green);
        border-bottom-color: var(--color-neon-green);
        background: #1b212b;
    }
    .icon-link:focus-visible {
        outline: 1px solid var(--color-neon-green);
        outline-offset: 2px;
    }
</style>