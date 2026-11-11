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
        class="facet-lbl"
    >
        WEAPON KEYWORD
    </label>

    <div class="relative">
        <input
            id="weapon-keyword-input"
            type="text"
            bind:value={keyword}
            placeholder="e.g. smartbomb, neut, ECM"
            class="w-full bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)] ui text-sm px-2 py-1 outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-neon-green)]"
            autocomplete="off"
            spellcheck="false"
        />
        {#if keyword}
            <button
                type="button"
                onclick={clear}
                aria-label="Clear weapon keyword"
                class="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-neon-green)] cursor-pointer text-sm leading-none px-1"
            >×</button>
        {/if}
    </div>

    {#if keyword && keyword.length >= 3}
        <div class="ui text-xs text-[var(--color-text-faint)]" aria-live="polite">
    {#if matchCount > 0}
        {matchCount} {matchCount === 1 ? 'match' : 'matches'}
    {:else}
        No matches
    {/if}
</div>
    {/if}
</div>

