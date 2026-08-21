import { cookies, headers } from "next/headers";

const FLASK_API = process.env.FLASK_API_URL ?? "http://127.0.0.1:5002";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch desde el servidor (Server Components / route handlers).
 *
 * Reenvía la cookie JWT y, cuando la petición llega vía Authelia, también
 * los headers Remote-*: sin ellos Flask no reconocería la identidad, porque
 * el proxy los inyecta en la petición al frontend, no en la del frontend a
 * Flask.
 */
export async function serverFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const cookieStore = await cookies();
  const h = await headers();

  const forwarded: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: cookieStore.toString(),
  };

  for (const name of ["remote-user", "remote-email", "remote-name", "remote-groups"]) {
    const value = h.get(name);
    if (value) forwarded[name] = value;
  }

  const res = await fetch(`${FLASK_API}${path}`, {
    ...init,
    headers: { ...forwarded, ...(init.headers as Record<string, string>) },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch desde el navegador. Va contra el mismo origen (los rewrites de
 * next.config.ts lo enrutan a Flask), así que la cookie viaja sola.
 */
export async function clientFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      // sin cuerpo
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
