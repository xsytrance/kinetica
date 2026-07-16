import { useState } from "react";

// WORD SIZZLE — "this is what your words will do." A row of sample words that
// fire an effect on tap/hover. These are lightweight CSS evocations of the real
// engine effects (the true burn/shatter/neon run per-word inside a live show,
// framer-driven off the beat grid) — enough to make the promise tangible and
// invite a poke, without dragging the whole stage onto the landing.

type Fx = "burn" | "shatter" | "neon" | "dissolve" | "slam" | "glitch";

const WORDS: { word: string; fx: Fx; hint: string }[] = [
  { word: "BURN", fx: "burn", hint: "chars curl to ash" },
  { word: "SHATTER", fx: "shatter", hint: "breaks and scatters" },
  { word: "NEON", fx: "neon", hint: "buzzes to life" },
  { word: "DISSOLVE", fx: "dissolve", hint: "melts into the field" },
  { word: "SLAM", fx: "slam", hint: "drops on the kick" },
  { word: "GLITCH", fx: "glitch", hint: "tears and reknits" },
];

const CSS = `
@keyframes ws-burn { 0%{ } 30%{ color:#ffd166; text-shadow:0 0 18px #ff7a1a, 0 0 34px #ff2d00; }
  70%{ color:#ff3d00; filter:blur(.4px); } 100%{ color:#5b1a00; text-shadow:0 0 6px #ff2d00; opacity:.55; } }
@keyframes ws-shatter { 0%{ } 20%{ transform:translateY(-2px) skewX(-6deg); }
  60%{ transform:translate(4px,6px) rotate(4deg); letter-spacing:.18em; opacity:.7; }
  100%{ transform:translate(-3px,10px) rotate(-3deg); opacity:.35; filter:blur(.6px); } }
@keyframes ws-neon { 0%,20%,24%,55%{ opacity:.35; text-shadow:none; } 22%,60%,100%{ opacity:1;
  color:#fff; text-shadow:0 0 6px var(--theme-secondary),0 0 16px var(--theme-secondary),0 0 30px var(--theme-primary); } }
@keyframes ws-dissolve { 0%{ } 100%{ opacity:.08; filter:blur(6px); letter-spacing:.3em; transform:translateY(-6px); } }
@keyframes ws-slam { 0%{ transform:translateY(-90%) scale(1.3); opacity:0; } 55%{ transform:translateY(0) scale(1); opacity:1; }
  62%{ transform:translateY(0) scale(.94); } 100%{ transform:translateY(0) scale(1); } }
@keyframes ws-glitch { 0%,100%{ text-shadow:none; transform:none; } 20%{ text-shadow:-2px 0 #ff2d78,2px 0 #43f7ff; transform:translateX(-2px); }
  40%{ text-shadow:2px 0 #ff2d78,-2px 0 #43f7ff; transform:translateX(2px); clip-path:inset(20% 0 30% 0); }
  60%{ text-shadow:-1px 0 #ff2d78,1px 0 #43f7ff; clip-path:inset(60% 0 5% 0); } 80%{ transform:none; clip-path:none; } }
.ws-fire-burn{ animation:ws-burn .9s ease forwards; }
.ws-fire-shatter{ animation:ws-shatter .8s cubic-bezier(.3,.9,.3,1) forwards; }
.ws-fire-neon{ animation:ws-neon 1s steps(1,end) forwards; }
.ws-fire-dissolve{ animation:ws-dissolve 1.1s ease forwards; }
.ws-fire-slam{ animation:ws-slam .55s cubic-bezier(.2,1.4,.3,1) forwards; }
.ws-fire-glitch{ animation:ws-glitch .7s steps(2,end) forwards; }
`;

export function WordSizzle() {
  // key bump per word retriggers its animation on every poke
  const [fired, setFired] = useState<Record<number, number>>({});
  const poke = (i: number) => setFired((f) => ({ ...f, [i]: (f[i] ?? 0) + 1 }));

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <style>{CSS}</style>
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">poke the words · this is what yours will do</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {WORDS.map((w, i) => (
          <button
            key={w.word}
            onMouseEnter={() => poke(i)}
            onClick={() => poke(i)}
            title={w.hint}
            className="group relative rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 transition hover:border-white/30"
          >
            <span
              key={fired[i] ?? 0}
              className={`font-display text-xl font-black uppercase tracking-wide text-white sm:text-2xl ${fired[i] ? `ws-fire-${w.fx}` : ""}`}
              style={{ display: "inline-block" }}
            >
              {w.word}
            </span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-white/30 group-hover:text-white/50">{w.hint}</span>
          </button>
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">
        …and ~30 more, matched to your actual lyrics, in time with your actual drums
      </p>
    </div>
  );
}
