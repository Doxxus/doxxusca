"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
const ORIGIN = "12px 12px";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const maskId = useId();

  const dark = mounted && resolvedTheme === "dark";
  const sun = !dark;

  // The sun and moon are one shape: the disc shrinks into a sun with rays, or grows a bite taken out by a sliding mask circle.
  // The first paint skips the transition so the icon doesn't animate on load.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (mounted) setAnimate(true);
  }, [mounted]);
  const transition = animate ? "0.5s cubic-bezier(0.4, 0, 0.2, 1)" : "0s";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="theme-pill"
      data-dark={dark || undefined}
      data-ready={animate || undefined}
    >
      <span className="theme-pill-knob">
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{
            transform: `rotate(${sun ? 90 : 0}deg)`,
            transformOrigin: "50% 50%",
            transition: `transform ${transition}`,
          }}
        >
        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="white" stroke="none" />
          <circle
            cx="16"
            cy="8"
            r="7"
            fill="black"
            stroke="none"
            style={{
              transform: `translate(${sun ? 14 : 0}px, ${sun ? -10 : 0}px)`,
              transition: `transform ${transition}`,
            }}
          />
        </mask>
        <circle
          cx="12"
          cy="12"
          r="8.5"
          fill="currentColor"
          mask={`url(#${maskId})`}
          style={{
            transform: `translate(${sun ? 0 : 0.3}px, ${sun ? 0 : -0.3}px) scale(${sun ? 0.47 : 1})`,
            transformOrigin: ORIGIN,
            transition: `transform ${transition}`,
          }}
        />
        <g
          style={{
            opacity: sun ? 1 : 0,
            transform: `scale(${sun ? 1 : 0.4}) rotate(${sun ? 0 : -45}deg)`,
            transformOrigin: ORIGIN,
            transition: `transform ${transition}, opacity 0.3s ease`,
          }}
        >
          {RAYS.map((angle) => (
            <path key={angle} d="M12 2.5v2" transform={`rotate(${angle} 12 12)`} />
          ))}
        </g>
      </svg>
      </span>
    </button>
  );
}
