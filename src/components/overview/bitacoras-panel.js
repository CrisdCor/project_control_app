"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Pagination } from "@/components/ui/pagination";
import { BitacoraTasksSlideOver } from "@/components/bitacoras/bitacora-tasks-slideover";
import { BitacoraTaskDrawer } from "@/components/bitacoras/bitacora-task-drawer";

const ROW_HEIGHT = 41;

export function BitacorasPanel({ isAdmin }) {
  const [bitacoras, setBitacoras] = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [page, setRawPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(null); // { id, name } | null
  const [creatingTaskFor, setCreatingTaskFor] = useState(null); // { id, name } | null
  const [pageSize, setPageSize] = useState(5);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function recalc() {
      setPageSize(Math.max(1, Math.floor(el.clientHeight / ROW_HEIGHT)));
    }
    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function load() {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase.from("bitacoras").select("*").order("created_at", { ascending: false });
    const list = data ?? [];
    setBitacoras(list);

    if (list.length) {
      const { data: tasks } = await supabase
        .from("bitacora_tasks")
        .select("bitacora_id")
        .in("bitacora_id", list.map((b) => b.id));
      const counts = {};
      (tasks ?? []).forEach((t) => {
        counts[t.bitacora_id] = (counts[t.bitacora_id] ?? 0) + 1;
      });
      setTaskCounts(counts);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const totalPages = Math.max(1, Math.ceil(bitacoras.length / pageSize));
  const page2 = Math.min(page, totalPages);
  const pageItems = bitacoras.slice((page2 - 1) * pageSize, page2 * pageSize);

  function handleCreateTask() {
    setCreatingTaskFor(managing);
    setManaging(null);
  }

  return (
    <section className="flex h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Bitácoras</h2>
      </div>

      <div ref={listRef} className="flex flex-1 min-h-0 flex-col divide-y divide-border overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : pageItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay bitácoras para mostrar.</p>
        ) : (
          pageItems.map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                <Link href={`/bitacoras/${b.id}`} className="hover:underline">
                  {b.name}
                </Link>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{taskCounts[b.id] ?? 0} tareas</span>
              <button
                onClick={() => setManaging({ id: b.id, name: b.name })}
                className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition hover:bg-neutral-50"
              >
                Gestionar
              </button>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0">
        <Pagination page={page2} totalPages={totalPages} onChange={setRawPage} />
      </div>

      <BitacoraTasksSlideOver
        open={Boolean(managing)}
        onClose={() => setManaging(null)}
        bitacoraId={managing?.id}
        bitacoraName={managing?.name}
        isAdmin={isAdmin}
        onCreateTask={handleCreateTask}
      />
      <BitacoraTaskDrawer
        open={Boolean(creatingTaskFor)}
        onClose={() => setCreatingTaskFor(null)}
        taskId={null}
        bitacoraId={creatingTaskFor?.id}
        onSaved={load}
      />
    </section>
  );
}
