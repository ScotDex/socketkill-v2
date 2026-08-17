<script>
    import TitleBoot from './TitleBoot.svelte'
    import PhosphorCounter from './PhosphorCounter.svelte'
    import { onMount } from 'svelte'
    import { killCount, serverStatus, iskDestroyed, npcKills } from '../../lib/stats-store.js'
    import { formatIsk } from '../../lib/filter-logic.js'
    const numberFormatter = (n) => n.toLocaleString()
    const tqFormatter = (status) => {
        if (status.active === false) return 'OFFLINE'
        if (status.active === true) return status.count.toLocaleString()
        return '---'
    }
    const npcFormatter = (value) => {
        if (value === null) return '...'
        if (value === 'OFFLINE') return 'OFFLINE'
        return value.toLocaleString()
    }

    onMount(() => {
        async function loadNpcKills() {
            try {
                const res = await fetch('https://ws.socketkill.com/stats/npc-kills')
                const data = await res.json()
                npcKills.set(data?.total ?? 'OFFLINE')
            } catch {
                npcKills.set('OFFLINE')
            }
        }

        loadNpcKills()
        const npcInterval = setInterval(loadNpcKills, 300_000)

        return () => clearInterval(npcInterval)
    })
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
        <span>|</span>
        <span>TQ_STATUS</span>
        <span class="text-white font-bold text-sm" class:text-yellow-400={$serverStatus.active === false}>
            <PhosphorCounter value={$serverStatus} formatter={tqFormatter} />
            {#if $serverStatus.vip}<span class="text-yellow-400 ml-1">VIP</span>{/if}
        </span>
        <span>|</span>
        <span>ISK_DESTROYED</span>
        <span class="text-white font-bold text-sm">
            <PhosphorCounter value={$iskDestroyed} formatter={formatIsk} />
        </span>
        <span>|</span>
        <span>NPC_KILLS PER HR</span>
        <span class="text-[#ffc107] font-bold text-sm [text-shadow:0_0_5px_rgba(255,193,7,0.3)]">
            <PhosphorCounter value={$npcKills} formatter={npcFormatter} />
        </span>
    </div>

    <div></div>
</header>