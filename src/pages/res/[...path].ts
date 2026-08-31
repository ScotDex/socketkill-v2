export const prerender = false
import { env } from 'cloudflare:workers'

// Pinned. An exact build is immutable, so a cached object never goes stale.
// Bump after each EVE patch:
//   curl https://caldariprimeponyclub.com/eve/latest/build
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

        // Hit: serve from our own bucket, upstream never sees it.
        const hit = await bucket.get(key)
        if (hit) {
            return new Response(hit.body, {
                headers: {
                    ...CORS,
                    // Stored on write below; falls back for objects cached
                    // before this was added.
                    'Content-Type': hit.httpMetadata?.contentType || 'application/octet-stream'
                }
            })
        }

        // Miss: one fetch upstream, then keep it forever.
        const upstream = await fetch(`${UPSTREAM}/eve/${BUILD}/resources/${path}`)
        if (!upstream.ok || !upstream.body) {
            return new Response('Not found', { status: upstream.status || 502 })
        }

        // tee() splits the stream so the same bytes go to R2 and to the browser
        // without buffering the whole asset in memory - some are several MB.
        const [ toStore, toSend ] = upstream.body.tee()

                // Astro v6: cfContext replaced runtime.ctx. waitUntil lets the R2
        // write finish after the response is sent.
        const write = bucket.put(key, toStore)
        if (locals.cfContext?.waitUntil) locals.cfContext.waitUntil(write)
        else await write

        return new Response(toSend, { headers: CORS })

    } catch (err) {
        // Readable in the browser, rather than a bare 500 with no cause.
        return new Response(`res error: ${err.message}`, { status: 500 })
    }
}