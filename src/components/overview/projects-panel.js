"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/status/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { PROJECT_STATUS } from "@/lib/status";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { ProjectTasksSlideOver } from "@/components/proyectos/project-tasks-slideover";

const PAGE_SIZE = 5;

export function ProjectsPanel({ isAdmin, currentUserId }) {
  const [projects, setProjects] = useState([]);
  const [leaders, setLeaders] = useState({});
  const [leaderFilter, setLeaderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [managingProject, setManagingProject] = useState(null); // { id, name } | null

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
            <div key={project.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                {leaders[project.leader_id] ?? "—"}
              </span>
              <StatusBadge status={project.status} map={PROJECT_STATUS} />
              <button
                onClick={() => setManagingProject({ id: project.id, name: project.name })}
                className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition hover:bg-neutral-50"
              >
                Gestionar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="shrink-0">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <ProjectTasksSlideOver
        open={Boolean(managingProject)}
        onClose={() => setManagingProject(null)}
        projectId={managingProject?.id}
        projectName={managingProject?.name}
        currentUserId={currentUserId}
      />
    </section>
  );
}
