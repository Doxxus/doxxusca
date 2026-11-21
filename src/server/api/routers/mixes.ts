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

// Covers used to be served by the mixes site itself, so root-relative paths belong under /mixes.
const resolveCover = (path: string) =>
  /^https?:\/\//.test(path) ? path : `/mixes${path}`;

export const mixesRouter = createTRPCRouter({
  latest: publicProcedure.query(async () => {
    const res = await fetch(env.MIXES_DATA_URL, { next: { revalidate: 3600 } });
    if (!res.ok) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: `Could not load mixes (${res.status})`,
      });
    }

    const { mixes } = mixesSchema.parse(await res.json());
    const latest = mixes.reduce((a, b) => (b.id > a.id ? b : a));

    return {
      id: latest.id,
      name: latest.name,
      coverUrl: resolveCover(latest.cover_path),
      audioUrl: latest.audio_file_path,
    };
  }),
});
