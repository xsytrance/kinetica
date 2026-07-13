import { useCallback, useEffect, useRef, useState } from "react";
import { loadStemZip, type LoadedStems } from "@/ingest/stemZip";
import { mixdownToWavUrl } from "@/audio/mixdown";
import { analyzeStems } from "@/audio/stemAnalysis";
import type { StemData } from "@/lib/stemSense";
import { DropZone } from "./DropZone";
import { LyricsStep } from "./LyricsStep";
import { ArtStep } from "./ArtStep";
import { Show } from "./Show";
import { buildTrack } from "@/lib/buildTrack";
import { makeDemo } from "@/demo/demoSong";
import { fetchRandomCatalogSong } from "@/demo/catalogDemo";
import { handleRedirectCode, installAuthListener } from "@/ai/openrouterAuth";
import type { Track } from "@/lib/types";
import type { SyncedWord } from "@/lib/lyrics";
import type { Credit } from "@/images/populate";

type Step = "drop" | "processing" | "lyrics" | "art" | "show";
interface Prepared { stems: LoadedStems; stemData: StemData; masterUrl: string; title: string }

export function App() {
  const [step, setStep] = useState<Step>("drop");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const prepared = useRef<Prepared | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [attribution, setAttribution] = useState("");

  // Finish an OpenRouter "Connect" (popup or redirect) + receive keys from popups.
  useEffect(() => {
    handleRedirectCode();
    return installAuthListener();
  }, []);

  const onFile = useCallback(async (file: File) => {
    setError(null); setStep("processing");
    try {
      const stems = await loadStemZip(file, setProgress);
      setProgress("Mixing the master…");
      const { url: masterUrl } = mixdownToWavUrl(stems);
      const stemData = await analyzeStems(stems, setProgress);
      const title = file.name.replace(/\.zip$/i, "").replace(/\s*stems?\s*$/i, "").trim() || "Untitled";
      prepared.current = { stems, stemData, masterUrl, title };
      setStep("lyrics");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("drop");
    }
  }, []);

  const onLyricsReady = useCallback((words: SyncedWord[], lyricsLrc: string, title: string, style?: string) => {
    const p = prepared.current; if (!p) return;
    const t = buildTrack({ title, lyricsLrc, words, stemData: p.stemData });
    t.audioUrl = p.masterUrl;
    // The style prompt becomes the track's mood — ArtStep's vibe suffix and the
    // per-song look generator both feed on it.
    if (style) t.mood = style;
    setTrack(t);
    setStep("art");
  }, []);

  const onArtDone = useCallback((t: Track, cr: Credit[], attr: string) => {
    setTrack(t); setCredits(cr); setAttribution(attr); setStep("show");
  }, []);

  // Demo history — ⏭ summons a fresh random planet, ⏮ walks back through
  // the ones you've already met.
  const demoHistory = useRef<Track[]>([]);
  const isDemo = !!track?.id.startsWith("catalog-");

  const onDemo = useCallback(async () => {
    setError(null); setStep("processing"); setProgress("Calling the mothership…");
    // The real demo: a random word-timed planet from the x1c7.com catalog.
    try {
      const t = await fetchRandomCatalogSong(setProgress);
      demoHistory.current = [];
      setTrack(t); setCredits([]); setAttribution(""); setStep("show");
      return;
    } catch {
      // Offline or catalog unreachable — the synthesized beat still performs.
      setProgress("Cooking up a demo beat…");
    }
    try {
      const { stems, lyricsLrc, words, title } = makeDemo();
      const { url } = mixdownToWavUrl(stems);
      const stemData = await analyzeStems(stems);
      const t = buildTrack({ title, lyricsLrc, words, stemData });
      t.audioUrl = url;
      setTrack(t); setCredits([]); setAttribution(""); setStep("show");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setStep("drop");
    }
  }, []);

  const nextSong = useCallback(async () => {
    setStep("processing"); setProgress("Summoning another planet…");
    try {
      const cur = track;
      const t = await fetchRandomCatalogSong(setProgress, cur?.id.replace(/^catalog-/, ""));
      if (cur) demoHistory.current.push(cur);
      setTrack(t);
    } catch { /* stay on the current song */ }
    setStep("show");
  }, [track]);

  const prevSong = useCallback(() => {
    const p = demoHistory.current.pop();
    if (p) setTrack(p);
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full">
      {step === "drop" && <DropZone onFile={onFile} onDemo={onDemo} error={error} />}
      {step === "processing" && (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[var(--theme-primary)]" />
          <p className="font-mono text-sm uppercase tracking-widest text-white/60">{progress || "Working…"}</p>
        </div>
      )}
      {step === "lyrics" && prepared.current && (
        <LyricsStep
          stems={prepared.current.stems}
          masterUrl={prepared.current.masterUrl}
          title={prepared.current.title}
          onReady={onLyricsReady}
        />
      )}
      {step === "art" && track && <ArtStep track={track} duration={prepared.current?.stemData.duration ?? 0} onDone={onArtDone} />}
      {step === "show" && track && (
        <Show
          track={track} credits={credits} attribution={attribution}
          onExit={() => setStep("drop")}
          onNextSong={isDemo ? nextSong : undefined}
          onPrevSong={isDemo ? prevSong : undefined}
          demoTitle={isDemo ? track.title : undefined}
        />
      )}
    </div>
  );
}
