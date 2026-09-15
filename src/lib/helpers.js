export function parseIsk(v) {
    if (typeof v === 'number') return v
    if (typeof v !== 'string') return 0
    const m = v.match(/([\d.,]+)\s*([KMBT])?/i)
    if (!m) return 0
    const n = parseFloat(m[1].replace(/,/g, ''))
    const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2]?.toUpperCase()] ?? 1
    return n * mult
}

const SEC_RAMP = [
    '#F00000', '#D73000', '#F04800', '#F06000', '#D77700',
    '#EFEF00', '#8FEF2F', '#00F000', '#00EF47', '#48F0C0', '#2FEFEF'
]

export function classifySecurity(system) {
    if (!system || system.security == null) return { label: 'UNKNOWN', color: 'var(--color-text-faint)' }
    if (system.id >= 31000000 && system.id < 32000000) return { label: 'WORMHOLE', color: 'var(--color-terminal-blue)' }
    if (system.regionID === 10000070 || system.region === 'Pochven') return { label: 'POCHVEN', color: '#f70e06' }
    const s = system.security
    const tier = Math.min(10, Math.max(0, Math.round(s * 10)))
    const display = (tier / 10).toFixed(1)
    const band = tier >= 5 ? 'HS' : tier > 0 ? 'LS' : 'NULL'
    return { label: `${band} ${display}`, color: SEC_RAMP[tier], display }
}


export function formatIsk(n) {
    if (!n || n < 0) return '0'
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
    return Math.round(n).toString()
}