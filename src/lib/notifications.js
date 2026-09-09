function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Tareas de bitácora (donde soy responsable o tengo una actividad asignada) y
// pendientes de agenda que vencen HOY y no han sido descartados hoy.
export async function fetchTodayReminders(supabase, userId) {
  const today = todayISO();

  const [{ data: assignedRows }, { data: activityRows }] = await Promise.all([
    supabase.from("bitacora_task_assignees").select("task_id").eq("user_id", userId),
    supabase.from("bitacora_activities").select("bitacora_task_id").eq("assigned_to", userId),
  ]);
  const taskIds = [
    ...new Set([
      ...(assignedRows ?? []).map((r) => r.task_id),
      ...(activityRows ?? []).map((r) => r.bitacora_task_id),
    ]),
  ];

  let taskReminders = [];
  if (taskIds.length) {
    const { data: tasks } = await supabase
      .from("v_bitacora_task_status")
      .select("*")
      .in("id", taskIds)
      .eq("due_date", today);
    taskReminders = (tasks ?? []).filter(
      (t) => t.status !== "finalizado" && t.reminder_dismissed_on !== today
    );
  }

  const { data: agendaRows } = await supabase
    .from("agenda_items")
    .select("*")
    .eq("user_id", userId)
    .eq("due_date", today)
    .eq("done", false);
  const agendaReminders = (agendaRows ?? []).filter((a) => a.reminder_dismissed_on !== today);

  return { taskReminders, agendaReminders };
}

export async function dismissTaskReminder(supabase, taskId) {
  await supabase.from("bitacora_tasks").update({ reminder_dismissed_on: todayISO() }).eq("id", taskId);
}

export async function dismissAgendaReminder(supabase, agendaItemId) {
  await supabase.from("agenda_items").update({ reminder_dismissed_on: todayISO() }).eq("id", agendaItemId);
}
