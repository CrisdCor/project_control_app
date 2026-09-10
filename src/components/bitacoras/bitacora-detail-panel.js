"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { StatusBadge } from "@/components/status/status-badge";
import { BITACORA_STATUS, bitacoraStatusKey } from "@/lib/status";

function formatDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

export function BitacoraDetailPanel({ bitacoraId, onSaved, onClose, backLabel = "✕", closeOnSave = false }) {
  const isCreate = !bitacoraId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [bitacora, setBitacora] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [encargadoId, setEncargadoId] = useState("");

  const [activityDetail, setActivityDetail] = useState("");
  const [activityDueDate, setActivityDueDate] = useState("");
  const [activityAssignee, setActivityAssignee] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [observationsDraft, setObservationsDraft] = useState({});

  async function load() {
    setLoading(true);
    setError(null);
    setConfirmDelete(false);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    setIsAdmin(profile?.role === "admin");

    const { data: allProfiles } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(allProfiles ?? []);

    if (!isCreate) {
      const { data: b } = await supabase.from("v_bitacora_status").select("*").eq("id", bitacoraId).maybeSingle();
      setBitacora(b);
      if (b) {
        setName(b.name);
        setDueDate(b.due_date);
        setEncargadoId(b.encargado_id ?? "");
      }

      const { data: acts } = await supabase
        .from("bitacora_activities")
        .select("*")
        .eq("bitacora_id", bitacoraId)
        .order("created_at");
      setActivities(acts ?? []);
      setObservationsDraft(Object.fromEntries((acts ?? []).map((a) => [a.id, a.observations ?? ""])));
      setActivityDueDate(b?.due_date ?? "");
    } else {
      setName("");
      setDueDate("");
      setEncargadoId("");
      setActivities([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitacoraId]);

  async function reloadBitacoraOnly() {
    const supabase = createClient();
    const { data: b } = await supabase.from("v_bitacora_status").select("*").eq("id", bitacoraId).maybeSingle();
    setBitacora(b);
    onSaved?.();
  }

  async function reloadActivities() {
    const supabase = createClient();
    const { data: acts } = await supabase
      .from("bitacora_activities")
      .select("*")
      .eq("bitacora_id", bitacoraId)
      .order("created_at");
    setActivities(acts ?? []);
    setObservationsDraft(Object.fromEntries((acts ?? []).map((a) => [a.id, a.observations ?? ""])));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("El nombre de la bitácora es obligatorio.");
    if (!dueDate) return setError("La fecha límite es obligatoria.");
    if (!encargadoId) return setError("Selecciona un encargado.");

    setSaving(true);
    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("bitacoras")
      .insert({
        name: name.trim(),
        due_date: dueDate,
        encargado_id: encargadoId,
        created_by: currentUserId,
      })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError("No se pudo crear la bitácora.");
      return;
    }

    onSaved?.(created);
    onClose?.();
  }

  async function handleSaveCore(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("El nombre de la bitácora es obligatorio.");
    if (!dueDate) return setError("La fecha límite es obligatoria.");
    if (!encargadoId) return setError("Selecciona un encargado.");

    setSaving(true);
    const supabase = createClient();
    const patch = { name: name.trim() };
    if (isAdmin) {
      patch.due_date = dueDate;
      patch.encargado_id = encargadoId;
    }
    const { error: updateError } = await supabase.from("bitacoras").update(patch).eq("id", bitacoraId);

    setSaving(false);
    if (updateError) {
      setError("No se pudo guardar la bitácora.");
      return;
    }
    await reloadBitacoraOnly();
    if (closeOnSave) onClose?.();
  }

  // admin: finaliza y aprueba de una vez. encargado (no admin): queda pendiente de aprobación.
  async function markCompleted() {
    const supabase = createClient();
    const now = new Date().toISOString();
    const patch = isAdmin ? { completed_at: now, finished_at: now } : { completed_at: now };
    await supabase.from("bitacoras").update(patch).eq("id", bitacoraId);
    reloadBitacoraOnly();
  }

  // el encargado deshace su propio envío, o el admin la rechaza: vuelve a pendiente/vencida
  async function undoCompleted() {
    const supabase = createClient();
    await supabase.from("bitacoras").update({ completed_at: null }).eq("id", bitacoraId);
    reloadBitacoraOnly();
  }

  async function approveBitacora() {
    const supabase = createClient();
    await supabase.from("bitacoras").update({ finished_at: new Date().toISOString() }).eq("id", bitacoraId);
    reloadBitacoraOnly();
  }

  async function reopenBitacora() {
    const supabase = createClient();
    await supabase.from("bitacoras").update({ finished_at: null, completed_at: null }).eq("id", bitacoraId);
    reloadBitacoraOnly();
  }

  async function handleDeleteBitacora() {
    const supabase = createClient();
    await supabase.from("bitacoras").delete().eq("id", bitacoraId);
    onSaved?.();
    onClose?.();
  }

  async function handleAddActivity(e) {
    e.preventDefault();
    setActivityError(null);
    if (!activityDetail.trim()) return;
    if (!activityAssignee) return setActivityError("Selecciona un responsable para la actividad.");
    if (!activityDueDate) return setActivityError("La fecha límite de la actividad es obligatoria.");

    setAddingActivity(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("bitacora_activities").insert({
      bitacora_id: bitacoraId,
      detail: activityDetail.trim(),
      due_date: activityDueDate,
      assigned_to: activityAssignee,
      created_by: currentUserId,
    });
    setAddingActivity(false);
    if (insertError) {
      setActivityError("No se pudo agregar. Verifica que la fecha no sea posterior a la de la bitácora.");
      return;
    }
    setActivityDetail("");
    reloadActivities();
  }

  async function toggleActivityDone(activity) {
    const supabase = createClient();
    await supabase.from("bitacora_activities").update({ is_done: !activity.is_done }).eq("id", activity.id);
    reloadActivities();
  }

  async function saveObservations(activity) {
    const text = observationsDraft[activity.id] ?? "";
    if (text === (activity.observations ?? "")) return;
    const supabase = createClient();
    await supabase.from("bitacora_activities").update({ observations: text || null }).eq("id", activity.id);
    reloadActivities();
  }

  async function handleDeleteActivity(activity) {
    const supabase = createClient();
    await supabase.from("bitacora_activities").delete().eq("id", activity.id);
    reloadActivities();
  }

  const isEncargado = !isCreate && bitacora?.encargado_id === currentUserId;
  const canEditName = isCreate || isAdmin || isEncargado;
  const canEditDueDateEncargado = isCreate || isAdmin; // fecha límite y encargado: solo admin
  const canFinish = isAdmin || isEncargado;
  const canManageActivities = isAdmin || isEncargado;
  const canTouchActivity = (activity) => isAdmin || isEncargado || activity.assigned_to === currentUserId;

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{isCreate ? "Nueva bitácora" : bitacora?.name || "Bitácora"}</h2>
        </div>
        <button onClick={onClose} className="shrink-0 text-muted-foreground transition hover:text-foreground">
          {backLabel}
        </button>
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-6">
            {!isCreate && bitacora && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Fecha límite: {formatDate(bitacora.due_date)}</span>
                <StatusBadge status={bitacoraStatusKey(bitacora)} map={BITACORA_STATUS} />
              </div>
            )}

            <form onSubmit={isCreate ? handleCreate : handleSaveCore} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Bitácora</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEditName}
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground disabled:bg-neutral-50 disabled:text-muted-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Encargado</label>
                <FilterDropdown
                  placeholder="Selecciona un encargado"
                  allowClear={false}
                  value={encargadoId}
                  onChange={setEncargadoId}
                  options={profiles.map((p) => ({ value: p.id, label: p.name }))}
                />
                {!canEditDueDateEncargado && (
                  <p className="text-xs text-muted-foreground">Solo el administrador puede reasignar el encargado.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Fecha límite</label>
                <DatePicker value={dueDate} onChange={setDueDate} disabled={!canEditDueDateEncargado} />
                {!canEditDueDateEncargado && (
                  <p className="text-xs text-muted-foreground">Solo el administrador puede cambiar la fecha límite.</p>
                )}
              </div>

              {error && <p className="text-sm text-status-overdue">{error}</p>}

              {(isCreate || canEditName) && (
                <button
                  type="submit"
                  disabled={saving}
                  className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : isCreate ? "Crear bitácora" : "Guardar cambios"}
                </button>
              )}
            </form>

            {!isCreate && (canFinish || (isAdmin && bitacora?.completed_at)) && (
              <div className="rounded-md border border-border p-4">
                <h3 className="mb-2 text-sm font-semibold">Cierre de la bitácora</h3>
                {bitacora?.finished_at ? (
                  <div className="flex flex-col gap-2 text-sm">
                    <p>Finalizada el {new Date(bitacora.finished_at).toLocaleDateString("es-CO")}</p>
                    {isAdmin && (
                      <button
                        onClick={reopenBitacora}
                        className="self-start rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                      >
                        Reabrir bitácora
                      </button>
                    )}
                  </div>
                ) : bitacora?.completed_at ? (
                  <div className="flex flex-col gap-2 text-sm">
                    <p className="text-status-attention">
                      Pendiente por aprobación — cerrada el{" "}
                      {new Date(bitacora.completed_at).toLocaleDateString("es-CO")}
                    </p>
                    <div className="flex gap-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={approveBitacora}
                            className="rounded-md bg-status-done px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={undoCompleted}
                            className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                          >
                            Rechazar
                          </button>
                        </>
                      ) : (
                        isEncargado && (
                          <button
                            onClick={undoCompleted}
                            className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                          >
                            Deshacer envío
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={markCompleted}
                    className="self-start rounded-md bg-status-done px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                  >
                    {isAdmin ? "Marcar como finalizada" : "Marcar como cerrada"}
                  </button>
                )}
              </div>
            )}

            {!isCreate && (
              <div className="rounded-md border border-border p-4">
                <h3 className="text-sm font-semibold">Lista de chequeo</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Agregando actividades a <span className="font-medium text-foreground">{bitacora?.name}</span> ·
                  fecha límite: {formatDate(dueDate)}
                </p>

                {activities.length === 0 ? (
                  <p className="mb-3 text-sm text-muted-foreground">Sin actividades todavía.</p>
                ) : (
                  <div className="mb-4 flex flex-col gap-2">
                    {activities.map((activity) => {
                      const editable = canTouchActivity(activity);
                      return (
                        <div key={activity.id} className="rounded-md border border-border p-2.5">
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={activity.is_done}
                              onChange={() => editable && toggleActivityDone(activity)}
                              disabled={!editable}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                            />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${activity.is_done ? "text-muted-foreground line-through" : ""}`}>
                                {activity.detail}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {profiles.find((p) => p.id === activity.assigned_to)?.name ?? "—"} ·{" "}
                                {new Date(activity.due_date + "T00:00:00").toLocaleDateString("es-CO")}
                              </p>
                            </div>
                            {canManageActivities && (
                              <button
                                onClick={() => handleDeleteActivity(activity)}
                                className="shrink-0 text-xs text-muted-foreground transition hover:text-status-overdue"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>

                          {editable ? (
                            <textarea
                              value={observationsDraft[activity.id] ?? ""}
                              onChange={(e) =>
                                setObservationsDraft((prev) => ({ ...prev, [activity.id]: e.target.value }))
                              }
                              onBlur={() => saveObservations(activity)}
                              placeholder="Observaciones (opcional)..."
                              rows={2}
                              className="mt-2 w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-foreground"
                            />
                          ) : (
                            activity.observations && (
                              <p className="mt-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs text-muted-foreground">
                                {activity.observations}
                              </p>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {canManageActivities && (
                  <form onSubmit={handleAddActivity} className="flex flex-col gap-2 border-t border-border pt-3">
                    <textarea
                      value={activityDetail}
                      onChange={(e) => setActivityDetail(e.target.value)}
                      placeholder="Detalle de la actividad..."
                      rows={2}
                      className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                    <div className="flex flex-wrap gap-2">
                      <div className="min-w-[160px] flex-1">
                        <MultiSelectDropdown
                          options={profiles.map((p) => ({ id: p.id, name: p.name }))}
                          selectedIds={activityAssignee ? [activityAssignee] : []}
                          onChange={(ids) => setActivityAssignee(ids[ids.length - 1] ?? "")}
                          placeholder="Responsable de la actividad"
                        />
                      </div>
                      <DatePicker
                        value={activityDueDate}
                        onChange={setActivityDueDate}
                        max={dueDate}
                        placeholder="Fecha límite"
                      />
                      <button
                        type="submit"
                        disabled={addingActivity || !activityDetail.trim()}
                        className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                      >
                        Agregar
                      </button>
                    </div>
                    {activityError && <p className="text-xs text-status-overdue">{activityError}</p>}
                  </form>
                )}
              </div>
            )}

            {!isCreate && isAdmin && (
              <div className="rounded-md border border-status-overdue/40 p-4">
                <h3 className="mb-2 text-sm font-semibold text-status-overdue">Eliminar bitácora</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Esta acción elimina la bitácora y sus actividades de forma permanente.
                </p>
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteBitacora}
                      className="rounded-md bg-status-overdue px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                    >
                      Confirmar eliminación
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-md border border-status-overdue/40 px-3 py-1.5 text-xs text-status-overdue transition hover:bg-red-50"
                  >
                    Eliminar bitácora
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
