"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProjectsPanel } from "@/components/overview/projects-panel";
import { MyTasksPanel } from "@/components/overview/my-tasks-panel";
import { AgendaPanel } from "@/components/overview/agenda-panel";
import { WeekView } from "@/components/overview/week-view";
import { SegmentedControl } from "@/components/ui/segmented-control";

const VIEW_OPTIONS = [
  { id: "general", label: "Vista general" },
  { id: "semana", label: "Semana" },
];

export default function OverviewPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("general");

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
      <div className="shrink-0">
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>

      <div className="min-h-0 flex-1">
        {view === "semana" ? (
          <WeekView userId={user.id} />
        ) : (
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-0 flex-col gap-4">
              <div className="min-h-0 flex-1">
                <ProjectsPanel isAdmin={isAdmin} currentUserId={user.id} />
              </div>
              <div className="min-h-0 flex-1">
                <MyTasksPanel currentUserId={user.id} isAdmin={isAdmin} />
              </div>
            </div>
            <AgendaPanel userId={user.id} />
          </div>
        )}
      </div>
    </div>
  );
}

