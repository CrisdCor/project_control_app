"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_SECTIONS } from "@/components/layout/nav-sections";
import { Switch } from "@/components/ui/switch";
import { ChevronDownIcon, ChevronRightIcon, LogoutIcon, SidebarIcon, SunIcon, MoonIcon, MenuAltIcon } from "@/components/icons";

export function Header({ profile, sidebarOn, onToggleSidebar, theme, onToggleTheme }) {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setOpenSection(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    setOpenSection(null);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleSection(id) {
    setOpenSection((prev) => (prev === id ? null : id));
  }

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div ref={menuRef} className="relative flex items-center">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir menú"
          className="text-foreground transition hover:text-muted-foreground"
        >
          <MenuAltIcon />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-30 mt-3 w-64 animate-fade-in rounded-[var(--radius-card)] border border-border bg-surface py-2 shadow-lg">
            {NAV_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const isOpen = openSection === section.id;
              const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-neutral-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <SectionIcon className="h-4 w-4 text-muted-foreground" />
                      {section.label}
                    </span>
                    {isOpen ? (
                      <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="flex flex-col pb-1 pl-4 pr-4">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                              active ? "bg-black text-white" : "text-foreground hover:bg-neutral-50"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {item.label}
                          </Link>
                        );
                      })}

                      {section.id === "configuracion" && (
                        <>
                          <div className="my-2 border-t border-border" />
                          <div className="flex items-center justify-between px-3 py-2 text-sm text-foreground">
                            <span className="flex items-center gap-2.5">
                              <SidebarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              Navegación en barra lateral
                            </span>
                            <Switch checked={sidebarOn} onChange={onToggleSidebar} label="Barra lateral" />
                          </div>
                          <div className="flex items-center justify-between px-3 py-2 text-sm text-foreground">
                            <span className="flex items-center gap-2.5">
                              {theme === "dark" ? (
                                <MoonIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              ) : (
                                <SunIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              )}
                              Tema
                            </span>
                            <Switch checked={theme === "dark"} onChange={onToggleTheme} label="Tema oscuro" />
                          </div>
                          <div className="my-2 border-t border-border" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-status-overdue transition hover:bg-red-50"
                          >
                            <LogoutIcon className="h-3.5 w-3.5 shrink-0" />
                            Cerrar sesión
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Image
        src="/logo-veloces.png"
        alt="Veloces"
        width={108}
        height={30}
        priority
        className="absolute left-1/2 -translate-x-1/2"
      />

      {/* Solo informativo */}
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
    </header>
  );
}
