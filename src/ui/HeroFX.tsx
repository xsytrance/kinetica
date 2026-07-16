// HERO FX — the animated jukebox backdrop. Pure CSS/DOM (no engine, no audio),
// so it looks identical and rich on every device: drifting aurora light, giant
// ghost typography, musical notes floating up, and a full-width equalizer that
// never stops feeling a beat. All motion is transform/opacity/filter only, and
// it all quiets under prefers-reduced-motion.

const NOTES = ["♪", "♫", "♩", "♬", "♭", "✦", "✧", "♪", "♫", "✦", "♬", "♩", "♪", "✧", "♫", "♪"];

// deterministic pseudo-random so the scatter is stable across renders
const rnd = (i: number, salt: number) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function HeroFX() {
  return (
    <div aria-hidden className="jk-fx pointer-events-none absolute inset-0 overflow-hidden">
      {/* aurora light pools */}
      <div className="jk-aurora jk-aurora-1" />
      <div className="jk-aurora jk-aurora-2" />
      <div className="jk-aurora jk-aurora-3" />

      {/* giant ghost typography drifting behind everything */}
      <span className="jk-ghost jk-ghost-a">STEMS</span>
      <span className="jk-ghost jk-ghost-b">SHOW</span>
      <span className="jk-ghost jk-ghost-c">LYRICS</span>

      {/* musical notes floating up */}
      {NOTES.map((n, i) => (
        <span
          key={i}
          className="jk-note"
          style={{
            left: `${rnd(i, 1) * 100}%`,
            fontSize: `${14 + rnd(i, 2) * 30}px`,
            animationDuration: `${9 + rnd(i, 3) * 12}s`,
            animationDelay: `${-rnd(i, 4) * 18}s`,
            // three neon inks, cycled
            color: ["var(--jk-pink)", "var(--jk-cyan)", "var(--jk-gold)", "var(--jk-violet)"][i % 4],
          }}
        >
          {n}
        </span>
      ))}

      {/* full-width equalizer along the floor */}
      <div className="jk-eq">
        {Array.from({ length: 64 }, (_, i) => (
          <i
            key={i}
            style={{
              animationDuration: `${0.5 + rnd(i, 5) * 0.9}s`,
              animationDelay: `${-rnd(i, 6) * 1.2}s`,
            }}
          />
        ))}
      </div>

      {/* soft scanline + vignette */}
      <div className="jk-vignette" />
    </div>
  );
}
