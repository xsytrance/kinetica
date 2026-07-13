/** A tiny equalizer that never stops feeling the music — pure CSS, deterministic. */
export function Eq({ bars = 24 }: { bars?: number }) {
  return (
    <div className="eq" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} style={{ animationDuration: `${0.72 + ((i * 37) % 50) / 100}s`, animationDelay: `${((i * 53) % 90) / 100}s` }} />
      ))}
    </div>
  );
}
