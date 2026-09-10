"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot } from "@/components/status/status-badge";
import { BITACORA_TASK_STATUS, dueSemaphore } from "@/lib/status";
import { BitacoraTaskDrawer } from "@/components/bitacoras/bitacora-task-drawer";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";

export default function BitacoraDetallePage() {
  const { id } = useParams();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [bitacora, setBitacora] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [drawerTaskId, setDrawerTaskId] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");
    }

    const { data: b } = await supabase.from("bitacoras").select("*").eq("id", id).maybeSingle();
    setBitacora(b);

    const { data: t } = await supabase.from("v_bitacora_task_status").select("*").eq("bitacora_id", id);

    const encargadoIds = [...new Set((t ?? []).map((x) => x.encargado_id).filter(Boolean))];
    let nameMap = {};
    if (encargadoIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", encargadoIds);
      nameMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name]));
    }

    const sorted = (t ?? [])
      .map((x) => ({ ...x, encargadoName: nameMap[x.encargado_id] ?? "—" }))
      .sort((a, b2) => {
        const aDone = a.status === "finalizado";
        const bDone = b2.status === "finalizado";
        if (aDone !== bDone) return aDone ? 1 : -1;
        return new Date(a.due_date) - new Date(b2.due_date);
      });
    setTasks(sorted);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSaveName() {
    if (!nameDraft.trim()) return;
    setSavingName(true);
    const supabase = createClient();
    await supabase.from("bitacoras").update({ name: nameDraft.trim() }).eq("id", id);
    setSavingName(false);
    setEditingName(false);
    load();
  }

  async function handleDeleteBitacora() {
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("bitacoras").delete().eq("id", id);
    router.push("/bitacoras");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (!bitacora) return <p className="text-sm text-muted-foreground">No se encontró la bitácora.</p>;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/bitacoras" className="text-sm text-muted-foreground hover:underline">
        ← Bitácoras
      </Link>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="flex-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-base font-semibold outline-none focus:border-foreground"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{bitacora.name}</h1>
            {isAdmin && (
              <button
                onClick={() => {
                  setNameDraft(bitacora.name);
                  setEditingName(true);
                }}
                className="text-muted-foreground transition hover:text-foreground"
                title="Editar"
              >
                <PencilIcon />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Tareas</h2>
          {isAdmin && (
            <button
              onClick={() => setCreatingTask(true)}
              className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              <PlusIcon />
              Crear tarea
            </button>
          )}
        </div>
        {tasks.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Esta bitácora aún no tiene tareas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Tarea</th>
                <th className="px-5 py-2.5 font-medium">Encargado</th>
                <th className="px-5 py-2.5 font-medium">Fecha límite</th>
                <th className="px-5 py-2.5 font-medium">Estado</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-5 py-2.5">{t.title}</td>
                  <td className="max-w-[140px] truncate px-5 py-2.5 text-muted-foreground">
                    {t.encargadoName}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <DueDot color={dueSemaphore(t.due_date, { done: t.status === "finalizado" })} />
                      {new Date(t.due_date + "T00:00:00").toLocaleDateString("es-CO")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    <StatusBadge status={t.status} map={BITACORA_TASK_STATUS} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => setDrawerTaskId(t.id)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-neutral-50"
                    >
                      Ver / editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-[var(--radius-card)] border border-status-overdue/40 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-status-overdue">Zona de peligro</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Elimina esta bitácora y todas sus tareas de forma permanente.
          </p>
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={handleDeleteBitacora}
                disabled={deleting}
                className="rounded-md bg-status-overdue px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                {deleting ? "Eliminando..." : "Confirmar eliminación"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-border px-4 py-2 text-sm transition hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-md border border-status-overdue/40 px-4 py-2 text-sm text-status-overdue transition hover:bg-red-50"
            >
              <TrashIcon />
              Eliminar bitácora
            </button>
          )}
        </div>
      )}

      <BitacoraTaskDrawer
        open={Boolean(drawerTaskId)}
        onClose={() => setDrawerTaskId(null)}
        taskId={drawerTaskId}
        onSaved={load}
      />
      <BitacoraTaskDrawer
        open={creatingTask}
        onClose={() => setCreatingTask(false)}
        taskId={null}
        bitacoraId={id}
        onSaved={load}
      />
    </div>
  );
}
