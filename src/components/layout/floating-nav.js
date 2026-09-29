"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  HomeIcon,
  FolderIcon,
  CheckSquareIcon,
  UsersIcon,
  NotebookIcon,
  CalendarIcon,
  UserCircleIcon,
  LogoutIcon,
  SidebarIcon,
} from "@/components/icons";

// dir: hacia dónde crece la sección desde el botón principal ("up" | "down")
// step: cuántos "saltos" de distancia desde el centro, cuando está colapsada (círculo)
const BASE_SECTIONS = [
  {
    id: "principal",
    label: "Principal",
    icon: HomeIcon,
    dir: "up",
    step: 2,
    items: [
      { href: "/overview", label: "Resumen", icon: HomeIcon },
      { href: "/mi-trabajo", label: "Mi trabajo", icon: CheckSquareIcon },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    icon: FolderIcon,
    dir: "down",
    step: 1,
    items: [
      { href: "/bitacoras", label: "Bitácoras", icon: FolderIcon },
      { href: "/reuniones", label: "Reuniones", icon: CalendarIcon },
      { href: "/cuaderno", label: "Cuaderno", icon: NotebookIcon },
      { href: "/usuarios", label: "Usuarios", icon: UsersIcon, adminOnly: true },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: UserCircleIcon,
    dir: "up",
    step: 1,
    items: [
      { href: "/perfil", label: "Mi perfil", icon: UserCircleIcon },
      { toggle: true, icon: SidebarIcon },
      { action: "logout", label: "Cerrar sesión", icon: LogoutIcon },
    ],
  },
];

const SIZE = 40; // diámetro del botón principal y de cada sección colapsada
const PILL_WIDTH = 108; // ancho de la píldora expandida, para que quepa el texto
const GAP = 10;
const STEP_DISTANCE = SIZE + GAP;
const ROW_HEIGHT = 34; // alto de cada fila dentro de la píldora expandida

function collapsedY(dir, step) {
  const distance = step * STEP_DISTANCE;
  return dir === "up" ? -distance : distance;
}

// ícono de menú fuera de lo común: tres barras de distinto largo (no el
// hamburger típico parejo), que igual se anima hacia una X al abrir
function MenuGlyph({ open }) {
  return (
    <span className="relative flex h-4 w-4 flex-col items-center justify-center gap-[3px]">
      <span
        className={`h-0.5 rounded-full bg-white transition-all duration-300 ease-in-out ${
          open ? "w-4 translate-y-[5px] rotate-45" : "w-2.5 translate-y-0 rotate-0 self-start"
        }`}
      />
      <span
        className={`h-0.5 w-4 rounded-full bg-white transition-all duration-300 ease-in-out ${
          open ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"
        }`}
      />
      <span
        className={`h-0.5 rounded-full bg-white transition-all duration-300 ease-in-out ${
          open ? "w-4 -translate-y-[5px] -rotate-45" : "w-3.5 translate-y-0 rotate-0 self-end"
        }`}
      />
    </span>
  );
}

export function FloatingNav({ profile, navStyle, onToggleNavStyle }) {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [hovering, setHovering] = useState(false);

  const isAdmin = profile?.role === "admin";
  const SECTIONS = BASE_SECTIONS;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
    setActiveSection(null);
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setActiveSection(null);
      }
    }
    function onEscape(e) {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveSection(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  function toggleMain() {
    setOpen((prev) => !prev);
    setActiveSection(null);
  }

  function selectSection(id) {
    setActiveSection((prev) => (prev === id ? null : id));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const idle = !open && !hovering;
  const active = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`fixed left-6 top-1/2 z-40 -translate-y-1/2 transition-opacity duration-300 ${
        idle ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* selector de secciones — círculos del mismo tamaño del botón principal;
            se quedan visibles aunque una esté activa, para poder cambiar directo */}
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const y = collapsedY(section.dir, section.step);
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => selectSection(section.id)}
              style={{
                width: SIZE,
                height: SIZE,
                transform: `translateY(${open ? y : 0}px) scale(${open ? 1 : 0.4})`,
                transitionDelay: open ? `${(section.step - 1) * 60}ms` : "0ms",
              }}
              title={section.label}
              className={`absolute left-0 top-0 flex items-center justify-center rounded-full shadow-md ring-1 transition-all duration-[600ms] ease-out ${
                isActive ? "bg-black text-white ring-black" : "bg-white text-foreground ring-border"
              } ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <SectionIcon className="h-4 w-4" />
            </button>
          );
        })}

        {/* sección activa: despliega su píldora hacia la derecha, alineada con
            el botón de esa sección */}
        {active &&
          (() => {
            const visibleItems = active.items.filter((item) => !item.adminOnly || isAdmin);
            const pillHeight = SIZE + visibleItems.length * ROW_HEIGHT;
            const top = collapsedY(active.dir, active.step);
            const rows = [
              { key: "icon", icon: active.icon, isIconRow: true },
              ...visibleItems.map((item) => ({ key: item.href ?? item.label, ...item })),
            ];

            return (
              <div
                style={{
                  width: PILL_WIDTH,
                  height: pillHeight,
                  transform: `translateY(${top}px) translateX(${SIZE + GAP}px)`,
                }}
                className="absolute left-0 top-0 flex flex-col overflow-hidden rounded-[20px] bg-white shadow-lg ring-1 ring-border transition-all duration-300 ease-out"
              >
                {rows.map((row) => {
                  if (row.isIconRow) {
                    const Icon = row.icon;
                    return (
                      <button
                        key="icon"
                        onClick={() => setActiveSection(null)}
                        title="Cerrar"
                        style={{ height: SIZE }}
                        className="flex shrink-0 items-center justify-center bg-black text-white transition hover:bg-neutral-800"
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  }

                  const Icon = row.icon;

                  if (row.action === "logout") {
                    return (
                      <button
                        key={row.key}
                        onClick={handleLogout}
                        style={{ height: ROW_HEIGHT }}
                        className="flex shrink-0 items-center gap-1.5 px-3 text-xs text-status-overdue transition hover:bg-red-50"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {row.label}
                      </button>
                    );
                  }

                  if (row.toggle) {
                    return (
                      <button
                        key="toggle"
                        onClick={onToggleNavStyle}
                        style={{ height: ROW_HEIGHT }}
                        className="flex shrink-0 items-center gap-1.5 px-3 text-left text-xs text-muted-foreground transition hover:bg-neutral-50"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {navStyle === "sidebar" ? "Menú flotante" : "Barra lateral"}
                      </button>
                    );
                  }

                  const isCurrentPage = pathname.startsWith(row.href);
                  return (
                    <Link
                      key={row.key}
                      href={row.href}
                      style={{ height: ROW_HEIGHT }}
                      className={`flex shrink-0 items-center gap-1.5 px-3 text-xs transition ${
                        isCurrentPage ? "bg-neutral-100 text-foreground" : "text-muted-foreground hover:bg-neutral-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{row.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })()}

        {/* botón principal — sticker fijo, nunca cambia de posición */}
        <button
          onClick={toggleMain}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          style={{ width: SIZE, height: SIZE }}
          className="relative z-10 flex items-center justify-center rounded-full bg-black text-white shadow-lg transition hover:bg-neutral-800"
        >
          <MenuGlyph open={open} />
        </button>
      </div>
    </div>
  );
}
