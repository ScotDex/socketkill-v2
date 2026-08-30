const DEFAULTS = { minValue: 0, regions: [], corps: [], alliances: [], systems: [], bands: [], weaponKeyword: '', radius: 0, origin: [] }

export function filtersToParams(filters) {
    const p = new URLSearchParams()
    if (filters.minValue > 0) p.set('min', String(filters.minValue))
    for (const r of filters.regions)   p.append('region', r)
    for (const c of filters.corps)     p.append('corp', c)
    for (const a of filters.alliances) p.append('alliance', a)
    for (const s of filters.systems)   p.append('system', s)
    for (const b of filters.bands)     p.append('band', b)
    if (filters.weaponKeyword) p.set('weapon', filters.weaponKeyword)
    if (filters.radius > 0) p.set('radius', String(filters.radius))
    for (const o of filters.origin) p.append('origin', o)
    return p
}

export function paramsToFilters(search) {
    const p = new URLSearchParams(search)
    return {
        minValue: Number(p.get('min')) || 0,
        regions: p.getAll('region'),
        corps: p.getAll('corp').slice(0, 5),
        alliances: p.getAll('alliance').slice(0, 5),
        systems: p.getAll('system').slice(0, 5),
        bands: p.getAll('band'),
        weaponKeyword: p.get('weapon') || '',
        radius: Number(p.get('radius')) || 0,
        origin: p.getAll('origin').slice(0, 1)
    }
}