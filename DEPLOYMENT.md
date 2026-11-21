# Deployment guide: doxxus.ca home site

## What was built

| Project | Local folder | Branch (uncommitted changes) | Change |
| --- | --- | --- | --- |
| Home site (new) | `Code_Projects\doxxusca` | not a git repo yet | Next.js/T3 app; proxies `/portfolio` and `/mixes` |
| Portfolio | `Code_Projects\PortfolioReloaded` | `feat/serve-under-doxxus-ca-portfolio` | `basePath: '/portfolio'`, tRPC/icon paths, `folio.doxxus.ca` redirect |
| Mixes | `Code_Projects\KairoMixes\KairoMixes` | `feat/serve-under-doxxus-ca-mixes` | `paths.base: '/mixes'`, covers moved to `media.doxxus.ca`, `mixes.doxxus.ca` redirect |

The changes in the two existing repos are on their branches but **not committed**. Review them with `git diff`, then commit them.

```
browser -> doxxus.ca (home project)
             /               rendered by the home site
             /portfolio/*  -> https://portfolio-reloaded.vercel.app/portfolio/*   (prefix kept: Next basePath)
             /mixes/*      -> https://kairo-mixes.vercel.app/*                    (prefix stripped: static build)
folio.doxxus.ca  -> redirect -> doxxus.ca/portfolio   (host rule inside the portfolio project)
mixes.doxxus.ca  -> redirect -> doxxus.ca/mixes       (host rule inside the mixes project)
```

The SvelteKit build writes its files at the root of `build/` but references them as `/mixes/_app/...`. That's why the `/mixes` rewrite strips the prefix, while `/portfolio` keeps it. A direct visit to `kairo-mixes.vercel.app` therefore has broken assets. That's expected, and nobody should visit it directly.

## Rollout order

The order matters. Once the portfolio and mixes branches are merged, their old subdomains redirect to `doxxus.ca/...`, so the home site must already be live.

### 1. Cloudflare R2: move the covers and set CORS

The mixes app reads cover pixels on a canvas to build its colour theme. Covers on another origin therefore need CORS, and the `<img>` now has `crossorigin="anonymous"`. **Without CORS, the covers won't load at all.** Do this before merging the mixes branch.

1. Upload the covers to the bucket behind `media.doxxus.ca`, under `Covers/` (same file names, e.g. `Covers/simulacrum.jpg`). From `KairoMixes\KairoMixes`:
   ```powershell
   Get-ChildItem static\Covers\*.jpg | ForEach-Object {
     npx wrangler r2 object put "<bucket-name>/Covers/$($_.Name)" --file $_.FullName --content-type image/jpeg --remote
   }
   ```
   (Or drag the folder into the bucket in the dashboard.)
2. Dashboard: **R2 > your bucket > Settings > CORS Policy > Add**:
   ```json
   [
     {
       "AllowedOrigins": [
         "https://doxxus.ca",
         "https://mixes.doxxus.ca",
         "http://localhost:5173"
       ],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```
3. Verify:
   ```powershell
   curl.exe -I -H "Origin: https://doxxus.ca" https://media.doxxus.ca/Covers/simulacrum.jpg
   ```
   Expect `200` and `access-control-allow-origin: https://doxxus.ca`.
4. Optional: add a Cache Rule for `media.doxxus.ca/Covers/*` (Cache eligibility: eligible, Edge TTL: 1 month), or set `Cache-Control` on the objects.

The audio files don't need any change. They use a plain `<audio>` element, which doesn't need CORS.

### 2. Vercel: deploy the home site

1. Create a GitHub repo (e.g. `Doxxus/doxxusca`) and push the home site:
   ```powershell
   cd F:\Documents\Personal\Code_Projects\doxxusca
   git init -b main
   git add .
   git commit -m "Initial home site"
   git remote add origin https://github.com/Doxxus/doxxusca.git
   git push -u origin main
   ```
2. Vercel dashboard: **Add New > Project**, import the repo. Framework preset is auto-detected as Next.js. Leave the build settings alone.
3. Environment variables are optional. The defaults already point at the production deployments:
   - `PORTFOLIO_UPSTREAM` = `https://portfolio-reloaded.vercel.app/portfolio`
   - `MIXES_UPSTREAM` = `https://kairo-mixes.vercel.app`
   - `MIXES_DATA_URL` = `https://raw.githubusercontent.com/Doxxus/KairoMixes/main/src/mixes.json`

   First check that those two `*.vercel.app` names are the real production domains. Open each project, go to **Settings > Domains**, and set the env vars above if they differ.
4. Deploy. At this point the home page (`/`) works on the project's `*.vercel.app` URL. `/portfolio` and `/mixes` only work after step 4, because the sub-sites don't have their base paths yet.

### 3. Attach `doxxus.ca` to the home project

1. Home project: **Settings > Domains > Add** `doxxus.ca`. Also add `www.doxxus.ca` and choose "Redirect to doxxus.ca".
2. Cloudflare DNS for the `doxxus.ca` zone: create the records Vercel shows. Use the Cloudflare values, which are typically:
   - apex `doxxus.ca`: `A` to `76.76.21.21` (or `CNAME` to `cname.vercel-dns.com`, which Cloudflare flattens)
   - `www`: `CNAME` to `cname.vercel-dns.com`
3. Set every Vercel-bound record to **DNS only** (grey cloud, not proxied). Proxying Vercel through Cloudflare breaks certificate issuance and caching.
4. **Leave the `folio` and `mixes` records and their Vercel project domains exactly as they are.** The redirect rules rely on those hosts still being attached to their own projects.
5. Wait until Vercel shows the domain as valid and `https://doxxus.ca` loads.

### 4. Merge the two sub-site branches

1. Commit and push each branch, open a PR, and merge it. Previews are behind Deployment Protection, so the home site can't proxy them. You can still test everything beforehand by running the home site locally against local sub-site builds (see `.env.example`).
2. After each merge, Vercel builds `main` for that project. When the build finishes:
   - `https://doxxus.ca/portfolio` and `https://doxxus.ca/mixes` work through the proxy.
   - `https://folio.doxxus.ca` redirects (307) to `https://doxxus.ca/portfolio`.
   - `https://mixes.doxxus.ca` redirects (307) to `https://doxxus.ca/mixes`.

   Merge both close together to keep the transition short. Until the portfolio build finishes, `folio.doxxus.ca` still serves the old site. After it finishes, the redirect is live and so is `/portfolio`.
3. If the proxy returns `401`, open the sub-site's Vercel project and go to **Settings > Deployment Protection**. Make sure production isn't protected (Vercel Authentication on "Only Preview Deployments" is fine).

### 5. Verify

```powershell
foreach ($u in 'https://doxxus.ca','https://doxxus.ca/portfolio','https://doxxus.ca/mixes') { curl.exe -s -o NUL -w "%{http_code} $u`n" $u }
curl.exe -sI https://folio.doxxus.ca | Select-String 'HTTP|location'
curl.exe -sI https://mixes.doxxus.ca | Select-String 'HTTP|location'
```

In the browser:
- On `/mixes`, play a mix, then check that covers load, the colour theme is applied, and the media-session artwork shows up.
- On `/portfolio`, check that projects load from GitHub (this is the tRPC call to `/portfolio/api/trpc`), the nav icon shows, and the favicon shows.
- On `/`, check that the "Latest mix" card shows and plays.

### 6. Make the redirects permanent

The subdomain redirects are temporary (307) so a mistake can't be cached by browsers. After a few days of everything working, change `permanent: false` to `permanent: true` in both repos:
- `PortfolioReloaded\next.config.js`
- `KairoMixes\KairoMixes\vercel.json` (`"permanent": true`)

### 7. Cleanup (optional)

- Delete `static/Covers/` from the mixes repo once the R2 upload is confirmed. It's no longer referenced, and the `Covers/` exclusion in `vercel.json` can go with it.
- In Google Search Console, add `https://doxxus.ca` as a property. The 301s carry the old subdomain URLs over.

## Rollback

- A bad sub-site deploy: Vercel project > Deployments > **Instant Rollback**.
- The redirects misbehave: remove the `redirects` block from that repo's config (or `vercel.json`) and redeploy. The old subdomain serves its content under `/portfolio` or `/mixes`, so it still works there.
- The home site misbehaves: remove `doxxus.ca` from its Vercel project. The sub-sites are unaffected.

## Things worth knowing

- **Shared browser storage.** All three sites are now one origin, so `localStorage` is shared. Both apps already use the `theme` key (the mixes app now accepts `system` too), so the theme choice carries across sites. The mixes player uses `kairo_playback`.
- **Link with plain `<a>` tags** to `/portfolio` and `/mixes` from the home site. `next/link` would try to prefetch and route client-side into a different project.
- **Adding something new:** see the "Adding a page" section in `README.md`. For a new proxied project, add a host redirect from its old subdomain (copy the `redirects` rule from the portfolio) so the old URL doesn't break.
- **Latest mix card.** It reads `src/mixes.json` from the KairoMixes `main` branch and shows the highest `id`. Adding a mix there shows up on the home page within an hour. If GitHub is unreachable, the card is hidden.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `/mixes` blank, JS 404s | The mixes branch isn't deployed yet, or `MIXES_UPSTREAM` has a path suffix. It must be the bare origin. |
| `/portfolio` 404 | The portfolio branch isn't deployed yet, or `PORTFOLIO_UPSTREAM` is missing the `/portfolio` suffix. |
| Mix covers broken | R2 CORS missing (step 1), or the files aren't under `Covers/`. |
| Mix covers load, theme stays default | CORS lacks `https://doxxus.ca` in `AllowedOrigins`. |
| Redirect loop on `/portfolio` or `/mixes` | `PORTFOLIO_UPSTREAM` or `MIXES_UPSTREAM` points at `folio.`/`mixes.doxxus.ca`. Use the `*.vercel.app` URLs. |
| `401` from the proxy | Deployment Protection on the sub-site's production deployment. |
| Cert error on `doxxus.ca` | The DNS record is proxied (orange cloud). Set it to DNS only. |
