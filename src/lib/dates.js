// IMPORTANTE: usar SIEMPRE esta función para "hoy", nunca
// `new Date().toISOString().slice(0, 10)` directamente — esa forma calcula la
// fecha en UTC, que en Colombia y el resto de LatAm (UTC-5 y similares) puede
// estar un día adelante de la fecha local durante la noche (aprox. 7pm-12am),
// causando que tareas creadas o filtradas "para hoy" queden con la fecha
// equivocada.
export function localTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
