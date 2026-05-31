import { useEffect, useState } from "react";
import { removeHtmlBootSplash, waitForBootSplashMinimum } from "@/lib/boot-splash";

/**
 * Keeps the branded splash visible until `contentReady` and the minimum
 * display time have elapsed (shared across auth bootstrap and settings load).
 */
export function useBootSplashGate(contentReady: boolean): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!contentReady) return;

    let cancelled = false;
    void waitForBootSplashMinimum().then(() => {
      if (cancelled) return;
      removeHtmlBootSplash();
      setVisible(false);
    });

    return () => {
      cancelled = true;
    };
  }, [contentReady]);

  return visible;
}
