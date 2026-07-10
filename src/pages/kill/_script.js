
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

const filter = document.getElementById('loot-filter')
const manifest = document.getElementById('manifest')
if (filter && manifest) {
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

  filter.addEventListener('change', () => apply(filter.value))
}

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


const EMOTES = [
  { key: 'plus1', label: '+1' },
  { key: 'f', label: 'F' },
  { key: 'nice-feed', label: 'nice feed' },
  { key: 'o7', label: 'o7' },
  { key: 'gf', label: 'gf' },
  { key: '67', label: '67' },
  { key: 'lol', label: 'lol' },
  { key: 'RMT', label: 'RMT' },
  { key: 'FFS', label: 'FFS' },
  { key: 'RIP', label: 'RIP' },
  { key: 'Skill Issue', label: 'Skill Issue' },
  { key: 'Loot fairy says GTF', label: 'Loot fairy says GTF' },
]

const list = document.getElementById('react-list')
const killId = list?.dataset.kill

function renderReactions(counts) {
  if (!list) return
  const rows = EMOTES
    .map(e => ({ ...e, count: counts[e.key] || 0 }))
    .sort((a, b) => b.count - a.count)
  list.innerHTML = rows.map(r => `
        <li class="row">
            <button type="button" class="react-btn link" data-key="${r.key}">▲ ${r.label}</button>
            <span class="v tabular-nums">${r.count}</span>
        </li>`).join('')
}

async function loadReactions() {
  if (!killId) return
  try {
    const res = await fetch(`https://ws.socketkill.com/api/reactions/${killId}`)
    if (!res.ok) return
    renderReactions((await res.json()).reactions || {})
  } catch { }
}

list?.addEventListener('click', async (e) => {
  const key = e.target.closest('.react-btn')?.dataset.key
  if (!key) return
  try {
    const res = await fetch(`https://ws.socketkill.com/api/reactions/${killId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoteKey: key }),
    })
    if (res.ok) renderReactions((await res.json()).reactions || {})
  } catch { /* silent */ }
})

loadReactions()
