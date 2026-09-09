import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://socketkill.com',
  output: 'server',
  prefetch: {
    prefetchAll : false,
    defaultStrategy: 'hover'
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: false
    }
  }),
  integrations: [svelte(), sitemap(), robotsTxt({
    sitemap:['https://socketkill.com/sitemap-index.xml',
            'https://socketkill.com/sitemaps/kills-index.xml'],
    policy: [
{ userAgent: 'meta-webindexer', disallow: '/' },
{ userAgent: 'meta-externalagent', disallow: '/' },
{ userAgent: '*', allow: '/', disallow: ['/api/'] }
]
  }), react()], 
  vite: {
    plugins: [tailwindcss()]
  }
})