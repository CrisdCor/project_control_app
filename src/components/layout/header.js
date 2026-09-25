"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDownIcon } from "@/components/icons";

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
  const router = useRouter();
  const title = resolveTitle(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <Image src="/logo-veloces.png" alt="Veloces" width={108} height={30} priority />

      <span className="absolute left-1/2 -translate-x-1/2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </span>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md p-1 pr-1.5 transition hover:bg-neutral-50"
        >
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
          <ChevronDownIcon className="shrink-0 text-muted-foreground" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1.5 w-48 animate-fade-in rounded-md border border-border bg-white py-1 shadow-md">
            <Link
              href="/perfil"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm transition hover:bg-neutral-50"
            >
              Mi perfil
            </Link>
            {onToggleNavStyle && (
              <button
                onClick={() => {
                  onToggleNavStyle();
                  setMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm transition hover:bg-neutral-50"
              >
                {navStyle === "sidebar" ? "Cambiar a menú flotante" : "Cambiar a barra lateral"}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="block w-full px-3 py-2 text-left text-sm text-status-overdue transition hover:bg-neutral-50"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
