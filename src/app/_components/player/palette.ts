import type { CSSProperties } from "react";

export type Palette = { h1: number; s1: number; h2: number; s2: number };

// Mirrors the cover colour extraction on the mixes site so both pages theme a cover the same way.
// Returns null when the pixels can't be read (cover host sent no CORS headers).
export function extractPalette(img: HTMLImageElement): Palette | null {
  if (!img.naturalWidth) return null;
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    const weights = new Array<number>(12).fill(0);
    const sats = new Array<number>(12).fill(0);
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 3] ?? 0) < 128) continue;
      const [h, s, l] = rgbToHsl(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      const weight = s * (1 - Math.abs(2 * l - 1)) + 0.01;
      const bucket = Math.floor(h / 30) % 12;
      weights[bucket]! += weight;
      sats[bucket]! += weight * s;
      total += weight;
    }
    if (!total) return null;

    const order = weights
      .map((_, i) => i)
      .sort((a, b) => weights[b]! - weights[a]!);
    const primary = order[0]!;
    const secondary = weights[order[1]!]! > total * 0.1 ? order[1]! : primary;
    const hue = (bucket: number) => bucket * 30 + 15;
    const sat = (bucket: number) =>
      Math.round(
        Math.min(0.75, Math.max(0.25, sats[bucket]! / (weights[bucket] || 1))) *
          100,
      );

    return { h1: hue(primary), s1: sat(primary), h2: hue(secondary), s2: sat(secondary) };
  } catch {
    return null;
  }
}

// The CSS registers these properties so changing them animates (see globals.css).
export function paletteStyle(palette: Palette | null): CSSProperties {
  if (!palette) return {};
  return {
    "--p-h1": palette.h1,
    "--p-s1": `${palette.s1}%`,
    "--p-h2": palette.h2,
    "--p-s2": `${palette.s2}%`,
  } as CSSProperties;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}
