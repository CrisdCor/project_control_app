"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pagination } from "@/components/ui/pagination";
import { DatePicker } from "@/components/ui/date-picker";
import { agendaSemaphore } from "@/lib/status";
import { PlusIcon, TrashIcon, CalendarIcon } from "@/components/icons";

const PAGE_SIZE = 10;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AgendaPanel({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState(todayISO());
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");

  async function load() {
    const supabase = createClient();
    setLoading(true);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const { data } = await supabase
      .from("agenda_items")
      .select("*")
      .or(`done.eq.false,done_at.gt.${twoDaysAgo}`);
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
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
    await supabase
      .from("agenda_items")
      .insert({ user_id: userId, text: newText.trim(), due_date: newDate });
    setNewText("");
    setNewDate(todayISO());
    load();
  }

  async function toggleDone(item) {
    const supabase = createClient();
    await supabase
      .from("agenda_items")
      .update({ done: !item.done, done_at: !item.done ? new Date().toISOString() : null })
      .eq("id", item.id);
    load();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditText(item.text);
    setEditDate(item.due_date);
  }

  async function saveEdit(overrides = {}) {
    if (!editingId) return;
    const supabase = createClient();
    await supabase
      .from("agenda_items")
      .update({
        text: (overrides.text ?? editText).trim(),
        due_date: overrides.due_date ?? editDate,
      })
      .eq("id", editingId);
    setEditingId(null);
    load();
  }

  async function handleDelete(item) {
    const supabase = createClient();
    await supabase.from("agenda_items").delete().eq("id", item.id);
    load();
  }

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">Mi agenda</h2>

      <form onSubmit={handleAdd} className="mb-3 flex flex-col gap-2">
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
        <div className="flex flex-1 flex-col divide-y divide-border overflow-y-auto">
          {pageItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleDone(item)}
                className="h-4 w-4 shrink-0 accent-black"
              />

              {editingId === item.id ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    onBlur={() => saveEdit()}
                    className="min-w-0 flex-1 rounded border border-border px-1.5 py-0.5 text-sm outline-none"
                  />
                  <DatePicker
                    value={editDate}
                    onChange={(v) => {
                      setEditDate(v);
                      saveEdit({ due_date: v });
                    }}
                  />
                </div>
              ) : (
                <button
                  onDoubleClick={() => startEdit(item)}
                  className={`flex min-w-0 flex-1 items-center gap-1.5 truncate text-left text-sm ${
                    item.done ? "text-muted-foreground line-through" : ""
                  }`}
                  title="Doble clic para editar"
                >
                  {item.source_meeting_id && (
                    <span title="Proviene de una reunión" className="shrink-0 text-accent">
                      <CalendarIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate">{item.text}</span>
                </button>
              )}

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
    </section>
  );
}
