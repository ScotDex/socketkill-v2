<script>
    import TitleBoot from './TitleBoot.svelte'
    import PhosphorCounter from './PhosphorCounter.svelte'
    import { killCount, serverStatus, iskDestroyed } from '../../lib/stats-store.js'
    import { formatIsk } from '../../lib/filter-logic.js'

    // Formatter for raw numeric counters
    const numberFormatter = (n) => n.toLocaleString()

    // Formatter for TQ — handles the active/null/offline states
    const tqFormatter = (status) => {
        if (status.active === false) return 'OFFLINE'
        if (status.active === true) return status.count.toLocaleString()
        return '---'
    }
</script>

<header class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10 pb-3 mb-4">
    <div class="min-w-0">
        <TitleBoot />
    </div>

    <div class="flex items-center gap-2 text-xs uppercase tracking-widest opacity-40 whitespace-nowrap">
        <span>KILLMAILS PROCESSED</span>
        <span class="text-white font-bold text-sm">
            <PhosphorCounter value={$killCount} formatter={numberFormatter} />
        </span>
        <span>//</span>
        <span>TQ_STATUS</span>
        <span class="text-white font-bold text-sm" class:text-yellow-400={$serverStatus.active === false}>
            <PhosphorCounter value={$serverStatus} formatter={tqFormatter} />
            {#if $serverStatus.vip}<span class="text-yellow-400 ml-1">VIP</span>{/if}
        </span>
        <span>//</span>
        <span>ISK_DESTROYED</span>
        <span class="text-white font-bold text-sm">
            <PhosphorCounter value={$iskDestroyed} formatter={formatIsk} />
        </span>
    </div>

    <div></div>
</header>