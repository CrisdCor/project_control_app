"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Tooltip({ content, children, className = "" }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
      {mounted &&
        show &&
        createPortal(
          <div
            style={{ top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
            className="pointer-events-none fixed z-[100] max-w-xs animate-fade-in rounded-md border border-border bg-white px-2.5 py-1.5 text-xs shadow-lg"
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
