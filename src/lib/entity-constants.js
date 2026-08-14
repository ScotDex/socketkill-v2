export const ENTITY = {
    pilot: {
        label: 'PILOT',
        esiPath: id => `https://esi.evetech.net/latest/characters/${id}/`,
        image: id => `https://images.evetech.net/characters/${id}/portrait?size=128`,
        zkillType: 'character',
        evewhoPath: 'character',
    },
    corp: {
        label: 'CORPORATION',
        esiPath: id => `https://esi.evetech.net/latest/corporations/${id}/`,
        image: id => `https://images.evetech.net/corporations/${id}/logo?size=128`,
        zkillType: 'corp',
        evewhoPath: 'corporation',
    },
    alliance: {
        label: 'ALLIANCE',
        esiPath: id => `https://esi.evetech.net/latest/alliances/${id}/`,
        image: id => `https://images.evetech.net/alliances/${id}/logo?size=128`,
        zkillType: 'alliance',
        evewhoPath: 'alliance',
    },
}

export const FACTION = {
    500001: { name: 'Caldari State',       short: 'CALDARI',  c: 'var(--color-terminal-blue)' },
    500002: { name: 'Minmatar Republic',   short: 'MINMATAR', c: 'var(--color-isk-billion)' },
    500003: { name: 'Amarr Empire',        short: 'AMARR',    c: 'var(--color-whale-accent)' },
    500004: { name: 'Gallente Federation', short: 'GALLENTE', c: 'var(--color-neon-green)' },
    500010: { name: 'Guristas Pirates',    short: 'GURISTAS', c: '#b07ce8' },
    500011: { name: 'Angel Cartel',        short: 'ANGELS',   c: '#b07ce8' },
}

/* Keyed by the `space` string the backend emits — not the same thing
   as helpers.js classifySecurity(), which reads a raw 0.0–1.0 float
   off a system object. */
export const SPACE = {
    high:    { short: 'HS',   label: 'highsec',  c: 'var(--color-neon-green)' },
    low:     { short: 'LS',   label: 'lowsec',   c: 'var(--color-whale-accent)' },
    null:    { short: 'NULL', label: 'nullsec',  c: 'var(--color-isk-billion)' },
    wh:      { short: 'WH',   label: 'wormhole', c: 'var(--color-terminal-blue)' },
    pochven: { short: 'PCH',  label: 'pochven',  c: '#b07ce8' },
}

export const UNKNOWN_SPACE = { short: '?', label: 'unknown', c: 'var(--color-text-faint)' }
export const spaceOf = s => SPACE[s] ?? UNKNOWN_SPACE

export const TZ_BANDS = [
    { label: 'AUTZ', start: 6,  end: 14 },
    { label: 'EUTZ', start: 14, end: 22 },
    { label: 'USTZ', start: 22, end: 6  },
]

export const normaliseSpace = s => (s === 'pochven' ? 'null' : s)