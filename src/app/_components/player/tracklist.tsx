"use client";

import { useEffect, useRef } from "react";

export type Track = {
  id: number;
  artist: string;
  title: string;
  start: number;
  end: number;
};

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

type Props = {
  tracks: Track[];
  activeIds: ReadonlySet<number>;
  open: boolean;
  onSelect: (track: Track) => void;
};

export function Tracklist({ tracks, activeIds, open, onSelect }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const firstActive = tracks.find((track) => activeIds.has(track.id))?.id;

  // Scrolls the list itself rather than the page, so playback never moves the viewport
  useEffect(() => {
    const list = listRef.current;
    if (!open || !list || firstActive === undefined) return;
    const row = list.querySelector<HTMLElement>(`[data-track="${firstActive}"]`);
    if (!row) return;
    list.scrollTo({
      top: row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2,
      behavior: "smooth",
    });
  }, [open, firstActive]);

  return (
    <div
      id="latest-mix-tracklist"
      className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
      style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      inert={!open}
    >
      <div className="overflow-hidden">
        <ol ref={listRef} className="relative mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
          {tracks.map((track, index) => (
            <li key={track.id} data-track={track.id}>
              <button
                type="button"
                onClick={() => onSelect(track)}
                className="track-row"
                data-active={activeIds.has(track.id) || undefined}
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums opacity-60">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  <span className="font-medium">{track.artist}</span>
                  <span className="opacity-70"> - {track.title}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums opacity-60">
                  {formatTime(track.start)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
