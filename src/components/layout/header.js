"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const TITLES = [
  { match: "/overview", label: "Resumen" },
  { match: "/proyectos", label: "Proyectos" },
  { match: "/reuniones", label: "Reuniones" },
  { match: "/mi-trabajo", label: "Mi trabajo" },
  { match: "/usuarios", label: "Usuarios" },
  { match: "/cuaderno", label: "Cuaderno" },
  { match: "/perfil", label: "Mi perfil" },
];

function resolveTitle(pathname) {
  const found = TITLES.find((t) => pathname.startsWith(t.match));
  return found?.label ?? "Control de Proyectos";
}

export function Header() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <span className="text-sm font-semibold">Control de Proyectos</span>
      <span className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-muted-foreground">
        {title}
      </span>
      <Image src="/logo-veloces.png" alt="Veloces" width={88} height={24} priority />
    </header>
  );
}
