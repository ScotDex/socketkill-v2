export const prerender = false
import { env } from 'cloudflare:workers'

const UPSTREAM = 'https://caldariprimeponyclub.com'
const BUILD_URL = `${UPSTREAM}/eve/latest/`
const BUILD_TTL_MS = 60 * 60 * 1000   
const RETRY_MS = 60 * 1000            

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, Range',
    'Cache-Control': 'public, max-age=31536000, immutable'
}


let cached: { build: string | null, at: number } = { build: null, at: 0 }

async function getBuild(): Promise<string | null> {
    const ttl = cached.build ? BUILD_TTL_MS : RETRY_MS
    if (Date.now() - cached.at < ttl) return cached.build

    cached.at = Date.now() 
    try {
        const res = await fetch(BUILD_URL, { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
            const data = await res.json()
            const build = String(data?.builds?.resources ?? data?.build ?? '')
            if (/^\d+$/.test(build)) cached.build = build
        }
    } catch {}
    return cached.build
}

export async function GET({ params, locals }) {
    try {
        const path = params.path
        if (!path || path.includes('..')) {
            return new Response('Bad path', { status: 400 })
        }

        const bucket = env.RES
        if (!bucket) {
            return new Response('res error: RES binding missing', { status: 500 })
        }

        const BUILD = await getBuild()
        if (!BUILD) {
            return new Response('res error: build unknown', { status: 503 })
        }

        const key = `assets/eve/${BUILD}/${path}`
        const hit = await bucket.get(key)
        if (hit) {
            return new Response(hit.body, {
                headers: {
                    ...CORS,
                    'Content-Type': hit.httpMetadata?.contentType || 'application/octet-stream'
                }
            })
        }

        const upstream = await fetch(`${UPSTREAM}/eve/${BUILD}/resources/${path}`)
        if (!upstream.ok || !upstream.body) {
            return new Response('Not found', { status: upstream.status || 502 })
        }

        const [ toStore, toSend ] = upstream.body.tee()
        const write = bucket.put(key, toStore, {
            httpMetadata: { contentType: upstream.headers.get('content-type') || 'application/octet-stream' }
        })
        if (locals.cfContext?.waitUntil) locals.cfContext.waitUntil(write)
        else await write

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

        return new Response(toSend, {
            headers: { ...CORS, 'Content-Type': contentType }
        })

    } catch (err) {
        return new Response(`res error: ${err.message}`, { status: 500 })
    }
}