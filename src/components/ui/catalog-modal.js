"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { PlusIcon, TrashIcon, PencilIcon } from "@/components/icons";

// Modal de catálogo reutilizable: nombre + color, con código ISO opcional
// (países lo usa, áreas no). Antes esto estaba duplicado casi entero entre
// PaisesModal y AreasModal.
export function CatalogModal({
  open,
  onClose,
  onChanged,
  table,
  title,
  hasCode = false,
  protectedId = null,
  namePlaceholder = "Nombre",
  entityLabel = "elemento",
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#9CA3AF");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editError, setEditError] = useState(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from(table).select("*").order("name");
    setEntries(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      setEditingId(null);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table]);

  function normalizedCode(value) {
    return value.trim() ? value.trim().toUpperCase().slice(0, 2) : null;
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const payload = { name: name.trim(), color };
    if (hasCode) payload.code = normalizedCode(code);
    const { error: insertError } = await supabase.from(table).insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message.includes("duplicate") ? `Ese ${entityLabel} ya existe.` : `No se pudo agregar el ${entityLabel}.`);
      return;
    }
    setName("");
    setCode("");
    setColor("#9CA3AF");
    await load();
    onChanged?.();
  }

  async function handleColorChange(entry, newColor) {
    setEntries((prev) => prev.map((it) => (it.id === entry.id ? { ...it, color: newColor } : it)));
    const supabase = createClient();
    await supabase.from(table).update({ color: newColor }).eq("id", entry.id);
    onChanged?.();
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditCode(entry.code ?? "");
    setEditError(null);
  }

  async function saveEdit(e) {
    e?.preventDefault();
    if (!editName.trim()) return;
    const supabase = createClient();
    const payload = { name: editName.trim() };
    if (hasCode) payload.code = normalizedCode(editCode);
    const { error: updateError } = await supabase.from(table).update(payload).eq("id", editingId);
    if (updateError) {
      setEditError(updateError.message.includes("duplicate") ? "Ya existe uno con ese nombre." : "No se pudo guardar.");
      return;
    }
    setEditingId(null);
    await load();
    onChanged?.();
  }

  async function handleDelete(entry) {
    if (entry.id === protectedId) return;
    if (!window.confirm(`¿Eliminar "${entry.name}" del catálogo?`)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from(table).delete().eq("id", entry.id);
    if (deleteError) {
      window.alert(`No se pudo eliminar: hay registros usando este ${entityLabel}.`);
      return;
    }
    await load();
    onChanged?.();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {entries.map((entry) =>
              editingId === entry.id ? (
                <form
                  key={entry.id}
                  onSubmit={saveEdit}
                  className="flex items-center gap-2 rounded-md border border-border bg-neutral-50 p-2"
                >
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-border bg-white px-2 py-1 text-sm outline-none focus:border-foreground"
                  />
                  {hasCode && (
                    <input
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      placeholder="ISO"
                      maxLength={2}
                      className="w-12 shrink-0 rounded border border-border bg-white px-2 py-1 text-sm uppercase outline-none focus:border-foreground"
                    />
                  )}
                  <button
                    type="submit"
                    className="shrink-0 rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white transition hover:bg-neutral-800"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-white"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <div key={entry.id} className="flex items-center gap-2.5 rounded-md border border-border p-2">
                  {hasCode && entry.code && (
                    <span className="w-8 shrink-0 text-xs font-semibold" style={{ color: entry.color }}>
                      {entry.code}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
                  <input
                    type="color"
                    value={entry.color}
                    onChange={(e) => handleColorChange(entry, e.target.value)}
                    className="h-6 w-6 shrink-0 cursor-pointer rounded border border-border p-0"
                    title="Color de la etiqueta"
                  />
                  <button
                    onClick={() => startEdit(entry)}
                    className="shrink-0 text-muted-foreground transition hover:text-foreground"
                    title="Editar"
                  >
                    <PencilIcon />
                  </button>
                  {entry.id !== protectedId && (
                    <button
                      onClick={() => handleDelete(entry)}
                      className="shrink-0 text-muted-foreground transition hover:text-status-overdue"
                      title={`Eliminar ${entityLabel}`}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              )
            )}
            {editError && <p className="text-xs text-status-overdue">{editError}</p>}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium capitalize">Agregar {entityLabel}</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={namePlaceholder}
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            {hasCode && (
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ISO"
                maxLength={2}
                className="w-16 rounded-md border border-border bg-white px-3 py-2 text-sm uppercase outline-none focus:border-foreground"
              />
            )}
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
