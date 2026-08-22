import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/ui/logout-button";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, area")
    .eq("id", user?.id)
    .maybeSingle();

  return (
    <main className="content-max flex min-h-screen flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Resumen</h1>
        <LogoutButton />
      </header>

      <div className="animate-fade-in rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Sesión iniciada como</p>
        <p className="mt-1 text-base font-medium">{profile?.name ?? user?.email}</p>
        {profile ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.role === "admin" ? "Administrador" : "Gestor"} · {profile.area ?? "Sin área"}
          </p>
        ) : (
          <p className="mt-3 text-sm text-status-attention">
            Aún no tienes un perfil vinculado en `profiles`. Pídele al administrador que te registre.
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Esta es la base del layout — el Sidebar, el Header y los contenedores de Proyectos / Mis tareas / Agenda
        se construyen en la siguiente iteración.
      </p>
    </main>
  );
}
