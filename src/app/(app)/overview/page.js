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
      <WeekTasksStrip userId={user.id} />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1">
            <TodayTasksPanel userId={user.id} />
          </div>
          <div className="min-h-0 flex-1">
            <MyTasksPanel currentUserId={user.id} isAdmin={isAdmin} />
          </div>
        </div>
        <AgendaPanel userId={user.id} />
      </div>
    </div>
  );
}
