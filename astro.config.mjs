import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import cloudflare from '@astrojs/cloudflare'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://socketkill.com',
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: false
    }
  }),
  integrations: [svelte()],
  session: {
    driver: 'memory'
  },
  vite: {
    plugins: [tailwindcss()]
  }
})