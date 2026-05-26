<script>
    import TitleBoot from './TitleBoot.svelte'
    import { killCount, playerCount, iskDestroyed, connectionStatus } from '../../lib/stats-store.js'
    import { formatIsk } from '../../lib/filter-logic.js'

    const statusClasses = {
        connecting: 'text-red-400',
        online: 'text-[var(--color-neon-green)]',
        offline: 'text-yellow-400'
    }

    const statusText = {
        connecting: '● CONNECTING...',
        online: '● ONLINE',
        offline: '● OFFLINE'
    }
</script>

<header class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-white/10 pb-3 mb-4">
    <div class="min-w-0">
        <TitleBoot />
    </div>

    <div class="flex items-center gap-2 text-xs uppercase tracking-widest opacity-40 whitespace-nowrap">
        <span>KILLMAILS PROCESSED</span>
        <span class="text-white font-bold text-sm">{$killCount.toLocaleString()}</span>
        <span>//</span>
        <span>TQ_STATUS</span>
        <span class="text-white font-bold text-sm">{$playerCount}</span>
        <span>//</span>
        <span>ISK_DESTROYED</span>
        <span class="text-white font-bold text-sm">{formatIsk($iskDestroyed)}</span>
    </div>

    <div>
        <div class={statusClasses[$connectionStatus]}>
            {statusText[$connectionStatus]}
        </div>
    </div>
</header>