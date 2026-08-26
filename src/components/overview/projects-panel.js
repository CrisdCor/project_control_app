"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot, PendingNoteDot } from "@/components/status/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { PROJECT_STATUS, TASK_STATUS, dueSemaphore } from "@/lib/status";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { ActionMenu } from "@/components/ui/action-menu";
import { fetchPendingNoteTaskIds } from "@/lib/notifications";

const PAGE_SIZE = 5;

export function ProjectsPanel({ isAdmin, currentUserId }) {
  const [projects, setProjects] = useState([]);
  const [leaders, setLeaders] = useState({});
  const [leaderFilter, setLeaderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [tasksByProject, setTasksByProject] = useState({});
  const [drawerTask, setDrawerTask] = useState(null); // { taskId, projectId } | null

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("v_project_status")
        .select("*")
        .eq("archived", false);

      const list = data ?? [];
      setProjects(list);

      const leaderIds = [...new Set(list.map((p) => p.leader_id))];
      if (leaderIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", leaderIds);
        setLeaders(Object.fromEntries((profs ?? []).map((p) => [p.id, p.name])));
      }
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => {
    let list = [...projects];
    if (leaderFilter) list = list.filter((p) => p.leader_id === leaderFilter);
    list.sort((a, b) => {
      const aDone = a.status === "finalizado";
      const bDone = b.status === "finalizado";
      if (aDone !== bDone) return aDone ? 1 : -1;
      return new Date(a.end_date) - new Date(b.end_date);
    });
    return list;
  }, [projects, leaderFilter]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function loadProjectTasks(projectId) {
    const supabase = createClient();
    const { data: tasks } = await supabase.from("v_task_status").select("*").eq("project_id", projectId);

    const taskIds = (tasks ?? []).map((t) => t.id);
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

    const pending = await fetchPendingNoteTaskIds(supabase, taskIds, currentUserId);

    setTasksByProject((prev) => ({
      ...prev,
      [projectId]: (tasks ?? []).map((t) => ({
        ...t,
        assignees: assigneeMap[t.id] ?? [],
        assigneeIds: assigneeIdMap[t.id] ?? [],
        hasPendingNote: pending.has(t.id),
      })),
    }));
  }

  async function handleDeleteTask(task, projectId) {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`)) return;
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", task.id);
    loadProjectTasks(projectId);
  }

  async function toggleExpand(projectId) {
    if (expanded === projectId) {
      setExpanded(null);
      return;
    }
    setExpanded(projectId);
    if (!tasksByProject[projectId]) {
      await loadProjectTasks(projectId);
    }
  }

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Proyectos</h2>
        {isAdmin && Object.keys(leaders).length > 0 && (
          <FilterDropdown
            placeholder="Todos los líderes"
            value={leaderFilter}
            onChange={(v) => {
              setLeaderFilter(v);
              setPage(1);
            }}
            options={Object.entries(leaders).map(([id, name]) => ({ value: id, label: name }))}
          />
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay proyectos para mostrar.</p>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col divide-y divide-border overflow-y-auto">
          {pageItems.map((project) => (
            <div key={project.id}>
              <button
                onClick={() => toggleExpand(project.id)}
                className="flex w-full items-center gap-3 py-2 text-left transition hover:bg-neutral-50"
              >
                {expanded === project.id ? (
                  <ChevronDownIcon className="shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {leaders[project.leader_id] ?? "—"}
                </span>
                <StatusBadge status={project.status} map={PROJECT_STATUS} />
              </button>

              {expanded === project.id && (
                <div className="animate-fade-in pb-3 pl-7">
                  <ProjectTasksTable
                    tasks={tasksByProject[project.id]}
                    onOpenTask={(taskId) => setDrawerTask({ taskId, projectId: project.id })}
                    onDeleteTask={(task) => handleDeleteTask(task, project.id)}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="shrink-0">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <TaskDrawer
        open={Boolean(drawerTask)}
        onClose={() => setDrawerTask(null)}
        taskId={drawerTask?.taskId}
        projectId={drawerTask?.projectId}
        onSaved={() => drawerTask && loadProjectTasks(drawerTask.projectId)}
      />
    </section>
  );
}

function ProjectTasksTable({ tasks, onOpenTask, onDeleteTask, isAdmin, currentUserId }) {
  if (!tasks) return <p className="text-xs text-muted-foreground">Cargando tareas...</p>;
  if (tasks.length === 0) return <p className="text-xs text-muted-foreground">Este proyecto aún no tiene tareas.</p>;

  const sorted = [...tasks].sort((a, b) => {
    const aDone = a.status === "finalizada";
    const bDone = b.status === "finalizada";
    if (aDone !== bDone) return aDone ? 1 : -1;
    return new Date(a.end_date) - new Date(b.end_date);
  });

  const cols = [
    { key: "title", label: "Tarea" },
    { key: "assignees", label: "Responsable", className: "w-[110px]" },
    { key: "end_date", label: "Fecha de compromiso", className: "whitespace-nowrap" },
    { key: "status", label: "Estado", className: "whitespace-nowrap" },
  ];

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted-foreground">
          {cols.map((c) => (
            <th key={c.key} className={`py-1.5 pr-3 font-medium ${c.className ?? ""}`}>
              {c.label}
            </th>
          ))}
          <th className="py-1.5 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((task) => (
          <tr key={task.id} className="border-t border-border">
            <td className="py-2 pr-3">
              <span className="inline-flex items-center gap-1.5">
                <PendingNoteDot pending={task.hasPendingNote} />
                {task.title}
              </span>
            </td>
            <td className="max-w-[110px] truncate py-2 pr-3" title={(task.assignees ?? []).filter(Boolean).join(", ")}>
              {(task.assignees ?? []).filter(Boolean).join(", ") || "—"}
            </td>
            <td className="whitespace-nowrap py-2 pr-3">
              <span className="inline-flex items-center gap-1.5">
                <DueDot color={dueSemaphore(task.end_date, { done: task.status === "finalizada" })} />
                {new Date(task.end_date + "T00:00:00").toLocaleDateString("es-CO")}
              </span>
            </td>
            <td className="whitespace-nowrap py-2 pr-3">
              <StatusBadge status={task.status} map={TASK_STATUS} />
            </td>
            <td className="whitespace-nowrap py-2 text-right">
              <ActionMenu
                actions={[
                  {
                    label: isAdmin || (task.assigneeIds ?? []).includes(currentUserId) ? "Editar" : "Ver",
                    onClick: () => onOpenTask(task.id),
                  },
                  isAdmin && { label: "Eliminar", danger: true, onClick: () => onDeleteTask(task) },
                ]}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
