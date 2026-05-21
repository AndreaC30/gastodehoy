/**
 * Top-level React component.
 *
 * Decides what to render based on the auth store:
 *   loading -> splash while we ask `/api/auth/me`
 *   anon    -> Landing (primera visita) o LoginScreen
 *   auth    -> Authed (OnboardingWizard or Dashboard).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Dashboard } from "@/components/dashboard/dashboard-view";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { LandingPage } from "@/components/landing-page";
import { LoadingSplash } from "@/components/loading-splash";
import {
  LoginScreen,
  type AuthEntryTab,
} from "@/components/login-screen";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ForcePasswordChangeModal } from "@/components/force-password-change-modal";
import { AppBackdrop } from "@/components/app-backdrop";
import { PrivacyPolicy } from "@/components/privacy-policy";
import { LegalNotice } from "@/components/legal-notice";
import {
  setLoading,
  setUser as setAuthUser,
  snapshot,
  subscribe,
} from "@/auth";
import { api, UnauthorizedError } from "@/api/client";
import type { Settings, User } from "./api/types";
import { getStoredAnonPhase, setStoredAnonPhase } from "@/lib/anon-phase-session";
import { APP_SHELL_CLASS } from "@/lib/app-layout";
import { hasSeenLanding, markLandingSeen } from "@/lib/landing-preference";
import { invalidateBudgetQueries } from "@/lib/query-keys";
import {
  subscribeToLegalPage,
  getLegalPage,
  showLegalPage,
  type LegalPage,
} from "@/lib/legal-pages-state";

async function loadSettings() {
  return api<Settings>("/api/settings");
}

export default function App() {
  const auth = useSyncExternalStore(subscribe, snapshot);
  const [meBootstrapError, setMeBootstrapError] = useState<string | null>(null);
  const [meRetryToken, setMeRetryToken] = useState(0);

  // Legal page overlay (privacy policy / legal notice)
  const [legalPage, setLegalPage] = useState<LegalPage>(getLegalPage);
  useEffect(() => subscribeToLegalPage(setLegalPage), []);

  useEffect(() => {
    if (auth.status !== "loading") return;
    let alive = true;
    setMeBootstrapError(null);
    (async () => {
      try {
        const u = await api<User>("/api/auth/me");
        if (alive) {
          setMeBootstrapError(null);
          setAuthUser(u);
        }
      } catch (e) {
        if (!alive) return;
        if (e instanceof UnauthorizedError) {
          return;
        }
        setMeBootstrapError(
          e instanceof Error ? e.message : "No se pudo conectar con el servidor.",
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth.status, meRetryToken]);

  // Legal page overlays — rendered above everything, bypassing auth checks
  if (legalPage === "privacy") {
    return (
      <div className={APP_SHELL_CLASS}>
        <PrivacyPolicy onBack={() => showLegalPage(null)} />
      </div>
    );
  }
  if (legalPage === "legal") {
    return (
      <div className={APP_SHELL_CLASS}>
        <LegalNotice onBack={() => showLegalPage(null)} />
      </div>
    );
  }

  let content: React.ReactNode;

  if (auth.status === "loading" && meBootstrapError) {
    content = (
      <div className={APP_SHELL_CLASS}>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center text-slate-300">
          <p className="max-w-md text-sm">{meBootstrapError}</p>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-teal-300 hover:bg-slate-800"
            onClick={() => {
              setMeBootstrapError(null);
              setLoading();
              setMeRetryToken((n) => n + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  } else if (auth.status === "loading") {
    content = <LoadingSplash />;
  } else if (auth.status === "anon" || !auth.user) {
    content = (
      <div className={APP_SHELL_CLASS}>
        <AnonFlow />
      </div>
    );
  } else {
    content = <Authed userName={auth.user.name} />;
  }

  return (
    <>
      {content}
      <CookieConsentBanner />
    </>
  );
}

function Authed({ userName }: { userName: string }) {
  const auth = useSyncExternalStore(subscribe, snapshot);
  const mustChange = auth.user?.must_change_password === true;

  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: loadSettings,
    enabled: !mustChange,
  });
  const [skipped, setSkipped] = useState(false);
  const qc = useQueryClient();

  if (mustChange && auth.user) {
    return (
      <div className={APP_SHELL_CLASS}>
        <AppBackdrop />
        <ForcePasswordChangeModal onDone={setAuthUser} />
      </div>
    );
  }

  if (settingsQ.isPending) {
    return <LoadingSplash />;
  }

  const needsOnboarding =
    !skipped &&
    settingsQ.data != null &&
    Number(settingsQ.data.monthly_income) <= 0;

  if (needsOnboarding) {
    return (
      <div className={APP_SHELL_CLASS}>
        <AppBackdrop />
        <OnboardingWizard
          userName={userName}
          onSkip={() => setSkipped(true)}
          onDone={() => {
            void invalidateBudgetQueries(qc);
            setSkipped(false);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <Dashboard profileName={userName} />
    </>
  );
}

/** Usuario no autenticado: landing o login; F5 conserva la vista gracias a sessionStorage. */
function AnonFlow() {
  const [phase, setPhase] = useState<"landing" | "auth">(() => {
    const fromSession = getStoredAnonPhase();
    if (fromSession) return fromSession;
    return hasSeenLanding() ? "auth" : "landing";
  });
  const [entryTab, setEntryTab] = useState<AuthEntryTab>("login");

  useEffect(() => {
    setStoredAnonPhase(phase);
  }, [phase]);

  if (phase === "landing") {
    return (
      <>
        <AppBackdrop />
        <LandingPage
          onEnter={(mode) => {
            markLandingSeen();
            setEntryTab(mode);
            setPhase("auth");
          }}
        />
      </>
    );
  }

  return (
    <>
      <AppBackdrop />
      <LoginScreen
        key={entryTab}
        initialMode={entryTab}
        onBackToLanding={() => setPhase("landing")}
      />
    </>
  );
}
