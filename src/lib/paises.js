"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Nota: no usamos emoji de bandera — en varios sistemas no se renderiza como
// gráfico y cae a las letras del código ISO como respaldo, lo cual generaba
// texto duplicado junto al código que ya mostrábamos explícitamente. La
// identificación visual del país se resuelve con el código ISO coloreado
// (ver CountryTag / CountryCodeTag).

export const GENERAL_PAIS_ID = "00000000-0000-0000-0000-000000000001";

export function hexToRgba(hex, alpha = 0.16) {
  const clean = (hex || "#9CA3AF").replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export async function fetchPaises(supabase) {
  const { data } = await supabase.from("paises").select("*").order("name");
  return data ?? [];
}

// options listas para FilterDropdown: "CO · Colombia" (o solo el nombre si no
// tiene código, como General)
export function paisOptions(paises) {
  return (paises ?? []).map((p) => ({
    value: p.id,
    label: p.code ? `${p.code} · ${p.name}` : p.name,
  }));
}

// hook: carga el catálogo de países una sola vez al montar. Se usa en todos
// los formularios/paneles que necesitan la lista completa o un mapa por id,
// evitando repetir el mismo fetch en cada componente.
export function usePaises() {
  const [paises, setPaises] = useState([]);
  const [paisesById, setPaisesById] = useState({});
  const [loading, setLoading] = useState(true);

  async function refetch() {
    const supabase = createClient();
    const data = await fetchPaises(supabase);
    setPaises(data);
    setPaisesById(Object.fromEntries(data.map((p) => [p.id, p])));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, []);

  return { paises, paisesById, loading, refetch };
}
