"use client";

import { BitacoraDetailPanel } from "@/components/bitacoras/bitacora-detail-panel";

export function BitacoraDrawer({ open, onClose, bitacoraId, onSaved, fullAccess = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg animate-slide-in-right shadow-xl">
        <BitacoraDetailPanel bitacoraId={bitacoraId} onSaved={onSaved} onClose={onClose} fullAccess={fullAccess} />
      </div>
    </div>
  );
}
