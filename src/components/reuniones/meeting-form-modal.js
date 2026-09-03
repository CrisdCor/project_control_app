"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { PlusIcon, GripIcon } from "@/components/icons";
import { fetchOutstandingCommitments } from "@/lib/meetings";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MeetingFormModal({ open, onClose, profiles, pastMeetings, currentUserId, onCreated }) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [moderatorId, setModeratorId] = useState(currentUserId ?? "");
  const [participantIds, setParticipantIds] = useState([]);
  const [externalName, setExternalName] = useState("");
  const [externalParticipants, setExternalParticipants] = useState([]);
  const [previousMeetingId, setPreviousMeetingId] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [checklistItems, setChecklistItems] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setTitle("");
    setMeetingDate(todayISO());
    setStartTime("");
    setEndTime("");
    setModeratorId(currentUserId ?? "");
    setParticipantIds([]);
    setExternalName("");
    setExternalParticipants([]);
    setPreviousMeetingId("");
    setChecklistDraft("");
    setChecklistItems([]);
    setError(null);
  }

  function addExternal() {
    const name = externalName.trim();
    if (!name || externalParticipants.includes(name)) return;
    setExternalParticipants((prev) => [...prev, name]);
    setExternalName("");
  }

  function removeExternal(name) {
    setExternalParticipants((prev) => prev.filter((n) => n !== name));
  }

  function addChecklistItem() {
    const text = checklistDraft.trim();
    if (!text) return;
    setChecklistItems((prev) => [...prev, text]);
    setChecklistDraft("");
  }

  function removeChecklistItem(index) {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setChecklistItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("El nombre de la reunión es obligatorio.");
      return;
    }
    if (!moderatorId) {
      setError("Selecciona un moderador.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("meetings")
      .insert({
        title: title.trim(),
        meeting_date: meetingDate,
        start_time: startTime || null,
        end_time: endTime || null,
        moderator_id: moderatorId,
        external_participants: externalParticipants,
        previous_meeting_id: previousMeetingId || null,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (insertError) {
      setSaving(false);
      setError("No se pudo crear la reunión.");
      return;
    }

    const allParticipantIds = [...new Set([...participantIds, moderatorId])];
    if (allParticipantIds.length) {
      await supabase
        .from("meeting_participants")
        .insert(allParticipantIds.map((userId) => ({ meeting_id: created.id, user_id: userId })));
    }

    let finalChecklist = [...checklistItems];
    if (previousMeetingId) {
      const outstanding = await fetchOutstandingCommitments(supabase, previousMeetingId);
      const carryOver = outstanding.map((item) => `Seguimiento: ${item.description}`);
      finalChecklist = [...carryOver, ...finalChecklist];
    }

    if (finalChecklist.length) {
      await supabase.from("meeting_checklist_items").insert(
        finalChecklist.map((text, position) => ({
          meeting_id: created.id,
          text,
          position,
          created_by: currentUserId,
        }))
      );
    }

    setSaving(false);
    reset();
    onCreated(created);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva reunión">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nombre de la reunión</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Fecha de la reunión</label>
          <DatePicker value={meetingDate} onChange={setMeetingDate} />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Hora inicio</label>
            <TimePicker value={startTime} onChange={setStartTime} placeholder="Inicio" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Hora fin</label>
            <TimePicker value={endTime} onChange={setEndTime} placeholder="Fin" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Moderador</label>
          <FilterDropdown
            placeholder="Selecciona un moderador"
            allowClear={false}
            value={moderatorId}
            onChange={setModeratorId}
            options={profiles.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Participantes de la aplicación</label>
          <MultiSelectDropdown
            options={profiles.map((p) => ({ id: p.id, name: p.name }))}
            selectedIds={participantIds}
            onChange={setParticipantIds}
            placeholder="Selecciona participantes..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Participantes externos (opcional)</label>
          <div className="flex gap-2">
            <input
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addExternal();
                }
              }}
              placeholder="Nombre de la persona..."
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              type="button"
              onClick={addExternal}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-medium transition hover:bg-neutral-50"
            >
              <PlusIcon />
              Agregar
            </button>
          </div>
          {externalParticipants.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {externalParticipants.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-neutral-50 px-2.5 py-1 text-xs"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeExternal(name)}
                    className="text-muted-foreground hover:text-status-overdue"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {pastMeetings?.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Reunión anterior relacionada (opcional)</label>
            <FilterDropdown
              placeholder="Ninguna — reunión esporádica"
              value={previousMeetingId}
              onChange={setPreviousMeetingId}
              fullWidth
              options={pastMeetings.map((m) => ({
                value: m.id,
                label: `${m.title} · ${new Date(m.meeting_date + "T00:00:00").toLocaleDateString("es-CO")}${
                  m.start_time ? ` · ${m.start_time.slice(0, 5)}` : ""
                }`,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Si es una reunión periódica, sus compromisos aún pendientes se agregan al orden del día.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Lista de chequeo (orden del día)</label>
          <div className="flex gap-2">
            <input
              value={checklistDraft}
              onChange={(e) => setChecklistDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addChecklistItem();
                }
              }}
              placeholder="Punto a tratar en la reunión..."
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              type="button"
              onClick={addChecklistItem}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-medium transition hover:bg-neutral-50"
            >
              <PlusIcon />
              Agregar
            </button>
          </div>
          {checklistItems.length > 0 && (
            <ul className="flex flex-col gap-1">
              {checklistItems.map((text, i) => (
                <li
                  key={i}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-neutral-50 px-3 py-1.5 text-sm active:cursor-grabbing"
                >
                  <GripIcon className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{text}</span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(i)}
                    className="shrink-0 text-muted-foreground hover:text-status-overdue"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {checklistItems.length > 1 && (
            <p className="text-xs text-muted-foreground">Arrastra los puntos para agruparlos por tema.</p>
          )}
        </div>

        {error && <p className="text-sm text-status-overdue">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-md bg-black py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? "Creando..." : "Crear reunión"}
        </button>
      </form>
    </Modal>
  );
}
