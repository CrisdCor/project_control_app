"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  FolderIcon,
  CheckSquareIcon,
  UsersIcon,
  NotebookIcon,
} from "@/components/icons";

const SECTIONS = [
  {
    id: "principal",
    label: "Principal",
    items: [
      { href: "/overview", label: "Resumen", icon: HomeIcon },
      { href: "/mi-trabajo", label: "Mi trabajo", icon: CheckSquareIcon },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    items: [
      { href: "/proyectos", label: "Proyectos", icon: FolderIcon },
      { href: "/usuarios", label: "Usuarios", icon: UsersIcon, adminOnly: true },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    items: [{ href: "/cuaderno", label: "Cuaderno", icon: NotebookIcon }],
  },
];

export function Sidebar({ profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleSection(id) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isAdmin = profile?.role === "admin";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      {/* Usuario */}
      <div className="relative border-b border-border p-3">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition hover:bg-neutral-50"
        >
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-200">
            {profile?.photo_url ? (
              <Image src={profile.photo_url} alt={profile.name} fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500">
                {(profile?.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{profile?.name ?? "Usuario"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isAdmin ? "Administrador" : "Gestor"}
            </p>
          </div>
          <ChevronDownIcon className="shrink-0 text-muted-foreground" />
        </button>

        {menuOpen && (
          <div className="absolute left-3 right-3 top-full z-20 mt-1 animate-fade-in rounded-md border border-border bg-white py-1 shadow-md">
            <Link
              href="/perfil"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm transition hover:bg-neutral-50"
            >
              Mi perfil
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full px-3 py-2 text-left text-sm text-status-overdue transition hover:bg-neutral-50"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-3">
        {SECTIONS.map((section) => (
          <div key={section.id} className="mb-2">
            <button
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {section.label}
              {openSections[section.id] ? (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5" />
              )}
            </button>
            {openSections[section.id] && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {section.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                          active
                            ? "bg-black text-white"
                            : "text-foreground hover:bg-neutral-100"
                        }`}
                      >
                        <Icon className="shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
