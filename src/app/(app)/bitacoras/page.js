"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BitacoraFormModal } from "@/components/bitacoras/bitacora-form-modal";
import { PlusIcon, TrashIcon } from "@/components/icons";

export default function BitacorasPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [bitacoras, setBitacoras] = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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
    }

    const { data } = await supabase.from("bitacoras").select("*").order("created_at", { ascending: false });
    const list = data ?? [];
    setBitacoras(list);

    if (list.length) {
      const { data: tasks } = await supabase.from("bitacora_tasks").select("bitacora_id").in(
        "bitacora_id",
        list.map((b) => b.id)
      );
      const counts = {};
      (tasks ?? []).forEach((t) => {
        counts[t.bitacora_id] = (counts[t.bitacora_id] ?? 0) + 1;
      });
      setTaskCounts(counts);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function handleDelete(bitacora) {
    if (!window.confirm(`¿Eliminar la bitácora "${bitacora.name}" y todas sus tareas? Esta acción no se puede deshacer.`))
      return;
    setDeletingId(bitacora.id);
    const supabase = createClient();
    await supabase.from("bitacoras").delete().eq("id", bitacora.id);
    setDeletingId(null);
    load();
  }

  if (isAdmin === false) {
    return <p className="text-sm text-muted-foreground">No tienes acceso a esta sección.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Las bitácoras agrupan tareas que se llevan a cabo en conjunto.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          <PlusIcon />
          Nueva bitácora
        </button>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
        ) : bitacoras.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aún no hay bitácoras.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Tareas</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {bitacoras.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/bitacoras/${b.id}`} className="font-medium hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{taskCounts[b.id] ?? 0}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(b)}
                      disabled={deletingId === b.id}
                      className="rounded-md border border-status-overdue/40 px-2.5 py-1 text-xs text-status-overdue transition hover:bg-red-50 disabled:opacity-50"
                      title="Eliminar bitácora"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BitacoraFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentUserId={currentUserId}
        onCreated={load}
      />
    </div>
  );
}
