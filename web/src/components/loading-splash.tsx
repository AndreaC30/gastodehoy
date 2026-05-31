import { BootSplashContent } from "@/components/boot-splash-content";

/** Full-screen branded splash while auth/settings bootstrap. */
export function LoadingSplash() {
  return (
    <div className="boot-splash" role="status" aria-live="polite" aria-busy="true">
      <div className="boot-splash__inner">
        <BootSplashContent showSpinner />
      </div>
    </div>
  );
}
