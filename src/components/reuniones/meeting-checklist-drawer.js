"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { GripIcon, PencilIcon, TrashIcon, PlusIcon } from "@/components/icons";

// Vista del orden del día para cuando comienza la reunión. Cualquiera con acceso a la
// reunión puede verla; crear, editar, reordenar o marcar puntos es exclusivo del
// Administrador o del moderador de la reunión (canEdit).
export function MeetingChecklistDrawer({ open, onClose, meetingId, items, canEdit, currentUserId, onChanged }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const sorted = [...items].sort((a, b) => a.position - b.position);
  const pending = sorted.filter((i) => !i.is_done);
  const done = sorted.filter((i) => i.is_done);

  async function toggleDone(item) {
    if (!canEdit) return;
    const supabase = createClient();
    await supabase.from("meeting_checklist_items").update({ is_done: !item.is_done }).eq("id", item.id);
    onChanged();
  }

  function startEdit(item) {
    if (!canEdit) return;
    setEditingId(item.id);
    setEditText(item.text);
  }

  async function saveEdit() {
    if (!editingId || !editText.trim()) {
      setEditingId(null);
      return;
    }
    const supabase = createClient();
    await supabase.from("meeting_checklist_items").update({ text: editText.trim() }).eq("id", editingId);
    setEditingId(null);
    onChanged();
  }

  async function handleDeleteItem(item) {
    const supabase = createClient();
    await supabase.from("meeting_checklist_items").delete().eq("id", item.id);
    onChanged();
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    setAdding(true);
    const supabase = createClient();
    const nextPosition = sorted.length ? Math.max(...sorted.map((i) => i.position)) + 1 : 0;
    await supabase.from("meeting_checklist_items").insert({
      meeting_id: meetingId,
      text: newText.trim(),
      position: nextPosition,
      created_by: currentUserId,
    });
    setNewText("");
    setAdding(false);
    onChanged();
  }

  async function handleDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);

    const supabase = createClient();
    await Promise.all(
      reordered.map((item, position) =>
        item.position === position
          ? null
          : supabase.from("meeting_checklist_items").update({ position }).eq("id", item.id)
      )
    );
    onChanged();
  }

  function renderItem(item, i) {
    return (
      <div
        key={item.id}
        draggable={canEdit}
        onDragStart={() => setDragIndex(i)}
        onDragOver={(e) => canEdit && e.preventDefault()}
        onDrop={() => handleDrop(i)}
        className={`flex items-start gap-2.5 rounded-md border border-border p-2.5 ${
          canEdit ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {canEdit && <GripIcon className="mt-1 shrink-0 text-muted-foreground" />}
        <input
          type="checkbox"
          checked={item.is_done}
          onChange={() => toggleDone(item)}
          disabled={!canEdit}
          className="mt-0.5 h-4 w-4 shrink-0 accent-black"
        />
        {editingId === item.id ? (
          <input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            className="min-w-0 flex-1 rounded border border-border px-1.5 py-0.5 text-sm outline-none"
          />
        ) : (
          <span
            onClick={() => startEdit(item)}
            className={`min-w-0 flex-1 text-sm ${item.is_done ? "text-muted-foreground line-through" : ""} ${
              canEdit ? "cursor-text" : ""
            }`}
          >
            {item.text}
          </span>
        )}
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => startEdit(item)}
              className="text-muted-foreground transition hover:text-foreground"
              title="Editar"
            >
              <PencilIcon />
            </button>
            <button
              onClick={() => handleDeleteItem(item)}
              className="text-muted-foreground transition hover:text-status-overdue"
              title="Eliminar"
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Orden del día">
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Compromisos pendientes por revisar
          </h3>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin puntos pendientes.</p>
          ) : (
            <div className="flex flex-col gap-2">{pending.map((item, i) => renderItem(item, i))}</div>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tratados</h3>
            <div className="flex flex-col gap-2">
              {done.map((item, i) => renderItem(item, pending.length + i))}
            </div>
          </section>
        )}

        {canEdit && (
          <section className="border-t border-border pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Agregar nuevo punto
            </h3>
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Nuevo punto del orden del día..."
                className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <button
                type="submit"
                disabled={adding || !newText.trim()}
                className="flex items-center gap-1 rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                <PlusIcon />
                Agregar
              </button>
            </form>
            {sorted.length > 1 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Arrastra los puntos para reordenarlos, o haz clic en el texto para editarlo.
              </p>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
