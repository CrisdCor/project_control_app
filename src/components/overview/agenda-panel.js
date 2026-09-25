"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pagination } from "@/components/ui/pagination";
import { DatePicker } from "@/components/ui/date-picker";
import { agendaSemaphore } from "@/lib/status";
import { PlusIcon, TrashIcon, CalendarIcon } from "@/components/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { CountryCodeTag } from "@/components/ui/country-tag";
import { localTodayISO as todayISO } from "@/lib/dates";

const PAGE_SIZE = 6;
const GENERAL_PAIS_ID = "00000000-0000-0000-0000-000000000001";

export function AgendaPanel({ userId, refreshSignal, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const [paises, setPaises] = useState([]);
  const [paisesById, setPaisesById] = useState({});
  const [page, setPage] = useState(1);

  // se reutiliza el mismo modal para crear y editar: editingItem.id === null
  // significa que se está creando una tarea nueva
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPaisId, setEditPaisId] = useState(GENERAL_PAIS_ID);
  const [savingEdit, setSavingEdit] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  function flashError(msg) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  }

  async function load() {
    const supabase = createClient();
    // solo bloquea con "Cargando..." la primera vez; recargas posteriores
    // (propias o de otro panel) se aplican en silencio para no parpadear
    if (!hasLoadedOnce.current) setLoading(true);

    // depuración real: las tareas ya finalizadas hace más de 2 días se eliminan
    // físicamente (no solo se ocultan), para no acumular filas indefinidamente
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    await supabase
      .from("agenda_items")
      .delete()
      .eq("user_id", userId)
      .eq("done", true)
      .lt("done_at", twoDaysAgo);

    const { data } = await supabase.from("agenda_items").select("*").eq("user_id", userId);
    setItems(data ?? []);

    if (!paises.length) {
      const { data: paisesData } = await supabase.from("paises").select("*").order("name");
      setPaises(paisesData ?? []);
      setPaisesById(Object.fromEntries((paisesData ?? []).map((p) => [p.id, p])));
    }

    setLoading(false);
    hasLoadedOnce.current = true;
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshSignal]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditingItem({ id: null });
    setEditText("");
    setEditDate(todayISO());
    setEditPaisId(GENERAL_PAIS_ID);
  }

  function startEdit(item) {
    setEditingItem(item);
    setEditText(item.text);
    setEditDate(item.due_date);
    setEditPaisId(item.pais_id ?? GENERAL_PAIS_ID);
  }

  async function toggleDone(item) {
    const done = !item.done;
    const done_at = done ? new Date().toISOString() : null;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done, done_at } : i)));
    const supabase = createClient();
    const { data, error } = await supabase
      .from("agenda_items")
      .update({ done, done_at })
      .eq("id", item.id)
      .select();
    if (error || !data?.length) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      flashError("No se pudo actualizar la tarea. Intenta de nuevo.");
      return;
    }
    onChanged?.();
  }

  async function saveEdit(e) {
    e?.preventDefault();
    if (!editingItem || !editText.trim()) return;
    setSavingEdit(true);
    const supabase = createClient();
    const text = editText.trim();
    const due_date = editDate;
    const pais_id = editPaisId;

    if (!editingItem.id) {
      const { data: created, error } = await supabase
        .from("agenda_items")
        .insert({ user_id: userId, text, due_date, pais_id })
        .select()
        .single();
      setSavingEdit(false);
      if (error) {
        flashError("No se pudo agregar la tarea. Intenta de nuevo.");
        return;
      }
      if (created) setItems((prev) => [...prev, created]);
      setEditingItem(null);
      onChanged?.();
      return;
    }

    const previous = editingItem;
    setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, text, due_date, pais_id } : i)));
    const { data, error } = await supabase
      .from("agenda_items")
      .update({ text, due_date, pais_id })
      .eq("id", editingItem.id)
      .select();
    setSavingEdit(false);
    setEditingItem(null);
    if (error || !data?.length) {
      setItems((prev) => prev.map((i) => (i.id === previous.id ? previous : i)));
      flashError("No se pudo guardar el cambio. Intenta de nuevo.");
      return;
    }
    onChanged?.();
  }

  async function handleDelete(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const supabase = createClient();
    const { data, error } = await supabase.from("agenda_items").delete().eq("id", item.id).select();
    if (error || !data?.length) {
      setItems((prev) => [...prev, item]);
      flashError("No se pudo eliminar la tarea. Intenta de nuevo.");
      return;
    }
    onChanged?.();
  }

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold">Mi agenda</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800"
        >
          <PlusIcon />
          Agregar
        </button>
      </div>

      {errorMsg && <p className="mb-2 shrink-0 text-xs text-status-overdue">{errorMsg}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin tareas en tu agenda.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col divide-y divide-border">
            {pageItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleDone(item)}
                  className="h-4 w-4 shrink-0 accent-black"
                />

                <button
                  onDoubleClick={() => startEdit(item)}
                  className={`flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm ${
                    item.done ? "text-muted-foreground line-through" : ""
                  }`}
                  title="Doble clic para editar"
                >
                  {item.source_meeting_id && (
                    <span title="Proviene de una reunión" className="shrink-0 text-accent">
                      <CalendarIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <CountryCodeTag pais={paisesById[item.pais_id]} />
                  <Tooltip
                    className="min-w-0 flex-1"
                    content={
                      <>
                        <p className="font-medium">{item.text}</p>
                        <p className="text-muted-foreground">
                          {new Date(item.due_date + "T00:00:00").toLocaleDateString("es-CO", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </>
                    }
                  >
                    <span className="block truncate">{item.text}</span>
                  </Tooltip>
                </button>

                <span className="shrink-0 text-xs font-medium" style={{ color: agendaSemaphore(item.due_date) }}>
                  {new Date(item.due_date + "T00:00:00").toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>

                <button
                  onClick={() => handleDelete(item)}
                  className="shrink-0 text-muted-foreground transition hover:text-status-overdue"
                  title="Eliminar"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs animate-fade-in rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-lg"
          >
            <h3 className="mb-3 text-sm font-semibold">{editingItem.id ? "Editar tarea" : "Nueva tarea"}</h3>
            <form onSubmit={saveEdit} className="flex flex-col gap-3">
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Descripción de la tarea..."
                className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <DatePicker value={editDate} onChange={setEditDate} />
              <FilterDropdown
                allowClear={false}
                value={editPaisId}
                onChange={setEditPaisId}
                options={paises.map((p) => ({
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
                  {editingItem.id ? "Guardar" : "Crear"}
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
