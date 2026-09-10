export const BITACORA_STATUS = {
  pendiente_lejos: { label: "Pendiente", color: "var(--color-status-pending)" }, // gris: aún no vence
  pendiente_hoy: { label: "Pendiente", color: "var(--color-status-progress)" }, // azul: vence hoy
  vencido: { label: "Vencida", color: "var(--color-status-overdue)" },
  pendiente_aprobacion: { label: "Pendiente por aprobación", color: "var(--color-status-attention)" },
  finalizado: { label: "Finalizada", color: "var(--color-status-done)" },
};

// Traduce el status calculado en la vista (pendiente/vencido/pendiente_aprobacion/finalizado)
// más la fecha límite, al color específico que corresponde mostrar.
export function bitacoraStatusKey(bitacora) {
  if (bitacora.status === "finalizado") return "finalizado";
  if (bitacora.status === "pendiente_aprobacion") return "pendiente_aprobacion";
  if (bitacora.status === "vencido") return "vencido";
  const today = new Date().toISOString().slice(0, 10);
  return bitacora.due_date === today ? "pendiente_hoy" : "pendiente_lejos";
}

// Semáforo de vencimiento para fecha de compromiso de una tarea
export function dueSemaphore(dateStr, { done = false } = {}) {
  if (done) return "var(--color-status-pending)";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return "var(--color-status-overdue)";
  if (diffDays === 0) return "var(--color-status-progress)";
  if (diffDays <= 2) return "#f5a623";
  return "var(--color-status-pending)";
}

// Semáforo de la agenda personal: solo gris / azul (hoy) / rojo (vencido)
export function agendaSemaphore(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return "var(--color-status-overdue)";
  if (diffDays === 0) return "var(--color-status-progress)";
  return "var(--color-status-pending)";
}
