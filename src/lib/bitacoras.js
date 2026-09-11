function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// De un conjunto de bitácoras visibles, cuáles tienen al menos una actividad
// sin terminar que vence hoy o ya está vencida (útil para señalizarlo en listas
// compactas, sin tener que entrar al detalle de cada una).
export async function fetchUrgentActivityBitacoraIds(supabase, bitacoraIds) {
  if (!bitacoraIds?.length) return new Set();
  const { data } = await supabase
    .from("bitacora_activities")
    .select("bitacora_id")
    .in("bitacora_id", bitacoraIds)
    .eq("is_done", false)
    .lte("due_date", todayISO());
  return new Set((data ?? []).map((a) => a.bitacora_id));
}
