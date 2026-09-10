"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot } from "@/components/status/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { BITACORA_TASK_STATUS, dueSemaphore } from "@/lib/status";
import { BitacoraTaskDrawer } from "@/components/bitacoras/bitacora-task-drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FilterDropdown } from "@/components/ui/filter-dropdown";

const PAGE_SIZE = 5;

const QUICK_FILTERS = [
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Hoy" },
  { id: "manana", label: "Mañana" },
  { id: "7dias", label: "7 días" },
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
    const supabase = createClient();
    setLoading(true);

    // sin usuario específico seleccionado (yo mismo): las RLS ya limitan a mis tareas
    // relacionadas (responsable de la tarea o de alguna actividad dentro de ella)
    if (selectedUserId === currentUserId) {
      const { data } = await supabase.from("v_bitacora_task_status").select("*");
      setTasks(data ?? []);
      setLoading(false);
      return;
    }

    let taskIds;
    if (!selectedUserId) {
      const { data: allTasks } = await supabase.from("v_bitacora_task_status").select("id");
      taskIds = (allTasks ?? []).map((t) => t.id);
    } else {
      const [{ data: encargadoRows }, { data: activityRows }] = await Promise.all([
        supabase.from("bitacora_tasks").select("id").eq("encargado_id", selectedUserId),
        supabase.from("bitacora_activities").select("bitacora_task_id").eq("assigned_to", selectedUserId),
      ]);
      taskIds = [
        ...new Set([
          ...(encargadoRows ?? []).map((r) => r.id),
          ...(activityRows ?? []).map((r) => r.bitacora_task_id),
        ]),
      ];
    }

    if (taskIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("v_bitacora_task_status").select("*").in("id", taskIds);
    setTasks(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadTasks();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const visible = useMemo(() => {
    // finalizadas ocultas por defecto
    let list = tasks.filter((t) => t.status !== "finalizado");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list = list.filter((t) => {
      const due = new Date(t.due_date + "T00:00:00");
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

    return list.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [tasks, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
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
              placeholder="Todos los responsables"
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
        <div className="flex flex-1 min-h-0 flex-col divide-y divide-border overflow-y-auto">
          {pageItems.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-2">
              <DueDot color={dueSemaphore(task.due_date)} />
              <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                {new Date(task.due_date + "T00:00:00").toLocaleDateString("es-CO")}
              </span>
              <StatusBadge status={task.status} map={BITACORA_TASK_STATUS} />
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

      <div className="shrink-0">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <BitacoraTaskDrawer
        open={Boolean(drawerTaskId)}
        onClose={() => setDrawerTaskId(null)}
        taskId={drawerTaskId}
        onSaved={loadTasks}
      />
    </section>
  );
}
