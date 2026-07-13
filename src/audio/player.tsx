import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/lib/types";

// Kinetica's player — the small surface the engine needs, backed by a local
// <audio> element (fed an object URL of the mixed master) + a Web Audio graph
// (source → lowpass "muffle" → analyser → destination). Nothing is uploaded.
interface PlayerCtx {
  currentTrack: Track | null;
  isPlaying: boolean;
  duration: number;
  analyser: AnalyserNode | null;
  load: (t: Track) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  getCurrentTime: () => number;
  setMuffle: (amount: number) => void;
  /** A live MediaStream of the song audio, for recording an export. */
  getAudioStream: () => MediaStream | null;
  /** Resolves once the loaded song is safely playable (buffered well ahead) —
   *  the show holds its curtain on this instead of opening into silence. */
  waitReady: (aheadSec?: number) => Promise<void>;
}

const Ctx = createContext<PlayerCtx | null>(null);
export const useMusicPlayer = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMusicPlayer must be used within <MusicPlayerProvider>");
  return c;
};

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const lowpassRef = useRef<BiquadFilterNode | null>(null);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Build the audio element + graph once, lazily (AudioContext needs a gesture).
  const ensureGraph = useCallback(() => {
    if (audioRef.current) return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration || 0));
    audio.addEventListener("ended", () => setIsPlaying(false));
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      const src = ac.createMediaElementSource(audio);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 22050;
      const an = ac.createAnalyser();
      an.fftSize = 1024;
      an.smoothingTimeConstant = 0.75;
      src.connect(lp); lp.connect(an); an.connect(ac.destination);
      // Tap a MediaStream of the processed audio for the video export.
      const streamDest = ac.createMediaStreamDestination();
      an.connect(streamDest);
      streamDestRef.current = streamDest;
      ctxRef.current = ac; lowpassRef.current = lp;
      setAnalyser(an);
    } catch {
      /* Web Audio unavailable — playback still works, --beat falls back to synthetic */
    }
  }, []);

  const load = useCallback((t: Track) => {
    ensureGraph();
    const audio = audioRef.current!;
    audio.src = t.audioUrl;
    audio.load();
    setCurrentTrack(t);
    setIsPlaying(false);
  }, [ensureGraph]);

  const play = useCallback(() => {
    ensureGraph();
    ctxRef.current?.resume();
    audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [ensureGraph]);
  const pause = useCallback(() => { audioRef.current?.pause(); setIsPlaying(false); }, []);
  const toggle = useCallback(() => { (audioRef.current?.paused ? play : pause)(); }, [play, pause]);
  const seek = useCallback((t: number) => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, t); }, []);
  const getCurrentTime = useCallback(() => audioRef.current?.currentTime ?? 0, []);
  const setMuffle = useCallback((amount: number) => {
    const lp = lowpassRef.current, ac = ctxRef.current;
    if (!lp || !ac) return;
    // amount 0 → open (22kHz), 1 → heavily muffled (~380Hz), smooth ramp.
    const f = 22050 - Math.max(0, Math.min(1, amount)) * (22050 - 380);
    lp.frequency.setTargetAtTime(f, ac.currentTime, 0.18);
  }, []);

  const getAudioStream = useCallback(() => streamDestRef.current?.stream ?? null, []);

  const waitReady = useCallback((aheadSec = 6) => new Promise<void>((resolve) => {
    const audio = audioRef.current;
    if (!audio) { resolve(); return; }
    const ready = () => {
      if (audio.readyState >= 4) return true; // browser says: through to the end
      const buf = audio.buffered;
      const ahead = buf.length ? buf.end(buf.length - 1) - audio.currentTime : 0;
      return audio.readyState >= 3 && (ahead >= aheadSec || (audio.duration > 0 && ahead >= audio.duration - 0.5));
    };
    if (ready()) { resolve(); return; }
    const evs = ["canplaythrough", "canplay", "progress", "loadeddata"] as const;
    const check = () => { if (ready()) { evs.forEach((e) => audio.removeEventListener(e, check)); resolve(); } };
    evs.forEach((e) => audio.addEventListener(e, check));
  }), []);

  useEffect(() => () => { audioRef.current?.pause(); ctxRef.current?.close().catch(() => {}); }, []);

  const value = useMemo<PlayerCtx>(() => ({
    currentTrack, isPlaying, duration, analyser,
    load, play, pause, toggle, seek, getCurrentTime, setMuffle, getAudioStream, waitReady,
  }), [currentTrack, isPlaying, duration, analyser, load, play, pause, toggle, seek, getCurrentTime, setMuffle, getAudioStream, waitReady]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
