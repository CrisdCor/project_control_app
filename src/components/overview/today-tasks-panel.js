"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DueDot } from "@/components/status/status-badge";
import { dueSemaphore, agendaSemaphore } from "@/lib/status";
import { DatePicker } from "@/components/ui/date-picker";
import { BitacoraDrawer } from "@/components/bitacoras/bitacora-drawer";
import { fetchMyBitacoraIds } from "@/lib/bitacoras";
import { flagEmoji } from "@/lib/paises";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { NotebookIcon, FolderIcon } from "@/components/icons";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TodayTasksPanel({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerBitacoraId, setDrawerBitacoraId] = useState(null);
  const [paisesById, setPaisesById] = useState({});

  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPaisId, setEditPaisId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    const supabase = createClient();
    setLoading(true);
    const today = todayISO();

    const myBitacoraIds = await fetchMyBitacoraIds(supabase, userId);

    const [{ data: agendaRows }, { data: bitacoraRows }, { data: paisesData }] = await Promise.all([
      supabase
        .from("agenda_items")
        .select("*")
        .eq("user_id", userId)
        .eq("done", false)
        .lte("due_date", today),
      myBitacoraIds.length
        ? supabase
            .from("v_bitacora_status")
            .select("*")
            .in("id", myBitacoraIds)
            .neq("status", "finalizado")
            .lte("due_date", today)
        : Promise.resolve({ data: [] }),
      supabase.from("paises").select("*"),
    ]);

    setPaisesById(Object.fromEntries((paisesData ?? []).map((p) => [p.id, p])));

    const agenda = (agendaRows ?? []).map((a) => ({
      kind: "agenda",
      id: a.id,
      title: a.text,
      due_date: a.due_date,
      pais_id: a.pais_id,
    }));
    const bitacoras = (bitacoraRows ?? []).map((b) => ({
      kind: "bitacora",
      id: b.id,
      title: b.name,
      due_date: b.due_date,
      pais_id: b.pais_id,
    }));

    const merged = [...agenda, ...bitacoras].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    setItems(merged);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function toggleAgendaDone(item) {
    setItems((prev) => prev.filter((i) => !(i.kind === "agenda" && i.id === item.id)));
    const supabase = createClient();
    await supabase
      .from("agenda_items")
      .update({ done: true, done_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  function startEditAgenda(item) {
    setEditingItem(item);
    setEditText(item.title);
    setEditDate(item.due_date);
    setEditPaisId(item.pais_id ?? "00000000-0000-0000-0000-000000000001");
  }

  async function saveEditAgenda(e) {
    e?.preventDefault();
    if (!editingItem || !editText.trim()) return;
    setSavingEdit(true);
    const supabase = createClient();
    await supabase
      .from("agenda_items")
      .update({ text: editText.trim(), due_date: editDate, pais_id: editPaisId })
      .eq("id", editingItem.id);
    setSavingEdit(false);
    setEditingItem(null);
    load();
  }

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 shrink-0 text-sm font-semibold">Tareas del día</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin tareas vencidas ni para hoy. Vas al día.</p>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col divide-y divide-border overflow-y-auto">
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2.5 py-2">
              <span
                title={item.kind === "agenda" ? "Tarea de agenda" : "Bitácora"}
                className="shrink-0 text-muted-foreground"
              >
                {item.kind === "agenda" ? <NotebookIcon className="h-3.5 w-3.5" /> : <FolderIcon className="h-3.5 w-3.5" />}
              </span>

              {paisesById[item.pais_id]?.code && (
                <span title={paisesById[item.pais_id].name} className="shrink-0">
                  {flagEmoji(paisesById[item.pais_id].code)}
                </span>
              )}

              <DueDot
                color={item.kind === "agenda" ? agendaSemaphore(item.due_date) : dueSemaphore(item.due_date)}
              />

              {item.kind === "agenda" ? (
                <>
                  <input
                    type="checkbox"
                    onChange={() => toggleAgendaDone(item)}
                    className="h-4 w-4 shrink-0 accent-black"
                  />
                  <button
                    onDoubleClick={() => startEditAgenda(item)}
                    title="Doble clic para editar"
                    className="min-w-0 flex-1 truncate text-left text-sm"
                  >
                    {item.title}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDrawerBitacoraId(item.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                >
                  {item.title}
                </button>
              )}

              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(item.due_date + "T00:00:00").toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      <BitacoraDrawer
        open={Boolean(drawerBitacoraId)}
        onClose={() => setDrawerBitacoraId(null)}
        bitacoraId={drawerBitacoraId}
        onSaved={load}
      />

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs animate-fade-in rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-lg"
          >
            <h3 className="mb-3 text-sm font-semibold">Editar tarea</h3>
            <form onSubmit={saveEditAgenda} className="flex flex-col gap-3">
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <DatePicker value={editDate} onChange={setEditDate} />
              <FilterDropdown
                allowClear={false}
                value={editPaisId}
                onChange={setEditPaisId}
                options={Object.values(paisesById).map((p) => ({
                  value: p.id,
                  label: p.code ? `${flagEmoji(p.code)} ${p.name}` : p.name,
                }))}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingEdit || !editText.trim()}
                  className="flex-1 rounded-md bg-black py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 rounded-md border border-border py-1.5 text-xs transition hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
