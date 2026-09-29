# Socket.Kill

[![SocketKill Status](https://badge.uptimerobot.com/psp/0a819a464bbfad8fef578c7c8d24b8df.svg?style=logo&theme=light)](https://stats.uptimerobot.com/1qn5EGcEZn?utm_source=status_badge&utm_medium=referral)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/O5K727GI1T)

**Live at [socketkill.com](https://socketkill.com) · [Discord](https://discord.gg/UnFN8UY6Dz)**

🏆 Winner of [FC Fanfest 2026 New Developer of the Year](https://www.eveonline.com/news/view/eve-fanfest-wrapped)

## About

Socket.Kill started with a side project where I was throwing away killmail data. I decided to do something with it instead: fuse killmails with a level of atmosphere and depth the community never asked for.

The scope is simple: stream kills as fast as technically possible, using the latest tech and ideas.

## Features

- **Real-time WebSocket feed.** Dual Caching layer provides optimized rendering speed
- **Per-kill social previews.** OG tags rendered server-side via Cloudflare Pages Functions, so Discord, Twitter, Mastadon and Bluesky cards reflect actual kill data.
- **Edge-cached image proxy.** Ship renders, corp logos, alliance logos served via Cloudflare's edge. Performance improvement from the CCP image server.
- **Multi-channel Discord integration.** [Whale alerts, AT/officer/Rorqual sightings, Multiple Value Thresholds](https://discord.gg/UnFN8UY6Dz)
- **Multi-mode filtering** on the live feed, you can filter corporations, alliances, systems, region and light year range to configure your own view.
- **Atmospheric interface.** Terminal-aesthetic design from the alien franchise 
- **Query Builder.** Configure your own question using the query builder module, resulting on the days killmails.
- **3D Render** Cover image swaps from static to 3D render of lost ship
- **Demo** Feature illustration here [Video](https://youtu.be/zbiEjZFed30?si=5q55ew3FAVLH6_N-)
- **Damage Guide** [Average Damage Guide](https://socketkill.com/guide/)
- **Map of New Eden** [Cinematic Map](https://socketkill.com/map)

## Tech stack

- **Runtime:** Node.js
- **Transport:** Socket.io 
- **Backend:** DigitalOcean ARM VM
- **Frontend:** Astro/Svelte/Tailwind
- **Storage:** Cloudflare R2/KV
- **Image delivery:** Cloudflare edge
- **EVE data:** ESI (EVE Swagger Interface) for character, corporation, and universe data


## Legal

EVE Online and the EVE logo are registered trademarks of Fenris Creations. All rights are reserved worldwide.

All other trademarks are the property of their respective owners. EVE Online, the EVE logo, EVE, and all associated logos and designs are the intellectual property of Fenris Creations. All artwork, screenshots, characters, vehicles, storylines, world facts, or other recognizable features of the intellectual property relating to these trademarks are likewise the intellectual property of Fenris Creations.

FC has granted permission to socketkill.com to use EVE Online and all associated logos and designs for promotional and informational purposes on its website but does not endorse, and is not in any way affiliated with, socketkill.com.

FC is in no way responsible for the content on or functioning of this website, nor can it be liable for any damage arising from the use of this website.

## Credits

### Data & APIs
- **Killmail feed:** [zKillboard](https://github.com/zKillboard/zKillboard/wiki/API-(R2Z2))
- **ESI & SDE:** [EVE API Explorer](https://developers.eveonline.com/api-explorer)
- **Killmail valuations:** [Janice (E-351)](https://janice.e-351.com/api/rest/docs/index.html)
- **Abyssal module valuations:** [Mutamarket](https://mutamarket.com/documentation/api-overview)

### Art
- **Main site background:** [Rixx Javix](https://www.flickr.com/photos/rixxjavix/albums/72157651335101023)
- **Killmail & stats backgrounds:** [El Geo](https://www.lloydgeorge.art/)

### Tooling
- **Model rendering:** [Tamber](https://x.com/pauloosterman)
- **Ship fit preview:** [EVE Ship Fit](https://eveship.fit/)