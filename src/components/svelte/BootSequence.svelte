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
    {shown}{#if !done}<span class="cursor">█</span>{/if}
    {#if done}<div class="dot-pulse"></div>{/if}
</div>

<style>
    .cursor { animation: blink 1s steps(2) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    /* keep your existing .boot-sequence / .dot-pulse styles */
</style>