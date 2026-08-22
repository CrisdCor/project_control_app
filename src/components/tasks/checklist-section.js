"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChecklistSection({ taskId, items, profiles, canPost, currentUserId, isAdmin, onChanged }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const profileName = (id) => profiles.find((p) => p.id === id)?.name ?? "—";

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("task_checklist").insert({
      task_id: taskId,
      created_by: currentUserId,
      note: message.trim(),
    });
    setMessage("");
    setSending(false);
    onChanged();
  }

  async function handleDelete(item) {
    const supabase = createClient();
    await supabase.from("task_checklist").delete().eq("id", item.id);
    onChanged();
  }

  const sorted = [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay notas en esta tarea.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((item) => {
            const canDelete = isAdmin || item.created_by === currentUserId;
            const isMine = item.created_by === currentUserId;
            return (
              <div
                key={item.id}
                className={`max-w-[88%] rounded-lg border border-border p-3 ${
                  isMine ? "self-end bg-neutral-50" : "self-start bg-white"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium">{profileName(item.created_by)}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("es-CO", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{item.note}</p>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="mt-1.5 text-[11px] text-muted-foreground transition hover:text-status-overdue"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canPost && (
        <form onSubmit={handleSend} className="flex flex-col gap-2 border-t border-border pt-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe una nota para el responsable o el líder..."
            rows={2}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="self-end rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  );
}
