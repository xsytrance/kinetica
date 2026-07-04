import { useCallback, useRef, useState } from "react";
import { loadStemZip, type LoadedStems } from "@/ingest/stemZip";
import { mixdownToWavUrl } from "@/audio/mixdown";
import { analyzeStems } from "@/audio/stemAnalysis";
import type { StemData } from "@/lib/stemSense";
import { DropZone } from "./DropZone";
import { LyricsStep } from "./LyricsStep";
import { Show } from "./Show";
import { buildTrack } from "@/lib/buildTrack";
import type { Track } from "@/lib/types";
import type { SyncedWord } from "@/lib/lyrics";

type Step = "drop" | "processing" | "lyrics" | "show";
interface Prepared { stems: LoadedStems; stemData: StemData; masterUrl: string; title: string }

export function App() {
  const [step, setStep] = useState<Step>("drop");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const prepared = useRef<Prepared | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

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

  const onLyricsReady = useCallback((words: SyncedWord[], lyricsLrc: string, title: string) => {
    const p = prepared.current; if (!p) return;
    const t = buildTrack({ title, lyricsLrc, words, stemData: p.stemData });
    t.audioUrl = p.masterUrl;
    setTrack(t);
    setStep("show");
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full">
      {step === "drop" && <DropZone onFile={onFile} error={error} />}
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
      {step === "show" && track && <Show track={track} onExit={() => setStep("drop")} />}
    </div>
  );
}
