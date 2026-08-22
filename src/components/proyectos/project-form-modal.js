"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { DatePicker } from "@/components/ui/date-picker";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ProjectFormModal({ open, onClose, leaders, onCreated, currentUserId }) {
  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function reset() {
    setName("");
    setLeaderId("");
    setStartDate(todayISO());
    setEndDate("");
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!leaderId) {
      setError("Selecciona un líder de proyecto.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("La fecha final no puede ser anterior a la fecha de inicio.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("projects").insert({
      name: name.trim(),
      leader_id: leaderId,
      start_date: startDate,
      end_date: endDate,
      created_by: currentUserId,
    });
    setSaving(false);

    if (insertError) {
      setError("No se pudo crear el proyecto.");
      return;
    }

    reset();
    onCreated();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear proyecto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nombre del proyecto</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Líder del proyecto</label>
          <select
            required
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          >
            <option value="">Selecciona un líder...</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Fecha inicio</label>
            <DatePicker value={startDate} min={todayISO()} onChange={setStartDate} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium">Fecha final</label>
            <DatePicker value={endDate} min={startDate} onChange={setEndDate} />
          </div>
        </div>

        {error && <p className="text-sm text-status-overdue">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-md bg-black py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? "Creando..." : "Crear proyecto"}
        </button>
      </form>
    </Modal>
  );
}
