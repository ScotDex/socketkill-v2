<script>
    import { Tween } from 'svelte/motion'
    const bootLines = [
        '> INITIALIZING GRID MONITOR...',
        '> CONNECTING TO DATASTREAM...',
        '> CREW EXPENDABLE — PRIORITY ONE OVERRIDE',
        '> UPLINK ESTABLISHED',
        '> AWAITING DATA STREAM'
    ]
    const fullText = bootLines.join('\n')
    const chars = new Tween(0, { duration: fullText.length * 40 })
    chars.set(fullText.length)
    const shown = $derived(fullText.slice(0, Math.floor(chars.current)))
    const done = $derived(chars.current >= fullText.length)
    const skip = () => chars.set(fullText.length, { duration: 0 })
</script>
<svelte:window onkeydown={skip} />

<div class="boot-sequence" onclick={skip}>
    {#each shown.split('\n') as line, i}
        <div>
            {line}{#if !done && i === shown.split('\n').length - 1}<span class="cursor">█</span>{/if}{#if done && i === bootLines.length - 1}<span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>{/if}
        </div>
    {/each}
</div>

