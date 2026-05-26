export const MAX_FEED_SIZE = 70
export const KILL_BUFFER_SIZE = 200
export const WHALE_THRESHOLD = 10_000_000_000
export const BILLION_THRESHOLD = 1_000_000_000
export const MAX_CORPS = 5
export const MAX_ALLIANCES = 5
export const MAX_SYSTEMS = 5

export function passesFilter(kill, filters) {
    if (filters.minValue > 0 && kill.val < filters.minValue) return false
    if (filters.regions.length && !filters.regions.includes(kill.region)) return false


    if (filters.corps.length) {
        const match = filters.corps.some(c =>
            (kill.corpName || '').toLowerCase().includes(c.toLowerCase()) ||
            (kill.finalBlowCorp || '').toLowerCase().includes(c.toLowerCase())
        )
        if (!match) return false
    }
    if (filters.alliances.length) {
        const match = filters.alliances.some(a =>
            (kill.allianceName || '').toLowerCase().includes(a.toLowerCase()) ||
            (kill.finalBlowAlliance || '').toLowerCase().includes(a.toLowerCase())
        )
        if (!match) return false
    }
    if (filters.systems.length) {
        const match = filters.systems.some(s =>
            (kill.systemName || '').toLowerCase() === s.toLowerCase()
        )
        if (!match) return false
    }
    return true
}

export function formatIsk(value) {
    const num = Number(value) || 0
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
    return num.toLocaleString()
}

export function getUtcTimestamp() {
    const now = new Date()
    const hh = now.getUTCHours().toString().padStart(2, '0')
    const mm = now.getUTCMinutes().toString().padStart(2, '0')
    return `[${hh}:${mm}]`
}