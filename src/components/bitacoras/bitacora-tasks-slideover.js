"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot } from "@/components/status/status-badge";
import { BITACORA_TASK_STATUS, dueSemaphore } from "@/lib/status";
import { BitacoraTaskDetailPanel } from "@/components/bitacoras/bitacora-task-detail-panel";

export function BitacoraTasksSlideOver({ open, onClose, bitacoraId, bitacoraName, isAdmin, onCreateTask }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  async function load() {
    if (!bitacoraId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("v_bitacora_task_status").select("*").eq("bitacora_id", bitacoraId);
    const rows = data ?? [];
    const taskIds = rows.map((t) => t.id);

    let assigneeMap = {};
    if (taskIds.length) {
      const { data: assignees } = await supabase
        .from("bitacora_task_assignees")
        .select("task_id, profiles(name)")
        .in("task_id", taskIds);
      assigneeMap = (assignees ?? []).reduce((acc, a) => {
        acc[a.task_id] = acc[a.task_id] ? [...acc[a.task_id], a.profiles?.name] : [a.profiles?.name];
        return acc;
      }, {});
    }

    const sorted = rows
      .map((t) => ({ ...t, assignees: assigneeMap[t.id] ?? [] }))
      .sort((a, b) => {
        const aDone = a.status === "finalizado";
        const bDone = b.status === "finalizado";
        if (aDone !== bDone) return aDone ? 1 : -1;
        return new Date(a.due_date) - new Date(b.due_date);
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
  }, [open, bitacoraId]);

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
              <h2 className="text-sm font-semibold">Tareas — {bitacoraName}</h2>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={onCreateTask}
                    className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800"
                  >
                    Crear tarea
                  </button>
                )}
                <button onClick={onClose} className="text-muted-foreground transition hover:text-foreground">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta bitácora aún no tiene tareas.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tarea</th>
                      <th className="py-2 pr-3 font-medium">Responsable</th>
                      <th className="py-2 pr-3 font-medium">Fecha límite</th>
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
                        <td className="py-2.5 pr-3">{task.title}</td>
                        <td className="max-w-[140px] truncate py-2.5 pr-3 text-muted-foreground">
                          {task.assignees.filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <DueDot color={dueSemaphore(task.due_date, { done: task.status === "finalizado" })} />
                            {new Date(task.due_date + "T00:00:00").toLocaleDateString("es-CO")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3">
                          <StatusBadge status={task.status} map={BITACORA_TASK_STATUS} />
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
              <BitacoraTaskDetailPanel
                taskId={selectedTaskId}
                bitacoraId={bitacoraId}
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
