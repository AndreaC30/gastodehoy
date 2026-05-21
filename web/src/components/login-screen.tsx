/**
 * Login / register / forgot-password screen.
 *
 * La recuperación envía una contraseña temporal por correo (requiere SMTP en el servidor).
 */
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

type Mode = "login" | "register" | "forgot";

/** Pestaña inicial cuando se entra desde la landing (no aplica a “forgot”). */
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

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="m-0 leading-none">
          {onBackToLanding ? (
            <button
              type="button"
              onClick={onBackToLanding}
              className="w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400"
              aria-label="Volver al inicio"
            >
              <BrandLogo variant="hero" />
            </button>
          ) : (
            <BrandLogo variant="hero" />
          )}
        </h1>
        <p className="mt-4 text-center text-sm text-slate-400">
          Cada uno con su cuenta, sin pisarse.
        </p>
        {onBackToLanding && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-teal-300"
            >
              <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
              Volver al inicio
            </button>
          </div>
        )}

        {mode !== "forgot" && (
          <div className="mt-6 flex rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-sm">
              <TabButton
                active={mode === "login"}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Entrar
              </TabButton>
              <TabButton
                active={mode === "register"}
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Crear cuenta
              </TabButton>
            </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
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
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${
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
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        id="login-email"
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />
      <Field
        id="login-password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <button
        type="submit"
        disabled={busy || !email || !password}
        className="mt-2 w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <button
        type="button"
        onClick={onForgot}
        className="mt-1 block w-full text-center text-xs font-medium text-slate-400 hover:text-teal-300"
      >
        He olvidado mi contraseña
      </button>
    </form>
  );
}

function RegisterForm({
  onError,
}: {
  onError: (m: string | null) => void;
}) {
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
      onError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== password2) {
      onError("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    try {
      await api<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name: name.trim(), password }),
      });
      const me = await api<User>("/api/auth/me");
      setUser(me);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        id="register-email"
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />
      <Field
        id="register-name"
        label="Tu nombre (lo verás en la cabecera)"
        type="text"
        autoComplete="name"
        maxLength={80}
        value={name}
        onChange={setName}
      />
      <Field
        id="register-password"
        label="Contraseña (8–64 caracteres)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <Field
        id="register-password2"
        label="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        value={password2}
        onChange={setPassword2}
      />
      <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 accent-teal-500"
        />
        <span>
          He leído y acepto la{" "}
          <button type="button" onClick={() => showLegalPage("privacy")} className="text-teal-400 underline hover:text-teal-300">política de privacidad</button>
          {" "}y las{" "}
          <button type="button" onClick={() => showLegalPage("legal")} className="text-teal-400 underline hover:text-teal-300">condiciones de uso</button>
        </span>
      </label>
      <button
        type="submit"
        disabled={busy || !email || !name || !password || !password2 || !acceptedTerms}
        className="mt-2 w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Creando…" : "Crear cuenta"}
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
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (doneMessage) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Revisa tu correo
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
          Volver a entrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">
          Recuperar contraseña
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Te enviaremos una contraseña nueva al correo de tu cuenta. Si no
          llega nada, revisa spam o contacta al administrador (hace falta correo
          configurado en el servidor).
        </p>
      </div>

      <Field
        id="forgot-email"
        label="Email"
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
          Volver a Entrar
        </button>
        <button
          type="submit"
          disabled={busy || !email}
          className="w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Enviando…" : "Enviar correo"}
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
  const fallbackId = useId();
  const id = idProp ?? fallbackId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && visible ? "text" : type;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-400">
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
          className={`w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-3 ${
            isPassword ? "pr-10" : "pr-3"
          } outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300 focus:text-slate-300 focus:outline-none"
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
