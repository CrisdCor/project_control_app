"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChecklistSection({ taskId, items, profiles, canCreate, currentUserId, isAdmin, onChanged }) {
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [adding, setAdding] = useState(false);
  const [responseDrafts, setResponseDrafts] = useState({});

  const profileName = (id) => profiles.find((p) => p.id === id)?.name ?? "—";

  async function handleAdd(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("task_checklist").insert({
      task_id: taskId,
      created_by: currentUserId,
      assigned_to: assignedTo || null,
      note: note.trim(),
    });
    setNote("");
    setAssignedTo("");
    setAdding(false);
    onChanged();
  }

  async function toggleDone(item) {
    const supabase = createClient();
    await supabase.from("task_checklist").update({ is_done: !item.is_done }).eq("id", item.id);
    onChanged();
  }

  async function saveResponse(item) {
    const draft = responseDrafts[item.id];
    if (draft === undefined) return;
    const supabase = createClient();
    await supabase.from("task_checklist").update({ response: draft }).eq("id", item.id);
    onChanged();
  }

  async function handleDelete(item) {
    const supabase = createClient();
    await supabase.from("task_checklist").delete().eq("id", item.id);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin observaciones todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const canDelete = isAdmin || item.created_by === currentUserId;
            return (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="text-sm">{item.note}</p>
                  <input
                    type="checkbox"
                    checked={item.is_done}
                    onChange={() => toggleDone(item)}
                    className="mt-0.5 shrink-0 accent-black"
                    title="Marcar como ejecutada"
                  />
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {profileName(item.created_by)}
                  {item.assigned_to ? ` → ${profileName(item.assigned_to)}` : ""}
                </p>
                <div className="flex gap-1.5">
                  <input
                    value={responseDrafts[item.id] ?? item.response ?? ""}
                    onChange={(e) =>
                      setResponseDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Respuesta..."
                    className="flex-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-foreground"
                  />
                  <button
                    onClick={() => saveResponse(item)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs transition hover:bg-neutral-50"
                  >
                    Guardar
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-md border border-status-overdue/40 px-2.5 py-1.5 text-xs text-status-overdue transition hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canCreate && (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-border pt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nueva observación o asignación..."
            rows={2}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <div className="flex gap-2">
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="flex-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs outline-none"
            >
              <option value="">Dirigida a (opcional)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              Agregar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
