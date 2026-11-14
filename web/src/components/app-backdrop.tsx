/**
 * Fondo estático: base del tema + acento suave vía tokens (coherente dark/light).
 * En móvil solo el color de body (este bloque es sm+).
 */
export function AppBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden sm:block"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      <div className="absolute -top-40 left-1/2 h-[min(480px,50vh)] w-[min(880px,100vw)] -translate-x-1/2 rounded-[100%] bg-[var(--color-accent)]/[0.07] blur-3xl" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 480px at 50% -18%, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 55%)",
        }}
      />
    </div>
  );
}
