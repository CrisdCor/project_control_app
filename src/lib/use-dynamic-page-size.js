"use client";

import { useEffect, useRef, useState } from "react";

// Calcula, mediante ResizeObserver, cuántas filas de "rowHeight" px caben en el
// alto disponible del contenedor referenciado — así los paneles del Resumen
// paginan en vez de hacer scroll interno cuando el listado no cabe.
export function useDynamicPageSize(rowHeight, minRows = 1) {
  const containerRef = useRef(null);
  const [pageSize, setPageSize] = useState(minRows);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function recalc() {
      setPageSize(Math.max(minRows, Math.floor(el.clientHeight / rowHeight)));
    }
    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rowHeight, minRows]);

  return [containerRef, pageSize];
}
