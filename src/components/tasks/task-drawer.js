"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { ChecklistSection } from "@/components/tasks/checklist-section";
import { StatusBadge } from "@/components/status/status-badge";
import { TASK_STATUS } from "@/lib/status";
import { DatePicker } from "@/components/ui/date-picker";
import { markTaskNotesRead } from "@/lib/notifications";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr) {
  const start = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today - start) / 86400000));
}

export function TaskDrawer({ open, onClose, taskId, projectId, initialTitle, onSaved }) {
  const isCreate = !taskId;

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [project, setProject] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [task, setTask] = useState(null);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [standbyPerson, setStandbyPerson] = useState("");
  const [standbyStartDate, setStandbyStartDate] = useState(todayISO());
  const [cancelReason, setCancelReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function load() {
    if (!open) return;
    setLoading(true);
    setError(null);
    setConfirmDelete(false);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    setIsAdmin(profile?.role === "admin");

    const { data: allProfiles } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(allProfiles ?? []);

    let currentProjectId = projectId;

    if (!isCreate) {
      const { data: t } = await supabase.from("v_task_status").select("*").eq("id", taskId).maybeSingle();
      setTask(t);
      if (t) {
        setTitle(t.title);
        setStartDate(t.start_date);
        setEndDate(t.end_date);
        setStandbyPerson(t.standby_person ?? "");
        setStandbyStartDate(t.standby_start_date ?? todayISO());
        setCancelReason(t.cancel_reason ?? "");
        currentProjectId = t.project_id;
      }

      const { data: assignees } = await supabase
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", taskId);
      setAssigneeIds((assignees ?? []).map((a) => a.user_id));

      const { data: items } = await supabase
        .from("task_checklist")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at");
      setChecklist(items ?? []);

      if (user) {
        markTaskNotesRead(supabase, taskId, user.id);
      }
    } else {
      setTitle(initialTitle ?? "");
      setStartDate(todayISO());
      setEndDate("");
      setAssigneeIds([]);
      setChecklist([]);
    }

    if (currentProjectId) {
      const { data: p } = await supabase
        .from("projects")
        .select("id, name, leader_id, start_date, end_date")
        .eq("id", currentProjectId)
        .maybeSingle();
      setProject(p);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId, projectId]);

  const isAssignee = !isCreate && assigneeIds.includes(currentUser?.id);
  const isLeader = project?.leader_id === currentUser?.id;
  const canEditCore = isAdmin || isAssignee;
  const canEditTitle = isAdmin;
  const canEditAssignees = isAdmin;
  const canPostNotes = isAdmin || isLeader || isAssignee;

  async function reloadAndNotify() {
    await load();
    onSaved?.();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("El nombre de la tarea es obligatorio.");
    if (assigneeIds.length === 0) return setError("Selecciona al menos un responsable.");
    if (project && startDate < project.start_date) {
      return setError("La fecha inicial no puede ser anterior al inicio del proyecto.");
    }
    if (project && endDate > project.end_date) {
      return setError("La fecha final no puede ser posterior al final del proyecto.");
    }
    if (endDate < startDate) return setError("La fecha final no puede ser anterior a la inicial.");

    setSaving(true);
    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (insertError) {
      setSaving(false);
      setError("No se pudo crear la tarea.");
      return;
    }

    await supabase
      .from("task_assignees")
      .insert(assigneeIds.map((userId) => ({ task_id: created.id, user_id: userId })));

    setSaving(false);
    onSaved?.(created);
    onClose();
  }

  async function handleSaveCore(e) {
    e.preventDefault();
    setError(null);

    if (project && startDate < project.start_date) {
      return setError("La fecha inicial no puede ser anterior al inicio del proyecto.");
    }
    if (project && endDate > project.end_date) {
      return setError("La fecha final no puede ser posterior al final del proyecto.");
    }
    if (endDate < startDate) return setError("La fecha final no puede ser anterior a la inicial.");

    setSaving(true);
    const supabase = createClient();
    const patch = { start_date: startDate, end_date: endDate };
    if (canEditTitle) patch.title = title.trim();

    const { error: updateError } = await supabase.from("tasks").update(patch).eq("id", taskId);

    if (canEditAssignees) {
      await supabase.from("task_assignees").delete().eq("task_id", taskId);
      if (assigneeIds.length) {
        await supabase
          .from("task_assignees")
          .insert(assigneeIds.map((userId) => ({ task_id: taskId, user_id: userId })));
      }
    }

    setSaving(false);
    if (updateError) {
      setError("No se pudo guardar la tarea.");
      return;
    }
    reloadAndNotify();
  }

  async function setStandby() {
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ standby_person: standbyPerson.trim(), standby_start_date: standbyStartDate })
      .eq("id", taskId);
    reloadAndNotify();
  }

  async function clearStandby() {
    const supabase = createClient();
    await supabase.from("tasks").update({ standby_person: null, standby_start_date: null }).eq("id", taskId);
    setStandbyPerson("");
    reloadAndNotify();
  }

  async function cancelTask() {
    if (!cancelReason.trim()) return setError("Indica el motivo de cancelación.");
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ cancel_date: todayISO(), cancel_reason: cancelReason.trim() })
      .eq("id", taskId);
    reloadAndNotify();
  }

  async function reopenTask() {
    const supabase = createClient();
    await supabase.from("tasks").update({ cancel_date: null, cancel_reason: null }).eq("id", taskId);
    reloadAndNotify();
  }

  async function finishTask() {
    const supabase = createClient();
    await supabase.from("tasks").update({ finished_at: new Date().toISOString() }).eq("id", taskId);
    reloadAndNotify();
  }

  async function unfinishTask() {
    const supabase = createClient();
    await supabase.from("tasks").update({ finished_at: null }).eq("id", taskId);
    reloadAndNotify();
  }

  async function handleDeleteTask() {
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", taskId);
    onSaved?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-lg animate-slide-in-right flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">{isCreate ? "Nueva tarea" : "Editar tarea"}</h2>
          <button onClick={onClose} className="text-muted-foreground transition hover:text-foreground">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-6">
              {!isCreate && task && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{project?.name}</span>
                  <StatusBadge status={task.status} map={TASK_STATUS} />
                </div>
              )}

              <form onSubmit={isCreate ? handleCreate : handleSaveCore} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Tarea</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!isCreate && !canEditTitle}
                    className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground disabled:bg-neutral-50 disabled:text-muted-foreground"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Responsable(s)</label>
                  <MultiSelectDropdown
                    options={profiles.map((p) => ({ id: p.id, name: p.name }))}
                    selectedIds={assigneeIds}
                    onChange={setAssigneeIds}
                    placeholder="Selecciona responsables..."
                    disabled={!isCreate && !canEditAssignees}
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label className="text-sm font-medium">Fecha inicial</label>
                    <DatePicker
                      value={startDate}
                      min={project?.start_date}
                      max={project?.end_date}
                      onChange={setStartDate}
                      disabled={!isCreate && !canEditCore}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label className="text-sm font-medium">Fecha final</label>
                    <DatePicker
                      value={endDate}
                      min={project?.start_date}
                      max={project?.end_date}
                      onChange={setEndDate}
                      disabled={!isCreate && !canEditCore}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-status-overdue">{error}</p>}

                {(isCreate || canEditCore) && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : isCreate ? "Crear tarea" : "Guardar cambios"}
                  </button>
                )}
              </form>

              {!isCreate && canEditCore && (
                <>
                  <div className="rounded-md border border-border p-4">
                    <h3 className="mb-2 text-sm font-semibold">Stand by</h3>
                    {task?.standby_start_date ? (
                      <div className="flex flex-col gap-2 text-sm">
                        <p>
                          Esperando a <span className="font-medium">{task.standby_person}</span> ·{" "}
                          {daysSince(task.standby_start_date)} día(s)
                        </p>
                        <button
                          onClick={clearStandby}
                          className="self-start rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                        >
                          Quitar de stand by
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input
                          value={standbyPerson}
                          onChange={(e) => setStandbyPerson(e.target.value)}
                          placeholder="Nombre de la persona externa"
                          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
                        />
                        <DatePicker
                          value={standbyStartDate}
                          onChange={setStandbyStartDate}
                        />
                        <button
                          onClick={setStandby}
                          disabled={!standbyPerson.trim()}
                          className="self-start rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50 disabled:opacity-50"
                        >
                          Poner en stand by
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-border p-4">
                    <h3 className="mb-2 text-sm font-semibold">Cancelación</h3>
                    {task?.cancel_date ? (
                      <div className="flex flex-col gap-2 text-sm">
                        <p>
                          Cancelada el {new Date(task.cancel_date + "T00:00:00").toLocaleDateString("es-CO")}
                        </p>
                        <p className="text-muted-foreground">{task.cancel_reason}</p>
                        <button
                          onClick={reopenTask}
                          className="self-start rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                        >
                          Reabrir tarea
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Motivo de la cancelación"
                          rows={2}
                          className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
                        />
                        <button
                          onClick={cancelTask}
                          className="self-start rounded-md border border-status-overdue/40 px-3 py-1.5 text-xs text-status-overdue transition hover:bg-red-50"
                        >
                          Cancelar tarea
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-border p-4">
                    <h3 className="mb-2 text-sm font-semibold">Finalización</h3>
                    {task?.finished_at ? (
                      <div className="flex flex-col gap-2 text-sm">
                        <p>Finalizada el {new Date(task.finished_at).toLocaleDateString("es-CO")}</p>
                        <button
                          onClick={unfinishTask}
                          className="self-start rounded-md border border-border px-3 py-1.5 text-xs transition hover:bg-neutral-50"
                        >
                          Reabrir tarea
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={finishTask}
                        className="self-start rounded-md bg-status-done px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                      >
                        Marcar como finalizada
                      </button>
                    )}
                  </div>
                </>
              )}

              {!isCreate && (
                <div className="rounded-md border border-border p-4">
                  <h3 className="mb-3 text-sm font-semibold">Notas de la tarea</h3>
                  <ChecklistSection
                    taskId={taskId}
                    items={checklist}
                    profiles={profiles}
                    canPost={canPostNotes}
                    currentUserId={currentUser?.id}
                    isAdmin={isAdmin}
                    onChanged={reloadAndNotify}
                  />
                </div>
              )}

              {!isCreate && isAdmin && (
                <div className="rounded-md border border-status-overdue/40 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-status-overdue">Eliminar tarea</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Esta acción elimina la tarea, su checklist y su historial de forma permanente.
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
    </div>
  );
}
