"use client";

import { useEffect, useRef, useState } from "react";

type Point = readonly [number, number];
type Shape = { left: readonly Point[]; right: readonly Point[] };

// Both shapes use the same four points per half so they can be interpolated directly:
// the play triangle is split down the middle, and each half stretches into a pause bar.
const PLAY: Shape = {
  left: [[7, 5], [12.5, 8.5], [12.5, 15.5], [7, 19]],
  right: [[12.5, 8.5], [18, 12], [18, 12], [12.5, 15.5]],
};
const PAUSE: Shape = {
  left: [[6, 5], [10, 5], [10, 19], [6, 19]],
  right: [[14, 5], [18, 5], [18, 19], [14, 19]],
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

function points(from: readonly Point[], to: readonly Point[], t: number) {
  return from
    .map(([x, y], i) => `${lerp(x, to[i]![0], t)},${lerp(y, to[i]![1], t)}`)
    .join(" ");
}

export function PlayPauseIcon({ playing }: { playing: boolean }) {
  // 0 = play shape, 1 = pause shape. The ref keeps the latest value so a reversal mid-animation continues from there.
  const [t, setT] = useState(playing ? 1 : 0);
  const current = useRef(t);

  useEffect(() => {
    const from = current.current;
    const to = playing ? 1 : 0;
    if (from === to) return;

    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 320;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = duration ? Math.min(1, (now - start) / duration) : 1;
      current.current = lerp(from, to, ease(p));
      setT(current.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Small squash in the middle of the morph gives the swap some weight
  const scale = 1 - 0.16 * Math.sin(Math.PI * t);

  return (
    <svg
      viewBox="0 0 24 24"
      className="size-7"
      aria-hidden
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      style={{ transform: `scale(${scale})` }}
    >
      <polygon points={points(PLAY.left, PAUSE.left, t)} />
      <polygon points={points(PLAY.right, PAUSE.right, t)} />
    </svg>
  );
}

export function VolumeIcon({ level, muted }: { level: number; muted: boolean }) {
  const silent = muted || level === 0;
  const wave = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateX(0)" : "translateX(-3px)",
    transition: "opacity 200ms ease, transform 250ms ease",
  });

  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" />
      <path d="M15 9.2a4 4 0 0 1 0 5.6" style={wave(!silent && level > 0)} />
      <path d="M17.6 6.6a8 8 0 0 1 0 10.8" style={wave(!silent && level > 0.5)} />
      <path
        d="M15.5 9.5l5 5M20.5 9.5l-5 5"
        style={{
          opacity: silent ? 1 : 0,
          transform: silent ? "scale(1)" : "scale(0.4)",
          transformOrigin: "18px 12px",
          transition: "opacity 200ms ease, transform 250ms cubic-bezier(0.3, 1.6, 0.5, 1)",
        }}
      />
    </svg>
  );
}

export function SkipIcon({
  direction,
  spin = 0,
}: {
  direction: "back" | "forward";
  // Bumped on every click; changing the key replays the arrow's spin
  spin?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-7"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform={direction === "forward" ? "translate(24 0) scale(-1 1)" : undefined}>
        <g key={spin} className={spin > 0 ? "skip-arc" : undefined}>
          <path d="M12 7a6.5 6.5 0 1 1-6.5 6.5" />
          <path d="M14.5 4.5L11.5 7l3 2.5" />
        </g>
      </g>
      <text
        x="12"
        y="16.2"
        textAnchor="middle"
        fontSize="7.2"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        10
      </text>
    </svg>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 transition-transform duration-300"
      style={{ transform: open ? "rotate(180deg)" : undefined }}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
