/**
 * Login / register / forgot-password screen.
 *
 * La recuperación envía una contraseña temporal por correo (requiere SMTP en el servidor).
 */
import { useTranslation } from "react-i18next";
import { type FormEvent, useId, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";
import { api } from "@/api/client";
import type {
  ForgotPasswordResponse,
  RegisterResponse,
  User,
} from "@/api/types";
import { setUser } from "@/auth";
import { BrandLogo } from "@/components/brand-logo";
import { showLegalPage } from "@/lib/legal-pages-state";
import { BTN_PRIMARY, FOCUS_RING, INPUT_CLASS } from "@/lib/ui-a11y";
import { translateBackendError } from "@/lib/backend-errors";

type Mode = "login" | "register" | "forgot";

/** Pestaña inicial cuando se entra desde la landing (no aplica a "forgot"). */
export type AuthEntryTab = "login" | "register";

/** Public entry point: renders the right form. */
export function LoginScreen({
  initialMode = "login",
  onBackToLanding,
}: {
  initialMode?: AuthEntryTab;
  onBackToLanding?: () => void;
} = {}) {
  const [mode, setMode] = useState<Mode>(() =>
    initialMode === "register" ? "register" : "login",
  );
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="m-0 leading-none">
          {onBackToLanding ? (
            <button
              type="button"
              onClick={onBackToLanding}
              className="w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400"
              aria-label={t("common.back")}
            >
              <BrandLogo variant="hero" />
            </button>
          ) : (
            <BrandLogo variant="hero" />
          )}
        </h1>
        <p className="mt-4 text-center text-sm text-slate-400">
          {t("login.title")}
        </p>
        {onBackToLanding && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onBackToLanding}
              className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-teal-300 ${FOCUS_RING}`}
            >
              <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
              {t("common.back")}
            </button>
          </div>
        )}

        {mode !== "forgot" && (
          <div
            className="mt-6 flex rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-sm"
            role="tablist"
            aria-label="Acceso a la cuenta"
          >
              <TabButton
                active={mode === "login"}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                {t("login.tabLogin")}
              </TabButton>
              <TabButton
                active={mode === "register"}
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                {t("login.tabRegister")}
              </TabButton>
            </div>
        )}

        {error && (
          <div
            className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30">
          {mode === "login" && (
            <LoginForm
              onError={setError}
              onForgot={() => {
                setError(null);
                setMode("forgot");
              }}
            />
          )}
          {mode === "register" && <RegisterForm onError={setError} />}
          {mode === "forgot" && (
            <ForgotForm
              onError={setError}
              onCancel={() => {
                setError(null);
                setMode("login");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Pill-style tab button used to flip between Login and Register. */
function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-lg px-3 py-2 font-medium transition ${FOCUS_RING} ${
        active
          ? "bg-slate-950 text-slate-100 shadow-inner"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

/** Email + password form. Calls `setUser` directly on success. */
function LoginForm({
  onError,
  onForgot,
}: {
  onError: (m: string | null) => void;
  onForgot: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      await api<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const me = await api<User>("/api/auth/me");
      setUser(me);
    } catch (e) {
      onError(translateBackendError((e as Error).message, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        id="login-email"
        label={t("login.email")}
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />
      <Field
        id="login-password"
        label={t("login.password")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <button
        type="submit"
        disabled={busy || !email || !password}
        className={`mt-2 w-full ${BTN_PRIMARY}`}
      >
        {busy ? t("login.loggingIn") : t("login.tabLogin")}
      </button>
      <button
        type="button"
        onClick={onForgot}
        className="mt-1 block w-full text-center text-xs font-medium text-slate-400 hover:text-teal-300"
      >
        {t("login.forgotPassword")}
      </button>
    </form>
  );
}

function RegisterForm({
  onError,
}: {
  onError: (m: string | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    if (password.length < 8) {
      onError(t("login.passwordMinError"));
      return;
    }
    if (password !== password2) {
      onError(t("login.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await api<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name: name.trim(), password, language: i18n.language || "es" }),
      });
      const me = await api<User>("/api/auth/me");
      setUser(me);
    } catch (e) {
      onError(translateBackendError((e as Error).message, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        id="register-email"
        label={t("login.email")}
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />
      <Field
        id="register-name"
        label={t("login.name")}
        type="text"
        autoComplete="name"
        maxLength={80}
        value={name}
        onChange={setName}
      />
      <Field
        id="register-password"
        label={t("login.passwordLength")}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <Field
        id="register-password2"
        label={t("login.passwordConfirm")}
        type="password"
        autoComplete="new-password"
        value={password2}
        onChange={setPassword2}
      />
      <label
        htmlFor="register-accept-terms"
        className="flex cursor-pointer items-start gap-2 text-xs text-slate-400"
      >
        <input
          id="register-accept-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-600 bg-slate-800 accent-teal-500"
        />
        <span>
          {t("login.acceptTerms")}{" "}
          <button type="button" onClick={() => showLegalPage("privacy")} className="text-teal-400 underline hover:text-teal-300">{t("login.privacyPolicy")}</button>
          {" "}{t("login.and")}{" "}
          <button type="button" onClick={() => showLegalPage("legal")} className="text-teal-400 underline hover:text-teal-300">{t("login.termsOfUse")}</button>
        </span>
      </label>
      <button
        type="submit"
        disabled={busy || !email || !name || !password || !password2 || !acceptedTerms}
        className={`mt-2 w-full ${BTN_PRIMARY}`}
      >
        {busy ? t("login.creating") : t("login.tabRegister")}
      </button>
    </form>
  );
}

function ForgotForm({
  onError,
  onCancel,
}: {
  onError: (m: string | null) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      const res = await api<ForgotPasswordResponse>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
      setDoneMessage(res.detail);
    } catch (e) {
      onError(translateBackendError((e as Error).message, t));
    } finally {
      setBusy(false);
    }
  }

  if (doneMessage) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {t("login.checkEmail")}
          </h2>
          <p className="mt-2 text-sm text-teal-200/90">{doneMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDoneMessage(null);
            onCancel();
          }}
          className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          {t("login.backToLogin")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">
          {t("login.forgotTitle")}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {t("login.forgotDesc")}
        </p>
      </div>

      <Field
        id="forgot-email"
        label={t("login.email")}
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex w-full items-center justify-center gap-1 text-sm text-slate-400 hover:text-slate-200 sm:w-auto sm:justify-start"
        >
          <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
          {t("login.backToLogin")}
        </button>
        <button
          type="submit"
          disabled={busy || !email}
          className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 sm:w-auto"
        >
          {busy ? t("login.sending") : t("login.sendEmail")}
        </button>
      </div>
    </form>
  );
}

/**
 * Reusable labelled input. Adds an eye-toggle when `type === "password"`
 * so the user can verify what they are typing.
 */
function Field({
  id: idProp,
  label,
  type,
  value,
  onChange,
  autoFocus,
  autoComplete,
  maxLength,
}: {
  id?: string;
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  maxLength?: number;
}) {
  const { t } = useTranslation();
  const fallbackId = useId();
  const id = idProp ?? fallbackId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && visible ? "text" : type;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 sm:text-base">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={effectiveType}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_CLASS} py-2.5 pl-3 ${
            isPassword ? "pr-10" : "pr-3"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t("login.hidePassword") : t("login.showPassword")}
            aria-pressed={visible}
            className={`absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-slate-500 hover:text-slate-300 ${FOCUS_RING}`}
          >
            {visible ? (
              <FiEyeOff className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <FiEye className="h-[18px] w-[18px]" aria-hidden />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
