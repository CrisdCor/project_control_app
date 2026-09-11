"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot } from "@/components/status/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { BITACORA_STATUS, bitacoraStatusKey, dueSemaphore } from "@/lib/status";
import { fetchUrgentActivityBitacoraIds } from "@/lib/bitacoras";
import { BitacoraDrawer } from "@/components/bitacoras/bitacora-drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { AlertIcon } from "@/components/icons";

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
  const [bitacoras, setBitacoras] = useState([]);
  const [urgentIds, setUrgentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [hideFinished, setHideFinished] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState(null);

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

  async function loadBitacoras() {
    if (!ready) return;
    const supabase = createClient();
    setLoading(true);

    if (selectedUserId === currentUserId) {
      const { data } = await supabase.from("v_bitacora_status").select("*");
      setBitacoras(data ?? []);
      setUrgentIds(await fetchUrgentActivityBitacoraIds(supabase, (data ?? []).map((b) => b.id)));
      setLoading(false);
      return;
    }

    let ids;
    if (!selectedUserId) {
      const { data: all } = await supabase.from("v_bitacora_status").select("id");
      ids = (all ?? []).map((b) => b.id);
    } else {
      const [{ data: encargadoRows }, { data: activityRows }] = await Promise.all([
        supabase.from("bitacoras").select("id").eq("encargado_id", selectedUserId),
        supabase.from("bitacora_activities").select("bitacora_id").eq("assigned_to", selectedUserId),
      ]);
      ids = [
        ...new Set([
          ...(encargadoRows ?? []).map((r) => r.id),
          ...(activityRows ?? []).map((r) => r.bitacora_id),
        ]),
      ];
    }

    if (ids.length === 0) {
      setBitacoras([]);
      setUrgentIds(new Set());
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("v_bitacora_status").select("*").in("id", ids);
    setBitacoras(data ?? []);
    setUrgentIds(await fetchUrgentActivityBitacoraIds(supabase, ids));
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadBitacoras();
      setPage(1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, ready]);

  const visible = useMemo(() => {
    let list = bitacoras;
    if (hideFinished) {
      list = list.filter((b) => b.status !== "finalizado");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list = list.filter((b) => {
      const due = new Date(b.due_date + "T00:00:00");
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
  }, [bitacoras, filter, hideFinished]);

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
            Ocultar finalizadas
          </label>

          {isAdmin && users.length > 0 && (
            <FilterDropdown
              placeholder="Todos los encargados"
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
          <p className="p-5 text-sm text-muted-foreground">No hay bitácoras para este filtro.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border px-5">
            {pageItems.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-3">
                <DueDot color={dueSemaphore(b.due_date, { done: b.status === "finalizado" })} />
                <span className="min-w-0 flex-1 truncate text-sm">{b.name}</span>
                {urgentIds.has(b.id) && (
                  <span
                    title="Tiene una actividad que vence hoy o ya está vencida"
                    className="shrink-0 text-status-overdue"
                  >
                    <AlertIcon />
                  </span>
                )}
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {new Date(b.due_date + "T00:00:00").toLocaleDateString("es-CO")}
                </span>
                <StatusBadge status={bitacoraStatusKey(b)} map={BITACORA_STATUS} />
                <button
                  onClick={() => setDrawerId(b.id)}
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

      <BitacoraDrawer
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        bitacoraId={drawerId}
        onSaved={loadBitacoras}
      />
    </div>
  );
}
