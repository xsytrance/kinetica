import { useCallback, useEffect, useMemo, useState } from "react";
import { useMusicPlayer } from "@/audio/player";
import type { LoadedStems } from "@/ingest/stemZip";
import { parseLyrics, type SyncedWord } from "@/lib/lyrics";
import { wordsFromLrc, lrcFromWords } from "@/lib/lyricsBuild";
import { transcribeOnDevice } from "@/transcribe/whisper";
import { alignLyrics, isHeaderLine } from "@/lib/align";
import { loadLexicon, aggregateLegos } from "@/lib/lexicon/lookup";
import type { Lexicon } from "@/lib/lexicon/types";

export function LyricsStep({ stems, masterUrl, title, onReady }: {
  stems: LoadedStems;
  masterUrl: string;
  title: string;
  onReady: (words: SyncedWord[], lrc: string, title: string, style?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [text, setText] = useState("");
  const [style, setStyle] = useState("");
  const [songTitle, setSongTitle] = useState(title);

  // ── What did they paste? Plain lyrics is the default; LRC is the pro lane. ──
  const parsed = useMemo(() => parseLyrics(text), [text]);
  const lines = useMemo(
    () => text.split("\n").map((l) => l.trim()).filter((l) => l && !isHeaderLine(l)),
    [text],
  );

  // ── The Lexicon reads the song live: which legos do these words summon? ──
  const [lex, setLex] = useState<Lexicon | null>(null);
  useEffect(() => { let on = true; loadLexicon().then((l) => on && setLex(l)).catch(() => {}); return () => { on = false; }; }, []);
  const legos = useMemo(() => {
    if (!lex || !text.trim()) return null;
    const words = [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 3))];
    const agg = aggregateLegos(lex, words);
    const chips = [
      ...agg.weather.map((m) => ({ icon: "🌦", label: m })),
      ...agg.text.map((m) => ({ icon: "✨", label: m })),
      ...agg.surface.map((m) => ({ icon: "🧱", label: m })),
      ...agg.light.map((m) => ({ icon: "💡", label: m })),
    ];
    return chips.slice(0, 10);
  }, [lex, text]);

  // ── Path A (default): pasted lyrics + on-device auto-sync (align to vocals) ──
  const autoSync = useCallback(async () => {
    setBusy(true); setMsg("Listening to your vocal stem — nothing leaves your device…");
    try {
      const { words: heard } = await transcribeOnDevice(stems, setMsg);
      const { words, lrc, matchRate } = alignLyrics(text, heard);
      if (matchRate < 0.35) {
        setMsg(`Only matched ${Math.round(matchRate * 100)}% of your words to the vocal — the mix may be instrumental-heavy. Try “Tap to sync” below for exact control.`);
        setBusy(false);
        return;
      }
      onReady(words, lrc, songTitle, style.trim() || undefined);
    } catch (e) {
      setMsg((e instanceof Error ? e.message : String(e)) + " — try “Tap to sync” instead.");
      setBusy(false);
    }
  }, [stems, text, songTitle, style, onReady]);

  // ── Path B (pro): LRC timestamps pass straight through ──
  const useLrc = useCallback(() => {
    onReady(wordsFromLrc(text), text, songTitle, style.trim() || undefined);
  }, [text, songTitle, style, onReady]);

  // ── Path C: no lyrics at all — pure on-device transcription ──
  const runAuto = useCallback(async () => {
    setBusy(true); setMsg("Transcribing on your device…");
    try {
      const { words } = await transcribeOnDevice(stems, setMsg);
      onReady(words, lrcFromWords(words), songTitle, style.trim() || undefined);
    } catch (e) {
      setMsg((e instanceof Error ? e.message : String(e)));
      setBusy(false);
    }
  }, [stems, songTitle, style, onReady]);

  // ── Path D: tap-to-sync (manual timing, zero models) ──
  const [syncing, setSyncing] = useState(false);
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
    onReady(wordsFromLrc(lrc), lrc, songTitle, style.trim() || undefined);
  }, [lines, stamps, player, songTitle, style, onReady]);

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

  const hasText = !!text.trim();
  const isLrc = parsed.synced;
  const field = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-[var(--theme-primary)]";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center gap-5 px-6 py-10">
      {/* header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--theme-secondary)]">step 2 · the words</p>
        <h2 className="mt-1 font-display text-3xl font-black text-white">Your lyrics, on stage</h2>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-white/50">
          Paste the lyrics exactly as written — we listen to your vocal stem <b className="text-white/70">right on this device</b> and
          time every word automatically. Section tags like <span className="text-white/70">[Chorus]</span> are fine; we skip them.
        </p>
      </div>

      <input
        value={songTitle} onChange={(e) => setSongTitle(e.target.value)}
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-display text-lg font-bold text-white outline-none transition focus:border-[var(--theme-primary)]"
        placeholder="Song title"
      />

      {/* the lyrics */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--theme-primary)]">📝 Lyrics</p>
          {hasText && (
            <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${isLrc ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>
              {isLrc ? "⏱ LRC timing detected — pro mode" : `${lines.length} lines`}
            </span>
          )}
        </div>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={9}
          placeholder={"Paste your lyrics here…\n\n[Verse 1]\nI keep showing up like I'm solid\nbut I keep coming home the same"}
          className={`mt-2 ${field} resize-y`}
        />
        {/* the engine reads the song live */}
        {legos && legos.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">the engine read your song →</span>
            {legos.map((c, i) => (
              <span key={i} className="rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-white/70">
                {c.icon} {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* the style prompt */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--theme-secondary)]">🎨 Style prompt <span className="text-white/35">— optional</span></p>
        <input
          value={style} onChange={(e) => setStyle(e.target.value)}
          placeholder='e.g. "dark moody R&B, night city, neon rain" — paste the style prompt you generated the song with'
          className={`mt-2 ${field}`}
        />
        <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-white/40">
          The show borrows its visual vibe from this — backdrops, colors, energy. Any words work.
        </p>
      </div>

      {/* the go button */}
      <div className="flex flex-col items-center gap-2">
        {isLrc ? (
          <button onClick={useLrc} disabled={busy} className="w-full rounded-2xl bg-[var(--theme-primary)] px-8 py-4 font-display text-lg font-black text-black transition hover:brightness-110 disabled:opacity-40">
            ⏱ Build with your LRC timing
          </button>
        ) : (
          <button onClick={autoSync} disabled={busy || !hasText} className="w-full rounded-2xl bg-[var(--theme-primary)] px-8 py-4 font-display text-lg font-black text-black transition hover:brightness-110 disabled:opacity-40">
            {busy ? "Working…" : "✨ Auto-sync my words & build the show"}
          </button>
        )}
        {busy && <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[var(--theme-primary)]" />}
        {msg && <p className="max-w-md text-center font-mono text-[11px] leading-relaxed text-white/55">{msg}</p>}
        {!busy && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
            {hasText && !isLrc && (
              <button onClick={() => setSyncing(true)} className="font-mono text-[11px] text-white/45 underline-offset-2 transition hover:text-white hover:underline">
                👆 tap to sync by hand instead
              </button>
            )}
            <button onClick={runAuto} className="font-mono text-[11px] text-white/45 underline-offset-2 transition hover:text-white hover:underline">
              🎙 no lyrics handy? transcribe for me
            </button>
          </div>
        )}
        <p className="pt-2 text-center font-mono text-[9px] leading-relaxed text-white/25">
          First auto-sync downloads a small speech model (~40MB) once, then it&apos;s cached. Audio never leaves your device.
          <br />Kinetica is an independent project — not affiliated with, endorsed by, or connected to Suno or any music service.
        </p>
      </div>
    </div>
  );
}
