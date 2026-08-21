"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success) {
      // La cookie de sesión la fija Flask; refrescamos para que los Server
      // Components la vean.
      router.replace("/");
      router.refresh();
      return;
    }

    setError(body.error ?? "No se pudo iniciar sesión");
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {error && (
        <p
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <label className="block">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Correo
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Contraseña
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
