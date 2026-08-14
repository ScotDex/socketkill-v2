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

const PAGE = 30

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

function init() {
    initClockMarker()
    initCopyButton()
    initFeedTabs()
}

init()