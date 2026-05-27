<script>
    let { value, formatter = null } = $props()

    
    const displayString = $derived(formatter ? formatter(value) : String(value))
    let previousString = $state('')
    const tokens = $derived.by(() => {
        const current = displayString
        const prev = previousString

        const result = []
        const currentLen = current.length
        const prevLen = prev.length

        for (let i = 0; i < currentLen; i++) {
            const char = current[i]
            const isDigit = /\d/.test(char)
            const posFromRight = currentLen - 1 - i
            const prevChar = posFromRight < prevLen ? prev[prevLen - 1 - posFromRight] : null
            const changed = char !== prevChar

            result.push({
                char,
                isDigit,
                changed: changed && isDigit,
                posFromRight,
                key: `${posFromRight}-${char}-${changed ? Date.now() : 'stable'}`
            })
        }

        return result
    })
    $effect(() => {
    const settled = displayString
    setTimeout(() => { previousString = settled }, 300)
})
</script>

<span class="phosphor-counter">
    {#each tokens as token (token.key)}
        {#if token.changed}
            <span class="digit-changed" style="--stagger: {token.posFromRight * 40}ms">{token.char}</span>
        {:else}
            <span class="digit-stable">{token.char}</span>
        {/if}
    {/each}
</span>

<style>
    .phosphor-counter {
        display: inline-block;
        font-variant-numeric: tabular-nums;
    }

    .digit-stable {
        display: inline-block;
    }

    .digit-changed {
        display: inline-block;
        animation: phosphor-tick 250ms linear forwards;
        animation-delay: var(--stagger, 0ms);
    }

    @keyframes phosphor-tick {
        0% {
            color: #fff;
            text-shadow:
                0 0 6px #fff,
                0 0 12px var(--color-neon-green);
            transform: translateY(-0.2em);
            opacity: 0;
        }
        20% {
            opacity: 1;
            transform: translateY(0);
        }
        100% {
            color: inherit;
            text-shadow: 0 0 4px rgba(63, 185, 80, 0.4);
            transform: translateY(0);
            opacity: 1;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .digit-changed {
            animation: none;
        }
    }
</style>