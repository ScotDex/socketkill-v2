export const prerender = false

const BUILD = '3484357'
const UPSTREAM = 'https://caldariprimeponyclub.com'

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, Range',
    'Cache-Control': 'public, max-age=31536000, immutable'
}

export async function GET({ params, locals }) {
    const path = params.path
    if (!path || path.includes('..')) {
        return new Response('Bad path', { status: 400 })
    }

    const bucket = locals.runtime.env.RES
    const key = `assets/eve/${BUILD}/${path}`

    // Hit: serve from our own bucket, upstream never sees it.
    const hit = await bucket.get(key)
    if (hit) {
        return new Response(hit.body, { headers: CORS })
    }

    // Miss: one fetch upstream, then keep it forever.
    const upstream = await fetch(`${UPSTREAM}/eve/${BUILD}/resources/${path}`)
    if (!upstream.ok) {
        return new Response('Not found', { status: upstream.status })
    }

    // tee() so we can both store and return the same stream without buffering
    // the whole asset in memory — some of these are several megabytes.
    const [ toStore, toSend ] = upstream.body.tee()
    locals.runtime.ctx.waitUntil(bucket.put(key, toStore))

    return new Response(toSend, { headers: CORS })
}