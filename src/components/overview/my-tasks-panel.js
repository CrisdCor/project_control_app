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
import { CountryCodeTag } from "@/components/ui/country-tag";

const PAGE_SIZE = 5;

const QUICK_FILTERS = [
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Hoy" },
  { id: "manana", label: "Mañana" },
  { id: "7dias", label: "7 días" },
  { id: "todas", label: "Todas" },
];

export function MyTasksPanel({ currentUserId, isAdmin, refreshSignal, onChanged }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [bitacoras, setBitacoras] = useState([]);
  const [urgentIds, setUrgentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState(null);
  const [paisesById, setPaisesById] = useState({});

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("paises")
      .select("*")
      .then(({ data }) => setPaisesById(Object.fromEntries((data ?? []).map((p) => [p.id, p]))));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, name")
      .order("name")
      .then(({ data }) => setUsers(data ?? []));
  }, [isAdmin]);

  async function loadBitacoras() {
    const supabase = createClient();
    setLoading(true);

    // sin usuario específico seleccionado (yo mismo): las RLS ya limitan a mis
    // bitácoras relacionadas (encargado, o responsable de alguna actividad)
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, refreshSignal]);

  const visible = useMemo(() => {
    // finalizadas ocultas por defecto
    let list = bitacoras.filter((b) => b.status !== "finalizado");

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
  }, [bitacoras, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="shrink-0 text-sm font-semibold">Bitácora</h2>

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
              placeholder="Todos los encargados"
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
        <p className="text-sm text-muted-foreground">No hay bitácoras para este filtro.</p>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col divide-y divide-border overflow-y-auto">
          {pageItems.map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-2">
              <DueDot color={dueSemaphore(b.due_date)} />
              <CountryCodeTag pais={paisesById[b.pais_id]} />
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

      <BitacoraDrawer
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        bitacoraId={drawerId}
        onSaved={() => {
          loadBitacoras();
          onChanged?.();
        }}
      />
    </section>
  );
}
