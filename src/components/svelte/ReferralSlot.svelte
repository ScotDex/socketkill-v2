<script>
  import { onMount } from 'svelte'

  // Partner slides. Image spec: 600 × 300 (2:1).
  // kind: 'referral' (yours) | 'sponsor' (rented for ISK)
  const slides = [
    {
      img: 'https://edge.socketkill.com/friendimage.jpeg',
      href: 'https://www.eveonline.com/signup?invc=e32ca441-aa95-4eb7-ad06-d2c6334a5872',
      alt: 'Start playing EVE Online with a bonus 1 million skill points',
      kind: 'referral',
    },
    {
      img: 'https://edge.socketkill.com/PartnerBadge2.png',
      href: 'https://www.eveonline.com/partners',
      alt: 'Socket.Kill is an Eve Partner Site',
      kind: 'referral',
    },
    {
      img: 'https://edge.socketkill.com/NoD_Stacked_White.png',
      href: 'https://www.eveonline.com/partners',
      alt: 'Nerd or Die Advertising',
      kind: 'referral',
    },
  ]

  // framed: true on /about (standalone box), false inside the home rail
  let { interval = 8000, framed = false } = $props()

  let current = $state(0)
  let paused  = $state(false)

  // Random start so every rented slot gets a fair share of first impressions.
  onMount(() => { current = Math.floor(Math.random() * slides.length) })

  // Re-runs whenever `paused` or `interval` changes. The returned function is
  // the cleanup: Svelte calls it before re-running and when the component is
  // destroyed, so the timer can never leak across page navigations.
  $effect(() => {
    if (paused || slides.length < 2) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => { current = (current + 1) % slides.length }, interval)
    return () => clearInterval(id)
  })
</script>

{#if slides.length}
  <section
    class="ref"
    class:framed
    aria-label="Referrals and sponsors"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    onfocusin={() => (paused = true)}
    onfocusout={() => (paused = false)}
  >
    <div class="stage">
      <span class="kind">{slides[current].kind}</span>
      {#each slides as s, i}
        <a
          href={s.href}
          target="_blank"
          rel="sponsored noopener"
          class="item"
          class:on={i === current}
          aria-hidden={i !== current}
          tabindex={i === current ? 0 : -1}
        >
          <img src={s.img} alt={s.alt} width="600" height="300"
            loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
        </a>
      {/each}
    </div>

    <div class="meta">
      {#if slides.length > 1}
        <div class="dots" role="group" aria-label="Choose slide">
          {#each slides as _, i}
            <button type="button" aria-label={`Show slide ${i + 1}`}
              aria-current={i === current} onclick={() => (current = i)}></button>
          {/each}
        </div>
      {/if}
      <a class="foot" href="/about#advertise">Rent this slot for ISK</a>
    </div>
  </section>
{/if}

<style>
  .ref {
    border-top: 1px solid var(--color-border-dim);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ref.framed {
    border: 1px solid var(--color-border-dim);
    background: rgb(13 15 19 / 0.85);
  }

  /* Label sits on top of the image instead of taking its own row. */
  .kind {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 1;
    padding: 1px 5px;
    background: rgb(10 11 14 / 0.8);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-neon-green);
  }

  /* Every slide shares one grid cell, so the box never changes size. */
  .stage {
    display: grid;
    position: relative;
    aspect-ratio: 2 / 1;
    background: var(--color-dark-bg);
    border: 1px solid var(--color-eve-border);
  }

  .item {
    grid-area: 1 / 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.8s ease-in-out;
  }

  .item.on { opacity: 1; pointer-events: auto; }

  .item:focus-visible { outline: 1px solid var(--color-neon-green); outline-offset: -3px; }

  .item img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .dots { display: flex; gap: 6px; }

  .dots button {
    width: 18px;
    height: 3px;
    padding: 0;
    border: 0;
    background: var(--color-border-mid);
    cursor: pointer;
  }

  .dots button[aria-current='true'] { background: var(--color-neon-green); }

  .foot {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-neon-green);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .item { transition: none; }
  }
</style>