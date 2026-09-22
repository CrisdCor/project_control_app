"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMyBitacoraIds } from "@/lib/bitacoras";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Card({ label, value, color }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 shadow-sm">
      <span className="text-xl font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function SummaryCards({ userId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const today = todayISO();

    (async () => {
      const myBitacoraIds = await fetchMyBitacoraIds(supabase, userId);

      const [{ data: agendaRows }, { data: bitacoraRows }] = await Promise.all([
        supabase.from("agenda_items").select("due_date, done").eq("user_id", userId).eq("done", false),
        myBitacoraIds.length
          ? supabase.from("v_bitacora_status").select("due_date, status").in("id", myBitacoraIds)
          : Promise.resolve({ data: [] }),
      ]);

      const agenda = agendaRows ?? [];
      const bitacoras = bitacoraRows ?? [];

      setStats({
        agendaVencidas: agenda.filter((a) => a.due_date < today).length,
        agendaHoy: agenda.filter((a) => a.due_date === today).length,
        agendaTotal: agenda.length,
        bitacorasAbiertas: bitacoras.filter((b) => b.status !== "finalizado").length,
        bitacorasVencidas: bitacoras.filter((b) => b.status === "vencido").length,
        bitacorasHoy: bitacoras.filter((b) => b.status !== "finalizado" && b.due_date === today).length,
        bitacorasFinalizadas: bitacoras.filter((b) => b.status === "finalizado").length,
      });
    })();
  }, [userId]);

  if (!stats) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Card label="Agenda vencidas" value={stats.agendaVencidas} color="var(--color-status-overdue)" />
        <Card label="Agenda para hoy" value={stats.agendaHoy} color="var(--color-status-progress)" />
        <Card label="Agenda — total" value={stats.agendaTotal} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Card label="Bitácoras abiertas" value={stats.bitacorasAbiertas} />
        <Card label="Bitácoras vencidas" value={stats.bitacorasVencidas} color="var(--color-status-overdue)" />
        <Card label="Bitácoras para hoy" value={stats.bitacorasHoy} color="var(--color-status-progress)" />
        <Card label="Bitácoras finalizadas" value={stats.bitacorasFinalizadas} color="var(--color-status-done)" />
      </div>
    </div>
  );
}
