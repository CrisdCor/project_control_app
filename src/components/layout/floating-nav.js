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

// dir: en qué posición vertical descansa la sección colapsada respecto al botón
// principal ("up" | "down"); step: cuántos "saltos" de distancia
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
      { toggle: true, label: "Barra lateral", icon: SidebarIcon },
      { action: "logout", label: "Cerrar sesión", icon: LogoutIcon },
    ],
  },
];

const SIZE = 40; // diámetro del botón principal y de cada sección colapsada
const ITEM_WIDTH = 106; // ancho de cada celda de navegación dentro de la cápsula
const GAP = 10;
const STEP_DISTANCE = SIZE + GAP;

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
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const isActive = activeSection === section.id;
          const y = collapsedY(section.dir, section.step);
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          const width = isActive ? SIZE + visibleItems.length * ITEM_WIDTH : SIZE;

          return (
            <div
              key={section.id}
              style={{
                height: SIZE,
                width,
                transform: `translateY(${open ? y : 0}px) scale(${open ? 1 : 0.4})`,
                transitionDelay: open ? `${(section.step - 1) * 60}ms` : "0ms",
              }}
              className={`absolute left-0 top-0 flex items-stretch overflow-hidden rounded-full shadow-md ring-1 ring-border transition-all duration-[450ms] ease-out ${
                open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {/* celda del ícono — representa y cierra la sección seleccionada */}
              <button
                onClick={() => selectSection(section.id)}
                title={section.label}
                style={{ width: SIZE, height: SIZE }}
                className={`flex shrink-0 items-center justify-center transition-colors ${
                  isActive ? "bg-black text-white" : "bg-white text-foreground hover:bg-neutral-100"
                }`}
              >
                <SectionIcon className="h-4 w-4" />
              </button>

              {/* celdas de navegación — se despliegan horizontalmente dentro de la misma cápsula */}
              {isActive &&
                visibleItems.map((item) => {
                  const Icon = item.icon;

                  if (item.action === "logout") {
                    return (
                      <button
                        key="logout"
                        onClick={handleLogout}
                        style={{ width: ITEM_WIDTH }}
                        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap bg-white px-3 text-xs text-status-overdue transition-colors hover:bg-neutral-100"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </button>
                    );
                  }

                  if (item.toggle) {
                    return (
                      <button
                        key="toggle"
                        onClick={onToggleNavStyle}
                        style={{ width: ITEM_WIDTH }}
                        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap bg-white px-3 text-xs text-foreground transition-colors hover:bg-neutral-100"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {navStyle === "sidebar" ? "Menú flotante" : "Barra lateral"}
                      </button>
                    );
                  }

                  const isCurrentPage = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{ width: ITEM_WIDTH }}
                      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-xs transition-colors ${
                        isCurrentPage ? "bg-black text-white" : "bg-white text-foreground hover:bg-neutral-100"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          );
        })}

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
