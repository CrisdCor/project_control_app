"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { StatusBadge } from "@/components/status/status-badge";
import { BITACORA_STATUS, bitacoraStatusKey } from "@/lib/status";
import { CheckSquareIcon } from "@/components/icons";
import { CountryTag } from "@/components/ui/country-tag";
import { flagEmoji } from "@/lib/paises";

function formatDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

export function BitacoraDetailPanel({
  bitacoraId,
  onSaved,
  onClose,
  backLabel = "✕",
  closeOnSave = false,
  fullAccess = false,
}) {
  const isCreate = !bitacoraId;
  const showFieldsForm = isCreate || fullAccess;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [paises, setPaises] = useState([]);
  const [bitacora, setBitacora] = useState(null);
  const [activities, setActivities] = useState([]);
  const [checklistCounts, setChecklistCounts] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [encargadoId, setEncargadoId] = useState("");
  const [paisId, setPaisId] = useState("00000000-0000-0000-0000-000000000001");

  const [activityDetail, setActivityDetail] = useState("");
  const [activityDueDate, setActivityDueDate] = useState("");
  const [activityAssignee, setActivityAssignee] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [observationsDraft, setObservationsDraft] = useState({});

  const [editingActivityId, setEditingActivityId] = useState(null);
  const [editDetail, setEditDetail] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // navegación deslizante a la lista de chequeo interna de una actividad
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);

  async function loadChecklistCounts(supabase, activityIds) {
    if (!activityIds.length) {
      setChecklistCounts({});
      return;
    }
    const { data } = await supabase
      .from("bitacora_activity_checklist")
      .select("activity_id, is_done")
      .in("activity_id", activityIds);
    const counts = {};
    (data ?? []).forEach((c) => {
      counts[c.activity_id] = counts[c.activity_id] ?? { total: 0, done: 0 };
      counts[c.activity_id].total += 1;
      if (c.is_done) counts[c.activity_id].done += 1;
    });
    setChecklistCounts(counts);
  }

  async function load() {
    setLoading(true);
    setError(null);
    setConfirmDelete(false);
    setSelectedActivityId(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    setIsAdmin(profile?.role === "admin");

    const { data: allProfiles } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(allProfiles ?? []);

    const { data: allPaises } = await supabase.from("paises").select("*").order("name");
    setPaises(allPaises ?? []);

    if (!isCreate) {
      const { data: b } = await supabase.from("v_bitacora_status").select("*").eq("id", bitacoraId).maybeSingle();
      setBitacora(b);
      if (b) {
        setName(b.name);
        setDueDate(b.due_date);
        setEncargadoId(b.encargado_id ?? "");
        setPaisId(b.pais_id ?? "00000000-0000-0000-0000-000000000001");
      }

      const { data: acts } = await supabase
        .from("bitacora_activities")
        .select("*")
        .eq("bitacora_id", bitacoraId)
        .order("due_date");
      setActivities(acts ?? []);
      setObservationsDraft(Object.fromEntries((acts ?? []).map((a) => [a.id, a.observations ?? ""])));
      setActivityDueDate(b?.due_date ?? "");
      await loadChecklistCounts(supabase, (acts ?? []).map((a) => a.id));
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
      .order("due_date");
    setActivities(acts ?? []);
    setObservationsDraft(Object.fromEntries((acts ?? []).map((a) => [a.id, a.observations ?? ""])));
    await loadChecklistCounts(supabase, (acts ?? []).map((a) => a.id));
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
        pais_id: paisId,
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
      patch.pais_id = paisId;
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

  function startEditActivity(activity) {
    setEditingActivityId(activity.id);
    setEditDetail(activity.detail);
    setEditDueDate(activity.due_date);
    setEditAssignee(activity.assigned_to ?? "");
    setEditError(null);
  }

  async function saveEditActivity(e) {
    e.preventDefault();
    setEditError(null);
    if (!editDetail.trim()) return;
    if (!editAssignee) return setEditError("Selecciona un responsable para la actividad.");
    if (!editDueDate) return setEditError("La fecha límite de la actividad es obligatoria.");

    setEditSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("bitacora_activities")
      .update({ detail: editDetail.trim(), due_date: editDueDate, assigned_to: editAssignee })
      .eq("id", editingActivityId);
    setEditSaving(false);
    if (updateError) {
      setEditError("No se pudo guardar. Verifica que la fecha no sea posterior a la de la bitácora.");
      return;
    }
    setEditingActivityId(null);
    reloadActivities();
  }

  // ---------- lista de chequeo interna de una actividad ----------
  async function loadActivityChecklist(activityId) {
    const supabase = createClient();
    const { data } = await supabase
      .from("bitacora_activity_checklist")
      .select("*")
      .eq("activity_id", activityId)
      .order("created_at");
    setChecklistItems(data ?? []);
  }

  function openActivityChecklist(activity) {
    setSelectedActivityId(activity.id);
    setNewChecklistText("");
    loadActivityChecklist(activity.id);
  }

  function closeActivityChecklist() {
    setSelectedActivityId(null);
  }

  async function handleAddChecklistItem(e) {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    setAddingChecklistItem(true);
    const supabase = createClient();
    await supabase.from("bitacora_activity_checklist").insert({
      activity_id: selectedActivityId,
      text: newChecklistText.trim(),
      created_by: currentUserId,
    });
    setNewChecklistText("");
    setAddingChecklistItem(false);
    await loadActivityChecklist(selectedActivityId);
    await reloadActivities();
  }

  async function toggleChecklistItem(item) {
    const supabase = createClient();
    await supabase.from("bitacora_activity_checklist").update({ is_done: !item.is_done }).eq("id", item.id);
    await loadActivityChecklist(selectedActivityId);
    await reloadActivities();
  }

  async function deleteChecklistItem(item) {
    const supabase = createClient();
    await supabase.from("bitacora_activity_checklist").delete().eq("id", item.id);
    await loadActivityChecklist(selectedActivityId);
    await reloadActivities();
  }

  const isEncargado = !isCreate && bitacora?.encargado_id === currentUserId;
  const canEditName = isCreate || isAdmin || isEncargado;
  const canEditDueDateEncargado = isCreate || isAdmin; // fecha límite y encargado: solo admin
  const canFinish = isAdmin || isEncargado;
  const canManageActivities = isAdmin || isEncargado;
  const canTouchActivity = (activity) => isAdmin || isEncargado || activity.assigned_to === currentUserId;

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const canEditChecklist = selectedActivity && canTouchActivity(selectedActivity);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {selectedActivityId
              ? selectedActivity?.detail
              : isCreate
                ? "Nueva bitácora"
                : bitacora?.name || "Bitácora"}
          </h2>
          {selectedActivityId && <p className="truncate text-xs text-muted-foreground">Lista de chequeo</p>}
        </div>
        <button
          onClick={selectedActivityId ? closeActivityChecklist : onClose}
          className="shrink-0 text-muted-foreground transition hover:text-foreground"
        >
          {selectedActivityId ? "← Volver" : backLabel}
        </button>
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          {/* Pantalla principal: bitácora + actividades */}
          <div
            className={`absolute inset-0 overflow-y-auto px-6 py-5 transition-transform duration-300 ease-out ${
              selectedActivityId ? "-translate-x-full" : "translate-x-0"
            }`}
          >
            <div className="flex flex-col gap-6">
              {!isCreate && bitacora && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    Fecha límite: {formatDate(bitacora.due_date)}
                    <CountryTag pais={paises.find((p) => p.id === bitacora.pais_id)} />
                  </span>
                  <StatusBadge status={bitacoraStatusKey(bitacora)} map={BITACORA_STATUS} />
                </div>
              )}

              {showFieldsForm && (
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

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">País</label>
                    <FilterDropdown
                      placeholder="Selecciona un país"
                      allowClear={false}
                      value={paisId}
                      onChange={setPaisId}
                      options={paises.map((p) => ({
                        value: p.id,
                        label: p.code ? `${flagEmoji(p.code)} ${p.code} — ${p.name}` : p.name,
                      }))}
                      disabled={!canEditDueDateEncargado}
                    />
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
              )}

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
                        const counts = checklistCounts[activity.id];

                        if (editingActivityId === activity.id) {
                          return (
                            <form
                              key={activity.id}
                              onSubmit={saveEditActivity}
                              className="flex flex-col gap-2 rounded-md border border-border bg-neutral-50 p-2.5"
                            >
                              <textarea
                                value={editDetail}
                                onChange={(e) => setEditDetail(e.target.value)}
                                rows={2}
                                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-foreground"
                              />
                              <div className="flex flex-wrap gap-2">
                                <div className="min-w-[160px] flex-1">
                                  <MultiSelectDropdown
                                    options={profiles.map((p) => ({ id: p.id, name: p.name }))}
                                    selectedIds={editAssignee ? [editAssignee] : []}
                                    onChange={(ids) => setEditAssignee(ids[ids.length - 1] ?? "")}
                                    placeholder="Responsable de la actividad"
                                  />
                                </div>
                                <DatePicker value={editDueDate} onChange={setEditDueDate} max={dueDate} />
                              </div>
                              {editError && <p className="text-xs text-status-overdue">{editError}</p>}
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={editSaving || !editDetail.trim()}
                                  className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingActivityId(null)}
                                  className="rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-white"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          );
                        }

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
                              <button
                                onClick={() => openActivityChecklist(activity)}
                                title="Lista de chequeo interna"
                                className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-neutral-50 hover:text-foreground"
                              >
                                <CheckSquareIcon className="h-3.5 w-3.5" />
                                {counts ? `${counts.done}/${counts.total}` : ""}
                              </button>
                              {canManageActivities && (
                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    onClick={() => startEditActivity(activity)}
                                    className="text-xs text-muted-foreground transition hover:text-foreground"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivity(activity)}
                                    className="text-xs text-muted-foreground transition hover:text-status-overdue"
                                  >
                                    Eliminar
                                  </button>
                                </div>
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

              {!isCreate && isAdmin && fullAccess && (
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

          {/* Pantalla secundaria: lista de chequeo interna de la actividad seleccionada */}
          <div
            className={`absolute inset-0 overflow-y-auto px-6 py-5 transition-transform duration-300 ease-out ${
              selectedActivityId ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {selectedActivity && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  {profiles.find((p) => p.id === selectedActivity.assigned_to)?.name ?? "—"} · fecha límite{" "}
                  {formatDate(selectedActivity.due_date)}
                </p>

                {checklistItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin puntos todavía.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={() => canEditChecklist && toggleChecklistItem(item)}
                          disabled={!canEditChecklist}
                          className="h-4 w-4 shrink-0 accent-black"
                        />
                        <span
                          className={`min-w-0 flex-1 text-sm ${item.is_done ? "text-muted-foreground line-through" : ""}`}
                        >
                          {item.text}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {profiles.find((p) => p.id === item.created_by)?.name ?? "—"}
                        </span>
                        {canEditChecklist && (
                          <button
                            onClick={() => deleteChecklistItem(item)}
                            className="shrink-0 text-muted-foreground transition hover:text-status-overdue"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canEditChecklist && (
                  <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                    <input
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      placeholder="Nuevo punto..."
                      className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                    <button
                      type="submit"
                      disabled={addingChecklistItem || !newChecklistText.trim()}
                      className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                    >
                      Agregar
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
