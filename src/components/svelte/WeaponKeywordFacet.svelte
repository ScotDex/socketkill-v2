
<script>
  import { itemsFuse, resolveWeaponKeyword } from '../../lib/filter-source-store.js';

  let { keyword = $bindable('') } = $props();

  // Derived match count for live feedback — recomputes only when keyword or
  // the Fuse index changes.
  const matchedIDs = $derived(resolveWeaponKeyword(keyword, $itemsFuse));
  const matchCount = $derived(matchedIDs.size);

  function clear() {
    keyword = '';
  }
</script>

<div class="facet">
  <label class="facet-label" for="weapon-keyword-input">WEAPON KEYWORD</label>

  <div class="input-row">
    <input
      id="weapon-keyword-input"
      type="text"
      bind:value={keyword}
      placeholder="smartbomb, neut, ECM…"
      class="weapon-input"
      autocomplete="off"
      spellcheck="false"
    />
    {#if keyword}
      <button type="button" class="clear-btn" onclick={clear} aria-label="Clear">×</button>
    {/if}
  </div>

  {#if keyword && keyword.length >= 3}
    <div class="match-meta" class:has-matches={matchCount > 0}>
      {#if matchCount > 0}
        {matchCount} match{matchCount === 1 ? '' : 'es'}
      {:else}
        No matches
      {/if}
    </div>
  {:else if keyword && keyword.length > 0}
    <div class="match-meta">Type 3+ characters…</div>
  {/if}
</div>

<style>
  .facet {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .facet-label {
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    color: var(--color-text-dim, #9ca3af);
    text-transform: uppercase;
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .weapon-input {
    flex: 1;
    background: transparent;
    border: 1px solid var(--color-border, #374151);
    color: var(--color-text, #e5e7eb);
    padding: 0.4rem 0.6rem;
    font-family: inherit;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 120ms ease;
  }

  .weapon-input:focus {
    border-color: var(--color-neon-green, #22c55e);
  }

  .clear-btn {
    background: transparent;
    border: 1px solid var(--color-border, #374151);
    color: var(--color-text-dim, #9ca3af);
    width: 1.75rem;
    height: 1.75rem;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn:hover {
    color: var(--color-text, #e5e7eb);
    border-color: var(--color-text-dim, #9ca3af);
  }

  .match-meta {
    font-size: 0.7rem;
    color: var(--color-text-dim, #9ca3af);
    font-variant-numeric: tabular-nums;
  }

  .match-meta.has-matches {
    color: var(--color-neon-green, #22c55e);
  }
</style>