import { redirect } from "next/navigation";
import { serverFetch, ApiError } from "./api";
import type { Session } from "./types";

/** Sesión actual, o null si no hay autenticación válida. */
export async function getSession(): Promise<Session | null> {
  try {
    return await serverFetch<Session>("/api/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** Exige sesión; si no hay, manda al login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Exige rol administrativo (superadmin o admin de área). */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.permissions.is_admin) redirect("/catalogo");
  return session;
}

/** Exige superadmin. */
export async function requireSuperadmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.permissions.is_superadmin) redirect("/");
  return session;
}

/** ¿Puede el usuario administrar esta área? */
export function canManageArea(session: Session, areaId: number): boolean {
  const scope = session.permissions.scoped_area_ids;
  if (scope === null) return true; // superadmin
  return scope.includes(areaId);
}
