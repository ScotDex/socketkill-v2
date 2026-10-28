<script>
    import { fade } from 'svelte/transition'
    import { internalLink } from '../../lib/entity-links.js'

    let searchTerm = $state('')
    let lookupError = $state('')
    let lookupBusy = $state(false)

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
        try {
            const res = await fetch('https://esi.evetech.net/latest/universe/ids/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([term]),
            })
            if (!res.ok) { lookupError = 'LOOKUP UNAVAILABLE'; return }
            const data = await res.json()
            for (const [bucket, kind] of LOOKUP_ORDER) {
                const hit = data[bucket]?.[0]
                if (hit) { window.location.href = internalLink(kind, hit.id); return }
            }
            lookupError = 'NO MATCH — EXACT NAME REQUIRED'
        } catch {
            lookupError = 'LOOKUP FAILED'
        } finally {
            lookupBusy = false
        }
    }
</script>

<div class="relative w-[260px]">
    <div class="lookup">
        <input type="text" class="lookup-input" placeholder="PILOT / CORP / ALLIANCE"
            aria-label="Entity lookup"
            bind:value={searchTerm}
            oninput={() => lookupError = ''}
            onkeydown={(e) => e.key === 'Enter' && runSearch()} />
        <button type="button" class="lookup-go" onclick={runSearch}
            disabled={lookupBusy} aria-label="Look up entity">
            {lookupBusy ? '·' : '>'}
        </button>
    </div>
    {#if lookupError}
        <span class="lookup-err absolute top-full right-0 mt-1 whitespace-nowrap"
            transition:fade={{ duration: 120 }}>{lookupError}</span>
    {/if}
</div>