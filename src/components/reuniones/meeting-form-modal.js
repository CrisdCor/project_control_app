"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MeetingFormModal({ open, onClose, profiles, projects, currentUserId, onCreated }) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(todayISO());
  const [projectId, setProjectId] = useState("");
  const [participantIds, setParticipantIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setTitle("");
    setMeetingDate(todayISO());
    setProjectId("");
    setParticipantIds([]);
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("meetings")
      .insert({
        title: title.trim(),
        meeting_date: meetingDate,
        project_id: projectId || null,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (insertError) {
      setSaving(false);
      setError("No se pudo crear la reunión.");
      return;
    }

    if (participantIds.length) {
      await supabase
        .from("meeting_participants")
        .insert(participantIds.map((userId) => ({ meeting_id: created.id, user_id: userId })));
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
          <label className="text-sm font-medium">Título</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Fecha</label>
          <DatePicker value={meetingDate} onChange={setMeetingDate} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Proyecto (opcional)</label>
          <FilterDropdown
            placeholder="Sin proyecto asociado"
            value={projectId}
            onChange={setProjectId}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Participantes</label>
          <MultiSelectDropdown
            options={profiles.map((p) => ({ id: p.id, name: p.name }))}
            selectedIds={participantIds}
            onChange={setParticipantIds}
            placeholder="Selecciona participantes..."
          />
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
