// --- EFT export copy (unchanged) ---
const btn = document.getElementById('eft-btn')
btn?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(btn.dataset.eft || '') }
  catch {
    const ta = document.createElement('textarea')
    ta.value = btn.dataset.eft || ''; document.body.appendChild(ta)
    ta.select(); document.execCommand('copy'); ta.remove()
  }
  const orig = btn.textContent
  btn.textContent = 'COPIED ✓'
  setTimeout(() => { btn.textContent = orig }, 1500)
})

// --- Manifest tabs (replaces the loot-filter dropdown) ---
const tabs = document.getElementById('loot-tabs')
const manifest = document.getElementById('manifest')
if (tabs && manifest) {
  const groups = [...manifest.querySelectorAll('[data-group]')]
  const empty = document.getElementById('manifest-empty')

  const apply = (mode) => {
    let anyVisible = false
    for (const g of groups) {
      let groupHas = false
      for (const li of g.querySelectorAll('[data-row]')) {
        const isDropped = li.dataset.dropped === '1'
        const isDestroyed = li.dataset.destroyed === '1'
        const show = mode === 'all'
          || (mode === 'dropped' && isDropped)
          || (mode === 'destroyed' && isDestroyed)
        li.hidden = !show
        if (show) groupHas = true
      }
      g.hidden = !groupHas
      if (groupHas) anyVisible = true
    }
    if (empty) empty.hidden = anyVisible
  }

  tabs.addEventListener('click', (e) => {
    const active = e.target.closest('.tab')
    if (!active) return
    for (const t of tabs.querySelectorAll('.tab')) {
      t.classList.toggle('is-active', t === active)
      t.setAttribute('aria-selected', t === active ? 'true' : 'false')
    }
    apply(active.dataset.mode)
  })
}

// --- Fit preview modal (unchanged) ---
const fitBtn = document.getElementById('fit-btn')
const fitModal = document.getElementById('fit-modal')
const fitFrame = document.getElementById('fit-frame')
const fitClose = document.getElementById('fit-close')

fitBtn?.addEventListener('click', () => {
  if (!window.matchMedia('(min-width: 768px)').matches) {
    window.open(fitBtn.dataset.editorUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (fitFrame && !fitFrame.src) fitFrame.src = fitFrame.dataset.src
  fitModal?.showModal()
})

fitClose?.addEventListener('click', () => fitModal?.close())

fitModal?.addEventListener('click', (e) => {
  if (e.target === fitModal) fitModal.close()
})

// --- System/region activity (kept: no-ops if the rows aren't in the markup) ---
async function loadActivity(rowId, param) {
  const row = document.getElementById(rowId)
  const id = row?.dataset.id
  if (!id) return
  try {
    const res = await fetch(`https://ws.socketkill.com/api/search?${param}=${id}&window=1h`)
    if (!res.ok) return
    const data = await res.json()
    row.querySelector('[data-count]').textContent = `${data.total} KILLS/HR`
    row.hidden = false
  } catch { }
}
loadActivity('sys-activity', 'system')
loadActivity('reg-activity', 'region')