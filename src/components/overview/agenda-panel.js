"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pagination } from "@/components/ui/pagination";
import { DatePicker } from "@/components/ui/date-picker";
import { agendaSemaphore } from "@/lib/status";
import { PlusIcon, TrashIcon, CalendarIcon } from "@/components/icons";
import { Tooltip } from "@/components/ui/tooltip";

const PAGE_SIZE = 15;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AgendaPanel({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState(todayISO());
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    // depuración real: las tareas ya finalizadas hace más de 2 días se eliminan
    // físicamente (no solo se ocultan), para no acumular filas indefinidamente
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    await supabase
      .from("agenda_items")
      .delete()
      .eq("user_id", userId)
      .eq("done", true)
      .lt("done_at", twoDaysAgo);

    const { data } = await supabase.from("agenda_items").select("*");
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    const supabase = createClient();
    const { data: created } = await supabase
      .from("agenda_items")
      .insert({ user_id: userId, text: newText.trim(), due_date: newDate })
      .select()
      .single();
    if (created) setItems((prev) => [...prev, created]);
    setNewText("");
    setNewDate(todayISO());
  }

  async function toggleDone(item) {
    const done = !item.done;
    const done_at = done ? new Date().toISOString() : null;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done, done_at } : i)));
    const supabase = createClient();
    await supabase.from("agenda_items").update({ done, done_at }).eq("id", item.id);
  }

  function startEdit(item) {
    setEditingItem(item);
    setEditText(item.text);
    setEditDate(item.due_date);
  }

  async function saveEdit(e) {
    e?.preventDefault();
    if (!editingItem || !editText.trim()) return;
    setSavingEdit(true);
    const text = editText.trim();
    const due_date = editDate;
    setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, text, due_date } : i)));
    const supabase = createClient();
    await supabase.from("agenda_items").update({ text, due_date }).eq("id", editingItem.id);
    setSavingEdit(false);
    setEditingItem(null);
  }

  async function handleDelete(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const supabase = createClient();
    await supabase.from("agenda_items").delete().eq("id", item.id);
  }

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 shrink-0 text-sm font-semibold">Mi agenda</h2>

      <form onSubmit={handleAdd} className="mb-3 flex shrink-0 flex-col gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Nueva tarea..."
          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePicker value={newDate} onChange={setNewDate} />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            <PlusIcon />
            Agregar
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin tareas en tu agenda.</p>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col divide-y divide-border overflow-y-auto overflow-x-hidden">
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

              <span
                className="shrink-0 text-xs font-medium"
                style={{ color: agendaSemaphore(item.due_date) }}
              >
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
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs animate-fade-in rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-lg"
          >
            <h3 className="mb-3 text-sm font-semibold">Editar tarea</h3>
            <form onSubmit={saveEdit} className="flex flex-col gap-3">
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <DatePicker value={editDate} onChange={setEditDate} />
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
