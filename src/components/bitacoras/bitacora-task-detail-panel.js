"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { StatusBadge } from "@/components/status/status-badge";
import { BITACORA_TASK_STATUS } from "@/lib/status";

export function BitacoraTaskDetailPanel({ taskId, bitacoraId, onSaved, onClose, backLabel = "✕", closeOnSave = false }) {
  const isCreate = !taskId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bitacora, setBitacora] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [task, setTask] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [encargadoId, setEncargadoId] = useState("");

  const [activityDetail, setActivityDetail] = useState("");
  const [activityDueDate, setActivityDueDate] = useState("");
  const [activityAssignee, setActivityAssignee] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);
  const [activityError, setActivityError] = useState(null);

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

    let currentBitacoraId = bitacoraId;

    if (!isCreate) {
      const { data: t } = await supabase.from("v_bitacora_task_status").select("*").eq("id", taskId).maybeSingle();
      setTask(t);
      if (t) {
        setTitle(t.title);
        setDueDate(t.due_date);
        setEncargadoId(t.encargado_id ?? "");
        currentBitacoraId = t.bitacora_id;
      }

      const { data: acts } = await supabase
        .from("bitacora_activities")
        .select("*")
        .eq("bitacora_task_id", taskId)
        .order("created_at");
      setActivities(acts ?? []);
      setActivityDueDate(t?.due_date ?? "");
    } else {
      setTitle("");
      setDueDate("");
      setEncargadoId("");
      setActivities([]);
    }

    if (currentBitacoraId) {
      const { data: b } = await supabase.from("bitacoras").select("id, name").eq("id", currentBitacoraId).maybeSingle();
      setBitacora(b);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, bitacoraId]);

  async function reloadTaskOnly() {
    const supabase = createClient();
    const { data: t } = await supabase.from("v_bitacora_task_status").select("*").eq("id", taskId).maybeSingle();
    setTask(t);
    onSaved?.();
  }

  async function reloadActivities() {
    const supabase = createClient();
    const { data: acts } = await supabase
      .from("bitacora_activities")
      .select("*")
      .eq("bitacora_task_id", taskId)
      .order("created_at");
    setActivities(acts ?? []);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("El nombre de la tarea es obligatorio.");
    if (!dueDate) return setError("La fecha límite es obligatoria.");
    if (!encargadoId) return setError("Selecciona un encargado.");

    setSaving(true);
    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("bitacora_tasks")
      .insert({
        bitacora_id: bitacoraId,
        title: title.trim(),
        due_date: dueDate,
        encargado_id: encargadoId,
        created_by: currentUserId,
      })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError("No se pudo crear la tarea.");
      return;
    }

    onSaved?.(created);
    onClose?.();
  }

  async function handleSaveCore(e) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("El nombre de la tarea es obligatorio.");
    if (!dueDate) return setError("La fecha límite es obligatoria.");
    if (!encargadoId) return setError("Selecciona un encargado.");

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("bitacora_tasks")
      .update({ title: title.trim(), due_date: dueDate, encargado_id: encargadoId })
      .eq("id", taskId);

    setSaving(false);
    if (updateError) {
      setError("No se pudo guardar la tarea. Verifica que las fechas de las actividades no queden por delante.");
      return;
    }
    await reloadTaskOnly();
    if (closeOnSave) onClose?.();
  }

  async function toggleFinished() {
    const supabase = createClient();
    await supabase
      .from("bitacora_tasks")
      .update({ finished_at: task.finished_at ? null : new Date().toISOString() })
      .eq("id", taskId);
    reloadTaskOnly();
  }

  async function handleDeleteTask() {
    const supabase = createClient();
    await supabase.from("bitacora_tasks").delete().eq("id", taskId);
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
      bitacora_task_id: taskId,
      detail: activityDetail.trim(),
      due_date: activityDueDate,
      assigned_to: activityAssignee,
      created_by: currentUserId,
    });
    setAddingActivity(false);
    if (insertError) {
      setActivityError("No se pudo agregar. Verifica que la fecha no sea posterior a la de la tarea.");
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

  async function handleDeleteActivity(activity) {
    const supabase = createClient();
    await supabase.from("bitacora_activities").delete().eq("id", activity.id);
    reloadActivities();
  }

  const isEncargado = !isCreate && task?.encargado_id === currentUserId;
  const canManageTask = isAdmin; // título, fecha límite y encargado: solo admin
  const canFinish = isAdmin || isEncargado; // cerrar la tarea: admin o el encargado
  const canManageActivities = isAdmin || isEncargado; // crear/editar/eliminar actividades
  const canEditActivityDone = (activity) => isAdmin || isEncargado || activity.assigned_to === currentUserId;

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold">{isCreate ? "Nueva tarea" : "Editar tarea"}</h2>
        <button onClick={onClose} className="text-muted-foreground transition hover:text-foreground">
          {backLabel}
        </button>
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-6">
            {!isCreate && task && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{bitacora?.name}</span>
                <StatusBadge status={task.status} map={BITACORA_TASK_STATUS} />
              </div>
            )}

            <form onSubmit={isCreate ? handleCreate : handleSaveCore} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Tarea</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isCreate && !canManageTask}
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
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Fecha límite</label>
                <DatePicker value={dueDate} onChange={setDueDate} disabled={!isCreate && !canManageTask} />
              </div>

              {error && <p className="text-sm text-status-overdue">{error}</p>}

              {(isCreate || canManageTask) && (
                <button
                  type="submit"
                  disabled={saving}
                  className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : isCreate ? "Crear tarea" : "Guardar cambios"}
                </button>
              )}
            </form>

            {!isCreate && canFinish && (
              <div className="rounded-md border border-border p-4">
                <h3 className="mb-2 text-sm font-semibold">Finalización</h3>
                {task?.finished_at ? (
                  <div className="flex flex-col gap-2 text-sm">
                    <p>Finalizada el {new Date(task.finished_at).toLocaleDateString("es-CO")}</p>
                    <button
                      onClick={toggleFinished}
                      className="self-start rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                    >
                      Reabrir tarea
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={toggleFinished}
                    className="self-start rounded-md bg-status-done px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                  >
                    Marcar como finalizada
                  </button>
                )}
              </div>
            )}

            {!isCreate && (
              <div className="rounded-md border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold">Lista de chequeo</h3>
                {activities.length === 0 ? (
                  <p className="mb-3 text-sm text-muted-foreground">Sin actividades todavía.</p>
                ) : (
                  <div className="mb-4 flex flex-col gap-2">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-2.5 rounded-md border border-border p-2.5">
                        <input
                          type="checkbox"
                          checked={activity.is_done}
                          onChange={() => canEditActivityDone(activity) && toggleActivityDone(activity)}
                          disabled={!canEditActivityDone(activity)}
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
                    ))}
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
                <h3 className="mb-2 text-sm font-semibold text-status-overdue">Eliminar tarea</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Esta acción elimina la tarea y sus actividades de forma permanente.
                </p>
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteTask}
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
                    Eliminar tarea
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
