import { localTodayISO as todayISO } from "@/lib/dates";

// Bitácoras donde el usuario es encargado o tiene alguna actividad asignada.
// Se usa de forma explícita (en vez de confiar solo en RLS) porque para el admin
// las políticas de seguridad devuelven TODAS las bitácoras a propósito — y estas
// vistas son de uso personal, deben reflejar solo lo propio incluso siendo admin.
export async function fetchMyBitacoraIds(supabase, userId) {
  const [{ data: encargadoRows }, { data: activityRows }] = await Promise.all([
    supabase.from("bitacoras").select("id").eq("encargado_id", userId),
    supabase.from("bitacora_activities").select("bitacora_id").eq("assigned_to", userId),
  ]);
  return [
    ...new Set([
      ...(encargadoRows ?? []).map((r) => r.id),
      ...(activityRows ?? []).map((r) => r.bitacora_id),
    ]),
  ];
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
