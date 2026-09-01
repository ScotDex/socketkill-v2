<script>
    import { onDestroy } from 'svelte'

    export let shipTypeID

    const MARGIN = 1.4

    const PATHS = {
        api: 'https://caldariprimeponyclub.com/eve/latest/',
        res: 'https://socketkill.com/res/',
        aud: 'https://caldariprimeponyclub.com/eve/latest/audio/'
    }

    let canvas
    let tny = null

    // 'idle' is just the button - no stage, no canvas, no bundle. A hull is
    // ~58MB of geometry and textures, which is not a cost to put on someone
    // who came to read the manifest.
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

        // Swaps the button for the stage. The canvas doesn't exist until
        // Svelte has flushed this, hence the frame wait below.
        status = 'loading'

        try {
            const mod = await loadLibrary()
            tny = mod.tny
            const tw2 = mod.tw2

            // Without this, Initialize fetches the whole data.black SOF
            // catalog - every hull in the game. The handler boots from
            // generic.black and pulls only what this DNA needs.
            const sof = new mod.EveSOFDataHandler()
            tw2.Register({ dnaHandler: sof.handler })

            // Wait for the stage to be in the DOM and laid out before reading
            // its size - the canvas is created by the status change above.
            await new Promise(r => requestAnimationFrame(r))

            // CSS sizes the element; these attributes size the drawing buffer
            // WebGL renders into. Without them it stays at 300x150.
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

            // The canvas sits in a scrolling column, so wheel events over it
            // would scroll the page while the reader is trying to zoom.
            // passive:false is required for preventDefault to apply.
            canvas.addEventListener('wheel', e => e.preventDefault(), { passive: false })

            const ship = await tny.FetchShip(shipTypeID)
            const camera = tny.GetCamera()

            // FetchShip resolves when the object is built, but geometry keeps
            // preparing afterwards and GetBoundingSphere has no radius until
            // it lands. FitToScreen returns null rather than guessing.
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

{#if status === 'idle'}
    <button type="button" class="render-btn" on:click={render}>&gt; RENDER IN 3D</button>
{:else}
    <div class="stage">
        <canvas bind:this={canvas} class:hidden={status !== 'ready'}></canvas>
        {#if status === 'loading'}
            <span class="msg">&gt; GENERATING</span>
        {:else if status === 'failed'}
            <span class="msg">&gt; RENDER UNAVAILABLE</span>
        {/if}
    </div>
{/if}

<style>
    .stage {
        position: relative;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background:
            radial-gradient(ellipse at center,
                rgb(var(--phosphor-rgb) / 0.05) 0%,
                transparent 70%),
            #05070a;
    }

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

    .render-btn {
        width: 100%;
        padding: 0.6rem;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.22em;
        color: var(--color-text-faint);
        background: transparent;
        border: 0;
        cursor: pointer;
        transition: color 0.15s, background 0.15s;
    }

    .render-btn:hover {
        color: var(--color-neon-green);
        background: rgb(var(--phosphor-rgb) / 0.05);
    }
</style>