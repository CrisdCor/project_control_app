export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-neutral-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            value === opt.id
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
