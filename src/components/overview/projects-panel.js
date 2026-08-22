"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot } from "@/components/status/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { PROJECT_STATUS, TASK_STATUS, dueSemaphore } from "@/lib/status";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";

const PAGE_SIZE = 5;

export function ProjectsPanel({ isAdmin }) {
  const [projects, setProjects] = useState([]);
  const [leaders, setLeaders] = useState({});
  const [leaderFilter, setLeaderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [tasksByProject, setTasksByProject] = useState({});

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

  async function toggleExpand(projectId) {
    if (expanded === projectId) {
      setExpanded(null);
      return;
    }
    setExpanded(projectId);
    if (!tasksByProject[projectId]) {
      const supabase = createClient();
      const { data: tasks } = await supabase
        .from("v_task_status")
        .select("*")
        .eq("project_id", projectId);

      const taskIds = (tasks ?? []).map((t) => t.id);
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

      setTasksByProject((prev) => ({
        ...prev,
        [projectId]: (tasks ?? []).map((t) => ({ ...t, assignees: assigneeMap[t.id] ?? [] })),
      }));
    }
  }

  return (
    <section className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Proyectos</h2>
        {isAdmin && Object.keys(leaders).length > 0 && (
          <select
            value={leaderFilter}
            onChange={(e) => {
              setLeaderFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs outline-none"
          >
            <option value="">Todos los líderes</option>
            {Object.entries(leaders).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay proyectos para mostrar.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {pageItems.map((project) => (
            <div key={project.id}>
              <button
                onClick={() => toggleExpand(project.id)}
                className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-neutral-50"
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
                  <ProjectTasksTable tasks={tasksByProject[project.id]} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}

function ProjectTasksTable({ tasks }) {
  const [sortKey, setSortKey] = useState("end_date");
  const [sortDir, setSortDir] = useState("asc");

  if (!tasks) return <p className="text-xs text-muted-foreground">Cargando tareas...</p>;
  if (tasks.length === 0) return <p className="text-xs text-muted-foreground">Este proyecto aún no tiene tareas.</p>;

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...tasks].sort((a, b) => {
    let av = a[sortKey] ?? "";
    let bv = b[sortKey] ?? "";
    if (sortKey === "end_date") {
      av = new Date(av);
      bv = new Date(bv);
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const cols = [
    { key: "title", label: "Tarea" },
    { key: "assignees", label: "Responsable" },
    { key: "end_date", label: "Fecha de compromiso" },
    { key: "status", label: "Estado" },
  ];

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted-foreground">
          {cols.map((c) => (
            <th
              key={c.key}
              onClick={() => toggleSort(c.key)}
              className="cursor-pointer select-none py-1.5 pr-3 font-medium"
            >
              {c.label} {sortKey === c.key && (sortDir === "asc" ? "↑" : "↓")}
            </th>
          ))}
          <th className="py-1.5 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((task) => (
          <tr key={task.id} className="border-t border-border">
            <td className="py-2 pr-3">{task.title}</td>
            <td className="py-2 pr-3">{(task.assignees ?? []).filter(Boolean).join(", ") || "—"}</td>
            <td className="py-2 pr-3">
              <span className="inline-flex items-center gap-1.5">
                <DueDot color={dueSemaphore(task.end_date, { done: task.status === "finalizada" })} />
                {new Date(task.end_date + "T00:00:00").toLocaleDateString("es-CO")}
              </span>
            </td>
            <td className="py-2 pr-3">
              <StatusBadge status={task.status} map={TASK_STATUS} />
            </td>
            <td className="py-2 text-right">
              <button
                className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-neutral-50"
                title="Disponible en la siguiente iteración"
              >
                Actualizar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
