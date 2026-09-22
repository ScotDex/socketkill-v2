export const prerender = false
import { env } from 'cloudflare:workers'

const BUILD = '3484357'
const UPSTREAM = 'https://caldariprimeponyclub.com'

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, Range',
    'Cache-Control': 'public, max-age=31536000, immutable'
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
        // Readable in the browser, rather than a bare 500 with no cause.
        return new Response(`res error: ${err.message}`, { status: 500 })
    }
}