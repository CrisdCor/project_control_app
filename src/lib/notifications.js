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
