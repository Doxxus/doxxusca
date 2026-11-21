import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const mixesSchema = z.object({
  mixes: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        cover_path: z.string(),
        audio_file_path: z.string().url(),
      }),
    )
    .min(1),
});

const tracklistsSchema = z.object({
  tracklists: z.array(
    z.object({
      id: z.number(),
      tracks: z.array(
        z.object({
          id: z.number(),
          artist: z.string(),
          title: z.string(),
          start_time: z.number(),
          end_time: z.number(),
        }),
      ),
    }),
  ),
});

// Covers used to be served by the mixes site itself, so root-relative paths belong under /mixes.
const resolveCover = (path: string) =>
  /^https?:\/\//.test(path) ? path : `/mixes${path}`;

async function fetchJson(url: string) {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`${url} responded with ${res.status}`);
  return (await res.json()) as unknown;
}

// A missing or malformed tracklist should never take the player down with it.
async function fetchTracks(mixId: number) {
  try {
    const { tracklists } = tracklistsSchema.parse(
      await fetchJson(env.MIXES_TRACKLISTS_URL),
    );
    return (
      tracklists
        .find((list) => list.id === mixId)
        ?.tracks.map((track) => ({
          id: track.id,
          artist: track.artist,
          title: track.title,
          start: track.start_time,
          end: track.end_time,
        })) ?? []
    );
  } catch {
    return [];
  }
}

export const mixesRouter = createTRPCRouter({
  latest: publicProcedure.query(async () => {
    let mixes: z.infer<typeof mixesSchema>["mixes"];
    try {
      ({ mixes } = mixesSchema.parse(await fetchJson(env.MIXES_DATA_URL)));
    } catch (error) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "Could not load mixes",
        cause: error,
      });
    }

    // mixes.json numbers newest-first, so the lowest id is the latest mix
    const latest = mixes.reduce((a, b) => (b.id < a.id ? b : a));

    return {
      id: latest.id,
      name: latest.name,
      coverUrl: resolveCover(latest.cover_path),
      audioUrl: latest.audio_file_path,
      tracks: await fetchTracks(latest.id),
    };
  }),
});

