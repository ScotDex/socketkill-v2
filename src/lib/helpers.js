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

const EFT_FITTED = ['low', 'mid', 'high', 'rig', 'subsystem', 'service']
const EFT_LOOSE = ['drone', 'fighter', 'cargo']
const MAX_SLOTS = 8

export function buildEft(kill) {
    const g = kill.items?.groups || {}
    const ship = kill.victim?.ship || 'Unknown Ship'
    const clean = it => it.name && it.name !== 'Unknown'

    const sections = []
    const loose = []

    for (const slot of EFT_FITTED) {
        const section = []
        for (const it of (g[slot] || []).filter(clean)) {
            const qty = it.quantity || 1
            if (qty > MAX_SLOTS) loose.push(`${it.name} x${qty}`)
            else for (let n = 0; n < qty; n++) section.push(it.name)
        }
        if (section.length) sections.push(section.join('\n'))
    }

    for (const slot of EFT_LOOSE)
        for (const it of (g[slot] || []).filter(clean))
            loose.push(it.quantity > 1 ? `${it.name} x${it.quantity}` : it.name)

    let out = `[${ship}, ${ship} - ${kill.killID ?? 'loss'}]\n` + sections.join('\n\n')
    if (loose.length) out += '\n\n\n' + loose.join('\n')
    return out
}