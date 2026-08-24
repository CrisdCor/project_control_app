"use client";

import { useEffect, useRef, useState } from "react";

export function SegmentedControl({ options, value, onChange }) {
  const btnRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const btn = btnRefs.current[value];
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
    }
  }, [value, options]);

  return (
    <div className="relative inline-flex items-center gap-1 rounded-md border border-border bg-neutral-100 p-1">
      <div
        className={`absolute top-1 bottom-1 rounded-md bg-white shadow-sm transition-[left,width] duration-300 ease-out ${
          indicator.ready ? "opacity-100" : "opacity-0"
        }`}
        style={{ left: indicator.left, width: indicator.width }}
      />
      {options.map((opt) => (
        <button
          key={opt.id}
          ref={(el) => {
            btnRefs.current[opt.id] = el;
          }}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`relative z-10 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
            value === opt.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
