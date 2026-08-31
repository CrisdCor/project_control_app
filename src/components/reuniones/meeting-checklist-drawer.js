"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { GripIcon } from "@/components/icons";

// Vista del orden del día para cuando comienza la reunión: no permite agregar puntos
// nuevos (eso se define al crear la reunión), pero sí marcarlos como tratados y,
// si tienes permiso de edición, reordenarlos para agruparlos por tema.
export function MeetingChecklistDrawer({ open, onClose, items, canEdit, onChanged }) {
  const [dragIndex, setDragIndex] = useState(null);
  const sorted = [...items].sort((a, b) => a.position - b.position);

  async function toggleDone(item) {
    const supabase = createClient();
    await supabase.from("meeting_checklist_items").update({ is_done: !item.is_done }).eq("id", item.id);
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

  return (
    <Modal open={open} onClose={onClose} title="Orden del día">
      <div className="flex flex-col gap-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin puntos registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((item, i) => (
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
                  className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                />
                <span className={`min-w-0 flex-1 text-sm ${item.is_done ? "text-muted-foreground line-through" : ""}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}
        {canEdit && sorted.length > 1 && (
          <p className="text-xs text-muted-foreground">Arrastra los puntos para reordenarlos o agruparlos por tema.</p>
        )}
      </div>
    </Modal>
  );
}
