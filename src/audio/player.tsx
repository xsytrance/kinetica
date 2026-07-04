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

  useEffect(() => () => { audioRef.current?.pause(); ctxRef.current?.close().catch(() => {}); }, []);

  const value = useMemo<PlayerCtx>(() => ({
    currentTrack, isPlaying, duration, analyser,
    load, play, pause, toggle, seek, getCurrentTime, setMuffle,
  }), [currentTrack, isPlaying, duration, analyser, load, play, pause, toggle, seek, getCurrentTime, setMuffle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
