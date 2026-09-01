<script>
    import { onMount, onDestroy } from 'svelte'

    export let shipTypeID

    const MARGIN = 1.4

    const PATHS = {
        api: 'https://caldariprimeponyclub.com/eve/latest/',
        res: 'https://socketkill.com/res/',
        aud: 'https://caldariprimeponyclub.com/eve/latest/audio/'
    }

    let canvas
    let status = 'loading'
    let tny = null

    function loadLibrary() {
        if (window.__ccpwgl2Promise) return window.__ccpwgl2Promise

        window.__ccpwgl2Promise = new Promise((resolve, reject) => {
            if (window.CCPWGL2) return resolve(window.CCPWGL2)
            const el = document.createElement('script')
            el.src = '/ccpwgl2_int.js'
            el.onload = () => window.CCPWGL2
                ? resolve(window.CCPWGL2)
                : reject(new Error('bundle loaded but CCPWGL2 global is missing'))
            el.onerror = () => reject(new Error('failed to load ccpwgl2'))
            document.head.appendChild(el)
        })

        return window.__ccpwgl2Promise
    }

    onMount(async () => {
        try {
            const mod = await loadLibrary()
            tny = mod.tny
            const tw2 = mod.tw2

            const sof = new mod.EveSOFDataHandler()
            tw2.Register({ dnaHandler: sof.handler })
            
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height

            await tny.Initialize({
                canvas,

                camera: { canvas },

                scene: 'res:/dx9/scene/preview/generic.red',
                device: { effectProfile: 'effect.dx11' },
                paths: PATHS,
                resMan: { maxConcurrentLoads: 24 }
            })

            const ship = await tny.FetchShip(shipTypeID)
            const camera = tny.GetCamera()
            for (let i = 0; i < 40; i++) {
                if (camera.FitToScreen(ship, { margin: MARGIN })) break
                await new Promise(r => setTimeout(r, 100))
            }

            status = 'ready'

        } catch (err) {
            console.error('[ShipViewer]', err)
            status = 'failed'
        }
    })

    onDestroy(() => {
    
        try { tny?.GetScene?.()?.ClearObjects?.() } catch {}
    })
</script>

<canvas bind:this={canvas} class:hidden={status !== 'ready'}></canvas>

{#if status === 'loading'}
    <span class="msg">&gt; LOADING HULL</span>
{:else if status === 'failed'}
    <span class="msg">&gt; RENDER UNAVAILABLE</span>
{/if}

<style>
    canvas {
        width: 100%;
        height: 100%;
        display: block;
    }

    .hidden {
        visibility: hidden;
    }

    .msg {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.22em;
        color: rgb(var(--phosphor-rgb) / 0.35);
        pointer-events: none;
    }
</style>