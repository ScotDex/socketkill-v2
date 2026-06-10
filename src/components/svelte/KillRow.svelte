<script>
    import { formatIsk } from '../../lib/filter-logic.js'
    import { onMount } from 'svelte'

    let { kill } = $props()
    let rowElement

    const WHALE_THRESHOLD = 10_000_000_000
    const BILLION_THRESHOLD = 1_000_000_000

    const isWhale = $derived(kill.val >= WHALE_THRESHOLD)
    const isBillion = $derived(kill.val >= BILLION_THRESHOLD)

    function getVictimDisplay(k) {
        return k.victimName === k.corpName ? k.victimName : `${k.victimName} of ${k.corpName}`
    }
</script>

<div
    class="kill-row group relative overflow-hidden flex items-center justify-between border-b border-[#1c2128] border-l-2 border-l-transparent hover:border-l-[var(--color-neon-green)] py-2 px-4 min-h-[64px] {isWhale ? 'whale-row' : ''}"
    bind:this={rowElement}
    onmousemove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    }}
>
    <div class="flex items-center flex-1">
        <a href={kill.zkillUrl} target="_blank" rel="noopener" class="flex items-center">
            <div class="w-16 h-16 bg-black border border-[var(--color-border-dim)] rounded-sm overflow-hidden mr-4">
                <img src={kill.shipImageUrl} alt="Ship" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div class="ml-2">
                <strong class="ship-name text-white text-base font-semibold block">
                    <span class="text-[var(--color-neon-green)]/70 text-xs font-mono mr-1.5">{kill.timestamp}</span>
                    {getVictimDisplay(kill)} lost {kill.article} <span class="inline-block">{kill.ship}</span>
                </strong>
                <div class="text-sm">
                    <span class="text-[var(--color-terminal-blue)] font-light text-sm" class:triglavian={kill.isTriglavian}>{kill.locationLabel}</span>
                </div>
            </div>
        </a>
    </div>

    <div class="text-white/25 font-mono text-[10px] tracking-wider mr-3">
        {kill.attackerCount} attackers
    </div>

    <div class="flex items-center">
        <div class="w-16 h-16 bg-black/40 border border-gray-700 flex items-center justify-center mr-3">
            <img src={kill.corpImageUrl} alt="Corp" class="w-[60px] h-[60px]" loading="lazy" />
        </div>
        <div class="w-16 h-16 bg-black/40 border border-gray-700 flex items-center justify-center mr-3">
            <img src={kill.allianceImageUrl} alt="Alliance" class="w-[60px] h-[60px]" loading="lazy" />
        </div>
        <div class="w-[120px] text-center">
            <div class="font-bold font-mono {isBillion ? 'text-[var(--color-isk-billion)] text-xl' : 'text-[var(--color-neon-green)] text-lg'}">
                {formatIsk(kill.val)}
            </div>
        </div>
    </div>
</div>