// Compromisos de una reunión anterior que siguen pendientes: nunca se agendaron,
// o se agendaron pero la tarea de agenda resultante aún no se marca como hecha.
// Si no se puede verificar el estado (por privacidad de la agenda de otra persona),
// se incluye igual por seguridad (mejor mostrar de más que ocultar algo pendiente).
export async function fetchOutstandingCommitments(supabase, previousMeetingId) {
  const { data: prevItems } = await supabase
    .from("meeting_action_items")
    .select("*")
    .eq("meeting_id", previousMeetingId);

  if (!prevItems?.length) return [];

  const agendaRefIds = prevItems
    .filter((i) => i.converted_to === "agenda" && i.converted_ref_id)
    .map((i) => i.converted_ref_id);

  let doneMap = {};
  if (agendaRefIds.length) {
    const { data: agendaRows } = await supabase.from("agenda_items").select("id, done").in("id", agendaRefIds);
    doneMap = Object.fromEntries((agendaRows ?? []).map((a) => [a.id, a.done]));
  }

  return prevItems.filter((i) => {
    if (i.converted_to === "none") return true;
    if (i.converted_to === "agenda") return doneMap[i.converted_ref_id] !== true;
    return false;
  });
}
