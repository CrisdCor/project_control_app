export async function fetchPendingNoteTaskIds(supabase, taskIds, currentUserId) {
  if (!taskIds || taskIds.length === 0 || !currentUserId) return new Set();

  const [{ data: lastNotes }, { data: reads }] = await Promise.all([
    supabase.from("v_task_last_note").select("*").in("task_id", taskIds),
    supabase.from("task_note_reads").select("task_id, last_read_at").eq("user_id", currentUserId).in("task_id", taskIds),
  ]);

  const readMap = Object.fromEntries((reads ?? []).map((r) => [r.task_id, r.last_read_at]));
  const pending = new Set();

  for (const note of lastNotes ?? []) {
    if (note.last_note_author === currentUserId) continue;
    const readAt = readMap[note.task_id];
    if (!readAt || new Date(note.last_note_at) > new Date(readAt)) {
      pending.add(note.task_id);
    }
  }

  return pending;
}

export async function markTaskNotesRead(supabase, taskId, userId) {
  if (!taskId || !userId) return;
  await supabase
    .from("task_note_reads")
    .upsert({ task_id: taskId, user_id: userId, last_read_at: new Date().toISOString() });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Tareas y pendientes de agenda que vencen HOY y no han sido descartados hoy.
export async function fetchTodayReminders(supabase, userId) {
  const today = todayISO();

  const { data: assignedRows } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", userId);
  const taskIds = (assignedRows ?? []).map((r) => r.task_id);

  let taskReminders = [];
  if (taskIds.length) {
    const { data: tasks } = await supabase
      .from("v_task_status")
      .select("*")
      .in("id", taskIds)
      .eq("end_date", today);
    taskReminders = (tasks ?? []).filter(
      (t) => t.status !== "finalizada" && t.status !== "cancelada" && t.reminder_dismissed_on !== today
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
  await supabase.from("tasks").update({ reminder_dismissed_on: todayISO() }).eq("id", taskId);
}

export async function dismissAgendaReminder(supabase, agendaItemId) {
  await supabase.from("agenda_items").update({ reminder_dismissed_on: todayISO() }).eq("id", agendaItemId);
}

// Tareas visibles para mí con una nota nueva sin leer (mensajes dentro de tareas).
export async function fetchPendingNoteMessages(supabase, userId) {
  const { data: lastNotes } = await supabase.from("v_task_last_note").select("*");
  const candidates = (lastNotes ?? []).filter((n) => n.last_note_author !== userId);
  if (candidates.length === 0) return [];

  const taskIds = candidates.map((n) => n.task_id);
  const { data: reads } = await supabase
    .from("task_note_reads")
    .select("task_id, last_read_at")
    .eq("user_id", userId)
    .in("task_id", taskIds);
  const readMap = Object.fromEntries((reads ?? []).map((r) => [r.task_id, r.last_read_at]));

  const pendingIds = candidates
    .filter((n) => {
      const readAt = readMap[n.task_id];
      return !readAt || new Date(n.last_note_at) > new Date(readAt);
    })
    .map((n) => n.task_id);

  if (pendingIds.length === 0) return [];

  const { data: tasks } = await supabase.from("tasks").select("id, title").in("id", pendingIds);
  return tasks ?? [];
}
