import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';

export default defineConfig({
  site: 'https://socketkill.com',
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: false
    }
  }),
  integrations: [
    svelte(), 
    sitemap(),
    robotsTxt({
      sitemap: 'https://socketkill.com/sitemap-index.xml',
      policy: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/']
        }

      ]
    })
  ], 
  vite: {
    plugins: [tailwindcss()]
  }
})