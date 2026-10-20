# Socket.Kill

[![SocketKill Status](https://badge.uptimerobot.com/psp/0a819a464bbfad8fef578c7c8d24b8df.svg?style=logo&theme=light)](https://stats.uptimerobot.com/1qn5EGcEZn?utm_source=status_badge&utm_medium=referral)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/O5K727GI1T)

**Real-time EVE Online killmail streaming, built as a live radar rather than an archive.**

[Live site](https://socketkill.com) · [Discord](https://discord.gg/UnFN8UY6Dz) · [Demo video](https://youtu.be/zbiEjZFed30?si=5q55ew3FAVLH6_N-) · [Status](https://stats.uptimerobot.com/1qn5EGcEZn)

🏆 Winner, **New Developer of the Year**, [FC Fanfest 2026](https://www.eveonline.com/news/view/eve-fanfest-wrapped)

---

## Overview

Socket.Kill began as a side project that was discarding killmail data. Rather than throw it away, the project now streams every kill as fast as technically possible, wrapped in an atmospheric interface.

Built by [Static Orbit Studio](https://static-orbit.co.uk/).

## Features

### Live feed
- **Real-time WebSocket stream** with a dual caching layer for fast rendering.
- **Multi-mode filtering** by corporation, alliance, system, region, or light-year range.
- **Query Builder** for composing custom queries against the day's killmails.

### Presentation
- **Atmospheric interface** with a retro-futurist terminal aesthetic inspired by the *Alien* franchise.
- **3D ship renders** that replace the static cover image with a model of the lost ship.
- **Per-kill social previews** — Open Graph tags rendered server-side via Cloudflare Pages Functions, so Discord, X/Twitter, Mastodon and Bluesky cards show real kill data.
- **Edge-cached image proxy** for ship renders and corporation/alliance logos, faster than serving directly from the CCP image server.

### Integrations
- **Discord alerts** across multiple channels: whale kills, AT/officer/Rorqual sightings, and configurable value thresholds. [Join the server](https://discord.gg/UnFN8UY6Dz).

### Companion tools
| Tool | Description |
|------|-------------|
| [Damage Guide](https://socketkill.com/guide/) | Average damage reference |
| [Map of New Eden](https://socketkill.com/map) | Cinematic universe map |
| [EVE Twitch Chat](https://socketkill.com/local/) | OBS overlay styled like EVE Local chat |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Transport | Socket.IO |
| Hosting | DigitalOcean ARM VM |
| Frontend | Astro, Svelte, Tailwind CSS |
| Storage | Cloudflare R2 / KV |
| Image delivery | Cloudflare edge |
| Game data | ESI (EVE Swagger Interface) |

## Credits

**Data & APIs**
- Killmail feed — [zKillboard](https://github.com/zKillboard/zKillboard/wiki/API-(R2Z2))
- ESI & SDE — [EVE API Explorer](https://developers.eveonline.com/api-explorer)
- Killmail valuations — [Janice (E-351)](https://janice.e-351.com/api/rest/docs/index.html)
- Abyssal module valuations — [Mutamarket](https://mutamarket.com/documentation/api-overview)

**Art**
- Main site background — [Rixx Javix](https://www.flickr.com/photos/rixxjavix/albums/72157651335101023)
- Killmail & stats backgrounds — [El Geo](https://www.lloydgeorge.art/)

**Tooling**
- Model rendering — [Tamber](https://x.com/pauloosterman)
- Ship fit preview — [EVE Ship Fit](https://eveship.fit/)

## Legal

EVE Online and the EVE logo are registered trademarks of Fenris Creations. All rights are reserved worldwide.

All other trademarks are the property of their respective owners. EVE Online, the EVE logo, EVE, and all associated logos and designs are the intellectual property of Fenris Creations. All artwork, screenshots, characters, vehicles, storylines, world facts, or other recognizable features of the intellectual property relating to these trademarks are likewise the intellectual property of Fenris Creations.

FC has granted permission to socketkill.com to use EVE Online and all associated logos and designs for promotional and informational purposes on its website but does not endorse, and is not in any way affiliated with, socketkill.com.

FC is in no way responsible for the content on or functioning of this website, nor can it be liable for any damage arising from the use of this website.