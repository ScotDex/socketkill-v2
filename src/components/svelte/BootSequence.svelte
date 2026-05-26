<script>
    import { onMount } from 'svelte'

    let displayedLines = $state([])
    let currentLine = $state('')
    let dotsActive = $state(false)

    const bootLines = [
        '> INITIALIZING GRID MONITOR...',
        '> CONNECTING TO DATASOURCE...',
        '> CREW EXPENDABLE — PRIORITY ONE OVERRIDE',
        '> UPLINK ESTABLISHED',
        '> AWAITING DATA STREAM'
    ]

    onMount(() => {
        let lineIndex = 0
        let charIndex = 0

        function typeChar() {
            if (lineIndex >= bootLines.length) {
                dotsActive = true
                return
            }

            const line = bootLines[lineIndex]
            if (charIndex < line.length) {
                currentLine = line.slice(0, charIndex + 1)
                charIndex++
                setTimeout(typeChar, 30)
            } else {
                displayedLines = [...displayedLines, currentLine]
                currentLine = ''
                lineIndex++
                charIndex = 0
                if (lineIndex < bootLines.length) {
                    setTimeout(typeChar, 200)
                } else {
                    dotsActive = true
                }
            }
        }

        typeChar()
    })
</script>

<div class="boot-sequence">
    {#each displayedLines as line}
        <div>{line}</div>
    {/each}
    {#if currentLine}
        <div>{currentLine}</div>
    {/if}
    {#if dotsActive}
        <div class="dot-pulse"></div>
    {/if}
</div>

<style>
    .boot-sequence {
        white-space: pre;
        font-family: var(--font-mono);
        font-size: 0.85rem;
        letter-spacing: 1px;
        line-height: 1.8;
        color: var(--color-neon-green);
        padding: 2rem;
        text-align: left;
        display: inline-block;
    }

    .dot-pulse::after {
        content: '.';
        animation: dots 1.5s steps(3, end) infinite;
    }

    @keyframes dots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60% { content: '...'; }
    }
</style>