function initClockMarker() {
    const el = document.querySelector('[data-clock-now]')
    if (!el) return
    const d = new Date()
    el.style.left = `${(d.getUTCHours() + d.getUTCMinutes() / 60) / 24 * 100}%`
}

function initCopyButton() {
    const btn = document.getElementById('copy-btn')
    if (!btn) return

    const label = btn.textContent
    let timer

    btn.addEventListener('click', async () => {
        const url = btn.dataset.url || ''
        try {
            await navigator.clipboard.writeText(url)
        } catch {
            const ta = document.createElement('textarea')
            ta.value = url
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            ta.remove()
        }
        clearTimeout(timer)
        btn.textContent = 'COPIED ✓'
        timer = setTimeout(() => { btn.textContent = label }, 1500)
    })
}

const PAGE = 50

function initFeedTabs() {
    const tabs = document.getElementById('f-tabs')
    const feed = document.getElementById('feed')
    if (!feed) return
    const days = [...feed.querySelectorAll('[data-day]')]
    const empty = document.getElementById('feed-empty')

    const moreBtn = document.getElementById('feed-more')
    let mode = 'all'
    let limit = PAGE
    const apply = () => {
        let matched = 0
        let shown = 0

        for (const day of days) {
            let dayVisible = false
            for (const row of day.querySelectorAll('[data-kind]')) {
                const matches = mode === 'all' || row.dataset.kind === mode
                if (matches) matched++

                const show = matches && shown < limit
                row.hidden = !show
                if (show) { shown++; dayVisible = true }
            }
            day.hidden = !dayVisible
        }

        if (empty) empty.hidden = shown > 0
        if (moreBtn) {
            moreBtn.hidden = matched <= shown
            moreBtn.textContent = `LOAD MORE — ${shown} OF ${matched}`
        }
    }

    if (tabs) {
        tabs.addEventListener('click', (e) => {
            const active = e.target.closest('.tab')
            if (!active) return
            for (const t of tabs.querySelectorAll('.tab')) {
                t.classList.toggle('is-active', t === active)
                t.setAttribute('aria-selected', t === active ? 'true' : 'false')
            }
            mode = active.dataset.f
            limit = PAGE
            apply()
        })
    }

    if (moreBtn) {
        moreBtn.addEventListener('click', () => {
            limit += PAGE
            apply()
        })
    }

    apply()
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c])

async function esiJson(url, opts) {
    try {
        const res = await fetch(url, opts)
        return res.ok ? await res.json() : null
    } catch {
        return null
    }
}

function buildEmployment(historyRaw, allianceHistories, uniqueCorpIDs) {
    const history = [...historyRaw]
        .sort((a, b) => Date.parse(b.start_date) - Date.parse(a.start_date))
        .map((rec, i, arr) => ({
            corpID: rec.corporation_id,
            start: rec.start_date,
            end: i === 0 ? null : arr[i - 1].start_date,
        }))

    const allianceByCorp = new Map()
    uniqueCorpIDs.forEach((cid, i) => {
        const recs = allianceHistories[i] ?? []
        allianceByCorp.set(cid, [...recs].sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date)))
    })

    const allianceAt = (corpID, iso) => {
        const recs = allianceByCorp.get(corpID) ?? []
        const t = Date.parse(iso)
        let current = null
        for (const r of recs) {
            if (Date.parse(r.start_date) > t) break
            current = r.alliance_id ?? null
        }
        return current
    }

    return history.map((h) => ({ ...h, allianceID: allianceAt(h.corpID, h.start) }))
}

function employmentRow(h, nameByID) {
    const corpName = nameByID.get(h.corpID) ?? `Corporation ${h.corpID}`
    const allianceName = h.allianceID
        ? (nameByID.get(h.allianceID) ?? `Alliance ${h.allianceID}`)
        : null

    const allianceLine = allianceName
        ? `<a href="/alliance/${h.allianceID}" class="link block truncate" style="color:var(--color-text-faint)">${esc(allianceName)}</a>`
        : ''

    return `<li class="flex items-center gap-2 text-xs">
        <img src="https://images.evetech.net/corporations/${h.corpID}/logo?size=32"
             class="w-6 h-6 shrink-0" width="32" height="32" alt=""
             loading="lazy" onerror="this.style.visibility='hidden'" />
        <span class="min-w-0 flex-1">
            <a href="/corp/${h.corpID}" class="link block truncate">${esc(corpName)}</a>
            ${allianceLine}
        </span>
        <span class="font-mono text-[10px] tabular-nums text-right shrink-0"
              style="color:var(--color-text-faint)">
            ${h.start.slice(0, 10)}<br />${h.end ? h.end.slice(0, 10) : 'present'}
        </span>
    </li>`
}

function initEmployment() {
    const details = document.querySelector('[data-emp]')
    if (!details) return

    const charID = details.dataset.emp
    if (!charID) return

    const list = details.querySelector('[data-emp-list]')
    const countEl = document.querySelector('[data-emp-count]')
    let loaded = false

    const fail = (msg) => {
        if (list) list.innerHTML = `<li class="text-xs" style="color:var(--color-text-faint)">${msg}</li>`
    }

    details.addEventListener('toggle', async () => {
        if (!details.open || loaded) return
        loaded = true

        const historyRaw = await esiJson(`https://esi.evetech.net/characters/${charID}/corporationhistory/`)
        if (!historyRaw) { loaded = false; fail('history unavailable — retry'); return }
        if (!historyRaw.length) { fail('no records'); return }

        const uniqueCorpIDs = [...new Set(historyRaw.map((r) => r.corporation_id))]
        const allianceHistories = await Promise.all(uniqueCorpIDs.map((cid) =>
            esiJson(`https://esi.evetech.net/corporations/${cid}/alliancehistory/`)))

        const joined = buildEmployment(historyRaw, allianceHistories, uniqueCorpIDs)

        const allianceIDs = [...new Set(joined.map((h) => h.allianceID).filter(Boolean))]
        const nameIDs = [...uniqueCorpIDs, ...allianceIDs]

        const namesData = nameIDs.length
            ? await esiJson('https://esi.evetech.net/universe/names/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nameIDs),
            })
            : []
        const nameByID = new Map((namesData ?? []).map((n) => [n.id, n.name]))

        if (countEl) countEl.textContent = `${joined.length} RECORDS`
        if (list) list.innerHTML = joined.map((h) => employmentRow(h, nameByID)).join('')
    })
}

function init() {
    initClockMarker()
    initCopyButton()
    initFeedTabs()
    initEmployment()
}

document.addEventListener('astro:page-load', init)