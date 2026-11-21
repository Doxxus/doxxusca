/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { env } from "./src/env.js";

/**
 * Sub-sites that live in their own repos/Vercel projects and are proxied under a path here.
 * To add another one, add an entry and a card in `src/config/site.ts`.
 *
 * `upstream` is the URL the path maps to, so it must already include whatever prefix the
 * upstream serves under (Next.js with basePath keeps it, the static SvelteKit build does not).
 */
const subSites = [
  { path: "/portfolio", upstream: env.PORTFOLIO_UPSTREAM },
  { path: "/mixes", upstream: env.MIXES_UPSTREAM },
];

/** @type {import("next").NextConfig} */
const config = {
  async rewrites() {
    return subSites.flatMap(({ path, upstream }) => [
      { source: path, destination: upstream },
      { source: `${path}/:rest+`, destination: `${upstream}/:rest+` },
    ]);
  },
};

export default config;
