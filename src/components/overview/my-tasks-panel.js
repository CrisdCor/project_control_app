"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot, PendingNoteDot } from "@/components/status/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { TASK_STATUS, dueSemaphore } from "@/lib/status";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { fetchPendingNoteTaskIds } from "@/lib/notifications";

const PAGE_SIZE = 5;

const QUICK_FILTERS = [
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Hoy" },
  { id: "manana", label: "Mañana" },
  { id: "7dias", label: "Próximos 7 días" },
  { id: "todas", label: "Todas" },
];

export function MyTasksPanel({ currentUserId, isAdmin }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [page, setPage] = useState(1);
  const [drawerTaskId, setDrawerTaskId] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, name")
      .order("name")
      .then(({ data }) => setUsers(data ?? []));
  }, [isAdmin]);

  async function loadTasks() {
    if (!selectedUserId) return;
    const supabase = createClient();
    setLoading(true);
    const { data: assignedRows } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", selectedUserId);

    const taskIds = (assignedRows ?? []).map((r) => r.task_id);
    if (taskIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("v_task_status").select("*").in("id", taskIds);
    const pending = await fetchPendingNoteTaskIds(supabase, taskIds, currentUserId);
    setTasks((data ?? []).map((t) => ({ ...t, hasPendingNote: pending.has(t.id) })));
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadTasks();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const visible = useMemo(() => {
    // finalizadas/canceladas ocultas por defecto
    let list = tasks.filter((t) => t.status !== "finalizada" && t.status !== "cancelada");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list = list.filter((t) => {
      const due = new Date(t.end_date + "T00:00:00");
      const diffDays = Math.round((due - today) / 86400000);
      switch (filter) {
        case "vencidas":
          return diffDays < 0;
        case "hoy":
          return diffDays === 0;
        case "manana":
          return diffDays === 1;
        case "7dias":
          return diffDays >= 0 && diffDays <= 7;
        default:
          return true;
      }
    });

    return list.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
  }, [tasks, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="shrink-0 text-sm font-semibold">Mi trabajo</h2>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={QUICK_FILTERS}
            value={filter}
            onChange={(id) => {
              setFilter(id);
              setPage(1);
            }}
          />
          {isAdmin && users.length > 0 && (
            <FilterDropdown
              placeholder="Selecciona responsable"
              allowClear={false}
              value={selectedUserId}
              onChange={(v) => {
                setSelectedUserId(v);
                setPage(1);
              }}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tareas para este filtro.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {pageItems.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-2">
              <DueDot color={dueSemaphore(task.end_date)} />
              <PendingNoteDot pending={task.hasPendingNote} />
              <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                {new Date(task.end_date + "T00:00:00").toLocaleDateString("es-CO")}
              </span>
              <StatusBadge status={task.status} map={TASK_STATUS} />
              <button
                onClick={() => setDrawerTaskId(task.id)}
                className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-neutral-50"
              >
                Actualizar
              </button>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <TaskDrawer
        open={Boolean(drawerTaskId)}
        onClose={() => setDrawerTaskId(null)}
        taskId={drawerTaskId}
        onSaved={loadTasks}
      />
    </section>
  );
}
