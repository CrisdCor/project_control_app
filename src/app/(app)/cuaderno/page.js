"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AgendaPanel } from "@/components/overview/agenda-panel";

export default function CuadernoPage() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  if (!userId) return null;

  return (
    <div className="mx-auto max-w-xl">
      <AgendaPanel userId={userId} />
    </div>
  );
}
