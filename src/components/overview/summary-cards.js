"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMyBitacoraIds } from "@/lib/bitacoras";
import { NotebookIcon, FolderIcon } from "@/components/icons";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Card({ icon, iconTitle, label, value, color }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 shadow-sm">
      <span title={iconTitle} className="shrink-0 text-muted-foreground">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-base font-semibold leading-tight" style={color ? { color } : undefined}>
          {value}
        </span>
        <span className="truncate text-[11px] leading-tight text-muted-foreground">{label}</span>
      </div>
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
    <div className="flex shrink-0 flex-wrap gap-2">
      <Card
        icon={<NotebookIcon className="h-3.5 w-3.5" />}
        iconTitle="Agenda"
        label="Vencidas"
        value={stats.agendaVencidas}
        color="var(--color-status-overdue)"
      />
      <Card
        icon={<NotebookIcon className="h-3.5 w-3.5" />}
        iconTitle="Agenda"
        label="Hoy"
        value={stats.agendaHoy}
        color="var(--color-status-progress)"
      />
      <Card icon={<NotebookIcon className="h-3.5 w-3.5" />} iconTitle="Agenda" label="Total" value={stats.agendaTotal} />
      <Card
        icon={<FolderIcon className="h-3.5 w-3.5" />}
        iconTitle="Bitácoras"
        label="Abiertas"
        value={stats.bitacorasAbiertas}
      />
      <Card
        icon={<FolderIcon className="h-3.5 w-3.5" />}
        iconTitle="Bitácoras"
        label="Vencidas"
        value={stats.bitacorasVencidas}
        color="var(--color-status-overdue)"
      />
      <Card
        icon={<FolderIcon className="h-3.5 w-3.5" />}
        iconTitle="Bitácoras"
        label="Hoy"
        value={stats.bitacorasHoy}
        color="var(--color-status-progress)"
      />
      <Card
        icon={<FolderIcon className="h-3.5 w-3.5" />}
        iconTitle="Bitácoras"
        label="Finalizadas"
        value={stats.bitacorasFinalizadas}
        color="var(--color-status-done)"
      />
    </div>
  );
}
