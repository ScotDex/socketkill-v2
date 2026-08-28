export const ENTITY = {
    pilot: {
        label: 'PILOT',
        esiPath: id => `https://esi.evetech.net/characters/${id}`,
        image: id => `https://images.evetech.net/characters/${id}/portrait?size=128`,
        zkillType: 'character',
        evewhoPath: 'character',
    },
    corp: {
        label: 'CORPORATION',
        esiPath: id => `https://esi.evetech.net/corporations/${id}`,
        image: id => `https://images.evetech.net/corporations/${id}/logo?size=128`,
        zkillType: 'corp',
        evewhoPath: 'corporation',
    },
    alliance: {
        label: 'ALLIANCE',
        esiPath: id => `https://esi.evetech.net/alliances/${id}`,
        image: id => `https://images.evetech.net/alliances/${id}/logo?size=128`,
        zkillType: 'alliance',
        evewhoPath: 'alliance',
    },
}

export const FACTION = {
    500001: { name: 'Caldari State',       short: 'CALDARI',  c: '#6a9cb7' },
    500002: { name: 'Minmatar Republic',   short: 'MINMATAR', c: '#e07972' },
    500003: { name: 'Amarr Empire',        short: 'AMARR',    c: '#ad926d' },
    500004: { name: 'Gallente Federation', short: 'GALLENTE', c: '#56a3a3' },
    500010: { name: 'Guristas Pirates',    short: 'GURISTAS', c: '#e8a77c' },
    500011: { name: 'Angel Cartel',        short: 'ANGELS',   c: '#0db6e9' },
}

export const SPACE = {
    high:    { short: 'HS',   label: 'highsec',  c: 'var(--color-neon-green)' },
    low:     { short: 'LS',   label: 'lowsec',   c: 'var(--color-whale-accent)' },
    null:    { short: 'NULL', label: 'null',  c: 'var(--color-isk-billion)' },
    wh:      { short: 'WH',   label: 'wormhole', c: 'var(--color-terminal-blue)' },
    pochven: { short: 'POCH',  label: 'pochven',  c: 'var(--color-isk-billion)' },
}

export const UNKNOWN_SPACE = { short: '?', label: 'unknown', c: 'var(--color-text-faint)' }
export const spaceOf = s => SPACE[s] ?? UNKNOWN_SPACE

export const TZ_BANDS = [
    { label: 'AUTZ',  start: 6,  end: 11 },
    { label: 'CNTZ',  start: 11, end: 16 },
    { label: 'EUTZ',  start: 16, end: 21 },
    { label: 'USETZ', start: 21, end: 1  },
    { label: 'USWTZ', start: 1,  end: 6  },
]

export const normaliseSpace = s => (s === 'pochven' ? 'null' : s)