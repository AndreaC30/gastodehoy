import { StarryBackground } from "@/components/starry-background";

export function LoadingSplash() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <StarryBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    </div>
  );
}
