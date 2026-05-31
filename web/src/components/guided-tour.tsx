/**
 * Guía paso a paso: overlay que oscurece todo excepto el elemento objetivo.
 * Scroll bloqueado durante el tour; solo el panel de controles recibe eventos.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose } from "react-icons/io5";
import type { TourStep } from "@/lib/dashboard-tour-steps";
import {
  tourMeasureTarget,
  tourScrollLockDisable,
  tourScrollLockEnable,
  tourScrollToTarget,
} from "@/lib/tour-scroll-lock";
import { BTN_PRIMARY, BTN_SECONDARY, FOCUS_RING } from "@/lib/ui-a11y";

type Props = {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
  onBackToMenu?: () => void;
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Oscurece todo menos el recuadro objetivo. Las zonas oscuras cierran el tour al tocarlas. */
function TourSpotlightOverlay({ rect, onDismiss }: { rect: SpotlightRect | null; onDismiss: () => void }) {
  const dim = "absolute bg-slate-950/50 backdrop-blur-[1px]";

  if (!rect) {
    return <div className={`inset-0 ${dim}`} aria-hidden onClick={onDismiss} />;
  }

  const { top, left, width, height } = rect;
  const bottom = top + height;
  const right = left + width;

  return (
    <>
      <div className={dim} style={{ top: 0, left: 0, right: 0, height: top }} onClick={onDismiss} />
      <div className={dim} style={{ top, left: 0, width: left, height }} onClick={onDismiss} />
      <div className={dim} style={{ top, left: right, right: 0, height }} onClick={onDismiss} />
      <div className={dim} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} onClick={onDismiss} />
    </>
  );
}

export function GuidedTour({ steps, onComplete, onSkip, onBackToMenu }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [scrolling, setScrolling] = useState(false);

  const step = steps[index];
  const isLast = index >= steps.length - 1;

  const goNext = useCallback(() => {
    if (isLast) onComplete();
    else setIndex((i) => i + 1);
  }, [isLast, onComplete]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const finishSkip = useCallback(() => {
    tourScrollLockDisable();
    onSkip();
  }, [onSkip]);

  const finishComplete = useCallback(() => {
    tourScrollLockDisable();
    onComplete();
  }, [onComplete]);

  // Lock background scroll while tour is active
  useEffect(() => {
    tourScrollLockEnable();
    return () => tourScrollLockDisable();
  }, []);

  // Scroll to and measure the current step's target
  useEffect(() => {
    if (!step) return;

    let cancelled = false;
    setRect(null);
    setScrolling(true);

    void (async () => {
      await tourScrollToTarget(step.target);
      if (cancelled) return;
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      setRect(tourMeasureTarget(step.target));
      setScrolling(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [step]);

  // Re-measure on resize
  useEffect(() => {
    function onResize() {
      if (step) setRect(tourMeasureTarget(step.target));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [step]);

  // Keyboard: Escape = skip, Enter = next
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finishSkip();
      } else if (e.key === "Enter" && !scrolling) {
        e.preventDefault();
        goNext();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [finishSkip, goNext, scrolling]);

  if (!step) return null;

  return (
    <div
      className="fixed inset-0 z-[90] isolate"
      style={{ width: "100vw", height: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
      aria-describedby="guided-tour-body"
    >
      {/* Dim overlay with spotlight cutout */}
      <TourSpotlightOverlay rect={scrolling ? null : rect} onDismiss={finishSkip} />

      {/* Invisible shield over spotlight window: blocks touches to the page behind */}
      {rect && !scrolling && (
        <div
          className="pointer-events-auto absolute z-[1]"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          aria-hidden
        />
      )}

      {/* Spotlight highlight ring (visual only) */}
      {rect && !scrolling && (
        <div
          className="pointer-events-none absolute z-[2] rounded-xl ring-2 ring-teal-400 shadow-[0_0_0_1px_rgba(45,212,191,0.35),0_0_28px_rgba(45,212,191,0.2)]"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          aria-hidden
        />
      )}

      {/* Controls panel: fixed to bottom, scrollable on small screens */}
      <div
        data-guided-tour-controls
        className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[3] mx-auto max-h-[45vh] max-w-md overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-4 shadow-2xl sm:inset-x-4 sm:max-h-none sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-teal-400">
            {index + 1} / {steps.length}
            {scrolling ? " · " + t("tour.moving") : ""}
          </p>
          <button
            type="button"
            onClick={finishSkip}
            className={`shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 ${FOCUS_RING}`}
            aria-label={t("tour.close")}
          >
            <IoClose className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <h2 id="guided-tour-title" className="mt-1.5 text-lg font-bold text-slate-100">
          {t(step.title)}
        </h2>
        <p id="guided-tour-body" className="mt-1.5 break-words text-base text-slate-300">
          {t(step.body)}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={isLast ? finishComplete : goNext}
              disabled={scrolling}
              className={`min-h-11 min-w-[7rem] flex-1 ${BTN_PRIMARY}`}
            >
              {isLast ? t("tour.done") : t("tour.next")}
            </button>
            {index > 0 && (
              <button
                type="button"
                onClick={goPrev}
                disabled={scrolling}
                className={`min-h-11 ${BTN_SECONDARY}`}
              >
                {t("tour.back")}
              </button>
            )}
            <button
              type="button"
              onClick={finishSkip}
              className={`min-h-11 ${BTN_SECONDARY}`}
            >
              {t("tour.skip")}
            </button>
          </div>
          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              disabled={scrolling}
              className={`min-h-11 w-full text-sm font-medium text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200 ${FOCUS_RING}`}
            >
              {t("tour.backToMenu")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
