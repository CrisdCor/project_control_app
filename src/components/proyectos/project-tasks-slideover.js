"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot, PendingNoteDot } from "@/components/status/status-badge";
import { TASK_STATUS, dueSemaphore } from "@/lib/status";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { fetchPendingNoteTaskIds } from "@/lib/notifications";

export function ProjectTasksSlideOver({ open, onClose, projectId, projectName, currentUserId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  async function load() {
    if (!projectId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("v_task_status").select("*").eq("project_id", projectId);
    const rows = data ?? [];
    const taskIds = rows.map((t) => t.id);

    let assigneeMap = {};
    if (taskIds.length) {
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("task_id, profiles(name)")
        .in("task_id", taskIds);
      assigneeMap = (assignees ?? []).reduce((acc, a) => {
        acc[a.task_id] = acc[a.task_id] ? [...acc[a.task_id], a.profiles?.name] : [a.profiles?.name];
        return acc;
      }, {});
    }

    const pending = await fetchPendingNoteTaskIds(supabase, taskIds, currentUserId);

    const sorted = rows
      .map((t) => ({ ...t, assignees: assigneeMap[t.id] ?? [], hasPendingNote: pending.has(t.id) }))
      .sort((a, b) => {
        const aDone = a.status === "finalizada" || a.status === "cancelada";
        const bDone = b.status === "finalizada" || b.status === "cancelada";
        if (aDone !== bDone) return aDone ? 1 : -1;
        return new Date(a.end_date) - new Date(b.end_date);
      });

    setTasks(sorted);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      setSelectedTaskId(null);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />

      <div className="relative h-full w-full max-w-2xl animate-slide-in-right overflow-hidden bg-white shadow-xl">
        <div className="relative h-full w-full">
          {/* Lista de tareas */}
          <div
            className={`absolute inset-0 flex h-full w-full flex-col bg-white transition-transform duration-300 ease-out ${
              selectedTaskId ? "-translate-x-full" : "translate-x-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold">Tareas — {projectName}</h2>
              <button onClick={onClose} className="text-muted-foreground transition hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este proyecto aún no tiene tareas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tarea</th>
                      <th className="py-2 pr-3 font-medium">Responsable</th>
                      <th className="py-2 pr-3 font-medium">Fecha</th>
                      <th className="py-2 pr-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="cursor-pointer border-b border-border transition last:border-0 hover:bg-neutral-50"
                      >
                        <td className="py-2.5 pr-3">
                          <span className="inline-flex items-center gap-1.5">
                            <PendingNoteDot pending={task.hasPendingNote} />
                            {task.title}
                          </span>
                        </td>
                        <td className="max-w-[140px] truncate py-2.5 pr-3 text-muted-foreground">
                          {task.assignees.filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <DueDot color={dueSemaphore(task.end_date, { done: task.status === "finalizada" })} />
                            {new Date(task.end_date + "T00:00:00").toLocaleDateString("es-CO")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3">
                          <StatusBadge status={task.status} map={TASK_STATUS} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detalle de la tarea seleccionada */}
          <div
            className={`absolute inset-0 h-full w-full transition-transform duration-300 ease-out ${
              selectedTaskId ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {selectedTaskId && (
              <TaskDetailPanel
                taskId={selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
                onSaved={load}
                backLabel="← Volver"
                closeOnSave
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
