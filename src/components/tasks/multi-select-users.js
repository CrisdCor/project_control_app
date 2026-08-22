"use client";

export function MultiSelectUsers({ profiles, selectedIds, onChange, disabled }) {
  function toggle(id) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
      {profiles.map((p) => (
        <label
          key={p.id}
          className={`flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0 ${
            disabled ? "text-muted-foreground" : "cursor-pointer hover:bg-neutral-50"
          }`}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(p.id)}
            onChange={() => toggle(p.id)}
            disabled={disabled}
            className="accent-black"
          />
          {p.name}
        </label>
      ))}
    </div>
  );
}
