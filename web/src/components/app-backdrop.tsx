/**
 * Fondo estático (sin animación): base slate, orbes difuminados tipo mesh,
 * gradiente radial suave y textura grain muy tenue.
 */
export function AppBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-slate-950" />
      <div className="absolute -top-32 left-1/2 h-[min(520px,55vh)] w-[min(920px,110vw)] -translate-x-1/2 rounded-[100%] bg-teal-400/[0.07] blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-sky-500/[0.06] blur-3xl" />
      <div className="absolute bottom-0 left-[-10%] h-72 w-72 rounded-full bg-indigo-600/[0.05] blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_900px_500px_at_50%_-20%,rgba(94,234,212,0.11),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
