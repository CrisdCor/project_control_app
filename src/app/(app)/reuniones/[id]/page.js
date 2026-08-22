"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { ProjectFormModal } from "@/components/proyectos/project-form-modal";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const CONVERTED_LABEL = {
  task: "Convertida en tarea",
  project: "Convertida en proyecto",
  agenda: "Enviada a agenda",
};

export default function ReunionDetallePage() {
  const { id } = useParams();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [projectName, setProjectName] = useState(null);
  const [participantNames, setParticipantNames] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [suggestedResponsible, setSuggestedResponsible] = useState("");
  const [suggestedDueDate, setSuggestedDueDate] = useState("");
  const [adding, setAdding] = useState(false);

  const [taskDrawerItem, setTaskDrawerItem] = useState(null);
  const [projectModalItem, setProjectModalItem] = useState(null);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");
    }

    const { data: m } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
    setMeeting(m);

    if (m?.project_id) {
      const { data: p } = await supabase.from("projects").select("name").eq("id", m.project_id).maybeSingle();
      setProjectName(p?.name ?? null);
    }

    const { data: participants } = await supabase
      .from("meeting_participants")
      .select("profiles(name)")
      .eq("meeting_id", id);
    setParticipantNames((participants ?? []).map((p) => p.profiles?.name).filter(Boolean));

    const { data: profs } = await supabase.from("profiles").select("id, name").order("name");
    setProfiles(profs ?? []);

    const { data: actionItems } = await supabase
      .from("meeting_action_items")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at");
    setItems(actionItems ?? []);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddItem(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setAdding(true);
    const supabase = createClient();
    await supabase.from("meeting_action_items").insert({
      meeting_id: id,
      description: description.trim(),
      suggested_responsible: suggestedResponsible || null,
      suggested_due_date: suggestedDueDate || null,
      created_by: currentUserId,
    });
    setDescription("");
    setSuggestedResponsible("");
    setSuggestedDueDate("");
    setAdding(false);
    load();
  }

  async function handleDeleteItem(item) {
    const supabase = createClient();
    await supabase.from("meeting_action_items").delete().eq("id", item.id);
    load();
  }

  async function handleConvertAgenda(item) {
    const supabase = createClient();
    const { data: agendaItem } = await supabase
      .from("agenda_items")
      .insert({
        user_id: currentUserId,
        text: item.description,
        due_date: item.suggested_due_date || todayISO(),
      })
      .select()
      .single();

    await supabase
      .from("meeting_action_items")
      .update({ converted_to: "agenda", converted_ref_id: agendaItem?.id })
      .eq("id", item.id);
    load();
  }

  async function handleTaskCreated(item, task) {
    const supabase = createClient();
    await supabase
      .from("meeting_action_items")
      .update({ converted_to: "task", converted_ref_id: task.id })
      .eq("id", item.id);
    setTaskDrawerItem(null);
    load();
  }

  async function handleProjectCreated(item, project) {
    const supabase = createClient();
    await supabase
      .from("meeting_action_items")
      .update({ converted_to: "project", converted_ref_id: project.id })
      .eq("id", item.id);
    setProjectModalItem(null);
    load();
  }

  const profileName = (pid) => profiles.find((p) => p.id === pid)?.name ?? "—";

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (!meeting) return <p className="text-sm text-muted-foreground">No se encontró la reunión.</p>;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/reuniones" className="text-sm text-muted-foreground hover:underline">
          ← Reuniones
        </Link>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm">
        <h1 className="mb-1 text-base font-semibold">{meeting.title}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(meeting.meeting_date + "T00:00:00").toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          {projectName && <> · Proyecto: {projectName}</>}
        </p>
        {participantNames.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Participantes: {participantNames.join(", ")}</p>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Ítems de acción</h2>

        {items.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">Aún no hay ítems registrados.</p>
        ) : (
          <div className="mb-5 flex flex-col gap-3">
            {items.map((item) => {
              const canDelete = isAdmin || item.created_by === currentUserId;
              return (
                <div key={item.id} className="rounded-md border border-border p-3">
                  <p className="text-sm">{item.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.suggested_responsible && <>Sugerido: {profileName(item.suggested_responsible)} · </>}
                    {item.suggested_due_date &&
                      new Date(item.suggested_due_date + "T00:00:00").toLocaleDateString("es-CO")}
                  </p>

                  {item.converted_to !== "none" ? (
                    <p className="mt-2 text-xs font-medium text-status-done">
                      {CONVERTED_LABEL[item.converted_to]}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {isAdmin && (
                        <button
                          onClick={() => setTaskDrawerItem(item)}
                          disabled={!meeting.project_id}
                          title={
                            !meeting.project_id
                              ? "Vincula esta reunión a un proyecto para convertir en tarea"
                              : undefined
                          }
                          className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-neutral-50 disabled:opacity-40"
                        >
                          Convertir en tarea
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setProjectModalItem(item)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-neutral-50"
                        >
                          Convertir en proyecto
                        </button>
                      )}
                      <button
                        onClick={() => handleConvertAgenda(item)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-neutral-50"
                      >
                        Enviar a mi agenda
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="rounded-md border border-status-overdue/40 px-2.5 py-1 text-xs text-status-overdue transition hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleAddItem} className="flex flex-col gap-2 border-t border-border pt-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe la tarea o responsabilidad que salió de la reunión..."
            rows={2}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[180px] flex-1">
              <FilterDropdown
                placeholder="Responsable sugerido"
                value={suggestedResponsible}
                onChange={setSuggestedResponsible}
                options={profiles.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <DatePicker
              value={suggestedDueDate}
              onChange={setSuggestedDueDate}
              placeholder="Fecha sugerida"
            />
            <button
              type="submit"
              disabled={adding || !description.trim()}
              className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              Agregar ítem
            </button>
          </div>
        </form>
      </div>

      {taskDrawerItem && (
        <TaskDrawer
          open={Boolean(taskDrawerItem)}
          onClose={() => setTaskDrawerItem(null)}
          taskId={null}
          projectId={meeting.project_id}
          initialTitle={taskDrawerItem.description}
          onSaved={(task) => task && handleTaskCreated(taskDrawerItem, task)}
        />
      )}

      {projectModalItem && (
        <ProjectFormModal
          open={Boolean(projectModalItem)}
          onClose={() => setProjectModalItem(null)}
          leaders={profiles}
          currentUserId={currentUserId}
          initialName={projectModalItem.description}
          onCreated={(project) => handleProjectCreated(projectModalItem, project)}
        />
      )}
    </div>
  );
}
