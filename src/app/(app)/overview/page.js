"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProjectsPanel } from "@/components/overview/projects-panel";
import { MyTasksPanel } from "@/components/overview/my-tasks-panel";
import { AgendaPanel } from "@/components/overview/agenda-panel";

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <ProjectsPanel isAdmin={isAdmin} />
        <MyTasksPanel currentUserId={user.id} isAdmin={isAdmin} />
      </div>
      <AgendaPanel userId={user.id} />
    </div>
  );
}
