
export function externalLink(kind, value) {
    switch (kind) {
        case 'character': return `https://zkillboard.com/character/${value}/`
        case 'corp':      return `https://zkillboard.com/corporation/${value}/`
        case 'alliance':  return `https://zkillboard.com/alliance/${value}/`
        case 'system':    return `https://evemaps.dotlan.net/system/${encodeURIComponent(String(value).replace(/ /g, '_'))}`
        case 'region':    return `https://evemaps.dotlan.net/region/${encodeURIComponent(String(value).replace(/ /g, '_'))}`
        case 'type':      return `https://everef.net/type/${value}`
        default:          return '#'
    }
}
