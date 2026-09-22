"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMyBitacoraIds } from "@/lib/bitacoras";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { localTodayISO as todayISO } from "@/lib/dates";

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

// Tira semanal compacta: solo selecciona el día y muestra un conteo. El detalle
// de tareas de ese día se muestra en el panel "Tareas del día" (evita que esta
// tira empuje al resto de contenedores hacia abajo al desplegar una lista).
export function WeekTasksStrip({ userId, selectedDate, onSelectDate, refreshSignal }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [animDirection, setAnimDirection] = useState("right");
  const [countsByDate, setCountsByDate] = useState({});

  const days = useMemo(() => weekDates(weekOffset), [weekOffset]);

  async function load() {
    const supabase = createClient();
    const startISO = toISO(days[0]);
    const endISO = toISO(days[6]);

    const myBitacoraIds = await fetchMyBitacoraIds(supabase, userId);

    const [{ data: agendaRows }, { data: bitacoraRows }] = await Promise.all([
      supabase
        .from("agenda_items")
        .select("due_date")
        .eq("user_id", userId)
        .eq("done", false)
        .gte("due_date", startISO)
        .lte("due_date", endISO),
      myBitacoraIds.length
        ? supabase
            .from("v_bitacora_status")
            .select("due_date")
            .in("id", myBitacoraIds)
            .neq("status", "finalizado")
            .gte("due_date", startISO)
            .lte("due_date", endISO)
        : Promise.resolve({ data: [] }),
    ]);

    const counts = {};
    days.forEach((d) => {
      counts[toISO(d)] = 0;
    });
    (agendaRows ?? []).forEach((a) => {
      if (counts[a.due_date] !== undefined) counts[a.due_date] += 1;
    });
    (bitacoraRows ?? []).forEach((b) => {
      if (counts[b.due_date] !== undefined) counts[b.due_date] += 1;
    });
    setCountsByDate(counts);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, userId, refreshSignal]);

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
    onSelectDate(todayISO());
  }

  const today = todayISO();
  const monthLabel = days[0].toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  return (
    <section className="flex shrink-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold capitalize text-muted-foreground">{monthLabel}</h2>
        {weekOffset !== 0 && (
          <button onClick={goToday} className="text-xs text-accent transition hover:underline">
            Volver a hoy
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={goPrev}
          className="shrink-0 rounded-md border border-border p-1 text-muted-foreground transition hover:bg-neutral-50 hover:text-foreground"
          aria-label="Semana anterior"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>

        <div
          key={animKey}
          className={`grid flex-1 grid-cols-7 gap-1.5 ${
            animDirection === "right" ? "animate-week-slide-right" : "animate-week-slide-left"
          }`}
        >
          {days.map((d, i) => {
            const iso = toISO(d);
            const isToday = iso === today;
            const isSelected = iso === selectedDate;
            const count = countsByDate[iso] ?? 0;
            return (
              <button
                key={iso}
                onClick={() => onSelectDate(iso)}
                className={`flex flex-col items-center gap-1 rounded-md border py-2.5 transition ${
                  isToday
                    ? "border-foreground bg-foreground text-white"
                    : isSelected
                      ? "border-foreground bg-neutral-50"
                      : "border-border bg-white hover:bg-neutral-50"
                }`}
              >
                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide leading-tight">
                  {DAY_NAMES[i]} - {d.getDate()}
                </span>
                <span
                  className={`text-2xl font-bold leading-none ${
                    count === 0 ? (isToday ? "text-white/50" : "text-neutral-300") : ""
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
          className="shrink-0 rounded-md border border-border p-1 text-muted-foreground transition hover:bg-neutral-50 hover:text-foreground"
          aria-label="Semana siguiente"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
