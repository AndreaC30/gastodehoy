import { type FormEvent, useState } from "react";
import { api } from "@/api/client";
import type { User } from "@/api/types";
import { setUser } from "@/auth";

type Mode = "login" | "register";

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl font-bold tracking-tight">
          Gasto<span className="font-semibold text-slate-500">De</span>Hoy
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Cada uno con su cuenta, sin pisarse.
        </p>

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

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30">
          {mode === "login" ? (
            <LoginForm onError={setError} />
          ) : (
            <RegisterForm onError={setError} />
          )}
        </div>
      </div>
    </div>
  );
}

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

function LoginForm({ onError }: { onError: (m: string | null) => void }) {
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
    </form>
  );
}

function RegisterForm({ onError }: { onError: (m: string | null) => void }) {
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
      const u = await api<User>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name: name.trim(), password }),
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
  return (
    <label className="block text-sm font-medium text-slate-400">
      {label}
      <input
        type={type}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/40"
      />
    </label>
  );
}
