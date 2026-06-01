<script>
    import { connectionStatus } from '../../lib/stats-store.js'
    import { searchFilters, runSearch } from '../../lib/search-store.js';

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


<div class="query-builder border border-[var(--color-border-dim)] bg-black/60 rounded-sm p-3 flex flex-col gap-4 lg:w-[280px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">


    <div class="flex items-center justify-between pb-2 border-b border-[var(--color-border-dim)]">
        <span class="font-mono text-[10px] tracking-widest uppercase text-[var(--color-neon-green)]/50">UPLINK</span>
        <span class="font-mono text-xs {statusClasses[$connectionStatus]}">
            {statusText[$connectionStatus]}
        </span>
    </div>
    
    <div class="flex items-center gap-2 pb-2 border-b border-[var(--color-border-dim)]">
        <span class="text-[var(--color-neon-green)] text-xs">&gt;</span>
        <span class="text-[var(--color-neon-green)] font-mono text-sm tracking-widest">QUERY BUILDER</span>
    </div>

   
    <div class="flex flex-col gap-2">
        <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
            STATUS
        </label>
        <div class="border border-[var(--color-border-dim)] bg-black/40 px-3 py-2 font-mono text-xs text-[var(--color-neon-green)]/60">
            MODULE OFFLINE
        </div>
    </div>

    
    <div class="flex flex-col gap-2 opacity-40">
        <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
            DATE RANGE
        </label>
        <div class="border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-[var(--color-neon-green)]/40">
            ── / ── / ──
        </div>
    </div>

    <div class="flex flex-col gap-2 opacity-40">
        <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
            SEC BAND
        </label>
        <div class="flex gap-1">
            <div class="flex-1 border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-center text-[var(--color-neon-green)]/40">HI</div>
            <div class="flex-1 border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-center text-[var(--color-neon-green)]/40">LO</div>
            <div class="flex-1 border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-center text-[var(--color-neon-green)]/40">NUL</div>
            <div class="flex-1 border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-center text-[var(--color-neon-green)]/40">WH</div>
        </div>
    </div>

    <div class="flex flex-col gap-2 opacity-40">
        <label class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70">
            SHIP CLASS
        </label>
        <div class="border border-[var(--color-border-dim)] px-2 py-1 font-mono text-xs text-[var(--color-neon-green)]/40 italic">
            SELECT CLASS
        </div>
    </div>

   
    <div class="mt-auto pt-2 border-t border-[var(--color-border-dim)]">
        <div class="font-mono text-[10px] tracking-widest text-[var(--color-neon-green)]/40 uppercase">
            &gt; HISTORICAL ARCHIVE
        </div>
        <div class="font-mono text-[10px] text-[var(--color-neon-green)]/30 mt-1">
            Query interface under construction
        </div>
    </div>
</div>