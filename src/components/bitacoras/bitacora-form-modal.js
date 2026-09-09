"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";

export function BitacoraFormModal({ open, onClose, currentUserId, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("bitacoras")
      .insert({ name: name.trim(), created_by: currentUserId })
      .select()
      .single();
    setSaving(false);

    if (insertError) {
      setError("No se pudo crear la bitácora.");
      return;
    }

    setName("");
    onCreated(created);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva bitácora">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nombre de la bitácora</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        {error && <p className="text-sm text-status-overdue">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-1 rounded-md bg-black py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? "Creando..." : "Crear bitácora"}
        </button>
      </form>
    </Modal>
  );
}
