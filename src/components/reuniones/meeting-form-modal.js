"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { PlusIcon } from "@/components/icons";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function MeetingFormModal({ open, onClose, profiles, projects, currentUserId, onCreated }) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(todayISO());
  const [projectId, setProjectId] = useState("");
  const [participantIds, setParticipantIds] = useState([]);
  const [externalName, setExternalName] = useState("");
  const [externalParticipants, setExternalParticipants] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setTitle("");
    setMeetingDate(todayISO());
    setProjectId("");
    setParticipantIds([]);
    setExternalName("");
    setExternalParticipants([]);
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
        external_participants: externalParticipants,
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
          <label className="text-sm font-medium">Nombre de la reunión</label>
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

