import { useEffect, useRef } from "react";
import { useMusicPlayer } from "@/audio/player";
import { deriveTheme, DEFAULT_THEME, type Theme } from "@/lib/theme";
import { beatClock } from "@/lib/beatClock";

// Sets the CSS custom properties the engine reads that it does NOT set itself:
// --theme-primary/secondary/accent/bg (from the song's palette) and a global
// --beat pulsing off the live analyser. Renders nothing.
function apply(theme: Theme) {
  const r = document.documentElement.style;
  r.setProperty("--theme-primary", theme.primary);
  r.setProperty("--theme-secondary", theme.secondary);
  r.setProperty("--theme-accent", theme.accent);
  r.setProperty("--theme-bg", theme.bg);
}

export function ThemeEngine() {
  const { currentTrack, isPlaying, analyser } = useMusicPlayer();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const playingRef = useRef(false);
  const intensityRef = useRef(DEFAULT_THEME.intensity);
  useEffect(() => { analyserRef.current = analyser; playingRef.current = isPlaying; }, [analyser, isPlaying]);

  // Palette: the analysis palette (Levels 1/2) wins; else derive from the seed color.
  useEffect(() => {
    if (!currentTrack) { apply(DEFAULT_THEME); return; }
    const pal = currentTrack.planet?.analysis?.palette;
    if (Array.isArray(pal) && pal.length >= 3) {
      apply({ primary: pal[0], secondary: pal[1], accent: pal[2], bg: pal[3] ?? "#05030b", intensity: 0.7 });
      intensityRef.current = 0.7;
    } else {
      const t = deriveTheme(currentTrack.color || "#ff2bd6");
      apply(t);
      intensityRef.current = t.intensity;
    }
  }, [currentTrack]);

  // Beat loop — bass energy → --beat, plus onset detection feeding the tap game.
  useEffect(() => {
    let raf = 0, beat = 0, energyAvg = 0, lastOnset = 0;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    const root = document.documentElement;
    const tick = () => {
      const an = analyserRef.current;
      let target = 0;
      if (playingRef.current) {
        if (an) {
          if (!freq || freq.length !== an.frequencyBinCount) freq = new Uint8Array(an.frequencyBinCount);
          an.getByteFrequencyData(freq);
          let sum = 0; const n = Math.min(8, freq.length);
          for (let i = 0; i < n; i++) sum += freq[i];
          const raw = sum / n / 255;
          target = raw * intensityRef.current;
          energyAvg = energyAvg * 0.97 + raw * 0.03;
          const now = performance.now();
          if (raw > Math.max(0.22, energyAvg * 1.45) && now - lastOnset > 280) { lastOnset = now; beatClock.record(now); }
        } else {
          target = (0.35 + 0.25 * Math.sin(performance.now() / 240)) * intensityRef.current;
        }
      }
      beat += (target - beat) * (target > beat ? 0.5 : 0.08);
      root.style.setProperty("--beat", beat.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
