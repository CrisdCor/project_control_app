"use client";

import { CatalogModal } from "@/components/ui/catalog-modal";

export function AreasModal({ open, onClose, onChanged }) {
  return (
    <CatalogModal
      open={open}
      onClose={onClose}
      onChanged={onChanged}
      table="areas"
      title="Catálogo de áreas"
      namePlaceholder="Nombre (ej. Tesorería)"
      entityLabel="área"
    />
  );
}
