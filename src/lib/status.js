export const BITACORA_TASK_STATUS = {
  pendiente: { label: "Pendiente", color: "var(--color-status-progress)" },
  finalizado: { label: "Finalizado", color: "var(--color-status-done)" },
  vencido: { label: "Vencido", color: "var(--color-status-overdue)" },
};

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
