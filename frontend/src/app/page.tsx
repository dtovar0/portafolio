import { requireSession } from "@/lib/session";
import { serverFetch } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await requireSession();

  // El usuario final no tiene dashboard: va directo al catálogo.
  if (!session.permissions.is_admin) redirect("/catalogo");

  const data = await serverFetch<DashboardData>("/api/dashboard");
  const { permissions, user } = session;
  const scoped = permissions.scoped_area_ids !== null;

  return (
    <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Panel de control
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {user.name} · {user.role}
          {scoped && permissions.areas.length > 0 && (
            <> · Áreas: {permissions.areas.map((a) => a.name).join(", ")}</>
          )}
        </p>
        {scoped && (
          <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Vista limitada a sus áreas asignadas
          </p>
        )}
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Áreas", value: data.kpis.areas },
          { label: "Plataformas", value: data.kpis.platforms },
          { label: "Usuarios", value: data.kpis.users },
          { label: "Pendientes", value: data.kpis.pending_requests },
          { label: "Aprobadas", value: data.kpis.approved_requests },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {kpi.value}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {kpi.label}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Plataformas por área
          </h2>
          {data.platforms_by_area.length === 0 ? (
            <p className="text-sm text-slate-500">Sin áreas en su alcance.</p>
          ) : (
            <ul className="space-y-2">
              {data.platforms_by_area.map((row) => (
                <li key={row.area} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{row.area}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Solicitudes recientes
          </h2>
          {data.recent_requests.length === 0 ? (
            <p className="text-sm text-slate-500">Sin solicitudes.</p>
          ) : (
            <ul className="space-y-2">
              {data.recent_requests.map((r) => (
                <li key={r.id} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {r.user_name} → {r.platform_name}
                  </span>
                  <span className="text-xs text-slate-500">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
