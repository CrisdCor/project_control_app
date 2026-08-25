"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "@/components/icons";

export function MultiSelectDropdown({ options, selectedIds, onChange, placeholder = "Seleccionar...", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState("left");
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  function toggle(id) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  const selectedLabels = options.filter((o) => selectedIds.includes(o.id)).map((o) => o.name);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const opening = !open;
          if (opening && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const popupWidth = Math.max(rect.width, 220);
            setAlign(rect.left + popupWidth > window.innerWidth - 8 ? "right" : "left");
          }
          setOpen(opening);
        }}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-foreground disabled:bg-neutral-50 disabled:text-muted-foreground"
      >
        <span
          className={`min-w-0 flex-1 truncate text-left ${
            selectedLabels.length ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
        </span>
        <ChevronDownIcon className="shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled && (
        <div
          className={`absolute top-full z-30 mt-1.5 w-full min-w-[220px] animate-fade-in overflow-hidden rounded-xl border border-border bg-white py-1.5 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => {
              const checked = selectedIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition hover:bg-neutral-50"
                >
                  <span className="block truncate">{opt.name}</span>
                  {checked && <CheckIcon className="shrink-0 text-foreground" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
