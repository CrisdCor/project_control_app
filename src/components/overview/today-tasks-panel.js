"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DueDot } from "@/components/status/status-badge";
import { dueSemaphore, agendaSemaphore } from "@/lib/status";
import { DatePicker } from "@/components/ui/date-picker";
import { BitacoraDrawer } from "@/components/bitacoras/bitacora-drawer";
import { fetchMyBitacoraIds } from "@/lib/bitacoras";
import { CountryCodeTag } from "@/components/ui/country-tag";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { localTodayISO as todayISO } from "@/lib/dates";
import { RefreshIcon } from "@/components/icons";

export function TodayTasksPanel({ userId, selectedDate, onClearSelection, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [drawerBitacoraId, setDrawerBitacoraId] = useState(null);
  const [paisesById, setPaisesById] = useState({});

  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPaisId, setEditPaisId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const today = todayISO();
  // vista por defecto: hoy + vencidas. Si se eligió otro día en la tira semanal,
  // se muestra únicamente ese día.
  const isDefaultView = !selectedDate || selectedDate === today;

  async function load() {
    const supabase = createClient();
    // solo se muestra el estado "Cargando..." de pantalla completa la primera
    // vez; las recargas posteriores (botón Actualizar, cambios propios) se
    // hacen en silencio para no hacer parpadear el contenedor
    if (!hasLoadedOnce.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const myBitacoraIds = await fetchMyBitacoraIds(supabase, userId);

    let agendaQuery = supabase.from("agenda_items").select("*").eq("user_id", userId).eq("done", false);
    let bitacoraQuery = myBitacoraIds.length
      ? supabase.from("v_bitacora_status").select("*").in("id", myBitacoraIds).neq("status", "finalizado")
      : null;
    // actividades (lista de chequeo dentro de una bitácora) asignadas a mí — tienen
    // su propia fecha límite, que puede ser muy distinta a la de la bitácora que
    // las contiene, así que se consultan aparte
    let activityQuery = supabase
      .from("bitacora_activities")
      .select("*, bitacoras(name, pais_id)")
      .eq("assigned_to", userId)
      .eq("is_done", false);

    if (isDefaultView) {
      agendaQuery = agendaQuery.lte("due_date", today);
      bitacoraQuery = bitacoraQuery?.lte("due_date", today) ?? null;
      activityQuery = activityQuery.lte("due_date", today);
    } else {
      agendaQuery = agendaQuery.eq("due_date", selectedDate);
      bitacoraQuery = bitacoraQuery?.eq("due_date", selectedDate) ?? null;
      activityQuery = activityQuery.eq("due_date", selectedDate);
    }

    const [{ data: agendaRows }, bitacoraResult, { data: activityRows }, { data: paisesData }] = await Promise.all([
      agendaQuery,
      bitacoraQuery ?? Promise.resolve({ data: [] }),
      activityQuery,
      supabase.from("paises").select("*"),
    ]);
    const bitacoraRows = bitacoraResult.data;

    setPaisesById(Object.fromEntries((paisesData ?? []).map((p) => [p.id, p])));

    const agenda = (agendaRows ?? []).map((a) => ({
      kind: "agenda",
      id: a.id,
      title: a.text,
      due_date: a.due_date,
      pais_id: a.pais_id,
    }));
    const bitacoras = (bitacoraRows ?? []).map((b) => ({
      kind: "bitacora",
      id: b.id,
      title: b.name,
      due_date: b.due_date,
      pais_id: b.pais_id,
    }));
    const actividades = (activityRows ?? []).map((a) => ({
      kind: "actividad",
      id: a.id,
      title: a.detail,
      due_date: a.due_date,
      pais_id: a.bitacoras?.pais_id,
      bitacoraId: a.bitacora_id,
    }));

    const merged = [...agenda, ...bitacoras, ...actividades].sort(
      (a, b) => new Date(a.due_date) - new Date(b.due_date)
    );
    setItems(merged);
    setLoading(false);
    setRefreshing(false);
    hasLoadedOnce.current = true;
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedDate]);

  async function toggleAgendaDone(item) {
    setItems((prev) => prev.filter((i) => !(i.kind === "agenda" && i.id === item.id)));
    const supabase = createClient();
    await supabase
      .from("agenda_items")
      .update({ done: true, done_at: new Date().toISOString() })
      .eq("id", item.id);
    onChanged?.();
  }

  async function toggleActividadDone(item) {
    setItems((prev) => prev.filter((i) => !(i.kind === "actividad" && i.id === item.id)));
    const supabase = createClient();
    await supabase.from("bitacora_activities").update({ is_done: true }).eq("id", item.id);
    onChanged?.();
  }

  function startEditAgenda(item) {
    setEditingItem(item);
    setEditText(item.title);
    setEditDate(item.due_date);
    setEditPaisId(item.pais_id ?? "00000000-0000-0000-0000-000000000001");
  }

  async function saveEditAgenda(e) {
    e?.preventDefault();
    if (!editingItem || !editText.trim()) return;
    setSavingEdit(true);
    const supabase = createClient();
    await supabase
      .from("agenda_items")
      .update({ text: editText.trim(), due_date: editDate, pais_id: editPaisId })
      .eq("id", editingItem.id);
    setSavingEdit(false);
    setEditingItem(null);
    load();
    onChanged?.();
  }

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {isDefaultView
            ? "Tareas del día"
            : `Tareas · ${new Date(selectedDate + "T00:00:00").toLocaleDateString("es-CO", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}`}
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {!isDefaultView && (
            <button onClick={onClearSelection} className="text-xs text-accent transition hover:underline">
              Volver a hoy
            </button>
          )}
          <button
            onClick={() => {
              load();
              onChanged?.();
            }}
            disabled={refreshing}
            title="Actualizar"
            className="text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            <RefreshIcon className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isDefaultView ? "Sin tareas vencidas ni para hoy. Vas al día." : "Sin tareas programadas para este día."}
        </p>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col divide-y divide-border overflow-y-auto">
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2.5 py-2">
              <CountryCodeTag pais={paisesById[item.pais_id]} />

              <DueDot
                color={item.kind === "agenda" ? agendaSemaphore(item.due_date) : dueSemaphore(item.due_date)}
              />

              {item.kind === "agenda" ? (
                <>
                  <input
                    type="checkbox"
                    onChange={() => toggleAgendaDone(item)}
                    className="h-4 w-4 shrink-0 accent-black"
                  />
                  <button
                    onDoubleClick={() => startEditAgenda(item)}
                    title="Doble clic para editar"
                    className="min-w-0 flex-1 truncate text-left text-sm"
                  >
                    {item.title}
                  </button>
                </>
              ) : item.kind === "actividad" ? (
                <>
                  <input
                    type="checkbox"
                    onChange={() => toggleActividadDone(item)}
                    className="h-4 w-4 shrink-0 accent-black"
                  />
                  <button
                    onClick={() => setDrawerBitacoraId(item.bitacoraId)}
                    className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                  >
                    {item.title}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDrawerBitacoraId(item.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                >
                  {item.title}
                </button>
              )}

              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(item.due_date + "T00:00:00").toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>

              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {item.kind === "agenda" ? "Agenda" : item.kind === "actividad" ? "Actividad" : "Bitácora"}
              </span>
            </div>
          ))}
        </div>
      )}

      <BitacoraDrawer
        open={Boolean(drawerBitacoraId)}
        onClose={() => setDrawerBitacoraId(null)}
        bitacoraId={drawerBitacoraId}
        onSaved={() => {
          load();
          onChanged?.();
        }}
      />

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs animate-fade-in rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-lg"
          >
            <h3 className="mb-3 text-sm font-semibold">Editar tarea</h3>
            <form onSubmit={saveEditAgenda} className="flex flex-col gap-3">
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <DatePicker value={editDate} onChange={setEditDate} />
              <FilterDropdown
                allowClear={false}
                value={editPaisId}
                onChange={setEditPaisId}
                options={Object.values(paisesById).map((p) => ({
                  value: p.id,
                  label: p.code ? `${p.code} · ${p.name}` : p.name,
                }))}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingEdit || !editText.trim()}
                  className="flex-1 rounded-md bg-black py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 rounded-md border border-border py-1.5 text-xs transition hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
