export const TASK_STATUS = {
  pendiente_por_inicio: { label: "Pendiente por inicio", color: "var(--color-status-pending)" },
  en_proceso: { label: "En proceso", color: "var(--color-status-progress)" },
  stand_by: { label: "Stand by", color: "var(--color-status-attention)" },
  cancelada: { label: "Cancelada", color: "var(--color-muted)" },
  finalizada: { label: "Finalizada", color: "var(--color-status-done)" },
  vencida: { label: "Vencida", color: "var(--color-status-overdue)" },
};

export const PROJECT_STATUS = {
  pendiente_por_inicio: { label: "Pendiente por inicio", color: "var(--color-status-pending)" },
  en_proceso: { label: "En proceso", color: "var(--color-status-progress)" },
  atencion: { label: "Atención", color: "var(--color-status-attention)" },
  vencido: { label: "Vencido", color: "var(--color-status-overdue)" },
  finalizada_sin_cierre: { label: "Finalizada sin cierre", color: "var(--color-status-attention)" },
  finalizado: { label: "Finalizado", color: "var(--color-status-done)" },
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
