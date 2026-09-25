<script>
    import { onMount } from 'svelte'
    import { io } from 'socket.io-client'
    import { WHALE_THRESHOLD } from '../../lib/filter-logic.js'

    const MAX_FLASHES_PER_TICK = 5
    let container

        onMount(() => {
        let map = null
        let ready = false
        let destroyed = false
        let pending = []

        import(/* @vite-ignore */ 'https://eo-map.com/embed/v1.js')
            .then(({ EOMap }) => {
                if (destroyed) return
                map = EOMap.mount(container, {})
                map.on('eo-ready', () => { ready = true })
            })
            .catch(err => console.warn('[EO-MAP] load failed', err))

                    const socket = io('https://ws.socketkill.com')
        socket.on('raw-kill', (kill) => {
            if (typeof kill.systemId === 'number') pending.push(kill)
        })

        const flush = setInterval(() => {
            const batch = pending
            pending = []
            if (!ready || batch.length === 0) return
            batch.sort((a, b) => (b.val || 0) - (a.val || 0))
            for (const kill of batch.slice(0, MAX_FLASHES_PER_TICK)) {
                if (kill.val >= WHALE_THRESHOLD) {
                    map.flash(kill.systemId, { kind: 'capital', value: kill.val })
                } else {
                    map.flash(kill.systemId, { kind: 'kill' })
                }
            }
        }, 300)

                return () => {
            destroyed = true
            clearInterval(flush)
            socket.disconnect()
            map?.destroy()
        }
    })
</script>

<div bind:this={container} class="w-full h-[calc(100dvh-24px)]"></div>