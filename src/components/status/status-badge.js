export function StatusBadge({ status, map }) {
  const entry = map[status] ?? { label: status, color: "var(--color-muted)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium"
      style={{ color: entry.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
      {entry.label}
    </span>
  );
}

export function DueDot({ color }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export function PendingNoteDot({ pending }) {
  if (!pending) return null;
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-status-attention"
      title="Tienes una nota sin leer en esta tarea"
    />
  );
}
