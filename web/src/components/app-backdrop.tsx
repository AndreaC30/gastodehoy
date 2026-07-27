/**
 * Fondo estático denso (mockup V11): base casi negra + acento cian muy suave.
 * Sin orbes indigo/teal; en móvil solo el color de body (este bloque es sm+).
 */
export function AppBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden sm:block"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      <div className="absolute -top-40 left-1/2 h-[min(480px,50vh)] w-[min(880px,100vw)] -translate-x-1/2 rounded-[100%] bg-[var(--color-accent)]/[0.06] blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_900px_480px_at_50%_-18%,rgb(34_211_238_/_0.08),transparent_55%)]" />
    </div>
  );
}
