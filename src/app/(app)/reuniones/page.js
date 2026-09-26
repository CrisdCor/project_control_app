"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MeetingFormModal } from "@/components/reuniones/meeting-form-modal";
import { CountryCodeTag } from "@/components/ui/country-tag";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PlusIcon, TrashIcon } from "@/components/icons";

const TABS = [
  { id: "activas", label: "Activas" },
  { id: "archivadas", label: "Archivadas" },
];

export default function ReunionesPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLider, setIsLider] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [profileNames, setProfileNames] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [paisesById, setPaisesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [tab, setTab] = useState("activas");

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");
      setIsLider(profile?.role === "lider");
    }

    const { data } = await supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: false });
    const list = data ?? [];
    setMeetings(list);

    const { data: profs } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(profs ?? []);
    setProfileNames(Object.fromEntries((profs ?? []).map((p) => [p.id, p.name])));

    const { data: paises } = await supabase.from("paises").select("*");
    setPaisesById(Object.fromEntries((paises ?? []).map((p) => [p.id, p])));

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function handleDelete(meeting) {
    setDeletingId(meeting.id);
    const supabase = createClient();
    await supabase.from("meetings").delete().eq("id", meeting.id);
    setDeletingId(null);
    load();
  }

  const visible = useMemo(
    () => meetings.filter((m) => (tab === "archivadas" ? m.archived_at : !m.archived_at)),
    [meetings, tab]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Registra reuniones y agenda sus tareas directamente en el calendario de cada participante.
        </p>
        {(isAdmin || isLider) && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <PlusIcon />
            Nueva reunión
          </button>
        )}
      </div>

      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
        ) : visible.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            {tab === "archivadas" ? "No hay reuniones archivadas." : "Aún no hay reuniones activas."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Título</th>
                <th className="px-5 py-3 font-medium">País</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Moderador</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/reuniones/${m.id}`} className="font-medium hover:underline">
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <CountryCodeTag pais={paisesById[m.pais_id]} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(m.meeting_date + "T00:00:00").toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {m.moderator_id ? profileNames[m.moderator_id] ?? "—" : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {(isAdmin || m.created_by === currentUserId) && (
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={deletingId === m.id}
                        className="rounded-md border border-status-overdue/40 px-2.5 py-1 text-xs text-status-overdue transition hover:bg-red-50 disabled:opacity-50"
                        title="Eliminar reunión"
                      >
                        <TrashIcon />
                      </button>
                    )}
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
        pastMeetings={meetings}
        currentUserId={currentUserId}
        onCreated={(created) => router.push(`/reuniones/${created.id}`)}
      />
    </div>
  );
}
