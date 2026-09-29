"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { SidebarIcon } from "@/components/icons";

const TITLES = [
  { match: "/overview", label: "Resumen" },
  { match: "/bitacoras", label: "Bitácoras" },
  { match: "/reuniones", label: "Reuniones" },
  { match: "/mi-trabajo", label: "Mi trabajo" },
  { match: "/usuarios", label: "Usuarios" },
  { match: "/cuaderno", label: "Cuaderno" },
  { match: "/perfil", label: "Mi perfil" },
];

function resolveTitle(pathname) {
  const found = TITLES.find((t) => pathname.startsWith(t.match));
  return found?.label ?? "";
}

export function Header({ profile, navStyle, onToggleNavStyle }) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  const isAdmin = profile?.role === "admin";

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <Image src="/logo-veloces.png" alt="Veloces" width={108} height={30} priority />

      <span className="absolute left-1/2 -translate-x-1/2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>

      <div className="flex items-center gap-4">
        {onToggleNavStyle && (
          <div className="flex items-center gap-2 text-muted-foreground" title="Estilo de navegación">
            <SidebarIcon />
            <Switch
              checked={navStyle === "sidebar"}
              onChange={onToggleNavStyle}
              title={navStyle === "sidebar" ? "Cambiar a menú flotante" : "Cambiar a barra lateral"}
            />
          </div>
        )}

        {/* Solo informativo — el menú de perfil y cierre de sesión viven en la navegación */}
        <div className="flex items-center gap-2 p-1">
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-medium">{profile?.name ?? "Usuario"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.cargo || (isAdmin ? "Administrador" : "Gestor")}
            </p>
          </div>
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-200">
            {profile?.photo_url ? (
              <Image src={profile.photo_url} alt={profile.name} fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500">
                {(profile?.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
