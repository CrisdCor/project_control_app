"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DueDot } from "@/components/status/status-badge";
import { dueSemaphore, agendaSemaphore } from "@/lib/status";
import {
  fetchTodayReminders,
  dismissTaskReminder,
  dismissAgendaReminder,
  fetchPendingNoteMessages,
} from "@/lib/notifications";
import { ChatBubbleIcon } from "@/components/icons";

export function NotificationsPanel({ open, onClose, userId, leftOffset, onOpenTask }) {
  const [taskReminders, setTaskReminders] = useState([]);
  const [agendaReminders, setAgendaReminders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!userId) return;
    setLoading(true);
    const supabase = createClient();
    const [{ taskReminders: t, agendaReminders: a }, msgs] = await Promise.all([
      fetchTodayReminders(supabase, userId),
      fetchPendingNoteMessages(supabase, userId),
    ]);
    setTaskReminders(t);
    setAgendaReminders(a);
    setMessages(msgs);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  async function handleDismissTask(task) {
    setTaskReminders((prev) => prev.filter((t) => t.id !== task.id));
    const supabase = createClient();
    await dismissTaskReminder(supabase, task.id);
  }

  async function handleDismissAgenda(item) {
    setAgendaReminders((prev) => prev.filter((a) => a.id !== item.id));
    const supabase = createClient();
    await dismissAgendaReminder(supabase, item.id);
  }

  function handleOpenMessage(task) {
    onOpenTask(task.id);
    onClose();
  }

  if (!open) return null;

  const totalReminders = taskReminders.length + agendaReminders.length;

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade-in bg-black/20" onClick={onClose} />
      <div
        style={{ left: leftOffset }}
        className="fixed top-12 bottom-0 z-50 flex w-80 animate-slide-in-left flex-col border-r border-border bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Notificaciones</h2>
          <button onClick={onClose} className="text-muted-foreground transition hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <div className="flex flex-col gap-6">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recordatorios de hoy
                </h3>
                {totalReminders === 0 ? (
                  <p className="text-sm text-muted-foreground">Nada pendiente para hoy.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {taskReminders.map((task) => (
                      <button
                        key={`task-${task.id}`}
                        onClick={() => handleDismissTask(task)}
                        title="Clic para marcar como visto"
                        className="flex items-center gap-2 rounded-md border border-border p-2.5 text-left text-sm transition hover:bg-neutral-50"
                      >
                        <DueDot color={dueSemaphore(task.end_date)} />
                        <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      </button>
                    ))}
                    {agendaReminders.map((item) => (
                      <button
                        key={`agenda-${item.id}`}
                        onClick={() => handleDismissAgenda(item)}
                        title="Clic para marcar como visto"
                        className="flex items-center gap-2 rounded-md border border-border p-2.5 text-left text-sm transition hover:bg-neutral-50"
                      >
                        <DueDot color={agendaSemaphore(item.due_date)} />
                        <span className="min-w-0 flex-1 truncate">{item.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mensajes en tareas
                </h3>
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin mensajes nuevos.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {messages.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleOpenMessage(task)}
                        className="flex items-center gap-2 rounded-md border border-border p-2.5 text-left text-sm transition hover:bg-neutral-50"
                      >
                        <span className="shrink-0 text-status-attention">
                          <ChatBubbleIcon />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
