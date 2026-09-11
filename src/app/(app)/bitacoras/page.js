"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, DueDot } from "@/components/status/status-badge";
import { BITACORA_STATUS, bitacoraStatusKey, dueSemaphore } from "@/lib/status";
import { fetchUrgentActivityBitacoraIds } from "@/lib/bitacoras";
import { BitacoraDrawer } from "@/components/bitacoras/bitacora-drawer";
import { PlusIcon, TrashIcon, AlertIcon } from "@/components/icons";

export default function BitacorasPage() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [bitacoras, setBitacoras] = useState([]);
  const [urgentIds, setUrgentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [drawerId, setDrawerId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    const supabase = createClient();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(profile?.role === "admin");
    }

    const { data } = await supabase.from("v_bitacora_status").select("*");
    const rows = data ?? [];

    const encargadoIds = [...new Set(rows.map((b) => b.encargado_id).filter(Boolean))];
    let nameMap = {};
    if (encargadoIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", encargadoIds);
      nameMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name]));
    }

    const sorted = rows
      .map((b) => ({ ...b, encargadoName: nameMap[b.encargado_id] ?? "—" }))
      .sort((a, b) => {
        const aDone = a.status === "finalizado";
        const bDone = b.status === "finalizado";
        if (aDone !== bDone) return aDone ? 1 : -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

    setBitacoras(sorted);
    setUrgentIds(await fetchUrgentActivityBitacoraIds(supabase, rows.map((b) => b.id)));
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function handleDelete(bitacora) {
    if (!window.confirm(`¿Eliminar la bitácora "${bitacora.name}" y todas sus actividades? Esta acción no se puede deshacer.`))
      return;
    setDeletingId(bitacora.id);
    const supabase = createClient();
    await supabase.from("bitacoras").delete().eq("id", bitacora.id);
    setDeletingId(null);
    load();
  }

  if (isAdmin === false) {
    return <p className="text-sm text-muted-foreground">No tienes acceso a esta sección.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Cada bitácora agrupa las actividades que se llevan a cabo para cumplirla.
        </p>
        {isAdmin && (
          <button
            onClick={() => setCreating(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <PlusIcon />
            Nueva bitácora
          </button>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Cargando...</p>
        ) : bitacoras.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aún no hay bitácoras.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Bitácora</th>
                <th className="px-5 py-3 font-medium">Encargado</th>
                <th className="px-5 py-3 font-medium">Fecha límite</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {bitacoras.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <button onClick={() => setDrawerId(b.id)} className="flex items-center gap-1.5 font-medium hover:underline">
                      {b.name}
                      {urgentIds.has(b.id) && (
                        <span
                          title="Tiene una actividad que vence hoy o ya está vencida"
                          className="text-status-overdue"
                        >
                          <AlertIcon />
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{b.encargadoName}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <DueDot color={dueSemaphore(b.due_date, { done: b.status === "finalizado" })} />
                      {new Date(b.due_date + "T00:00:00").toLocaleDateString("es-CO")}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={bitacoraStatusKey(b)} map={BITACORA_STATUS} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(b)}
                        disabled={deletingId === b.id}
                        className="rounded-md border border-status-overdue/40 px-2.5 py-1 text-xs text-status-overdue transition hover:bg-red-50 disabled:opacity-50"
                        title="Eliminar bitácora"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BitacoraDrawer open={Boolean(drawerId)} onClose={() => setDrawerId(null)} bitacoraId={drawerId} onSaved={load} />
      <BitacoraDrawer open={creating} onClose={() => setCreating(false)} bitacoraId={null} onSaved={load} />
    </div>
  );
}
