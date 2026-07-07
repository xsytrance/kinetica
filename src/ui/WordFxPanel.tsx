import { useMemo, useState } from "react";
import { ALL_TEXT_EFFECTS, type TextEffect } from "@/lib/effects/registry";

const ALL_EFFECTS = ALL_TEXT_EFFECTS;

// Per-word effect override editor. Lists the song's unique words; assigning one
// writes to overrides[key] (key = clean(word).toLowerCase(), the same key the
// stage resolver checks). "auto" clears it back to the engine's own pick.
export function WordFxPanel({ words, overrides, onSet, onClear, onClose }: {
  words: { key: string; display: string }[];
  overrides: Record<string, TextEffect>;
  onSet: (key: string, fx: TextEffect | null) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const count = Object.keys(overrides).length;
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? words.filter((w) => w.key.includes(needle)) : words;
    // assigned words float to the top so they're easy to find/revise
    return [...list].sort((a, b) => (overrides[b.key] ? 1 : 0) - (overrides[a.key] ? 1 : 0));
  }, [words, q, overrides]);

  return (
    <div className="pointer-events-auto absolute right-3 top-16 z-40 flex max-h-[76dvh] w-72 flex-col rounded-2xl border border-white/12 bg-[#0b0810]/95 p-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-black text-white">Per-word effects {count > 0 && <span className="text-[var(--theme-secondary)]">· {count}</span>}</h3>
        <button onClick={onClose} className="font-mono text-xs text-white/50 hover:text-white">✕</button>
      </div>
      <p className="mt-0.5 font-mono text-[10px] leading-snug text-white/40">Pin an effect to a word — it fires every time the word appears, over the vibe’s pick.</p>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter words…"
        className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[var(--theme-secondary)]"
      />
      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {shown.length === 0 && <p className="py-4 text-center font-mono text-[11px] text-white/35">no words</p>}
        {shown.map((w) => {
          const cur = overrides[w.key] ?? "";
          return (
            <div key={w.key} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${cur ? "bg-[var(--theme-secondary)]/12" : ""}`}>
              <span className="flex-1 truncate font-mono text-[11px] text-white/75" title={w.display}>{w.display}</span>
              <select
                value={cur}
                onChange={(e) => onSet(w.key, (e.target.value || null) as TextEffect | null)}
                className="rounded-md border border-white/15 bg-black/60 px-1.5 py-1 font-mono text-[10px] text-white/80 outline-none"
              >
                <option value="" className="bg-black">auto</option>
                {ALL_EFFECTS.map((fx) => <option key={fx} value={fx} className="bg-black">{fx}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      {count > 0 && (
        <button onClick={onClear} className="mt-2 rounded-full border border-white/15 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/55 hover:text-white">
          Clear all ({count})
        </button>
      )}
    </div>
  );
}
