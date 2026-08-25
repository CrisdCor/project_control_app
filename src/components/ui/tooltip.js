"use client";

import { useRef, useState } from "react";

export function Tooltip({ content, children, className = "" }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  function handleEnter() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.top - 6, left: rect.left });
    }
    setShow(true);
  }

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      className={`min-w-0 ${className}`}
    >
      {children}
      {show && (
        <div
          style={{ top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
          className="pointer-events-none fixed z-50 max-w-xs animate-fade-in rounded-md border border-border bg-white px-2.5 py-1.5 text-xs shadow-lg"
        >
          {content}
        </div>
      )}
    </div>
  );
}
