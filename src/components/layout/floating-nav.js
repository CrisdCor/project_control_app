"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, FolderIcon, CheckSquareIcon, UsersIcon, NotebookIcon, CalendarIcon } from "@/components/icons";

// dir: hacia dónde se despliega desde el botón principal ("up" | "down")
// step: cuántos "saltos" de distancia desde el centro (1, 2, 3...)
const SECTIONS = [
  {
    id: "principal",
    label: "Principal",
    icon: HomeIcon,
    dir: "up",
    step: 1,
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
      { href: "/usuarios", label: "Usuarios", icon: UsersIcon, adminOnly: true },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    icon: NotebookIcon,
    dir: "up",
    step: 2,
    items: [{ href: "/cuaderno", label: "Cuaderno", icon: NotebookIcon }],
  },
];

const SIZE = 40; // mismo tamaño para el botón principal y las secciones
const GAP = 10;
const STEP_DISTANCE = SIZE + GAP;

function stackTransform(dir, step, open) {
  if (!open) return "translateY(0px) scale(0.4)";
  const distance = step * STEP_DISTANCE;
  const y = dir === "up" ? -distance : distance;
  return `translateY(${y}px) scale(1)`;
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

export function FloatingNav({ profile }) {
  const pathname = usePathname();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [hovering, setHovering] = useState(false);

  const isAdmin = profile?.role === "admin";

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
    if (open) {
      setOpen(false);
      setActiveSection(null);
    } else {
      setOpen(true);
    }
  }

  // clic en una sección: si ya estaba abierta esa, se cierra; si era otra,
  // cambia directo a la nueva sin necesidad de cerrar todo el menú primero
  function selectSection(id) {
    setActiveSection((prev) => (prev === id ? null : id));
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
        {/* secciones — mismo tamaño del botón, se apilan hacia arriba/abajo */}
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => selectSection(section.id)}
              style={{
                width: SIZE,
                height: SIZE,
                transform: stackTransform(section.dir, section.step, open),
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

        {/* listas de páginas — se abren hacia la derecha, a la altura de su sección */}
        {SECTIONS.map((section) => {
          if (activeSection !== section.id) return null;
          return (
            <div
              key={section.id}
              style={{ transform: stackTransform(section.dir, section.step, true) }}
              className="absolute left-0 top-0 ml-[52px] flex flex-col gap-1.5"
            >
              {section.items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  const Icon = item.icon;
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex animate-fade-in items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-2 pr-3 text-xs shadow-md ring-1 ring-border transition ${
                        active ? "bg-black text-white" : "bg-white text-foreground hover:bg-neutral-50"
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
