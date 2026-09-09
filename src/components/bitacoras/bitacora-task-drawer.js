"use client";

import { BitacoraTaskDetailPanel } from "@/components/bitacoras/bitacora-task-detail-panel";

export function BitacoraTaskDrawer({ open, onClose, taskId, bitacoraId, onSaved }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg animate-slide-in-right shadow-xl">
        <BitacoraTaskDetailPanel taskId={taskId} bitacoraId={bitacoraId} onSaved={onSaved} onClose={onClose} />
      </div>
    </div>
  );
}
