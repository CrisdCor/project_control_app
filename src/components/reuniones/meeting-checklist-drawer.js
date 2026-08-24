"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";

export function MeetingChecklistDrawer({ open, onClose, meetingId, items, canEdit, currentUserId, onChanged }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setAdding(true);
    const supabase = createClient();
    await supabase
      .from("meeting_checklist_items")
      .insert({ meeting_id: meetingId, text: text.trim(), created_by: currentUserId });
    setText("");
    setAdding(false);
    onChanged();
  }

  async function toggleDone(item) {
    const supabase = createClient();
    await supabase.from("meeting_checklist_items").update({ is_done: !item.is_done }).eq("id", item.id);
    onChanged();
  }

  async function handleDelete(item) {
    const supabase = createClient();
    await supabase.from("meeting_checklist_items").delete().eq("id", item.id);
    onChanged();
  }

  return (
    <Modal open={open} onClose={onClose} title="Orden del día">
      <div className="flex flex-col gap-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin puntos registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 rounded-md border border-border p-2.5">
                <input
                  type="checkbox"
                  checked={item.is_done}
                  onChange={() => canEdit && toggleDone(item)}
                  disabled={!canEdit}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                />
                <span className={`min-w-0 flex-1 text-sm ${item.is_done ? "text-muted-foreground line-through" : ""}`}>
                  {item.text}
                </span>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="shrink-0 text-xs text-muted-foreground transition hover:text-status-overdue"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <form onSubmit={handleAdd} className="flex gap-2 border-t border-border pt-4">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nuevo punto..."
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={adding || !text.trim()}
              className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              Agregar
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
