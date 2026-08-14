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
    if (system.regionID === 10000070 || system.region === 'Pochven') return { label: 'POCHVEN', color: '#b07ce8' }
    const s = system.security
    const tier = Math.min(10, Math.max(0, Math.round(s * 10)))
    const display = (tier / 10).toFixed(1)
    const band = tier >= 5 ? 'HS' : tier > 0 ? 'LS' : 'NULL'
    return { label: `${band} ${display}`, color: SEC_RAMP[tier], display }
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

export function formatIsk(n) {
    if (!n || n < 0) return '0'
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
    return Math.round(n).toString()
}