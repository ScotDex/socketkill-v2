# Socket.Kill

The inspiration came from a development project where I was discarding some killmail data, and I decided to do something with that. Subsequently I decided fusing together kill mails with a level of atmosphere and depth that the community didn't ask for.

The scope is very simple, stream kills as fast as technically possible utilizing the latest tech and ideas.

Winner of [FC Fanfest 2026 New Developer of the Year](https://www.eveonline.com/news/view/eve-fanfest-wrapped).

**Live at [socketkill.com](https://socketkill.com) · [Discord](https://discord.gg/UnFN8UY6Dz)**


## Features

- **Real-time WebSocket feed.** Dual Caching layer provides optimized rendering speed
- **Per-kill social previews.** OG tags rendered server-side via Cloudflare Pages Functions, so Discord, Twitter, and Bluesky cards reflect actual kill data.
- **Edge-cached image proxy.** Ship renders, corp logos, alliance logos served via Cloudflare's edge. Performance improvement from the CCP image server.
- **Multi-channel Discord integration.** [Whale alerts, AT/officer/Rorqual sightings, Multiple Value Thresholds](https://discord.gg/UnFN8UY6Dz)
- **Multi-mode filtering** on the live feed, you can filter corporations, alliances, systems and region to configure your own view.
- **Atmospheric interface.** Terminal-aesthetic design from the alien franchise 
- **Query Builder.** Coming Soon - configure your own question using the query builder module, resulting on the days killmails.


## Tech stack

- **Runtime:** Node.js
- **Transport:** Socket.io (WebSocket + polling fallback)
- **Backend:** DigitalOcean ARM VM
- **Frontend:** Astro/Svelte/Tailwind
- **Storage:** Cloudflare R2/KV
- **Image delivery:** Cloudflare edge
- **EVE data:** ESI (EVE Swagger Interface) for character, corporation, and universe data

## API

A public image proxy API is available for EVE Online assets. Free to use for personal and third-party projects. If you integrate this API into your tool or application, a credit link back to [socketkill.com](https://socketkill.com) is appreciated.

Full API documentation: [api.socketkill.com/docs](https://api.socketkill.com/docs/)

## Legal

EVE Online and the EVE logo are registered trademarks of Fenris Creations. All rights are reserved worldwide.

All other trademarks are the property of their respective owners. EVE Online, the EVE logo, EVE, and all associated logos and designs are the intellectual property of Fenris Creations. All artwork, screenshots, characters, vehicles, storylines, world facts, or other recognizable features of the intellectual property relating to these trademarks are likewise the intellectual property of Fenris Creations.

FC has granted permission to socketkill.com to use EVE Online and all associated logos and designs for promotional and informational purposes on its website but does not endorse, and is not in any way affiliated with, socketkill.com.

FC is in no way responsible for the content on or functioning of this website, nor can it be liable for any damage arising from the use of this website.

## Credits

Original API provided by: [zKillboard](https://github.com/zKillboard/zKillboard/wiki/API-(R2Z2))

Further API's and SDE used [EVE API Explorer](https://developers.eveonline.com/api-explorer)

Main site background art from [Rixx Javix](https://www.flickr.com/photos/rixxjavix/albums/72157651335101023)

Background art for the killmails and stats page from the magnificent work from [El Geo](https://www.lloydgeorge.art/)