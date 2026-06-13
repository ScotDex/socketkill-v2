export async function GET({ params }) {
  const res = await fetch(`https://ws.socketkill.com/sitemaps/${params.path}`);
  if (!res.ok) return new Response('Not found', { status: 404 });
  return new Response(await res.text(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': res.headers.get('Cache-Control') ?? 'public, max-age=3600',
    },
  });
}