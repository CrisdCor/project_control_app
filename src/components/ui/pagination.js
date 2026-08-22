export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-1 pt-3 text-sm">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md px-2.5 py-1 text-muted-foreground transition hover:bg-neutral-100 disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md px-2.5 py-1 text-muted-foreground transition hover:bg-neutral-100 disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}
