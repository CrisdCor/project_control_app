"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { PlusIcon, TrashIcon } from "@/components/icons";

export function AreasModal({ open, onClose, onChanged }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#9CA3AF");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("areas").select("*").order("name");
    setAreas(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      await load();
    })();
  }, [open]);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("areas").insert({ name: name.trim(), color });
    setSaving(false);
    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "Esa área ya existe." : "No se pudo agregar el área.");
      return;
    }
    setName("");
    setColor("#9CA3AF");
    await load();
    onChanged?.();
  }

  async function handleColorChange(area, newColor) {
    setAreas((prev) => prev.map((a) => (a.id === area.id ? { ...a, color: newColor } : a)));
    const supabase = createClient();
    await supabase.from("areas").update({ color: newColor }).eq("id", area.id);
    onChanged?.();
  }

  async function handleDelete(area) {
    if (!window.confirm(`¿Eliminar "${area.name}" del catálogo?`)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("areas").delete().eq("id", area.id);
    if (deleteError) {
      window.alert("No se pudo eliminar: hay usuarios o bitácoras usando esta área.");
      return;
    }
    await load();
    onChanged?.();
  }

  return (
    <Modal open={open} onClose={onClose} title="Catálogo de áreas">
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {areas.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 rounded-md border border-border p-2">
                <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                <input
                  type="color"
                  value={a.color}
                  onChange={(e) => handleColorChange(a, e.target.value)}
                  className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border p-0"
                  title="Color de la etiqueta"
                />
                <button
                  onClick={() => handleDelete(a)}
                  className="shrink-0 text-muted-foreground transition hover:text-status-overdue"
                  title="Eliminar área"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Agregar área</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej. Tesorería)"
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-[38px] w-10 shrink-0 cursor-pointer rounded-md border border-border p-0.5"
            />
          </div>
          {error && <p className="text-xs text-status-overdue">{error}</p>}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-1.5 rounded-md bg-black py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            <PlusIcon />
            Agregar
          </button>
        </form>
      </div>
    </Modal>
  );
}
