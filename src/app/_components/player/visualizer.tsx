"use client";

import { useEffect, useRef } from "react";

const BARS = 36;

// Averages the FFT bins behind one bar. Bars are spaced on a curve so the bass doesn't take up the whole width.
function sample(data: Uint8Array, bar: number) {
  // MP3s are low-passed around 16 kHz, so bins above that would just be dead bars
  const usable = Math.min(data.length, 90);
  const edge = (i: number) => Math.floor(1 + (usable - 2) * Math.pow(i / BARS, 2));
  const lo = edge(bar);
  const hi = Math.max(lo + 1, edge(bar + 1));
  let sum = 0;
  for (let k = lo; k < hi; k++) sum += data[k] ?? 0;
  const avg = sum / (hi - lo) / 255;
  // Highs carry less energy, so lift them a little
  return Math.min(1, avg * (1 + (0.6 * bar) / BARS));
}

// Loud, compressed masters sit near full scale in every band, so a bar's absolute level barely moves.
// Showing how far each bar rises above its own recent average keeps the transients visible.
function shape(raw: number, baseline: number) {
  const floor = baseline * 0.95;
  const contrast = Math.max(0, (raw - floor) / Math.max(0.15, 1 - floor));
  return Math.pow(Math.min(1, 0.15 * raw * raw + 1.2 * contrast), 1.6);
}

// Stand-in used when the audio host doesn't allow CORS (the real analyser would read silence).
function simulate(now: number, bar: number) {
  return (
    0.2 +
    0.25 * (0.5 + 0.5 * Math.sin(now / 260 + bar * 0.55)) +
    0.2 * (0.5 + 0.5 * Math.sin(now / 410 + bar * 1.3))
  );
}

type Props = {
  analyser: AnalyserNode | null;
  playing: boolean;
  // Changing this repaints (e.g. after a theme or palette change) even if nothing is playing
  redrawKey: string;
};

export function Visualizer({ analyser, playing, redrawKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levels = useRef(new Float32Array(BARS));
  const baselines = useRef(new Float32Array(BARS));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    // Palette colours transition for about a second, so keep repainting through it
    const settleUntil = performance.now() + 1200;
    let raf = 0;

    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const style = getComputedStyle(canvas);
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, style.getPropertyValue("--accent-2").trim() || "#22d3ee");
      gradient.addColorStop(1, style.getPropertyValue("--accent").trim() || "#a78bfa");

      const gap = 3 * dpr;
      const barWidth = (width - gap * (BARS - 1)) / BARS;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      for (let i = 0; i < BARS; i++) {
        const barHeight = Math.max(3 * dpr, levels.current[i]! * height);
        const x = i * (barWidth + gap);
        if (ctx.roundRect) ctx.roundRect(x, height - barHeight, barWidth, barHeight, barWidth / 2);
        else ctx.rect(x, height - barHeight, barWidth, barHeight);
      }
      ctx.fill();
    };

    const step = (now: number) => {
      if (playing && analyser && data) analyser.getByteFrequencyData(data);

      let moving = false;
      for (let i = 0; i < BARS; i++) {
        let target = 0;
        if (playing && data) {
          const raw = sample(data, i);
          const baseline = baselines.current[i]! || raw;
          // Slow average (about a second and a half) that the bar is measured against
          baselines.current[i] = baseline + (raw - baseline) * 0.02;
          target = shape(raw, baseline);
        } else if (playing) {
          target = simulate(now, i);
        }
        const current = levels.current[i]!;
        // Rise fast, fall slowly
        const next = current + (target - current) * (target > current ? 0.55 : 0.1);
        levels.current[i] = next;
        if (next > 0.01) moving = true;
      }

      paint();
      if (playing || moving || now < settleUntil) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // Resizing clears the canvas, so repaint when the layout changes
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [analyser, playing, redrawKey]);

  return <canvas ref={canvasRef} aria-hidden className="h-14 w-full" />;
}
