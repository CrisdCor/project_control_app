"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/status/status-badge";
import { PROJECT_STATUS } from "@/lib/status";
import { ProjectFormModal } from "@/components/proyectos/project-form-modal";
import { PlusIcon } from "@/components/icons";

export default function ProyectosPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [projects, setProjects] = useState([]);
  const [leaders, setLeaders] = useState({});
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leaderFilter, setLeaderFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    setUser(authUser);

    let admin = false;
    if (authUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();
      admin = profile?.role === "admin";
      setIsAdmin(admin);
    }

    const { data } = await supabase.from("v_project_status").select("*");
    const list = data ?? [];
    setProjects(list);

    const leaderIds = [...new Set(list.map((p) => p.leader_id))];
    if (leaderIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", leaderIds);
      setLeaders(Object.fromEntries((profs ?? []).map((p) => [p.id, p.name])));
    }

    if (admin) {
      const { data: all } = await supabase.from("profiles").select("id, name").order("name");
      setAllProfiles(all ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = projects.filter((p) => (showArchived ? true : !p.archived));
    if (search.trim()) {
      list = list.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
    }
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (leaderFilter) list = list.filter((p) => p.leader_id === leaderFilter);

    return list.sort((a, b) => {
      const aDone = a.status === "finalizado";
      const bDone = b.status === "finalizado";
      if (aDone !== bDone) return aDone ? 1 : -1;
      return new Date(a.end_date) - new Date(b.end_date);
    });
  }, [projects, search, statusFilter, leaderFilter, showArchived]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-56 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-2.5 py-2 text-sm outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(PROJECT_STATUS).map(([key, v]) => (
            <option key={key} value={key}>
              {v.label}
            </option>
          ))}
        </select>

        {Object.keys(leaders).length > 0 && (
          <select
            value={leaderFilter}
            onChange={(e) => setLeaderFilter(e.target.value)}
            className="rounded-md border border-border bg-white px-2.5 py-2 text-sm outline-none"
          >
            <option value="">Todos los líderes</option>
            {Object.entries(leaders).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-black"
          />
          Ver archivados
        </label>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <PlusIcon />
            Crear proyecto
          </button>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No hay proyectos que coincidan con los filtros.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Líder</th>
                <th className="px-5 py-3 font-medium">Fecha final</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/proyectos/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{leaders[project.leader_id] ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(project.end_date + "T00:00:00").toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={project.status} map={PROJECT_STATUS} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && (
        <ProjectFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          leaders={allProfiles}
          onCreated={load}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}
