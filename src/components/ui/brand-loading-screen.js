"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// Curva de carga: subida suave hasta ~80%, pausa breve, y remate rápido a 100%
// antes de avisar que terminó (onDone). Duración total ~4s.
const SLOW_TARGET = 80;
const SLOW_MS = 2400;
const PAUSE_MS = 600;
const FAST_MS = 350;
const SETTLE_MS = 500;

export function BrandLoadingScreen({ message = "Cargando...", onDone }) {
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(SLOW_MS);
  const [easing, setEasing] = useState("cubic-bezier(0.16, 1, 0.3, 1)");
  const calledDone = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(SLOW_TARGET), 30);

    const t2 = setTimeout(() => {
      setDurationMs(FAST_MS);
      setEasing("ease-in");
      setProgress(100);
    }, SLOW_MS + PAUSE_MS);

    const t3 = setTimeout(() => {
      if (!calledDone.current) {
        calledDone.current = true;
        onDone?.();
      }
    }, SLOW_MS + PAUSE_MS + FAST_MS + SETTLE_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#111111]">
      <Image src="/logo-mark.png" alt="Veloces" width={52} height={36} priority />

      <div className="flex flex-col items-center gap-3">
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white"
            style={{
              width: `${progress}%`,
              transitionProperty: "width",
              transitionDuration: `${durationMs}ms`,
              transitionTimingFunction: easing,
            }}
          />
        </div>
        <p className="text-xs text-white/60">{message}</p>
      </div>
    </main>
  );
}
