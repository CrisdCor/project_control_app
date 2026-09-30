"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_SECTIONS } from "@/components/layout/nav-sections";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  LogoutIcon,
  SidebarIcon,
  SunIcon,
  MoonIcon,
} from "@/components/icons";

export function Sidebar({ profile, sidebarOn, onToggleSidebar, theme, onToggleTheme }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(NAV_SECTIONS.map((s) => [s.id, s.id === "principal"]))
  );
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-collapsed") === "1";
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  function toggleSection(id) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const isAdmin = profile?.role === "admin";
  const flatNavItems = NAV_SECTIONS.flatMap((s) => s.items).filter((item) => !item.adminOnly || isAdmin);

  if (collapsed) {
    return (
      <aside className="flex w-11 shrink-0 flex-col items-center border-r border-border bg-surface py-3">
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
          {flatNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`rounded-md p-2 transition ${
                  active ? "bg-black text-white" : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
                }`}
              >
                <Icon className="shrink-0" />
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="mb-1 rounded-md p-2 text-status-overdue transition hover:bg-red-50"
        >
          <LogoutIcon className="shrink-0" />
        </button>
        <button
          onClick={toggleCollapsed}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
          title="Mostrar menú"
        >
          <ChevronRightIcon />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) => (
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
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                          active ? "bg-black text-white" : "text-foreground hover:bg-neutral-100"
                        }`}
                      >
                        <Icon className="shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}

                {section.id === "configuracion" && (
                  <>
                    <div className="my-1.5 border-t border-border" />
                    <div className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground">
                      <span className="flex items-center gap-2.5">
                        <SidebarIcon className="shrink-0" />
                        Barra lateral
                      </span>
                      <Switch checked={sidebarOn} onChange={onToggleSidebar} label="Barra lateral" />
                    </div>
                    <div className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm text-foreground">
                      <span className="flex items-center gap-2.5">
                        {theme === "dark" ? <MoonIcon className="shrink-0" /> : <SunIcon className="shrink-0" />}
                        Tema
                      </span>
                      <Switch checked={theme === "dark"} onChange={onToggleTheme} label="Tema oscuro" />
                    </div>
                    <div className="my-1.5 border-t border-border" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-status-overdue transition hover:bg-red-50"
                    >
                      <LogoutIcon className="shrink-0" />
                      Cerrar sesión
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer — el botón de contraer siempre queda abajo, en ambos estados */}
      <div className="border-t border-border p-3">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-neutral-100 hover:text-foreground"
        >
          <ChevronLeftIcon className="shrink-0" />
          Ocultar menú
        </button>
      </div>
    </aside>
  );
}
