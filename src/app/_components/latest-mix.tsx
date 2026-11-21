type Mix = { name: string; coverUrl: string; audioUrl: string };

export function LatestMix({ mix }: { mix: Mix }) {
  return (
    <section aria-labelledby="latest-mix" className="card p-5 sm:p-6">
      <h2
        id="latest-mix"
        className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
      >
        Latest mix
      </h2>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mix.coverUrl}
          alt=""
          className="size-40 shrink-0 rounded-xl object-cover shadow-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-wide uppercase">
            {mix.name}
          </p>
          <audio
            controls
            preload="none"
            src={mix.audioUrl}
            className="mt-4 w-full"
          />
          {/* Plain anchor: /mixes is proxied to another project, so client-side routing must not handle it */}
          <a
            href="/mixes"
            className="mt-3 inline-block text-sm text-violet-600 hover:underline dark:text-violet-300"
          >
            Browse all mixes →
          </a>
        </div>
      </div>
    </section>
  );
}
