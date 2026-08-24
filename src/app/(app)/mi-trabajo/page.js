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

const PAGE_SIZE = 10;

const QUICK_FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Hoy" },
  { id: "manana", label: "Mañana" },
  { id: "7dias", label: "7 días" },
];

export default function MiTrabajoPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [hideFinished, setHideFinished] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerTaskId, setDrawerTaskId] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      setSelectedUserId(user?.id ?? null);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        const admin = profile?.role === "admin";
        setIsAdmin(admin);
        if (admin) {
          const { data: all } = await supabase.from("profiles").select("id, name").order("name");
          setUsers(all ?? []);
        }
      }
      setReady(true);
    })();
  }, []);

  async function loadTasks() {
    if (!ready) return;
    const supabase = createClient();
    setLoading(true);

    let taskIds;
    if (selectedUserId) {
      const { data: assignedRows } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", selectedUserId);
      taskIds = (assignedRows ?? []).map((r) => r.task_id);
    } else {
      // "Todos los responsables" (solo admin): todas las tareas visibles
      const { data: allTasks } = await supabase.from("v_task_status").select("id");
      taskIds = (allTasks ?? []).map((t) => t.id);
    }

    if (taskIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("v_task_status").select("*").in("id", taskIds);
    const pending = await fetchPendingNoteTaskIds(supabase, taskIds, currentUserId);

    let assigneeMap = {};
    if (!selectedUserId) {
      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("task_id, profiles(name)")
        .in("task_id", taskIds);
      assigneeMap = (assignees ?? []).reduce((acc, a) => {
        acc[a.task_id] = acc[a.task_id] ? [...acc[a.task_id], a.profiles?.name] : [a.profiles?.name];
        return acc;
      }, {});
    }

    setTasks(
      (data ?? []).map((t) => ({
        ...t,
        hasPendingNote: pending.has(t.id),
        assignees: assigneeMap[t.id],
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadTasks();
      setPage(1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, ready]);

  const visible = useMemo(() => {
    let list = tasks;
    if (hideFinished) {
      list = list.filter((t) => t.status !== "finalizada" && t.status !== "cancelada");
    }

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
  }, [tasks, filter, hideFinished]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <SegmentedControl
            options={QUICK_FILTERS}
            value={filter}
            onChange={(id) => {
              setFilter(id);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={hideFinished}
              onChange={(e) => setHideFinished(e.target.checked)}
              className="accent-black"
            />
            Ocultar finalizadas/canceladas
          </label>

          {isAdmin && users.length > 0 && (
            <FilterDropdown
              placeholder="Todos los responsables"
              value={selectedUserId ?? ""}
              onChange={setSelectedUserId}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
        ) : pageItems.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No hay tareas para este filtro.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border px-5">
            {pageItems.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-3">
                <DueDot color={dueSemaphore(task.end_date, { done: task.status === "finalizada" })} />
                <PendingNoteDot pending={task.hasPendingNote} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {task.title}
                  {task.assignees?.length ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      · {task.assignees.filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {new Date(task.end_date + "T00:00:00").toLocaleDateString("es-CO")}
                </span>
                <StatusBadge status={task.status} map={TASK_STATUS} />
                <button
                  onClick={() => setDrawerTaskId(task.id)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-neutral-50"
                >
                  Actualizar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 pb-4">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      <TaskDrawer
        open={Boolean(drawerTaskId)}
        onClose={() => setDrawerTaskId(null)}
        taskId={drawerTaskId}
        onSaved={loadTasks}
      />
    </div>
  );
}
