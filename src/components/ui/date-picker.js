"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

function parseISO(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function DatePicker({ value, onChange, min, max, placeholder = "Seleccionar fecha", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState("left");
  const ref = useRef(null);
  const selected = parseISO(value);
  const minDate = parseISO(min);
  const maxDate = parseISO(max);
  const [viewDate, setViewDate] = useState(selected || minDate || new Date());

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

  function isDisabledDay(date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function buildDays() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const startOffset = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }

  function selectDay(date) {
    if (isDisabledDay(date)) return;
    onChange(toISO(date));
    setOpen(false);
  }

  const days = buildDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const opening = !open;
          if (opening && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const popupWidth = 288; // w-72
            setAlign(rect.left + popupWidth > window.innerWidth - 8 ? "right" : "left");
          }
          setViewDate(selected || minDate || new Date());
          setOpen(opening);
        }}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-foreground disabled:bg-neutral-50 disabled:text-muted-foreground"
      >
        <CalendarIcon className="shrink-0 text-muted-foreground" />
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
      </button>

      {open && !disabled && (
        <div
          className={`absolute top-full z-30 mt-1.5 w-72 animate-fade-in rounded-xl border border-border bg-white p-3 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-neutral-100"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-sm font-medium capitalize">
              {viewDate.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-neutral-100"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((date, i) => {
              if (!date) return <div key={i} />;
              const dayDisabled = isDisabledDay(date);
              const isSelected = selected && toISO(date) === toISO(selected);
              const isToday = toISO(date) === toISO(today);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dayDisabled}
                  onClick={() => selectDay(date)}
                  className={`aspect-square rounded-md text-xs transition ${
                    isSelected
                      ? "bg-black font-medium text-white"
                      : dayDisabled
                      ? "cursor-not-allowed text-neutral-300"
                      : isToday
                      ? "border border-foreground font-medium text-foreground"
                      : "text-foreground hover:bg-neutral-100"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
