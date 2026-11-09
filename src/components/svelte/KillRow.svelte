<script>
    import { formatIsk, WHALE_THRESHOLD, BILLION_THRESHOLD } from '../../lib/filter-logic.js'
    let { kill } = $props()
    const isWhale = $derived(kill.val >= WHALE_THRESHOLD)
    const isBillion = $derived(kill.val >= BILLION_THRESHOLD)
    function getVictimDisplay(k) {
        return k.victimName === k.corpName ? k.victimName : `${k.victimName} of ${k.corpName}`
    }
</script>


<div
    class="kill-row group relative overflow-hidden flex items-center justify-between border-b border-[#1c2128] border-l-2 border-l-transparent hover:border-l-[var(--color-neon-green)] py-2 px-4 min-h-[64px] {isWhale ? 'whale-row' : ''}"
    onmousemove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    }}
>
    <div class="flex items-center flex-1">
        <a href={kill.zkillUrl} target="_blank" rel="noopener noreferrer" class="flex items-center">
            <div class="w-16 h-16 bg-black border border-[var(--color-border-dim)] rounded-sm overflow-hidden mr-4">
                <img src={kill.shipImageUrl} alt="" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div class="ml-2">
                <span class="ship-name text-white text-base block">
                    <span class="text-[var(--color-text-faint)] text-sm font-mono mr-1.5">{kill.timestamp}</span>
                    <strong class="font-semibold">{getVictimDisplay(kill)}</strong>
                    lost {kill.article}
                    <strong class="font-semibold inline-block">{kill.ship}</strong>
                </span>
                <div>
                    <span class="text-[var(--color-terminal-blue)] text-sm"
                        class:triglavian={kill.isTriglavian}
                        title={kill.isTriglavian ? kill.locationLabel : undefined}>
                        {kill.locationLabel}
                    </span>
                </div>
            </div>
        </a>
    </div>
    <div class="flex items-center">
        <div class="w-16 h-16 bg-black/40 border border-gray-700 flex items-center justify-center mr-3">
            <img src={kill.corpImageUrl} alt={kill.corpName} class="w-[60px] h-[60px]" loading="lazy" />
        </div>
        <div class="w-16 h-16 bg-black/40 border border-gray-700 flex items-center justify-center mr-3">
            <img src={kill.allianceImageUrl} alt={kill.allianceName ?? ''} class="w-[60px] h-[60px]" loading="lazy" />
        </div>
        <div class="w-[120px] text-right pr-2">
            <div class="font-bold font-mono {isBillion ? 'text-[var(--color-whale-accent)] text-xl' : 'text-[var(--color-neon-green)] text-lg'}">
                {formatIsk(kill.val)}
            </div>
            <div class="kill-attackers text-[var(--color-text-faint)] font-mono text-xs mt-0.5">
                {kill.attackerCount} {kill.attackerCount === 1 ? 'attacker' : 'attackers'}
            </div>
        </div>
    </div>
</div>