import { useEffect, useRef, useState } from "react";
import { KineticStage } from "@/engine/KineticStage";
import { fetchRandomCatalogSong } from "@/demo/catalogDemo";
import { P } from "@/lib/engine/params";
import { Eq } from "./Eq";
import type { Track } from "@/lib/types";

// HERO SHOW — the landing's living wallpaper. A real catalog song performs
// behind the invitation, MUTED, the instant you arrive: words ignite, the
// backdrop breathes. The muted <audio> is only a clock — KineticStage reads
// its currentTime (which advances while muted), so there's no sound and no
// autoplay-policy fight. Bypasses the app player entirely.
//
// Perf is the whole game here, so the live path is gated: reduced-motion,
// touch/small screens, and no-WebGL2 all fall back to a static poster (same
// gradient + a calm equalizer). The show pauses when the tab is hidden or the
// hero scrolls offscreen, renders at a low scale, and never blocks the UI —
// it's `pointer-events-none` and `aria-hidden`; the real invitation sits on top.

/** Can this device run the live engine as a background without hurting? */
function canRunLive(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia;
  if (mm("(prefers-reduced-motion: reduce)").matches) return false;
  if (mm("(pointer: coarse)").matches) return false; // phones/tablets → poster
  if (Math.min(window.innerWidth, window.innerHeight) < 720) return false;
  try {
    const c = document.createElement("canvas");
    if (!c.getContext("webgl2")) return false;
  } catch {
    return false;
  }
  return true;
}

/** The calm fallback: theme gradient + a breathing equalizer, no engine. */
function Poster() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--theme-primary) 26%, transparent), transparent 45%)," +
            "radial-gradient(circle at 78% 30%, color-mix(in srgb, var(--theme-secondary) 22%, transparent), transparent 40%)," +
            "radial-gradient(circle at 50% 85%, color-mix(in srgb, var(--theme-accent) 16%, transparent), transparent 50%)",
        }}
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pb-10 opacity-40">
        <Eq bars={40} />
      </div>
    </div>
  );
}

export function HeroShow({ onSongChange }: { onSongChange?: (title: string) => void }) {
  const [live, setLive] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [rolling, setRolling] = useState(false); // audio has begun advancing
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Decide capability once, fetch a song, and gently drop the render scale for
  // a background (restored on unmount so a full show later runs at full res).
  useEffect(() => {
    if (!canRunLive()) return;
    setLive(true);
    let cancelled = false;
    const prevScale = P.get("backdrop.renderScale");
    P.set("backdrop.renderScale", 0.35, "code");
    // Silence the tap-the-beat game HUD for the wallpaper (it defaults on in
    // focus mode). The stage reads this once, and only mounts after the async
    // fetch below resolves — so setting it here lands before the stage reads it.
    const prevBeatGame = localStorage.getItem("x1c7-beat-game");
    localStorage.setItem("x1c7-beat-game", "off");
    fetchRandomCatalogSong()
      .then((t) => {
        if (cancelled) return;
        setTrack(t);
        onSongChange?.(t.title);
      })
      .catch(() => setLive(false)); // catalog unreachable → poster
    return () => {
      cancelled = true;
      P.set("backdrop.renderScale", prevScale, "code");
      if (prevBeatGame === null) localStorage.removeItem("x1c7-beat-game");
      else localStorage.setItem("x1c7-beat-game", prevBeatGame);
    };
  }, [onSongChange]);

  // The muted clock element + lifecycle (pause when hidden/offscreen).
  useEffect(() => {
    if (!track) return;
    const a = new Audio();
    a.src = track.audioUrl;
    a.crossOrigin = "anonymous";
    a.muted = true;
    a.loop = true;
    a.preload = "auto";
    audioRef.current = a;
    a.play().then(() => setRolling(true)).catch(() => setRolling(true)); // either way, mount the stage

    const resume = () => { if (!document.hidden) a.play().catch(() => {}); };
    const onVis = () => (document.hidden ? a.pause() : resume());
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | null = null;
    if (boxRef.current) {
      io = new IntersectionObserver(
        ([e]) => (e.isIntersecting ? resume() : a.pause()),
        { threshold: 0.04 },
      );
      io.observe(boxRef.current);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
  }, [track]);

  if (!live) return <Poster />;

  return (
    <div ref={boxRef} aria-hidden className="absolute inset-0 overflow-hidden">
      {track && rolling ? (
        // transform box → the containing block for the engine's fixed layers,
        // so the whole show letterboxes to the hero instead of the viewport.
        <div className="hero-live-stage absolute inset-0" style={{ transform: "translateZ(0)" }}>
          {/* Wallpaper, not a playable surface: hide the stage's interactive
              chrome (the tap-the-beat toggle + mic/swipe prompt pills). Scoped
              to the hero, so the real show keeps every control. */}
          <style>{`.hero-live-stage [title^="Tap-to-the-beat"],.hero-live-stage .stage-warn-pill{display:none!important}`}</style>
          {/* focus mode = calm cinematic single words (no pressure gauge, most
              legible behind text); the timeline is pushed off-screen. */}
          <KineticStage
            track={track}
            pass={3}
            mode="focus"
            forceBackdrop
            timelineBottomClass="-bottom-64"
            clock={() => audioRef.current?.currentTime ?? 0}
          />
        </div>
      ) : (
        <Poster />
      )}
      {/* legibility scrim: darken overall + a center vignette so the invitation
          on top always reads, whatever the show is doing behind it */}
      <div className="absolute inset-0 bg-[var(--theme-bg)]/45" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 55% at 50% 46%, color-mix(in srgb, var(--theme-bg) 78%, transparent), transparent 75%)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--theme-bg)]/50 via-transparent to-[var(--theme-bg)]/90" />
    </div>
  );
}
