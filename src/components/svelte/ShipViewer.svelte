<script>
    import { onMount, onDestroy } from 'svelte'

    export let shipTypeID
    export let posterUrl = null

    const MARGIN = 1.4
    const DWELL_MS = 8000
const DRIFT_PER_MS = 360 / 60000

    const PATHS = {
        api: 'https://caldariprimeponyclub.com/eve/latest/',
        res: 'https://socketkill.com/res/',
        aud: 'https://caldariprimeponyclub.com/eve/latest/audio/'
    }

    let canvas
    let stage
    let tny = null
    let timer = null

    // The static render holds the frame until ccpwgl2 has a hull to show. A
    // hull is ~58MB, so nothing is fetched until the reader has actually sat
    // with this card - see the observer below.
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

            // Without this, Initialize fetches the whole data.black SOF
            // catalog - every hull in the game, ~183MB. The handler boots
            // from generic.black and pulls only what this DNA needs.
            const sof = new mod.EveSOFDataHandler()
            tw2.Register({ dnaHandler: sof.handler })

            // CSS sizes the element; these attributes size the drawing buffer
            // WebGL renders into. Without them it stays at 300x150. The stage
            // is already at its final size here - no accordion to wait on.
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

            let last = performance.now()
            const drift = now => {
                camera.rotationY += (now - last) * DRIFT_PER_MS
                last = now
                raf = requestAnimationFrame(drift)
            }
            raf = requestAnimationFrame(drift)

            // Rotating under someone who is dragging to look at something is
            // worse than no drift at all, so it stops for good on first touch.
            canvas.addEventListener('pointerdown', () => {
                cancelAnimationFrame(raf)
                raf = null
            }, { once: true })

        } catch (err) {
            console.error('[ShipViewer]', err)
            status = 'failed'
        }
    }

    // Dwell alone would charge someone 58MB for reading the manifest without
    // ever looking up here, so the clock only runs while the card is on
    // screen and resets if they scroll past.
    onMount(() => {
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && status === 'idle') {
                timer = setTimeout(render, DWELL_MS)
            } else {
                clearTimeout(timer)
                timer = null
            }
        }, { threshold: 0.5 })

        io.observe(stage)

        return () => {
            io.disconnect()
            clearTimeout(timer)
        }
    })

    onDestroy(() => {
        cancelAnimationFrame(raf)
        try { tny?.GetScene?.()?.ClearObjects?.() } catch {}
    })
</script>

<div class="stage" bind:this={stage}>
    {#if posterUrl}
        <img class="poster" class:gone={status === 'ready'} src={posterUrl} alt="" />
    {/if}

    <canvas bind:this={canvas} class:visible={status === 'ready'}></canvas>

    {#if status === 'failed'}
        <span class="msg">&gt; RENDER UNAVAILABLE</span>
    {/if}
</div>

<style>
    .stage {
        position: relative;
        width: 100%;
        height: 100%;
        background: #05070a;
    }

    .poster, canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
        -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 100%);
    }

    /* Carries what .cover img used to do, so nothing shifts visually until
       the hull lands. */
    .poster {
        object-fit: cover;
        object-position: center 30%;
        z-index: 1;
        opacity: 1;
        transition: opacity 0.8s ease-out;
    }

    .poster.gone {
        opacity: 0;
        pointer-events: none;
    }

    canvas {
        opacity: 0;
        transition: opacity 0.8s ease-out;
    }

    canvas.visible {
        opacity: 1;
    }

    .msg {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: grid;
        place-items: center;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.22em;
        color: rgb(var(--phosphor-rgb) / 0.35);
        pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
        .poster, canvas { transition: none; }
    }
</style>