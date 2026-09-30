"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export async function fetchAreas(supabase) {
  const { data } = await supabase.from("areas").select("*").order("name");
  return data ?? [];
}

// options listas para FilterDropdown
export function areaOptions(areas) {
  return (areas ?? []).map((a) => ({ value: a.id, label: a.name }));
}

// hook: carga el catálogo de áreas una sola vez al montar
export function useAreas() {
  const [areas, setAreas] = useState([]);
  const [areasById, setAreasById] = useState({});
  const [loading, setLoading] = useState(true);

  async function refetch() {
    const supabase = createClient();
    const data = await fetchAreas(supabase);
    setAreas(data);
    setAreasById(Object.fromEntries(data.map((a) => [a.id, a])));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  return { areas, areasById, loading, refetch };
}
