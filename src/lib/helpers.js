export function parseIsk(v) {
    if (typeof v === 'number') return v
    if (typeof v !== 'string') return 0
    const m = v.match(/([\d.,]+)\s*([KMBT])?/i)
    if (!m) return 0
    const n = parseFloat(m[1].replace(/,/g, ''))
    const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2]?.toUpperCase()] ?? 1
    return n * mult
}

export function classifySecurity(system) {
    if (!system || system.security == null) return { label: 'UNKNOWN', color: 'var(--color-text-faint)' }
    if (system.id >= 31000000 && system.id < 32000000) return { label: 'WORMHOLE', color: 'var(--color-terminal-blue)' }
    if (system.regionID === 10000070 || system.region === 'Pochven') return { label: 'POCHVEN', color: '#b07ce8' }
    const s = system.security
    if (s >= 0.5) return { label: `HS ${s.toFixed(1)}`, color: 'var(--color-neon-green)' }
    if (s > 0.0) return { label: `LS ${s.toFixed(1)}`, color: 'var(--color-whale-accent)' }
    return { label: `NULL ${s.toFixed(1)}`, color: 'var(--color-isk-billion)' }
}
