<script>
    import { onMount } from 'svelte'

    let { text = 'SOCKET.KILL', speed = 80 } = $props()

    let displayed = $state('')
    let cursorVisible = $state(true)

    onMount(() => {
        let i = 0
        const interval = setInterval(() => {
            if (i < text.length) {
                displayed += text[i]
                i++
            } else {
                clearInterval(interval)
            }
        }, speed)

        // Blinking cursor
        const cursorInterval = setInterval(() => {
            cursorVisible = !cursorVisible
        }, 500)

        return () => {
            clearInterval(interval)
            clearInterval(cursorInterval)
        }
    })
</script>

<span class="font-mono text-[var(--color-neon-green)] tracking-widest text-3xl font-bold">
    {displayed}<span class:invisible={!cursorVisible}>_</span>
</span>