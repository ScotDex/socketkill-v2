<script>
    import { Tween } from 'svelte/motion'

    const bootLines = [
        '> INITIALIZING GRID MONITOR...',
        '> CONNECTING TO DATASOURCE...',
        '> CREW EXPENDABLE — PRIORITY ONE OVERRIDE',
        '> UPLINK ESTABLISHED',
        '> AWAITING DATA STREAM'
    ]
    const fullText = bootLines.join('\n')

    const chars = new Tween(0, { duration: fullText.length * 40 }) // linear by default
    chars.set(fullText.length)

    const shown = $derived(fullText.slice(0, Math.floor(chars.current)))
    const done = $derived(chars.current >= fullText.length)

    const skip = () => chars.set(fullText.length, { duration: 0 })
</script>

<svelte:window onkeydown={skip} />


<div class="boot-sequence" onclick={skip}>
    {#each shown.split('\n') as line, i}
        <div>{line}{#if !done && i === shown.split('\n').length - 1}<span class="cursor">█</span>{/if}</div>
    {/each}
    {#if done}<div class="dot-pulse"></div>{/if}
</div>

<style>
    .boot-sequence {
        font-family: var(--font-mono);
        font-size: 0.85rem;
        letter-spacing: 1px;
        line-height: 1.8;
        color: var(--color-neon-green);
        text-shadow: 0 0 6px var(--color-neon-green);
        padding: 2rem;
        text-align: left;
    }
    .cursor { animation: blink 1s steps(2) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
</style>