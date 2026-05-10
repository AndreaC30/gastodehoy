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
import { LandingPage } from "@/components/landing-page";
import { LoadingSplash } from "@/components/loading-splash";
import {
  LoginScreen,
  type AuthEntryTab,
} from "@/components/login-screen";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ForcePasswordChangeModal } from "@/components/force-password-change-modal";
import { AppBackdrop } from "@/components/app-backdrop";
import {
  setAnonymous,
  setUser as setAuthUser,
  snapshot,
  subscribe,
} from "@/auth";
import { api } from "@/api/client";
import type { Settings, User } from "./api/types";
import { getStoredAnonPhase, setStoredAnonPhase } from "@/lib/anon-phase-session";
import { APP_SHELL_CLASS } from "@/lib/app-layout";
import { hasSeenLanding, markLandingSeen } from "@/lib/landing-preference";

async function loadSettings() {
  return api<Settings>("/api/settings");
}

export default function App() {
  const auth = useSyncExternalStore(subscribe, snapshot);

  useEffect(() => {
    if (auth.status !== "loading") return;
    let alive = true;
    (async () => {
      try {
        const u = await api<User>("/api/auth/me");
        if (alive) setAuthUser(u);
      } catch {
        if (alive) setAnonymous();
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth.status]);

  if (auth.status === "loading") {
    return <LoadingSplash />;
  }

  if (auth.status === "anon" || !auth.user) {
    return (
      <div className={APP_SHELL_CLASS}>
        <AnonFlow />
      </div>
    );
  }

  return <Authed userName={auth.user.name} />;
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
            void qc.invalidateQueries();
            setSkipped(false);
          }}
        />
      </div>
    );
  }

  return <Dashboard profileName={userName} />;
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
