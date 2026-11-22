import Image from "next/image";

import { LatestMix } from "~/app/_components/latest-mix";
import { ThemeToggle } from "~/app/_components/theme-toggle";
import { pages, siteConfig } from "~/config/site";
import { api } from "~/trpc/server";

export default async function Home() {
  const latestMix = await api.mixes.latest().catch(() => null);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-400/20 blur-3xl"
      />

      <header className="relative mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/dox_icon.png" alt="" width={32} height={32} />
          <span className="text-gradient">{siteConfig.handle}</span>
        </a>
        <ThemeToggle />
      </header>

      <main className="relative mx-auto flex max-w-3xl flex-col gap-12 px-4 pt-12 pb-20 sm:pt-20">
        <section>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            <span className="text-gradient">{siteConfig.name}</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            {siteConfig.tagline}
          </p>
        </section>

        {siteConfig.about.length > 0 && (
          <section aria-labelledby="about" className="-mt-4">
            <h2
              id="about"
              className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
            >
              About
            </h2>
            <div className="mt-3 max-w-2xl space-y-3 text-gray-700 dark:text-gray-300">
              {siteConfig.about.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}

        <section aria-label="Pages" className="grid gap-4 sm:grid-cols-2">
          {pages.map((page) => (
            // Plain anchors: these paths are proxied to other projects, so client-side routing must not handle them
            <a
              key={page.href}
              href={page.href}
              className="card group p-5 transition-colors hover:border-violet-400 dark:hover:border-violet-500"
            >
              <h2 className="text-xl font-semibold">
                {page.title}{" "}
                <span className="inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {page.description}
              </p>
            </a>
          ))}
        </section>

        {latestMix && <LatestMix mix={latestMix} />}

        <footer className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
          {siteConfig.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-gray-900 dark:hover:text-gray-100"
            >
              {link.label}
            </a>
          ))}
        </footer>
      </main>
    </div>
  );
}
