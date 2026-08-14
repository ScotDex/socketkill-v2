import { TZ_BANDS } from './entity-constants.js'

const PEAK_MIN_SAMPLE = 25

export const pad2 = n => String(n).padStart(2, '0')

function bump(map, key) {
    if (key == null) return
    map.set(key, (map.get(key) || 0) + 1)
}

function topEntry(map) {
    let bestKey = null
    let bestN = 0
    for (const [k, n] of map) {
        if (n > bestN) { bestN = n; bestKey = k }
    }
    return bestKey == null ? null : [bestKey, bestN]
}

const inBand = (h, b) => b.start < b.end
    ? (h >= b.start && h < b.end)
    : (h >= b.start || h < b.end)

/* Takes the raw event list from /api/entity and returns every derived
   statistic the page renders. Pure — no fetching, no Astro, no DOM.
   `now` is injectable so the output is testable against a fixture. */
export function analyseEvents(events, windowDays, feedOnline, now = Date.now()) {
    const halfWindowTs = now - (windowDays / 2) * 86400000

    let killCount = 0
    let lossCount = 0
    let iskDestroyed = 0
    let iskLost = 0
    let recentCount = 0

    const histK = new Array(24).fill(0)
    const histL = new Array(24).fill(0)
    const spaceCount = new Map()
    const systemCount = new Map()
    const systemRegion = new Map()
    const killedHulls = new Map()
    const gangSizes = []
    const byDay = []

    for (const e of events) {
        const isLoss = e.isLoss
        const value = e.totalValue || 0

        if (isLoss) {
            lossCount++
            iskLost += value
        } else {
            killCount++
            iskDestroyed += value
            if (Number.isFinite(e.attackerCount)) gangSizes.push(e.attackerCount)
            bump(killedHulls, e.shipTypeID)
        }

        /* Epoch ms → UTC hour arithmetically; no Date object needed. */
        const t = Date.parse(e.time)
        if (!Number.isNaN(t)) {
            const h = Math.floor(t / 3600000) % 24
            if (isLoss) histL[h]++
            else histK[h]++
            if (t >= halfWindowTs) recentCount++
        }

        bump(spaceCount, e.space)
        if (e.systemName != null) {
            bump(systemCount, e.systemName)
            if (!systemRegion.has(e.systemName)) {
                systemRegion.set(e.systemName, e.regionName ?? null)
            }
        }

        const day = (e.time ?? '').slice(0, 10)
        let bucket = byDay[byDay.length - 1]
        if (!bucket || bucket.day !== day) {
            bucket = { day, rows: [], kills: 0, losses: 0 }
            byDay.push(bucket)
        }
        bucket.rows.push(e)
        if (isLoss) bucket.losses++
        else bucket.kills++
    }

    const total = events.length
    const hourTotals = new Array(24)
    let histMax = 1
    for (let h = 0; h < 24; h++) {
        hourTotals[h] = histK[h] + histL[h]
        if (histK[h] > histMax) histMax = histK[h]
        if (histL[h] > histMax) histMax = histL[h]
    }

    let peak = null
    if (total >= PEAK_MIN_SAMPLE) {
        let best = 0
        let bestStart = 0
        let window3 = hourTotals[0] + hourTotals[1] + hourTotals[2]
        for (let i = 0; i < 24; i++) {
            if (window3 > best) { best = window3; bestStart = i }
            window3 += hourTotals[(i + 3) % 24] - hourTotals[i]
        }
        if (best > 0) peak = { start: bestStart, end: (bestStart + 3) % 24 }
    }
    const peakLabel = peak ? `${pad2(peak.start)}–${pad2(peak.end)}` : (total ? 'SPARSE' : '')

    const tzCounts = TZ_BANDS.map(b => {
        let n = 0
        for (let h = 0; h < 24; h++) if (inBand(h, b)) n += hourTotals[h]
        return { label: b.label, n }
    }).sort((a, b) => b.n - a.n)

    const tzTopPct = total ? Math.round(tzCounts[0].n / total * 100) : 0
    const tzLabel = !total || !tzCounts[0].n ? null
        : tzTopPct >= 50
            ? `${tzCounts[0].label} (${tzTopPct}%)`
            : `mixed — ${tzCounts[0].label}/${tzCounts[1].label}`

    const spaceTally = [...spaceCount.entries()].sort((a, b) => b[1] - a[1])

    const topSystemEntry = topEntry(systemCount)
    const topSystem = topSystemEntry
        ? {
            name: topSystemEntry[0],
            count: topSystemEntry[1],
            pct: Math.round(topSystemEntry[1] / total * 100),
            region: systemRegion.get(topSystemEntry[0]) ?? null,
        }
        : null

    const topKilledHull = topEntry(killedHulls)

    const priorCount = total - recentCount
    const trend = priorCount === 0
        ? (recentCount ? 'new contact' : '—')
        : `${recentCount >= priorCount ? '▲' : '▼'} ${Math.abs(Math.round((recentCount - priorCount) / priorCount * 100))}% vs prior ${Math.round(windowDays / 2)}d`

    let medGang = 0
    if (gangSizes.length) {
        gangSizes.sort((a, b) => a - b)
        medGang = gangSizes[Math.floor(gangSizes.length / 2)]
    }
    const profile = !killCount ? 'no offensive activity'
        : medGang <= 1 ? 'solo'
        : medGang <= 5 ? `small gang (med ${medGang})`
        : medGang <= 15 ? `gang (med ${medGang})`
        : `fleet (med ${medGang})`

    const lastEvent = events[0] ?? null
    const minsSince = lastEvent ? (now - Date.parse(lastEvent.time)) / 60000 : Infinity
    const status = !feedOnline ? { text: 'UPLINK OFFLINE', color: 'var(--color-terminal-blue)', live: false }
        : minsSince < 180 ? { text: 'ACTIVE NOW', color: 'var(--color-neon-green)', live: true }
        : minsSince < 4320 ? { text: 'ACTIVE', color: 'var(--color-neon-green)', live: false }
        : minsSince < 20160 ? { text: 'INTERMITTENT', color: 'var(--color-whale-accent)', live: false }
        : total ? { text: 'FADING', color: 'var(--color-whale-accent)', live: false }
        : { text: 'NO CONTACT', color: 'var(--color-text-faint)', live: false }

    return {
        total, killCount, lossCount, iskDestroyed, iskLost,
        histK, histL, histMax, hourTotals,
        peak, peakLabel,
        tzLabel, spaceTally, systemCount,
        topSystem, topKilledHull,
        trend, profile,
        lastEvent, status,
        byDay,
    }
}