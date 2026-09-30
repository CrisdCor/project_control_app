"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { paisOptions } from "@/lib/paises";

// Antes este formulario (texto + fecha + país) estaba duplicado casi entero
// entre AgendaPanel y TodayTasksPanel.
export function AgendaTaskModal({
  open,
  title,
  text,
  onTextChange,
  date,
  onDateChange,
  paisId,
  onPaisIdChange,
  paises,
  onSubmit,
  onCancel,
  saving,
  submitLabel = "Guardar",
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs animate-fade-in rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-lg"
      >
        <h3 className="mb-3 text-sm font-semibold">{title}</h3>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Descripción de la tarea..."
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <DatePicker value={date} onChange={onDateChange} />
          <FilterDropdown
            allowClear={false}
            value={paisId}
            onChange={onPaisIdChange}
            fullWidth
            options={paisOptions(paises)}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !text.trim()}
              className="flex-1 rounded-md bg-black py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-border py-1.5 text-xs transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
