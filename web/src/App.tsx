/**
 * Top-level React component.
 *
 * Decides what to render based on the auth store:
 *   loading -> splash while we ask `/api/auth/me`
 *   anon    -> LoginScreen
 *   auth    -> Authed (OnboardingWizard or Dashboard).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Dashboard } from "@/components/dashboard/dashboard-view";
import { LoadingSplash } from "@/components/loading-splash";
import { LoginScreen } from "@/components/login-screen";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { StarryBackground } from "@/components/starry-background";
import {
  setAnonymous,
  setUser as setAuthUser,
  snapshot,
  subscribe,
} from "@/auth";
import { api } from "@/api/client";
import type { Settings, User } from "./api/types";
import { RADIAL_SHELL_CLASS } from "@/lib/app-layout";

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
      <div className={RADIAL_SHELL_CLASS}>
        <StarryBackground />
        <LoginScreen />
      </div>
    );
  }

  return <Authed userName={auth.user.name} />;
}

function Authed({ userName }: { userName: string }) {
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
  const [skipped, setSkipped] = useState(false);
  const qc = useQueryClient();

  if (settingsQ.isPending) {
    return <LoadingSplash />;
  }

  const needsOnboarding =
    !skipped &&
    settingsQ.data != null &&
    Number(settingsQ.data.monthly_income) <= 0;

  if (needsOnboarding) {
    return (
      <div className={RADIAL_SHELL_CLASS}>
        <StarryBackground />
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
