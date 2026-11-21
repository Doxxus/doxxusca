"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronIcon,
  PlayPauseIcon,
  SkipIcon,
  VolumeIcon,
} from "~/app/_components/player/icons";
import {
  extractPalette,
  paletteStyle,
  type Palette,
} from "~/app/_components/player/palette";
import {
  formatTime,
  Tracklist,
  type Track,
} from "~/app/_components/player/tracklist";
import { Visualizer } from "~/app/_components/player/visualizer";

type Mix = {
  name: string;
  coverUrl: string;
  audioUrl: string;
  tracks: Track[];
};

// The mixes site stores its own state under "kairo_playback" and "theme" on this same origin, so this key must stay distinct.
const VOLUME_KEY = "doxxus_home_player_volume";
const SKIP_SECONDS = 10;
const SEEK_SECONDS = 5;
const VOLUME_STEP = 0.05;

type Volume = { level: number; muted: boolean };

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function LatestMix({ mix }: { mix: Mix }) {
  const { resolvedTheme } = useTheme();

  const rootRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const coverRef = useRef<HTMLImageElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const graph = useRef<{ context: AudioContext; analyser: AnalyserNode } | null>(
    null,
  );

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState<Volume>({ level: 0.8, muted: false });
  const [volumeLoaded, setVolumeLoaded] = useState(false);
  const [canSetVolume, setCanSetVolume] = useState(true);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [tracklistOpen, setTracklistOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const playingRef = useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Cover palette. The image may already be loaded by the time React hydrates, so check on mount too.
  const readPalette = useCallback(() => {
    const img = coverRef.current;
    if (img?.complete && img.crossOrigin) setPalette(extractPalette(img));
  }, []);
  useEffect(readPalette, [readPalette]);

  const onCoverError = () => {
    const img = coverRef.current;
    // Retry without CORS so the cover still shows; the palette just stays on the default colours
    if (img?.crossOrigin) {
      img.removeAttribute("crossorigin");
      img.src = mix.coverUrl;
    }
  };

  // Saved volume. iOS ignores programmatic volume, so the slider is hidden there rather than doing nothing.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? "null") as Partial<Volume> | null;
      if (saved && typeof saved.level === "number") {
        setVol({ level: clamp(saved.level), muted: saved.muted === true });
      }
    } catch {
      /* storage unavailable or corrupt */
    }
    const probe = new Audio();
    probe.volume = 0.5;
    setCanSetVolume(probe.volume === 0.5);
    setVolumeLoaded(true);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = vol.level;
      audio.muted = vol.muted;
    }
    if (!volumeLoaded) return;
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify(vol));
    } catch {
      /* storage unavailable */
    }
  }, [vol, volumeLoaded]);

  // Routes the audio through an analyser for the visualizer. Must happen from a user gesture so the context can start.
  const ensureGraph = () => {
    const audio = audioRef.current;
    if (!audio?.crossOrigin) return;
    if (!graph.current) {
      const Context =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Context) return;
      const context = new Context();
      const analyserNode = context.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      context.createMediaElementSource(audio).connect(analyserNode);
      analyserNode.connect(context.destination);
      graph.current = { context, analyser: analyserNode };
      setAnalyser(analyserNode);
    }
    if (graph.current.context.state === "suspended") void graph.current.context.resume();
  };

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      ensureGraph();
      setFailed(false);
      audio.play().catch(() => {
        /* interrupted by a pause or a failed load; the error handler covers the latter */
      });
    } else {
      audio.pause();
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : seconds;
    audio.currentTime = clamp(seconds, 0, limit);
    setTime(audio.currentTime);
  }, []);

  const seekBy = useCallback(
    (delta: number) => seekTo((audioRef.current?.currentTime ?? 0) + delta),
    [seekTo],
  );

  const changeVolume = useCallback((delta: number) => {
    setVol((prev) => {
      const next = clamp((prev.muted ? 0 : prev.level) + delta);
      return next === 0 ? { ...prev, muted: true } : { level: next, muted: false };
    });
  }, []);

  const toggleMute = useCallback(() => {
    setVol((prev) => {
      const muted = !prev.muted;
      // Unmuting from a slider dragged to zero would stay silent otherwise
      return { muted, level: !muted && prev.level < 0.05 ? 0.5 : prev.level };
    });
  }, []);

  // Without CORS on the audio host the analyser would read silence (or the load fails outright), so fall back to plain playback.
  const onAudioError = () => {
    const audio = audioRef.current;
    if (audio?.crossOrigin && !graph.current) {
      audio.removeAttribute("crossorigin");
      audio.load();
      return;
    }
    setPlaying(false);
    setFailed(true);
  };

  // Space and the arrows only act while this player is playing or has focus, so the page scrolls normally otherwise.
  // Up/Down also need focus inside the player, since they are scrolling keys.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "")) return;

      const focused = rootRef.current?.contains(document.activeElement) ?? false;
      if (!playingRef.current && !focused) return;

      switch (event.key) {
        case " ":
          // Buttons and links activate themselves on Space
          if (/^(BUTTON|A)$/.test(target?.tagName ?? "")) return;
          togglePlay();
          // Keeps the shortcuts live after pausing, since they only act on a focused or playing player
          playButtonRef.current?.focus({ preventScroll: true });
          break;
        case "ArrowLeft":
          seekBy(-SEEK_SECONDS);
          break;
        case "ArrowRight":
          seekBy(SEEK_SECONDS);
          break;
        case "ArrowUp":
          if (!focused) return;
          changeVolume(VOLUME_STEP);
          break;
        case "ArrowDown":
          if (!focused) return;
          changeVolume(-VOLUME_STEP);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, seekBy, changeVolume, toggleMute]);

  const activeTracks = useMemo(
    () => mix.tracks.filter((track) => time >= track.start && time < track.end),
    [mix.tracks, time],
  );
  const activeIds = useMemo(
    () => new Set(activeTracks.map((track) => track.id)),
    [activeTracks],
  );

  const effectiveVolume = vol.muted ? 0 : vol.level;
  const progress = duration ? (time / duration) * 100 : 0;
  const nowPlayingLabel = playing ? "Now playing" : time > 0 ? "Paused at" : "Opens with";

  return (
    <section
      ref={rootRef}
      aria-labelledby="latest-mix"
      className="card player p-5 sm:p-6"
      data-playing={playing || undefined}
      style={paletteStyle(palette)}
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="latest-mix"
          className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
        >
          Latest mix
        </h2>
        <p className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">
          Space play · ← → seek · ↑ ↓ volume · M mute
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <div className="player-cover shrink-0 self-center sm:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={coverRef}
            src={mix.coverUrl}
            alt=""
            crossOrigin="anonymous"
            onLoad={readPalette}
            onError={onCoverError}
            className="relative size-52 rounded-xl object-cover shadow-xl sm:size-48"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-wide uppercase">{mix.name}</p>

          {activeTracks.length > 0 && (
            <div className="mt-2 min-h-[3.25rem]">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {nowPlayingLabel}
              </p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {activeTracks.slice(0, 3).map((track) => (
                  <li key={track.id} className="now-playing-track truncate">
                    <span className="font-medium">{track.artist}</span>
                    <span className="opacity-70"> - {track.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3">
            <Visualizer
              analyser={analyser}
              playing={playing}
              redrawKey={`${resolvedTheme}-${palette?.h1}-${palette?.h2}`}
            />
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs tabular-nums text-gray-500 dark:text-gray-400">
            <span className="w-12 text-right">{formatTime(time)}</span>
            <input
              type="range"
              className="player-range"
              aria-label="Seek"
              aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(time, duration || 1)}
              disabled={!duration}
              style={{ "--fill": `${progress}%` } as React.CSSProperties}
              onChange={(event) => seekTo(Number(event.target.value))}
            />
            <span className="w-12">{formatTime(duration)}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="player-btn"
                aria-label={`Back ${SKIP_SECONDS} seconds`}
                onClick={() => seekBy(-SKIP_SECONDS)}
              >
                <SkipIcon direction="back" />
              </button>
              <button
                ref={playButtonRef}
                type="button"
                className="play-btn"
                aria-label={playing ? "Pause" : "Play"}
                onClick={togglePlay}
              >
                <PlayPauseIcon playing={playing} />
              </button>
              <button
                type="button"
                className="player-btn"
                aria-label={`Forward ${SKIP_SECONDS} seconds`}
                onClick={() => seekBy(SKIP_SECONDS)}
              >
                <SkipIcon direction="forward" />
              </button>
            </div>

            {canSetVolume && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="player-btn"
                  aria-label={vol.muted ? "Unmute" : "Mute"}
                  onClick={toggleMute}
                >
                  <VolumeIcon level={vol.level} muted={vol.muted} />
                </button>
                <input
                  type="range"
                  className="player-range w-28"
                  aria-label="Volume"
                  min={0}
                  max={1}
                  step={0.01}
                  value={effectiveVolume}
                  style={{ "--fill": `${effectiveVolume * 100}%` } as React.CSSProperties}
                  onChange={(event) => {
                    const level = Number(event.target.value);
                    setVol((prev) => ({
                      level: level === 0 ? prev.level : level,
                      muted: level === 0,
                    }));
                  }}
                />
              </div>
            )}
          </div>

          {failed && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
              This mix couldn&apos;t be loaded. Try again, or open it on the mixes page.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* Plain anchor: /mixes is proxied to another project, so client-side routing must not handle it */}
            <a
              href="/mixes"
              className="text-sm text-violet-600 hover:underline dark:text-violet-300"
            >
              Browse all mixes →
            </a>
            {mix.tracks.length > 0 && (
              <button
                type="button"
                className="tracklist-toggle"
                aria-expanded={tracklistOpen}
                aria-controls="latest-mix-tracklist"
                onClick={() => setTracklistOpen((open) => !open)}
              >
                Tracklist
                <ChevronIcon open={tracklistOpen} />
              </button>
            )}
          </div>
        </div>
      </div>

      {mix.tracks.length > 0 && (
        <Tracklist
          tracks={mix.tracks}
          activeIds={activeIds}
          open={tracklistOpen}
          onSelect={(track) => {
            seekTo(track.start);
            if (audioRef.current?.paused) togglePlay();
          }}
        />
      )}

      <audio
        ref={audioRef}
        src={mix.audioUrl}
        preload="metadata"
        crossOrigin="anonymous"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onSeeked={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onError={onAudioError}
      />
    </section>
  );
}
