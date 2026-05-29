<script>
    import { itemsFuse, resolveWeaponKeyword } from '../../lib/filter-source-store.js'

    let { keyword = $bindable('') } = $props()

    const matchedIDs = $derived(resolveWeaponKeyword(keyword, $itemsFuse))
    const matchCount = $derived(matchedIDs.size)

    function clear() {
        keyword = ''
    }
</script>

<div class="flex flex-col gap-2">
    <label
        for="weapon-keyword-input"
        class="font-mono text-xs tracking-widest uppercase text-[var(--color-neon-green)]/70"
    >
        WEAPON KEYWORD
    </label>

    <div class="relative">
        <input
            id="weapon-keyword-input"
            type="text"
            bind:value={keyword}
            placeholder="smartbomb, neut, ECM…"
            class="w-full bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)] font-mono text-xs px-2 py-1.5 outline-none italic placeholder:text-[var(--color-neon-green)]/40 placeholder:italic focus:border-[var(--color-neon-green)]/70"
            autocomplete="off"
            spellcheck="false"
        />
        {#if keyword}
            <button
                type="button"
                onclick={clear}
                aria-label="Clear"
                class="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--color-neon-green)]/40 hover:text-[var(--color-neon-green)] font-mono cursor-pointer text-sm leading-none px-1"
            >×</button>
        {/if}
    </div>

    {#if keyword && keyword.length >= 3}
        <div class="font-mono text-[0.65rem] tracking-wider text-[var(--color-neon-green)]/50">
            {#if matchCount > 0}
                {matchCount} MATCH{matchCount === 1 ? '' : 'ES'}
            {:else}
                NO MATCHES
            {/if}
        </div>
    {/if}
</div>