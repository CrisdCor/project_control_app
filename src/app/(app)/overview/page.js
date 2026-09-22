"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MyTasksPanel } from "@/components/overview/my-tasks-panel";
import { AgendaPanel } from "@/components/overview/agenda-panel";
import { TodayTasksPanel } from "@/components/overview/today-tasks-panel";
import { WeekTasksStrip } from "@/components/overview/week-tasks-strip";

export default function OverviewPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  // Se incrementa cada vez que cualquier panel crea/edita/marca una tarea
  // (agenda o bitácora), para que los demás paneles se enteren y refresquen
  // — antes cada uno vivía en su propia burbuja y no se veían los cambios
  // de los otros sin recargar la página entera.
  const [refreshTick, setRefreshTick] = useState(0);
  const bumpRefresh = () => setRefreshTick((t) => t + 1);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setIsAdmin(profile?.role === "admin");
      }
    })();
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-full flex-col gap-3">
      <WeekTasksStrip
        userId={user.id}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        refreshSignal={refreshTick}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <TodayTasksPanel
              userId={user.id}
              selectedDate={selectedDate}
              onClearSelection={() => setSelectedDate(null)}
              refreshSignal={refreshTick}
              onChanged={bumpRefresh}
            />
          </div>
          <div className="min-h-0 flex-1">
            <MyTasksPanel currentUserId={user.id} isAdmin={isAdmin} refreshSignal={refreshTick} onChanged={bumpRefresh} />
          </div>
        </div>
        <AgendaPanel userId={user.id} refreshSignal={refreshTick} onChanged={bumpRefresh} />
      </div>
    </div>
  );
}
