"use client";

import { useEffect, useRef, useState } from "react";
import { DotsIcon } from "@/components/icons";

export function ActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState("right");
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

  const visibleActions = (actions ?? []).filter(Boolean);
  if (visibleActions.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const opening = !open;
          if (opening && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setAlign(rect.left + 160 > window.innerWidth - 8 ? "right" : "left");
          }
          setOpen(opening);
        }}
        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
        title="Acciones"
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          className={`absolute top-full z-30 mt-1 w-40 animate-fade-in overflow-hidden rounded-xl border border-border bg-white py-1.5 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {visibleActions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onClick();
              }}
              className={`flex w-full items-center px-3.5 py-2 text-left text-sm transition hover:bg-neutral-50 ${
                action.danger ? "text-status-overdue" : "text-foreground"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
