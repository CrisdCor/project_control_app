"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MeetingFormModal } from "@/components/reuniones/meeting-form-modal";
import { PlusIcon } from "@/components/icons";

export default function ReunionesPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [projectNames, setProjectNames] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: false });
    const list = data ?? [];
    setMeetings(list);

    const projectIds = [...new Set(list.map((m) => m.project_id).filter(Boolean))];
    if (projectIds.length) {
      const { data: projs } = await supabase.from("projects").select("id, name").in("id", projectIds);
      setProjectNames(Object.fromEntries((projs ?? []).map((p) => [p.id, p.name])));
    }

    const { data: profs } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(profs ?? []);

    const { data: allProjects } = await supabase.from("projects").select("id, name").order("name");
    setProjects(allProjects ?? []);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Registra reuniones y convierte sus ítems de acción en tareas, proyectos o pendientes de agenda.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <PlusIcon />
          Nueva reunión
        </button>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
        ) : meetings.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aún no hay reuniones registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Título</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Proyecto</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/reuniones/${m.id}`} className="font-medium hover:underline">
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(m.meeting_date + "T00:00:00").toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {m.project_id ? projectNames[m.project_id] ?? "—" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <MeetingFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        profiles={profiles}
        projects={projects}
        currentUserId={currentUserId}
        onCreated={(created) => router.push(`/reuniones/${created.id}`)}
      />
    </div>
  );
}
