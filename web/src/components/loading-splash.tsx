import { useEffect } from "react";
import { BootSplashContent } from "@/components/boot-splash-content";
import { removeHtmlBootSplash } from "@/lib/boot-splash";

/** Full-screen branded splash while auth/settings bootstrap. */
export function LoadingSplash() {
  useEffect(() => {
    removeHtmlBootSplash();
  }, []);

  return (
    <div className="boot-splash" role="status" aria-live="polite" aria-busy="true">
      <div className="boot-splash__inner">
        <BootSplashContent showSpinner />
      </div>
    </div>
  );
}
