"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { DatePicker } from "@/components/ui/date-picker";
import { DueDot } from "@/components/status/status-badge";
import { dueSemaphore, agendaSemaphore } from "@/lib/status";
import { ChevronLeftIcon, ChevronRightIcon, CheckSquareIcon, NotebookIcon } from "@/components/icons";

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShort(date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export function WeekView({ userId }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerTaskId, setDrawerTaskId] = useState(null);
  const [editingAgenda, setEditingAgenda] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const weekStart = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getMonday(base);
  }, [weekOffset]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const weekStartISO = toISO(weekStart);
  const weekEndISO = toISO(weekDays[6]);
  const todayISO = toISO(new Date());

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const { data: assignedRows } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", userId);
    const taskIds = (assignedRows ?? []).map((r) => r.task_id);

    let taskRows = [];
    if (taskIds.length) {
      const { data } = await supabase
        .from("v_task_status")
        .select("*")
        .in("id", taskIds)
        .lte("end_date", weekEndISO);
      taskRows = data ?? [];
    }
    setTasks(taskRows);

    const { data: agendaRows } = await supabase
      .from("agenda_items")
      .select("*")
      .eq("user_id", userId)
      .lte("due_date", weekEndISO);
    setAgendaItems(agendaRows ?? []);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, weekStartISO, weekEndISO]);

  const { taskBacklog, taskByDay } = useMemo(() => {
    const backlog = [];
    const byDay = {};
    for (const t of tasks) {
      if (t.status === "cancelada") continue;
      if (t.end_date < weekStartISO) {
        if (t.status !== "finalizada") backlog.push(t);
      } else if (t.end_date <= weekEndISO) {
        (byDay[t.end_date] ??= []).push(t);
      }
    }
    backlog.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    return { taskBacklog: backlog, taskByDay: byDay };
  }, [tasks, weekStartISO, weekEndISO]);

  const { agendaBacklog, agendaByDay } = useMemo(() => {
    const backlog = [];
    const byDay = {};
    for (const a of agendaItems) {
      if (a.due_date < weekStartISO) {
        if (!a.done) backlog.push(a);
      } else if (a.due_date <= weekEndISO) {
        (byDay[a.due_date] ??= []).push(a);
      }
    }
    backlog.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    return { agendaBacklog: backlog, agendaByDay: byDay };
  }, [agendaItems, weekStartISO, weekEndISO]);

  function startEditAgenda(item) {
    setEditingAgenda(item);
    setEditText(item.text);
    setEditDate(item.due_date);
  }

  async function saveEditAgenda(e) {
    e?.preventDefault();
    if (!editingAgenda || !editText.trim()) return;
    setSavingEdit(true);
    const supabase = createClient();
    await supabase
      .from("agenda_items")
      .update({ text: editText.trim(), due_date: editDate })
      .eq("id", editingAgenda.id);
    setSavingEdit(false);
    setEditingAgenda(null);
    load();
  }

  function TaskCard({ task }) {
    const done = task.status === "finalizada";
    return (
      <button
        onClick={() => setDrawerTaskId(task.id)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-white p-2 text-left text-xs shadow-sm transition hover:border-foreground"
      >
        <CheckSquareIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
        <DueDot color={dueSemaphore(task.end_date, { done })} />
        <span className={`block flex-1 truncate ${done ? "text-muted-foreground line-through" : ""}`}>
          {task.title}
        </span>
      </button>
    );
  }

  function AgendaCard({ item }) {
    return (
      <button
        onClick={() => startEditAgenda(item)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-white p-2 text-left text-xs shadow-sm transition hover:border-foreground"
      >
        <NotebookIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
        <DueDot color={agendaSemaphore(item.due_date)} />
        <span className={`block flex-1 truncate ${item.done ? "text-muted-foreground line-through" : ""}`}>
          {item.text}
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold">
          Semana del {formatShort(weekDays[0])} al {formatShort(weekDays[6])}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((v) => v - 1)}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-neutral-50"
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-neutral-50"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekOffset((v) => v + 1)}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-neutral-50"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-8 gap-2">
          <div className="flex min-h-0 flex-col rounded-md border border-status-overdue/30 bg-red-50/30">
            <div className="shrink-0 border-b border-status-overdue/30 px-2 py-2 text-center">
              <p className="text-xs font-semibold text-status-overdue">Atrasadas</p>
              <p className="text-[10px] text-muted-foreground">Periodos anteriores</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-1.5">
              <div className="flex flex-col gap-1.5">
                {taskBacklog.map((t) => (
                  <TaskCard key={`t-${t.id}`} task={t} />
                ))}
                {agendaBacklog.map((a) => (
                  <AgendaCard key={`a-${a.id}`} item={a} />
                ))}
                {taskBacklog.length === 0 && agendaBacklog.length === 0 && (
                  <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">Sin pendientes</p>
                )}
              </div>
            </div>
          </div>

          {weekDays.map((day, i) => {
            const iso = toISO(day);
            const isToday = iso === todayISO;
            const dayTasks = taskByDay[iso] ?? [];
            const dayAgenda = agendaByDay[iso] ?? [];
            return (
              <div
                key={iso}
                className={`flex min-h-0 flex-col rounded-md border ${
                  isToday ? "border-foreground" : "border-border"
                }`}
              >
                <div
                  className={`shrink-0 border-b px-2 py-2 text-center ${
                    isToday ? "border-foreground bg-neutral-100" : "border-border"
                  }`}
                >
                  <p className="text-xs font-semibold">{DAY_NAMES[i]}</p>
                  <p className="text-[10px] text-muted-foreground">{formatShort(day)}</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-1.5">
                  <div className="flex flex-col gap-1.5">
                    {dayTasks.map((t) => (
                      <TaskCard key={`t-${t.id}`} task={t} />
                    ))}
                    {dayAgenda.map((a) => (
                      <AgendaCard key={`a-${a.id}`} item={a} />
                    ))}
                    {dayTasks.length === 0 && dayAgenda.length === 0 && (
                      <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDrawer open={Boolean(drawerTaskId)} onClose={() => setDrawerTaskId(null)} taskId={drawerTaskId} onSaved={load} />

      {editingAgenda && (
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
                  onClick={() => setEditingAgenda(null)}
                  className="flex-1 rounded-md border border-border py-1.5 text-xs transition hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
