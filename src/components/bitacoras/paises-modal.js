"use client";

import { CatalogModal } from "@/components/ui/catalog-modal";
import { GENERAL_PAIS_ID } from "@/lib/paises";

export function PaisesModal({ open, onClose, onChanged }) {
  return (
    <CatalogModal
      open={open}
      onClose={onClose}
      onChanged={onChanged}
      table="paises"
      title="Catálogo de países"
      hasCode
      protectedId={GENERAL_PAIS_ID}
      namePlaceholder="Nombre (ej. Brasil)"
      entityLabel="país"
    />
  );
}
