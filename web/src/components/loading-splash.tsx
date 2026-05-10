import { AppBackdrop } from "@/components/app-backdrop";
import { APP_SHELL_CLASS } from "@/lib/app-layout";

export function LoadingSplash() {
  return (
    <div className={APP_SHELL_CLASS}>
      <AppBackdrop />
      <div className="relative z-10 flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando…
      </div>
    </div>
  );
}
