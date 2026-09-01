<script>
    import { onMount, onDestroy } from 'svelte'

    export let shipTypeID
    export let shipName = ''
    export let staticRenderUrl = ''

    const MARGIN = 1.4

    const PATHS = {
        api: 'https://caldariprimeponyclub.com/eve/latest/',
        res: 'https://socketkill.com/res/',
        aud: 'https://caldariprimeponyclub.com/eve/latest/audio/'
    }

    let canvas
    let tny = null
    let status = 'idle'

    function loadLibrary() {
        if (window.__ccpwgl2Promise) return window.__ccpwgl2Promise

        window.__ccpwgl2Promise = new Promise((resolve, reject) => {
            if (window.CCPWGL2) return resolve(window.CCPWGL2)
            const el = document.createElement('script')
            el.src = '/ccpwgl2_int.min.js'
            el.onload = () => window.CCPWGL2
                ? resolve(window.CCPWGL2)
                : reject(new Error('bundle loaded but CCPWGL2 global is missing'))
            el.onerror = () => reject(new Error('failed to load ccpwgl2'))
            document.head.appendChild(el)
        })

        return window.__ccpwgl2Promise
    }

    async function render() {
        if (status !== 'idle') return
        status = 'loading'

        try {
            const mod = await loadLibrary()
            tny = mod.tny
            const tw2 = mod.tw2

        
            const sof = new mod.EveSOFDataHandler()
            tw2.Register({ dnaHandler: sof.handler })

            await new Promise(r => requestAnimationFrame(r))
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height

            await tny.Initialize({
                canvas,

                // TnyCameraTest mirrors values onto a `wrapped` camera that
                // only exists once AttachCanvas has run. Without a canvas
                // here, FitToScreen computes a distance that never applies.
                camera: { canvas },

                scene: 'res:/dx9/scene/preview/generic.red',
                device: { effectProfile: 'effect.dx11' },
                paths: PATHS,
                resMan: { maxConcurrentLoads: 24 }
            })

            canvas.addEventListener('wheel', e => e.preventDefault(), { passive: false })

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
    }

    onDestroy(() => {
        try { tny?.GetScene?.()?.ClearObjects?.() } catch {}
    })
</script>

<div class="stage" class:expanded={status !== 'idle'}>
    {#if status === 'idle'}
        <img src={staticRenderUrl} alt={shipName} loading="lazy" />
    {:else}
        <canvas bind:this={canvas} class:hidden={status !== 'ready'}></canvas>
        {#if status === 'loading'}
            <span class="msg">&gt; GENERATING</span>
        {:else if status === 'failed'}
            <span class="msg">&gt; RENDER UNAVAILABLE</span>
        {/if}
    {/if}
</div>

{#if status === 'idle'}
    <button type="button" class="render-btn" on:click={render}>&gt; RENDER IN 3D</button>
{/if}

<style>
    .stage {
    position: relative;
    height: 0;
    overflow: hidden;
    transition: height 0.4s ease;
}

.stage.expanded {
    height: 400px;
}

    canvas {
        width: 100%;
        height: 100%;
        display: block;
    }

    img {
        position: absolute;
        inset: 0;
        margin: auto;
        max-width: 100%;
        max-height: 88%;
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

    .render-btn {
        width: 100%;
        padding: 0.5rem;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.22em;
        color: var(--color-text-faint);
        background: transparent;
        border: 0;
        border-top: 1px solid var(--color-border-dim);
        cursor: pointer;
        transition: color 0.15s, background 0.15s;
    }

    .render-btn:hover {
        color: var(--color-neon-green);
        background: rgb(var(--phosphor-rgb) / 0.05);
    }
</style>