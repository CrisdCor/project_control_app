"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMyBitacoraIds } from "@/lib/bitacoras";
import { flagEmoji } from "@/lib/paises";
import { DatePicker } from "@/components/ui/date-picker";
import { BitacoraDrawer } from "@/components/bitacoras/bitacora-drawer";
import { ChevronLeftIcon, ChevronRightIcon, NotebookIcon, FolderIcon } from "@/components/icons";

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekDates(weekOffset) {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function WeekTasksStrip({ userId }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [animDirection, setAnimDirection] = useState("right");
  const [tasksByDate, setTasksByDate] = useState({});
  const [paisesById, setPaisesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [drawerBitacoraId, setDrawerBitacoraId] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");

  const days = useMemo(() => weekDates(weekOffset), [weekOffset]);

  async function load() {
    const supabase = createClient();
    setLoading(true);
    const startISO = toISO(days[0]);
    const endISO = toISO(days[6]);

    const myBitacoraIds = await fetchMyBitacoraIds(supabase, userId);

    const [{ data: agendaRows }, { data: bitacoraRows }, { data: paisesData }] = await Promise.all([
      supabase
        .from("agenda_items")
        .select("*")
        .eq("user_id", userId)
        .eq("done", false)
        .gte("due_date", startISO)
        .lte("due_date", endISO),
      myBitacoraIds.length
        ? supabase
            .from("v_bitacora_status")
            .select("*")
            .in("id", myBitacoraIds)
            .neq("status", "finalizado")
            .gte("due_date", startISO)
            .lte("due_date", endISO)
        : Promise.resolve({ data: [] }),
      supabase.from("paises").select("*"),
    ]);

    setPaisesById(Object.fromEntries((paisesData ?? []).map((p) => [p.id, p])));

    const byDate = {};
    days.forEach((d) => {
      byDate[toISO(d)] = [];
    });
    (agendaRows ?? []).forEach((a) => {
      byDate[a.due_date]?.push({ kind: "agenda", id: a.id, title: a.text, pais_id: a.pais_id });
    });
    (bitacoraRows ?? []).forEach((b) => {
      byDate[b.due_date]?.push({ kind: "bitacora", id: b.id, title: b.name, pais_id: b.pais_id });
    });
    setTasksByDate(byDate);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, userId]);

  function goPrev() {
    setAnimDirection("left");
    setAnimKey((k) => k + 1);
    setWeekOffset((w) => w - 1);
  }
  function goNext() {
    setAnimDirection("right");
    setAnimKey((k) => k + 1);
    setWeekOffset((w) => w + 1);
  }
  function goToday() {
    setAnimDirection(weekOffset > 0 ? "left" : "right");
    setAnimKey((k) => k + 1);
    setWeekOffset(0);
    setSelectedDate(todayISO());
  }

  async function toggleAgendaDone(item) {
    setTasksByDate((prev) => ({
      ...prev,
      [selectedDate]: prev[selectedDate]?.filter((i) => !(i.kind === "agenda" && i.id === item.id)) ?? [],
    }));
    const supabase = createClient();
    await supabase.from("agenda_items").update({ done: true, done_at: new Date().toISOString() }).eq("id", item.id);
  }

  function startEditAgenda(item) {
    setEditingItem(item);
    setEditText(item.title);
    setEditDate(selectedDate);
  }

  async function saveEditAgenda(e) {
    e?.preventDefault();
    if (!editingItem || !editText.trim()) return;
    const supabase = createClient();
    await supabase.from("agenda_items").update({ text: editText.trim(), due_date: editDate }).eq("id", editingItem.id);
    setEditingItem(null);
    load();
  }

  const today = todayISO();
  const monthLabel = days[0].toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const selectedItems = tasksByDate[selectedDate] ?? [];

  return (
    <section className="flex shrink-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold capitalize">{monthLabel}</h2>
        {weekOffset !== 0 && (
          <button onClick={goToday} className="text-xs text-accent transition hover:underline">
            Volver a hoy
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={goPrev}
          className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-neutral-50 hover:text-foreground"
          aria-label="Semana anterior"
        >
          <ChevronLeftIcon />
        </button>

        <div
          key={animKey}
          className={`grid flex-1 grid-cols-7 gap-1.5 ${
            animDirection === "right" ? "animate-slide-in-right" : "animate-slide-in-left"
          }`}
        >
          {days.map((d, i) => {
            const iso = toISO(d);
            const isToday = iso === today;
            const isSelected = iso === selectedDate;
            const count = tasksByDate[iso]?.length ?? 0;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`flex flex-col items-center gap-0.5 rounded-md border py-2.5 transition ${
                  isToday
                    ? "border-foreground bg-foreground text-white"
                    : isSelected
                      ? "border-foreground bg-neutral-50"
                      : "border-border bg-white hover:bg-neutral-50"
                }`}
              >
                <span className="text-sm font-semibold">{DAY_LETTERS[i]}</span>
                <span className={`text-[11px] ${isToday ? "text-white/80" : "text-muted-foreground"}`}>
                  {d.getDate()}
                </span>
                <span
                  className={`mt-1 min-w-[18px] rounded-full px-1 text-center text-[10px] font-medium ${
                    count === 0 ? "invisible" : isToday ? "bg-white text-foreground" : "bg-neutral-900 text-white"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={goNext}
          className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-neutral-50 hover:text-foreground"
          aria-label="Semana siguiente"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin tareas programadas para este día.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {selectedItems.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2.5 py-2">
                <span
                  title={item.kind === "agenda" ? "Tarea de agenda" : "Bitácora"}
                  className="shrink-0 text-muted-foreground"
                >
                  {item.kind === "agenda" ? (
                    <NotebookIcon className="h-3.5 w-3.5" />
                  ) : (
                    <FolderIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                {paisesById[item.pais_id]?.code && (
                  <span title={paisesById[item.pais_id].name} className="shrink-0">
                    {flagEmoji(paisesById[item.pais_id].code)}
                  </span>
                )}
                {item.kind === "agenda" ? (
                  <>
                    <input
                      type="checkbox"
                      onChange={() => toggleAgendaDone(item)}
                      className="h-4 w-4 shrink-0 accent-black"
                    />
                    <button
                      onDoubleClick={() => startEditAgenda(item)}
                      title="Doble clic para editar"
                      className="min-w-0 flex-1 truncate text-left text-sm"
                    >
                      {item.title}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDrawerBitacoraId(item.id)}
                    className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                  >
                    {item.title}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BitacoraDrawer
        open={Boolean(drawerBitacoraId)}
        onClose={() => setDrawerBitacoraId(null)}
        bitacoraId={drawerBitacoraId}
        onSaved={load}
      />

      {editingItem && (
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
                  disabled={!editText.trim()}
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
