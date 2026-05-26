<script>
    import { onMount } from 'svelte'

    let { text = 'SOCKET.KILL', speed = 80 } = $props()

    let chars = $state([])
    let cursorVisible = $state(true)

    onMount(() => {
        let i = 0
        const interval = setInterval(() => {
            if (i < text.length) {
                chars = [...chars, text[i]]
                i++
            } else {
                clearInterval(interval)
            }
        }, speed)

        const cursorInterval = setInterval(() => {
            cursorVisible = !cursorVisible
        }, 500)

        return () => {
            clearInterval(interval)
            clearInterval(cursorInterval)
        }
    })
</script>

<span class="font-mono tracking-widest text-3xl font-bold">
    {#each chars as ch}<span class="char-land">{ch}</span>{/each}<span class="text-[var(--color-neon-green)]" class:invisible={!cursorVisible}>_</span>
</span>

<style>
    .char-land {
        display: inline-block;
        animation: char-land 0.4s ease-out forwards;
    }
</style>