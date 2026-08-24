"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { MeetingChecklistDrawer } from "@/components/reuniones/meeting-checklist-drawer";
import { TrashIcon, PencilIcon } from "@/components/icons";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EXTERNAL_PREFIX = "ext:";

function formatTime(t) {
  if (!t) return null;
  return t.slice(0, 5);
}

export default function ReunionDetallePage() {
  const { id } = useParams();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]); // [{id, name}]
  const [profiles, setProfiles] = useState([]);
  const [items, setItems] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [confirmDeleteMeeting, setConfirmDeleteMeeting] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  // edición del detalle
  const [editingDetail, setEditingDetail] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [moderatorDraft, setModeratorDraft] = useState("");
  const [participantIdsDraft, setParticipantIdsDraft] = useState([]);
  const [savingDetail, setSavingDetail] = useState(false);

  // nuevo ítem de acción
  const [description, setDescription] = useState("");
  const [suggestedValue, setSuggestedValue] = useState("");
  const [suggestedDueDate, setSuggestedDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const [dragOver, setDragOver] = useState(false);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");
    }

    const { data: m } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
    setMeeting(m);

    const { data: parts } = await supabase
      .from("meeting_participants")
      .select("user_id, profiles(name)")
      .eq("meeting_id", id);
    setParticipants((parts ?? []).map((p) => ({ id: p.user_id, name: p.profiles?.name })).filter((p) => p.name));

    const { data: profs } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(profs ?? []);

    const { data: actionItems } = await supabase
      .from("meeting_action_items")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at");
    setItems(actionItems ?? []);

    const { data: checklist } = await supabase
      .from("meeting_checklist_items")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at");
    setChecklistItems(checklist ?? []);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (!meeting) return <p className="text-sm text-muted-foreground">No se encontró la reunión.</p>;

  const canEdit = isAdmin || meeting.moderator_id === currentUserId || meeting.created_by === currentUserId;
  const canSchedule = isAdmin || meeting.moderator_id === currentUserId;
  const canDeleteMeeting = isAdmin || meeting.created_by === currentUserId;

  const moderator = participants.find((p) => p.id === meeting.moderator_id);
  const otherParticipants = participants.filter((p) => p.id !== meeting.moderator_id);

  const responsibleOptions = [
    ...profiles.map((p) => ({ value: p.id, label: p.name })),
    ...(meeting.external_participants ?? []).map((name) => ({
      value: `${EXTERNAL_PREFIX}${name}`,
      label: `${name} (externo)`,
    })),
  ];

  function responsibleLabel(item) {
    if (item.suggested_responsible_external) return `${item.suggested_responsible_external} (externo)`;
    if (item.suggested_responsible) return profiles.find((p) => p.id === item.suggested_responsible)?.name ?? "—";
    return "—";
  }

  function startEditDetail() {
    setTitleDraft(meeting.title);
    setModeratorDraft(meeting.moderator_id ?? "");
    setParticipantIdsDraft(otherParticipants.map((p) => p.id));
    setEditingDetail(true);
  }

  async function handleSaveDetail() {
    if (!titleDraft.trim() || !moderatorDraft) return;
    setSavingDetail(true);
    const supabase = createClient();

    await supabase
      .from("meetings")
      .update({ title: titleDraft.trim(), moderator_id: moderatorDraft })
      .eq("id", id);

    const finalParticipantIds = [...new Set([...participantIdsDraft, moderatorDraft])];
    await supabase.from("meeting_participants").delete().eq("meeting_id", id);
    if (finalParticipantIds.length) {
      await supabase
        .from("meeting_participants")
        .insert(finalParticipantIds.map((userId) => ({ meeting_id: id, user_id: userId })));
    }

    setSavingDetail(false);
    setEditingDetail(false);
    load();
  }

  async function handleDeleteMeeting() {
    setDeletingMeeting(true);
    const supabase = createClient();
    await supabase.from("meetings").delete().eq("id", id);
    router.push("/reuniones");
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setAddError(null);
    if (!description.trim()) return;
    if (!suggestedValue) {
      setAddError("Selecciona un responsable sugerido.");
      return;
    }
    if (!suggestedDueDate) {
      setAddError("La fecha sugerida es obligatoria.");
      return;
    }

    setAdding(true);
    const isExternal = suggestedValue.startsWith(EXTERNAL_PREFIX);
    const supabase = createClient();
    await supabase.from("meeting_action_items").insert({
      meeting_id: id,
      description: description.trim(),
      suggested_responsible: !isExternal ? suggestedValue : null,
      suggested_responsible_external: isExternal ? suggestedValue.slice(EXTERNAL_PREFIX.length) : null,
      suggested_due_date: suggestedDueDate,
      created_by: currentUserId,
    });
    setDescription("");
    setSuggestedValue("");
    setSuggestedDueDate("");
    setAdding(false);
    load();
  }

  async function handleDeleteItem(item) {
    const supabase = createClient();
    await supabase.from("meeting_action_items").delete().eq("id", item.id);
    load();
  }

  async function handleConvertAgenda(item) {
    if (!canSchedule || item.converted_to !== "none") return;
    const targetUserId = item.suggested_responsible;
    if (!targetUserId) return; // externo: no tiene agenda

    const supabase = createClient();
    const { data: agendaItem, error } = await supabase
      .from("agenda_items")
      .insert({
        user_id: targetUserId,
        text: item.description,
        due_date: item.suggested_due_date || todayISO(),
        source_meeting_id: id,
      })
      .select()
      .single();

    if (error) return;

    await supabase
      .from("meeting_action_items")
      .update({ converted_to: "agenda", converted_ref_id: agendaItem?.id })
      .eq("id", item.id);
    load();
  }

  const pendingItems = items.filter((i) => i.converted_to === "none");
  const scheduledItems = items.filter((i) => i.converted_to === "agenda");

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <Link href="/reuniones" className="text-sm text-muted-foreground hover:underline">
          ← Reuniones
        </Link>
        {canDeleteMeeting &&
          (confirmDeleteMeeting ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteMeeting}
                disabled={deletingMeeting}
                className="rounded-md bg-status-overdue px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
              >
                {deletingMeeting ? "Eliminando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setConfirmDeleteMeeting(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteMeeting(true)}
              className="flex items-center gap-1.5 rounded-md border border-status-overdue/40 px-2.5 py-1.5 text-xs text-status-overdue transition hover:bg-red-50"
            >
              <TrashIcon />
              Eliminar reunión
            </button>
          ))}
      </div>

      {/* Detalle de la reunión */}
      <div className="shrink-0 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm">
        {editingDetail ? (
          <div className="flex flex-col gap-3">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="rounded-md border border-border bg-white px-2.5 py-1.5 text-base font-semibold outline-none focus:border-foreground"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Moderador</label>
              <FilterDropdown
                placeholder="Selecciona un moderador"
                allowClear={false}
                value={moderatorDraft}
                onChange={setModeratorDraft}
                options={profiles.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Participantes</label>
              <MultiSelectDropdown
                options={profiles.filter((p) => p.id !== moderatorDraft).map((p) => ({ id: p.id, name: p.name }))}
                selectedIds={participantIdsDraft}
                onChange={setParticipantIdsDraft}
                placeholder="Selecciona participantes..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDetail}
                disabled={savingDetail || !titleDraft.trim() || !moderatorDraft}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditingDetail(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-base font-semibold">{meeting.title}</h1>
              {canEdit && (
                <button
                  onClick={startEditDetail}
                  className="text-muted-foreground transition hover:text-foreground"
                  title="Editar"
                >
                  <PencilIcon />
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(meeting.meeting_date + "T00:00:00").toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {(meeting.start_time || meeting.end_time) && (
                <>
                  {" · "}
                  {formatTime(meeting.start_time)}
                  {meeting.end_time && ` - ${formatTime(meeting.end_time)}`}
                </>
              )}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {moderator && (
                <>
                  Moderador: <span className="font-medium text-foreground">{moderator.name}</span>
                </>
              )}
              {(otherParticipants.length > 0 || meeting.external_participants?.length > 0) && (
                <>
                  {moderator && " · "}
                  Participantes:{" "}
                  {[...otherParticipants.map((p) => p.name), ...(meeting.external_participants ?? []).map((n) => `${n} (externo)`)].join(", ")}
                </>
              )}
            </p>
          </>
        )}

        <button
          onClick={() => setChecklistOpen(true)}
          className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-50"
        >
          Ver Orden del día
        </button>
      </div>

      {/* Tareas + agenda */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
          <form onSubmit={handleAddItem} className="flex shrink-0 flex-col gap-2 border-b border-border p-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la tarea o responsabilidad que salió de la reunión..."
              rows={2}
              className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[180px] flex-1">
                <FilterDropdown
                  placeholder="Responsable sugerido *"
                  value={suggestedValue}
                  onChange={setSuggestedValue}
                  options={responsibleOptions}
                />
              </div>
              <DatePicker value={suggestedDueDate} onChange={setSuggestedDueDate} placeholder="Fecha sugerida *" />
              <button
                type="submit"
                disabled={adding || !description.trim()}
                className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
              >
                Agregar tarea
              </button>
            </div>
            {addError && <p className="text-xs text-status-overdue">{addError}</p>}
          </form>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {pendingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tareas pendientes de agendar.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {pendingItems.map((item) => {
                  const canDelete = isAdmin || item.created_by === currentUserId;
                  return (
                    <div
                      key={item.id}
                      draggable={canSchedule}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                      className={`rounded-md border border-border bg-white p-3 shadow-sm ${
                        canSchedule ? "cursor-grab active:cursor-grabbing" : ""
                      }`}
                    >
                      <p className="text-sm">{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {responsibleLabel(item)} ·{" "}
                        {new Date(item.suggested_due_date + "T00:00:00").toLocaleDateString("es-CO")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {canSchedule && item.suggested_responsible && (
                          <button
                            onClick={() => handleConvertAgenda(item)}
                            className="rounded-md border border-border px-2 py-1 text-xs transition hover:bg-neutral-50"
                          >
                            Enviar a agenda
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="rounded-md border border-status-overdue/40 px-2 py-1 text-xs text-status-overdue transition hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          onDragOver={(e) => {
            if (!canSchedule) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!canSchedule) return;
            const itemId = e.dataTransfer.getData("text/plain");
            const item = items.find((i) => i.id === itemId);
            if (item) handleConvertAgenda(item);
          }}
          className={`flex min-h-0 flex-col rounded-[var(--radius-card)] border-2 border-dashed p-3 transition ${
            dragOver ? "border-foreground bg-neutral-50" : "border-border bg-neutral-50/50"
          }`}
        >
          <h3 className="mb-2 shrink-0 text-sm font-semibold">Tareas agendadas</h3>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {scheduledItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {canSchedule ? "Arrastra aquí una tarea para agendarla." : "Aún no hay tareas agendadas."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {scheduledItems.map((item) => (
                  <div key={item.id} className="rounded-md border border-border bg-white p-2.5 text-xs shadow-sm">
                    <p>{item.description}</p>
                    <p className="mt-1 text-muted-foreground">{responsibleLabel(item)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <MeetingChecklistDrawer
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        meetingId={id}
        items={checklistItems}
        canEdit={canEdit}
        currentUserId={currentUserId}
        onChanged={load}
      />
    </div>
  );
}
