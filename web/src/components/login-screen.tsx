/**
 * Login / register / recover screen.
 *
 * Three forms behind a tab-like switch. After register or recover we
 * display the one-time recovery code (RecoveryCodeCard) and only mark
 * the user as authenticated once they confirm having saved it; doing
 * it earlier would unmount this screen before the code can be shown.
 */
import { type FormEvent, useState } from "react";
import { api } from "@/api/client";
import type {
  RecoverResponse,
  RegisterResponse,
  User,
} from "@/api/types";
import { setUser } from "@/auth";
import { RecoveryCodeCard } from "./recovery-code-card";

type Mode = "login" | "register" | "recover";

/** Public entry point: renders the right form (and the recovery card overlay). */
export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  // Código a mostrar tras registro o tras recuperación. Mientras esté
  // presente, ocultamos el resto del formulario.
  // Mientras esté presente, ocultamos el resto del formulario.
  // Para el flujo de registro guardamos también el `user` y solo llamamos a
  // `setUser` cuando el usuario confirma haber guardado el código; si no,
  // App.tsx desmontaría `LoginScreen` antes de poder enseñarlo.
  const [pendingCode, setPendingCode] = useState<
    | { code: string; flow: "register"; user: User }
    | { code: string; flow: "recover" }
    | null
  >(null);

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl font-bold tracking-tight">
          Gasto<span className="font-semibold text-slate-500">De</span>Hoy
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Cada uno con su cuenta, sin pisarse.
        </p>

        {pendingCode ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30">
            <RecoveryCodeCard
              code={pendingCode.code}
              title={
                pendingCode.flow === "recover"
                  ? "Contraseña actualizada"
                  : "Guarda tu código de recuperación"
              }
              intro={
                pendingCode.flow === "recover"
                  ? "El código anterior queda invalidado. Aquí tienes uno nuevo: guárdalo y vuelve a entrar con tu nueva contraseña."
                  : "Si olvidas tu contraseña, este código te dejará entrar y elegir una nueva. No volveremos a mostrarlo."
              }
              ctaLabel={
                pendingCode.flow === "recover" ? "Ir a entrar" : "Empezar a usar la app"
              }
              onAcknowledge={() => {
                if (pendingCode.flow === "register") {
                  // Ahora sí: log-in efectivo. Esto desmonta LoginScreen
                  // y App.tsx pasa al wizard / dashboard.
                  setUser(pendingCode.user);
                } else {
                  setMode("login");
                }
                setPendingCode(null);
              }}
            />
          </div>
        ) : (
          <>
            {mode !== "recover" && (
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
                    setMode("recover");
                  }}
                />
              )}
              {mode === "register" && (
                <RegisterForm
                  onError={setError}
                  onRegistered={(user, code) =>
                    setPendingCode({ flow: "register", user, code })
                  }
                />
              )}
              {mode === "recover" && (
                <RecoverForm
                  onError={setError}
                  onCancel={() => {
                    setError(null);
                    setMode("login");
                  }}
                  onDone={(code) =>
                    setPendingCode({ code, flow: "recover" })
                  }
                />
              )}
            </div>
          </>
        )}
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
      const u = await api<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(u);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />
      <Field
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

/**
 * Sign-up form. Bubbles `(user, recoveryCode)` up so the parent can
 * show the recovery-code card before flipping the auth state.
 */
function RegisterForm({
  onError,
  onRegistered,
}: {
  onError: (m: string | null) => void;
  onRegistered: (user: User, recoveryCode: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
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
      const res = await api<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name: name.trim(), password }),
      });
      // Importante: NO llamamos a setUser aquí. Si lo hiciéramos, App.tsx
      // desmontaría LoginScreen y nunca veríamos la pantalla del código.
      // El padre (LoginScreen) hará el setUser tras confirmar la lectura.
      onRegistered(res.user, res.recovery_code);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />
      <Field
        label="Tu nombre (lo verás en la cabecera)"
        type="text"
        autoComplete="name"
        maxLength={80}
        value={name}
        onChange={setName}
      />
      <Field
        label="Contraseña (8–64 caracteres)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <Field
        label="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        value={password2}
        onChange={setPassword2}
      />
      <button
        type="submit"
        disabled={busy || !email || !name || !password || !password2}
        className="mt-2 w-full rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Creando…" : "Crear cuenta"}
      </button>
    </form>
  );
}

/**
 * Password recovery form. Submits email + recovery code + new password
 * and yields the freshly-rotated recovery code to the parent.
 */
function RecoverForm({
  onError,
  onCancel,
  onDone,
}: {
  onError: (m: string | null) => void;
  onCancel: () => void;
  onDone: (newCode: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
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
      const res = await api<RecoverResponse>("/api/auth/recover", {
        method: "POST",
        body: JSON.stringify({
          email,
          recovery_code: code.trim(),
          new_password: password,
        }),
      });
      onDone(res.recovery_code);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">
          Recuperar contraseña
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Introduce el código que guardaste al crear la cuenta y elige una
          contraseña nueva. Si lo has perdido, pídele al administrador que la
          resetee desde el servidor.
        </p>
      </div>

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={setEmail}
      />
      <Field
        label="Código de recuperación"
        type="text"
        autoComplete="off"
        value={code}
        onChange={setCode}
      />
      <Field
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
      <Field
        label="Repite la nueva contraseña"
        type="password"
        autoComplete="new-password"
        value={password2}
        onChange={setPassword2}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Volver a Entrar
        </button>
        <button
          type="submit"
          disabled={busy || !email || !code || !password || !password2}
          className="rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Cambiar contraseña"}
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
  label,
  type,
  value,
  onChange,
  autoFocus,
  autoComplete,
  maxLength,
}: {
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  maxLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && visible ? "text" : type;

  return (
    <label className="block text-sm font-medium text-slate-400">
      {label}
      <div className="relative mt-1.5">
        <input
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
            // tabIndex=-1 evita que se cuele entre el campo y el botón de submit.
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300 focus:text-slate-300 focus:outline-none"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </label>
  );
}

/** Inline SVG: eye (Feather "eye"). */
function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Inline SVG: crossed-out eye (Feather "eye-off"). */
function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 4.22-5.34" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
