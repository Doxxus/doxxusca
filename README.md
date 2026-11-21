# doxxus.ca

Home site for [doxxus.ca](https://doxxus.ca), built with the [T3 stack](https://create.t3.gg/) (Next.js, TypeScript, Tailwind, tRPC).

It serves the landing page natively and proxies the other sites under paths, so each of them keeps its own repo and Vercel project:

| Path | Project | Upstream (env var) |
| --- | --- | --- |
| `/portfolio` | [PortfolioReloaded](https://github.com/Doxxus/PortfolioReloaded) (Next.js, `basePath: '/portfolio'`) | `PORTFOLIO_UPSTREAM` |
| `/mixes` | [KairoMixes](https://github.com/Doxxus/KairoMixes) (SvelteKit static, `paths.base: '/mixes'`) | `MIXES_UPSTREAM` |

The proxy rules live in [next.config.js](./next.config.js). The home page's "latest mix" card is a tRPC query ([mixes.ts](./src/server/api/routers/mixes.ts)) that reads the KairoMixes `mixes.json`, revalidated hourly, along with the mix's tracklist (`MIXES_TRACKLISTS_URL`). The card is a custom player ([latest-mix.tsx](./src/app/_components/latest-mix.tsx)) with a cover-derived colour palette, volume and 10s skip controls, an audio-reactive visualizer, a tracklist, and keyboard shortcuts (Space, ←/→, ↑/↓ with focus, M). The visualizer needs CORS on the R2 audio; see [DEPLOYMENT.md](./DEPLOYMENT.md).

Deployment and DNS setup: see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Develop

```bash
npm install
npm run dev
```

Defaults point at the production Vercel deployments. To work against local sub-sites, copy `.env.example` to `.env` and set `PORTFOLIO_UPSTREAM` / `MIXES_UPSTREAM` (see the comments there), then run each sub-site's dev server on the matching port.

## Adding a page

- **Native page:** create `src/app/<name>/page.tsx`, then add a card to `pages` in [src/config/site.ts](./src/config/site.ts).
- **Separate project:** give that project a base path, add `{ path, upstream }` to `subSites` in [next.config.js](./next.config.js) and a card to `pages`. Cards use plain `<a>` tags on purpose: proxied paths must not go through Next's client-side router.
