"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "@/components/icons";

export function FilterDropdown({ placeholder, value, options, onChange, allowClear = true, fullWidth = false }) {
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

  const selected = options.find((o) => o.value === value);

  function select(v) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${fullWidth ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={() => {
          const opening = !open;
          if (opening && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setAlign(rect.left + 224 > window.innerWidth - 8 ? "right" : "left");
          }
          setOpen(opening);
        }}
        className={`flex items-center gap-2 rounded-md border border-border bg-white px-2.5 py-1.5 text-sm transition hover:bg-neutral-50 ${
          fullWidth ? "w-full justify-between" : ""
        }`}
      >
        <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          className={`absolute top-full z-20 mt-1.5 ${
            fullWidth ? "w-full" : "w-56"
          } animate-fade-in overflow-hidden rounded-xl border border-border bg-white py-1.5 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {allowClear && (
            <>
              <button
                type="button"
                onClick={() => select("")}
                className="flex w-full items-center justify-between px-3.5 py-2 text-sm transition hover:bg-neutral-50"
              >
                {placeholder}
                {!value && <CheckIcon className="shrink-0 text-foreground" />}
              </button>
              <div className="my-1 border-t border-border" />
            </>
          )}

          <div className="max-h-64 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt.value)}
                className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition hover:bg-neutral-50"
              >
                <span className="block truncate">{opt.label}</span>
                {value === opt.value && <CheckIcon className="shrink-0 text-foreground" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
