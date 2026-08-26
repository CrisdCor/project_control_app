"use client";

import Image from "next/image";

const DOTS = Array.from({ length: 8 });

export function BrandLoadingScreen({ message = "Cargando..." }) {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#111111]">
      <div className="relative flex h-28 w-28 items-center justify-center">
        {DOTS.map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 -ml-1 -mt-1"
            style={{ transform: `rotate(${i * 45}deg) translateY(-52px)` }}
          >
            <span
              className="block h-2 w-2 rounded-full bg-white animate-orbit-dot"
              style={{ animationDelay: `${i * 0.13}s` }}
            />
          </span>
        ))}

        <Image src="/logo-mark.png" alt="Veloces" width={44} height={30} priority />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/3 rounded-full bg-white animate-progress-slide" />
        </div>
        <p className="text-xs text-white/60">{message}</p>
      </div>
    </main>
  );
}
