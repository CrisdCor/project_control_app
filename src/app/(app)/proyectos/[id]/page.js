"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot, PendingNoteDot } from "@/components/status/status-badge";
import { PROJECT_STATUS, TASK_STATUS, dueSemaphore } from "@/lib/status";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PlusIcon } from "@/components/icons";
import { DatePicker } from "@/components/ui/date-picker";
import { ActionMenu } from "@/components/ui/action-menu";
import { fetchPendingNoteTaskIds } from "@/lib/notifications";

export default function ProyectoDetallePage() {
  const { id } = useParams();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [project, setProject] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [view, setView] = useState("list");

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setIsAdmin(profile?.role === "admin");
    }

    const { data: p } = await supabase.from("v_project_status").select("*").eq("id", id).maybeSingle();
    if (p) {
      setProject(p);
      setName(p.name);
      setLeaderId(p.leader_id);
      setStartDate(p.start_date);
      setEndDate(p.end_date);
    }

    const { data: profs } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(profs ?? []);

    const { data: t } = await supabase.from("v_task_status").select("*").eq("project_id", id);
    const taskIds = (t ?? []).map((x) => x.id);
    const pending = await fetchPendingNoteTaskIds(supabase, taskIds, user?.id);

    let assigneeMap = {};
    let assigneeIdMap = {};
    if (taskIds.length) {
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("task_id, user_id, profiles(name)")
        .in("task_id", taskIds);
      assigneeMap = (assignees ?? []).reduce((acc, a) => {
        acc[a.task_id] = acc[a.task_id] ? [...acc[a.task_id], a.profiles?.name] : [a.profiles?.name];
        return acc;
      }, {});
      assigneeIdMap = (assignees ?? []).reduce((acc, a) => {
        acc[a.task_id] = acc[a.task_id] ? [...acc[a.task_id], a.user_id] : [a.user_id];
        return acc;
      }, {});
    }

    setTasks(
      (t ?? []).map((x) => ({
        ...x,
        hasPendingNote: pending.has(x.id),
        assignees: assigneeMap[x.id] ?? [],
        assigneeIds: assigneeIdMap[x.id] ?? [],
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    if (endDate < startDate) {
      setError("La fecha final no puede ser anterior a la fecha de inicio.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("projects")
      .update({ name: name.trim(), leader_id: leaderId, start_date: startDate, end_date: endDate })
      .eq("id", id);
    setSaving(false);
    if (updateError) {
      setError("No se pudo guardar el proyecto.");
      return;
    }
    load();
  }

  async function toggleField(field, value) {
    const supabase = createClient();
    await supabase.from("projects").update({ [field]: value }).eq("id", id);
    load();
  }

  async function handleDelete() {
    if (confirmName !== project.name) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", id);
    router.push("/proyectos");
  }

  async function handleDeleteTaskFromList(task) {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`)) return;
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", task.id);
    load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (!project) return <p className="text-sm text-muted-foreground">No se encontró el proyecto.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-3xl items-center justify-between">
        <Link href="/proyectos" className="text-sm text-muted-foreground hover:underline">
          ← Proyectos
        </Link>
        <StatusBadge status={project.status} map={PROJECT_STATUS} />
      </div>

      <form
        onSubmit={handleSave}
        className="flex max-w-3xl flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nombre del proyecto</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground disabled:bg-neutral-50 disabled:text-muted-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Líder del proyecto</label>
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            disabled={!isAdmin}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground disabled:bg-neutral-50 disabled:text-muted-foreground"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Fecha inicio</label>
            <DatePicker value={startDate} onChange={setStartDate} disabled={!isAdmin} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Fecha final</label>
            <DatePicker value={endDate} min={startDate} onChange={setEndDate} disabled={!isAdmin} />
          </div>
        </div>

        {error && <p className="text-sm text-status-overdue">{error}</p>}

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>

            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={project.admin_closed}
                onChange={(e) => toggleField("admin_closed", e.target.checked)}
                className="accent-black"
              />
              Cerrar proyecto (finalizado)
            </label>

            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={project.archived}
                onChange={(e) => toggleField("archived", e.target.checked)}
                className="accent-black"
              />
              Archivar
            </label>
          </div>
        )}
      </form>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Tareas del proyecto</h2>
          <div className="flex items-center gap-2">
            <SegmentedControl
              options={[
                { id: "list", label: "Lista" },
                { id: "board", label: "Tablero" },
              ]}
              value={view}
              onChange={setView}
            />
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
        </div>
        {tasks.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Este proyecto aún no tiene tareas.</p>
        ) : view === "board" ? (
          <KanbanBoard tasks={tasks} onOpenTask={setDrawerTaskId} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Tarea</th>
                <th className="px-5 py-2.5 font-medium">Responsable</th>
                <th className="px-5 py-2.5 font-medium">Fecha de compromiso</th>
                <th className="px-5 py-2.5 font-medium">Estado</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {[...tasks]
                .sort((a, b) => {
                  const aDone = a.status === "finalizada";
                  const bDone = b.status === "finalizada";
                  if (aDone !== bDone) return aDone ? 1 : -1;
                  return new Date(a.end_date) - new Date(b.end_date);
                })
                .map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <PendingNoteDot pending={t.hasPendingNote} />
                      {t.title}
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate px-5 py-2.5 text-muted-foreground">
                    {t.assignees?.filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <DueDot color={dueSemaphore(t.end_date, { done: t.status === "finalizada" })} />
                      {new Date(t.end_date + "T00:00:00").toLocaleDateString("es-CO")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5">
                    <StatusBadge status={t.status} map={TASK_STATUS} />
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <ActionMenu
                      actions={[
                        {
                          label: isAdmin || (t.assigneeIds ?? []).includes(currentUserId) ? "Editar" : "Ver",
                          onClick: () => setDrawerTaskId(t.id),
                        },
                        isAdmin && {
                          label: "Eliminar",
                          danger: true,
                          onClick: () => handleDeleteTaskFromList(t),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && (
        <div className="max-w-3xl rounded-[var(--radius-card)] border border-status-overdue/40 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-status-overdue">Zona de peligro</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Esta acción elimina el proyecto y todas sus tareas de forma permanente. Escribe el nombre exacto
            del proyecto para confirmar: <span className="font-medium text-foreground">{project.name}</span>
          </p>
          <div className="flex gap-2">
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              onClick={handleDelete}
              disabled={confirmName !== project.name || deleting}
              className="rounded-md bg-status-overdue px-4 py-2 text-sm font-medium text-white transition disabled:opacity-40"
            >
              {deleting ? "Eliminando..." : "Eliminar proyecto"}
            </button>
          </div>
        </div>
      )}

      <TaskDrawer
        open={Boolean(drawerTaskId)}
        onClose={() => setDrawerTaskId(null)}
        taskId={drawerTaskId}
        onSaved={load}
      />
      <TaskDrawer
        open={creatingTask}
        onClose={() => setCreatingTask(false)}
        taskId={null}
        projectId={id}
        onSaved={load}
      />
    </div>
  );
}
