<script>
    let {
        label,
        items = $bindable([]),
        suggestions = [],
        placeholder = 'ADD',
        maxItems = Infinity,
        allowFreeText = false
    } = $props()

    let input = $state('')
    let selectedIndex = $state(-1)

    const filtered = $derived(
        input.length < 2
            ? []
            : suggestions
                .filter(s => s.toLowerCase().includes(input.toLowerCase()) && !items.includes(s))
                .sort()
                .slice(0, 6)
    )

    const showSuggestions = $derived(filtered.length > 0)
    const atMax = $derived(items.length >= maxItems)

    function add(value) {
        if (atMax || items.some(i => i.toLowerCase() === value.toLowerCase())) return
        items = [...items, value]
        input = ''
        selectedIndex = -1
    }

    function remove(value) {
        items = items.filter(i => i !== value)
    }

    function handleKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (selectedIndex >= 0 && filtered[selectedIndex]) {
                add(filtered[selectedIndex])
            } else if (allowFreeText && input.trim()) {
                add(input.trim())
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (filtered.length > 0) {
                selectedIndex = (selectedIndex + 1) % filtered.length
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (filtered.length > 0) {
                selectedIndex = selectedIndex <= 0 ? filtered.length - 1 : selectedIndex - 1
            }
        } else if (e.key === 'Escape') {
            input = ''
            selectedIndex = -1
        }
    }
</script>

<div class="flex flex-col gap-2" data-active={items.length > 0}>
    <label class="facet-lbl">
        {label}
    </label>

    {#if items.length > 0}
        <div class="flex flex-wrap gap-1">
            {#each items as item (item)}
                <span class="inline-flex items-center gap-1 bg-[var(--color-neon-green)]/10 border border-[var(--color-border-mid)] text-[var(--color-neon-green)] font-mono text-xs px-1.5 py-0.5 uppercase">
                    {item}
                    <button
                        type="button"
                        class="bg-transparent border-none text-[var(--color-neon-green)]/50 cursor-pointer text-sm leading-none hover:text-[var(--color-isk-billion)]"
                        onclick={() => remove(item)}
                    >×</button>
                </span>
            {/each}
        </div>
    {/if}

    <div class="relative">
        <input
            type="text"
            class="w-full bg-transparent border border-[var(--color-border-dim)] text-[var(--color-neon-green)] font-mono text-sm tracking-wider px-2 py-1 outline-none focus:border-[var(--color-border-bright)] placeholder:text-[var(--color-neon-green)]/30 placeholder:uppercase placeholder:italic disabled:opacity-50"
            placeholder={atMax ? 'MAX REACHED' : placeholder}
            bind:value={input}
            onkeydown={handleKeydown}
            disabled={atMax}
        />

        {#if showSuggestions}
            <div class="absolute top-full left-0 right-0 bg-black/95 border border-[var(--color-border-mid)] border-t-0 max-h-60 overflow-y-auto z-50 shadow-lg">
                {#each filtered as suggestion, i}
                    <div
                        class="px-3 py-1.5 font-mono text-xs cursor-pointer border-b border-[var(--color-neon-green)]/10 last:border-b-0 hover:bg-[var(--color-neon-green)]/15 hover:text-[var(--color-neon-green)] {i === selectedIndex ? 'bg-[var(--color-neon-green)]/15 text-[var(--color-neon-green)]' : 'text-[var(--color-neon-green)]/70'}"
                        onclick={() => add(suggestion)}
                        role="button"
                        tabindex="0"
                    >
                        {suggestion}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .facet-lbl {
        font-family: var(--font-body);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--color-border-bright);
        user-select: none;
    }
</style>