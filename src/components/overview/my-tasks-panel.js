"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot } from "@/components/status/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { BITACORA_STATUS, bitacoraStatusKey, dueSemaphore } from "@/lib/status";
import { fetchUrgentActivityBitacoraIds } from "@/lib/bitacoras";
import { BitacoraDrawer } from "@/components/bitacoras/bitacora-drawer";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { AlertIcon } from "@/components/icons";
import { CountryCodeTag } from "@/components/ui/country-tag";
import { AreaTag } from "@/components/ui/area-tag";

const PAGE_SIZE = 6;

export function MyTasksPanel({ currentUserId, isAdmin, refreshSignal, onChanged }) {
  const [users, setUsers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [areaFilter, setAreaFilter] = useState("");
  const [bitacoras, setBitacoras] = useState([]);
  const [urgentIds, setUrgentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState(null);
  const [paisesById, setPaisesById] = useState({});
  const [areasById, setAreasById] = useState({});
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("paises")
      .select("*")
      .then(({ data }) => setPaisesById(Object.fromEntries((data ?? []).map((p) => [p.id, p]))));
    supabase
      .from("areas")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setAreas(data ?? []);
        setAreasById(Object.fromEntries((data ?? []).map((a) => [a.id, a])));
      });
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
    // solo bloquea con "Cargando..." la primera vez; recargas posteriores
    // (propias o de otro panel) se aplican en silencio para no parpadear
    if (!hasLoadedOnce.current) setLoading(true);
    hasLoadedOnce.current = true;

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
    if (areaFilter) list = list.filter((b) => b.area_id === areaFilter);
    return list.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [bitacoras, areaFilter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h2 className="shrink-0 text-sm font-semibold">Bitácora</h2>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {areas.length > 0 && (
              <FilterDropdown
                placeholder="Todas las áreas"
                value={areaFilter}
                onChange={(v) => {
                  setAreaFilter(v);
                  setPage(1);
                }}
                options={areas.map((a) => ({ value: a.id, label: a.name }))}
              />
            )}
            {users.length > 0 && (
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
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay bitácoras para este filtro.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col divide-y divide-border">
            {pageItems.map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-2">
              <DueDot color={dueSemaphore(b.due_date)} />
              <CountryCodeTag pais={paisesById[b.pais_id]} />
              <span className="min-w-0 flex-1 truncate text-sm">{b.name}</span>
              <AreaTag area={areasById[b.area_id]} className="hidden sm:inline-flex" />
              {urgentIds.has(b.id) && (
                <span
                  title="Tiene una actividad que vence hoy o ya está vencida"
                  className="shrink-0 text-status-overdue"
                >
                  <AlertIcon />
                </span>
              )}
              <span className="hidden w-9 shrink-0 text-right text-xs text-muted-foreground sm:block">
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
