"use client";

import { StatusBadge, DueDot, PendingNoteDot } from "@/components/status/status-badge";
import { TASK_STATUS, dueSemaphore } from "@/lib/status";

const COLUMN_ORDER = [
  "pendiente_por_inicio",
  "en_proceso",
  "stand_by",
  "vencida",
  "finalizada",
  "cancelada",
];

export function KanbanBoard({ tasks, onOpenTask }) {
  const columns = COLUMN_ORDER.map((status) => ({
    status,
    tasks: tasks
      .filter((t) => t.status === status)
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date)),
  }));

  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {columns.map((col) => (
        <div key={col.status} className="flex w-64 shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <StatusBadge status={col.status} map={TASK_STATUS} />
            <span className="text-xs text-muted-foreground">{col.tasks.length}</span>
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-2">
            {col.tasks.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">Sin tareas</p>
            ) : (
              col.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  className="flex flex-col gap-1.5 rounded-md border border-border bg-white p-2.5 text-left shadow-sm transition hover:border-foreground"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium leading-snug">{task.title}</span>
                    <PendingNoteDot pending={task.hasPendingNote} />
                  </div>
                  {task.assignees?.length > 0 && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {task.assignees.filter(Boolean).join(", ")}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <DueDot color={dueSemaphore(task.end_date, { done: task.status === "finalizada" })} />
                    {new Date(task.end_date + "T00:00:00").toLocaleDateString("es-CO")}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
