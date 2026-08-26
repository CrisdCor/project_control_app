"use client";

import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";

// Slide-over independiente (fondo + posicionamiento fijo) que envuelve el panel de detalle.
export function TaskDrawer({ open, onClose, taskId, projectId, initialTitle, onSaved }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg animate-slide-in-right shadow-xl">
        <TaskDetailPanel
          taskId={taskId}
          projectId={projectId}
          initialTitle={initialTitle}
          onSaved={onSaved}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
