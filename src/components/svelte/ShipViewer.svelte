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

    // 'idle' is the button alone - the stage sits at zero height and the
    // bundle isn't requested. A hull is ~58MB, which is not a cost to put on
    // someone who came to read the manifest.
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

        // Opens the accordion and creates the canvas.
        status = 'loading'

        try {
            const mod = await loadLibrary()
            tny = mod.tny
            const tw2 = mod.tw2

            // Without this, Initialize fetches the whole data.black SOF
            // catalog - every hull in the game, ~183MB. The handler boots
            // from generic.black and pulls only what this DNA needs.
            const sof = new mod.EveSOFDataHandler()
            tw2.Register({ dnaHandler: sof.handler })

            // The stage is mid-transition at this point, so its height is
            // still climbing. Wait for the accordion to settle before reading
            // it, or the drawing buffer is sized against a partial height.
            await new Promise(resolve => {
                const done = () => resolve()
                canvas.parentElement.addEventListener('transitionend', done, { once: true })
                // Fallback: if the transition never fires (reduced motion,
                // interrupted), don't hang here.
                setTimeout(done, 700)
            })

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
{/if}

<div class="stage" class:open={status !== 'idle'}>
    {#if status !== 'idle'}
        <canvas bind:this={canvas} class:hidden={status !== 'ready'}></canvas>

        {#if status === 'loading'}
            <span class="msg">
                &gt; GENERATING<span class="dots"><span>.</span><span>.</span><span>.</span></span>
            </span>
        {:else if status === 'failed'}
            <span class="msg">&gt; RENDER UNAVAILABLE</span>
        {/if}
    {/if}
</div>

<style>
    /* Accordion. Zero height when idle, so the card is just its header and
       the button until the reader asks for a hull. */
    .stage {
        position: relative;
        height: 0;
        overflow: hidden;
        transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        background:
            radial-gradient(ellipse at center,
                rgb(var(--phosphor-rgb) / 0.05) 0%,
                transparent 70%),
            #05070a;
    }

    .stage.open {
        height: 400px;
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

    /* Same cadence as the boot sequence dots, so the wait reads as part of
       the same interface rather than a new idiom. */
    .dots span {
        opacity: 0;
        animation: viewer-dot-cycle 1.4s infinite;
    }

    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes viewer-dot-cycle {
        0%, 70%, 100% { opacity: 0; }
        25%, 50%      { opacity: 1; }
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

    @media (prefers-reduced-motion: reduce) {
        .stage { transition: none; }
        .dots span { animation: none; opacity: 1; }
    }
</style>