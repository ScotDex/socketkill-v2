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

function initFeedTabs() {
    const tabs = document.getElementById('f-tabs')
    const feed = document.getElementById('feed')
    if (!tabs || !feed) return

    const days = [...feed.querySelectorAll('[data-day]')]
    const empty = document.getElementById('feed-empty')

    const apply = (mode) => {
        let anyVisible = false
        for (const day of days) {
            let dayVisible = false
            for (const row of day.querySelectorAll('[data-kind]')) {
                const show = mode === 'all' || row.dataset.kind === mode
                row.hidden = !show
                if (show) dayVisible = true
            }
            day.hidden = !dayVisible
            if (dayVisible) anyVisible = true
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
        apply(active.dataset.f)
    })
}

function init() {
    initClockMarker()
    initCopyButton()
    initFeedTabs()
}

init()