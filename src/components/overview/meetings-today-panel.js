"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Pagination } from "@/components/ui/pagination";
import { CountryCodeTag } from "@/components/ui/country-tag";
import { CalendarIcon } from "@/components/icons";
import { localTodayISO as todayISO } from "@/lib/dates";

const PAGE_SIZE = 5;

function formatTime(t) {
  if (!t) return null;
  return t.slice(0, 5);
}

export function MeetingsTodayPanel({ userId, selectedDate, refreshSignal }) {
  const [meetings, setMeetings] = useState([]);
  const [paisesById, setPaisesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const date = selectedDate || todayISO();

  async function load() {
    const supabase = createClient();
    if (meetings.length === 0) setLoading(true);

    const [{ data: participantRows }, { data: paisesData }] = await Promise.all([
      supabase.from("meeting_participants").select("meeting_id").eq("user_id", userId),
      supabase.from("paises").select("*"),
    ]);
    setPaisesById(Object.fromEntries((paisesData ?? []).map((p) => [p.id, p])));

    const meetingIds = [...new Set((participantRows ?? []).map((r) => r.meeting_id))];
    if (meetingIds.length === 0) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("meetings")
      .select("*")
      .in("id", meetingIds)
      .eq("meeting_date", date)
      .is("archived_at", null)
      .order("start_time", { ascending: true, nullsFirst: false });

    setMeetings(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      setPage(1);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, date, refreshSignal]);

  const totalPages = Math.max(1, Math.ceil(meetings.length / PAGE_SIZE));
  const pageItems = meetings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 shrink-0 text-sm font-semibold">
        {selectedDate ? "Reuniones · día seleccionado" : "Reuniones del día"}
      </h2>

      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : pageItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin reuniones para este día.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {pageItems.map((m) => (
              <Link
                key={m.id}
                href={`/reuniones/${m.id}`}
                className="flex items-center gap-2.5 py-2 transition hover:opacity-70"
              >
                <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <CountryCodeTag pais={paisesById[m.pais_id]} />
                <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(m.start_time) ?? "—"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </section>
  );
}
