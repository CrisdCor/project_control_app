"use client";

import { useEffect, useRef, useState } from "react";
import { ClockIcon } from "@/components/icons";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export function TimePicker({ value, onChange, placeholder = "Hora", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState("left");
  const ref = useRef(null);

  const [hour, minute] = value ? value.split(":") : ["", ""];

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

  function pickHour(h) {
    onChange(`${h}:${minute || "00"}`);
  }

  function pickMinute(m) {
    onChange(`${hour || "00"}:${m}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const opening = !open;
          if (opening && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setAlign(rect.left + 176 > window.innerWidth - 8 ? "right" : "left");
          }
          setOpen(opening);
        }}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-foreground disabled:bg-neutral-50 disabled:text-muted-foreground"
      >
        <ClockIcon className="shrink-0 text-muted-foreground" />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || placeholder}</span>
      </button>

      {open && !disabled && (
        <div
          className={`absolute top-full z-30 mt-1.5 flex w-44 animate-fade-in overflow-hidden rounded-xl border border-border bg-white shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="max-h-48 flex-1 overflow-y-auto border-r border-border py-1.5">
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => pickHour(h)}
                className={`block w-full px-3 py-1.5 text-left text-sm transition hover:bg-neutral-50 ${
                  hour === h ? "bg-black font-medium text-white hover:bg-black" : ""
                }`}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="max-h-48 flex-1 overflow-y-auto py-1.5">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickMinute(m)}
                className={`block w-full px-3 py-1.5 text-left text-sm transition hover:bg-neutral-50 ${
                  minute === m ? "bg-black font-medium text-white hover:bg-black" : ""
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
