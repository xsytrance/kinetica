import { useCallback, useEffect, useMemo, useState } from "react";
import { useMusicPlayer } from "@/audio/player";
import type { LoadedStems } from "@/ingest/stemZip";
import { parseLyrics, type SyncedWord } from "@/lib/lyrics";
import { wordsFromLrc, lrcFromWords } from "@/lib/lyricsBuild";
import { transcribeOnDevice } from "@/transcribe/whisper";

type Tab = "auto" | "paste";

export function LyricsStep({ stems, masterUrl, title, onReady }: {
  stems: LoadedStems;
  masterUrl: string;
  title: string;
  onReady: (words: SyncedWord[], lrc: string, title: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("auto");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [text, setText] = useState("");
  const [songTitle, setSongTitle] = useState(title);

  // ── Auto: on-device Whisper ──
  const runAuto = useCallback(async () => {
    setBusy(true); setMsg("");
    try {
      const { words } = await transcribeOnDevice(stems, setMsg);
      onReady(words, lrcFromWords(words), songTitle);
    } catch (e) {
      setMsg((e instanceof Error ? e.message : String(e)) + " — try the Paste tab instead.");
      setBusy(false);
    }
  }, [stems, songTitle, onReady]);

  // ── Paste: LRC goes straight through; plain text → tap-sync ──
  const parsed = useMemo(() => parseLyrics(text), [text]);
  const usePasted = useCallback(() => {
    if (parsed.synced) { onReady(wordsFromLrc(text), text, songTitle); return; }
    setSyncing(true);
  }, [parsed.synced, text, songTitle, onReady]);

  // ── Tap-to-sync (plain lyrics) ──
  const [syncing, setSyncing] = useState(false);
  const lines = useMemo(() => text.split("\n").map((l) => l.trim()).filter(Boolean), [text]);
  const [stamps, setStamps] = useState<number[]>([]);
  const player = useMusicPlayer();

  useEffect(() => {
    if (!syncing) return;
    player.load({ id: "sync", title: songTitle, artist: "", genre: "", color: "#ff2bd6", audioUrl: masterUrl });
    setStamps([]);
    const t = setTimeout(() => player.play(), 250);
    return () => { clearTimeout(t); player.pause(); };
  }, [syncing]); // eslint-disable-line react-hooks/exhaustive-deps

  const stamp = useCallback(() => {
    setStamps((s) => (s.length >= lines.length ? s : [...s, player.getCurrentTime()]));
  }, [lines.length, player]);

  useEffect(() => {
    if (!syncing) return;
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); stamp(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [syncing, stamp]);

  const finishSync = useCallback(() => {
    const toLrc = (sec: number) => {
      const mm = Math.floor(sec / 60), ss = Math.floor(sec % 60), cs = Math.round((sec % 1) * 100) % 100;
      return `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
    };
    const lrc = lines.map((l, i) => (stamps[i] != null ? toLrc(stamps[i]) + l : l)).filter((_, i) => stamps[i] != null).join("\n");
    player.pause();
    onReady(wordsFromLrc(lrc), lrc, songTitle);
  }, [lines, stamps, player, songTitle, onReady]);

  if (syncing) {
    const cur = stamps.length;
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-white/50">Tap the beat — press <b className="text-white">Space</b> (or the button) as each line starts</p>
        <div className="max-w-2xl space-y-1">
          {lines.map((l, i) => (
            <p key={i} className={`text-lg transition ${i < cur ? "text-white/30" : i === cur ? "font-bold text-[var(--theme-primary)] scale-105" : "text-white/60"}`}>{l}</p>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={stamp} className="rounded-full bg-[var(--theme-primary)] px-8 py-3 font-display font-bold text-black">Tap ({cur}/{lines.length})</button>
          <button onClick={finishSync} disabled={cur === 0} className="rounded-full border border-white/20 px-6 py-3 font-mono text-xs uppercase tracking-wider text-white/70 disabled:opacity-30">Done</button>
          <button onClick={() => { player.pause(); setSyncing(false); }} className="rounded-full border border-white/20 px-6 py-3 font-mono text-xs uppercase tracking-wider text-white/50">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center gap-6 p-6">
      <input
        value={songTitle} onChange={(e) => setSongTitle(e.target.value)}
        className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 font-display text-lg font-bold text-white outline-none focus:border-[var(--theme-primary)]"
        placeholder="Song title"
      />
      <div className="flex gap-2">
        {(["auto", "paste"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2 font-mono text-xs uppercase tracking-wider transition ${tab === t ? "bg-[var(--theme-primary)] text-black" : "border border-white/20 text-white/60"}`}>
            {t === "auto" ? "Auto — on device" : "Paste / LRC"}
          </button>
        ))}
      </div>

      {tab === "auto" ? (
        <div className="space-y-4 text-center">
          <p className="font-mono text-xs leading-relaxed text-white/50">
            Transcribe the vocals right here on your device — no API key, nothing leaves your machine.
            First run downloads a small model (~40MB), then it's cached.
          </p>
          <button onClick={runAuto} disabled={busy} className="rounded-full bg-[var(--theme-primary)] px-8 py-3 font-display font-bold text-black disabled:opacity-40">
            {busy ? "Working…" : "Transcribe & build the show"}
          </button>
          {msg && <p className="font-mono text-[11px] text-white/50">{msg}</p>}
          {busy && <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--theme-primary)]" />}
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={10}
            placeholder={"Paste your lyrics.\n\nAlready have timestamps? Paste LRC like:\n[00:12.30]first line\n[00:15.80]second line\n\nPlain lyrics? You'll tap along to time them next."}
            className="w-full rounded-lg border border-white/15 bg-white/5 p-4 font-mono text-sm text-white outline-none focus:border-[var(--theme-primary)]"
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">{parsed.synced ? "Timed LRC detected ✓" : `${lines.length} lines — you'll tap to sync`}</span>
            <button onClick={usePasted} disabled={!text.trim()} className="rounded-full bg-[var(--theme-primary)] px-6 py-2 font-display font-bold text-black disabled:opacity-40">
              {parsed.synced ? "Build the show" : "Next: tap to sync"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
