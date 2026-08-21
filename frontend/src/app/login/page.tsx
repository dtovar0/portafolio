import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Si ya hay sesión, no tiene sentido mostrar el formulario.
  const session = await getSession();
  if (session) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Nexus Access
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Portal de gestión de accesos
          </p>
        </div>
        <LoginForm initialError={error} />
      </div>
    </main>
  );
}
