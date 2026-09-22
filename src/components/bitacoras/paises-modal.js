"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { flagEmoji } from "@/lib/paises";
import { PlusIcon, TrashIcon } from "@/components/icons";

export function PaisesModal({ open, onClose, onChanged }) {
  const [paises, setPaises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#9CA3AF");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("paises").select("*").order("name");
    setPaises(data ?? []);
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
    const { error: insertError } = await supabase.from("paises").insert({
      name: name.trim(),
      code: code.trim() ? code.trim().toUpperCase().slice(0, 2) : null,
      color,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "Ese país ya existe." : "No se pudo agregar el país.");
      return;
    }
    setName("");
    setCode("");
    setColor("#9CA3AF");
    await load();
    onChanged?.();
  }

  async function handleColorChange(pais, newColor) {
    setPaises((prev) => prev.map((p) => (p.id === pais.id ? { ...p, color: newColor } : p)));
    const supabase = createClient();
    await supabase.from("paises").update({ color: newColor }).eq("id", pais.id);
    onChanged?.();
  }

  async function handleDelete(pais) {
    if (pais.id === "00000000-0000-0000-0000-000000000001") return; // General no se elimina
    if (!window.confirm(`¿Eliminar "${pais.name}" del catálogo?`)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("paises").delete().eq("id", pais.id);
    if (deleteError) {
      window.alert("No se pudo eliminar: hay bitácoras o tareas de agenda usando este país.");
      return;
    }
    await load();
    onChanged?.();
  }

  return (
    <Modal open={open} onClose={onClose} title="Catálogo de países">
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {paises.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-md border border-border p-2">
                <span className="w-5 shrink-0 text-center">{flagEmoji(p.code) ?? "—"}</span>
                {p.code && (
                  <span className="shrink-0 text-xs font-semibold" style={{ color: p.color }}>
                    {p.code}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                <input
                  type="color"
                  value={p.color}
                  onChange={(e) => handleColorChange(p, e.target.value)}
                  className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border p-0"
                  title="Color de la etiqueta"
                />
                {p.id !== "00000000-0000-0000-0000-000000000001" && (
                  <button
                    onClick={() => handleDelete(p)}
                    className="shrink-0 text-muted-foreground transition hover:text-status-overdue"
                    title="Eliminar país"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Agregar país</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej. Brasil)"
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ISO"
              maxLength={2}
              className="w-16 rounded-md border border-border bg-white px-3 py-2 text-sm uppercase outline-none focus:border-foreground"
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
