"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, FolderIcon, CheckSquareIcon, UsersIcon, NotebookIcon, CalendarIcon } from "@/components/icons";

const SECTIONS = [
  {
    id: "principal",
    label: "Principal",
    icon: HomeIcon,
    angle: 90, // recto hacia arriba
    items: [
      { href: "/overview", label: "Resumen", icon: HomeIcon },
      { href: "/mi-trabajo", label: "Mi trabajo", icon: CheckSquareIcon },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    icon: FolderIcon,
    angle: 45, // diagonal
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
    angle: 0, // horizontal
    items: [{ href: "/cuaderno", label: "Cuaderno", icon: NotebookIcon }],
  },
];

const RADIUS = 72;

function fanTransform(angleDeg, isOpen) {
  if (!isOpen) return "translate(0px, 0px) scale(0.4)";
  const rad = (angleDeg * Math.PI) / 180;
  const x = Math.round(Math.cos(rad) * RADIUS);
  const y = Math.round(-Math.sin(rad) * RADIUS);
  return `translate(${x}px, ${y}px) scale(1)`;
}

export function FloatingNav({ profile }) {
  const pathname = usePathname();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const isAdmin = profile?.role === "admin";

  // cerrar todo al navegar
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

  function selectSection(id) {
    setActiveSection((prev) => (prev === id ? null : id));
  }

  const activeSectionData = SECTIONS.find((s) => s.id === activeSection);
  const delayFor = (angle) => (angle === 90 ? 0 : angle === 45 ? 60 : 120);

  return (
    <div ref={containerRef} className="fixed bottom-6 left-6 z-40">
      <div className="relative h-12 w-12">
        {/* secciones en abanico */}
        {!activeSection &&
          SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => selectSection(section.id)}
                style={{
                  transform: fanTransform(section.angle, open),
                  transitionDelay: open ? `${delayFor(section.angle)}ms` : "0ms",
                }}
                title={section.label}
                className={`absolute inset-0 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-foreground shadow-md ring-1 ring-border transition-all duration-[600ms] ease-out ${
                  open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <SectionIcon className="h-4 w-4" />
              </button>
            );
          })}

        {/* páginas de la sección elegida, apiladas hacia arriba */}
        {activeSectionData && (
          <div className="absolute bottom-full left-0 mb-3 flex flex-col gap-2">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {activeSectionData.label}
            </p>
            {activeSectionData.items
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex animate-fade-in items-center gap-2 whitespace-nowrap rounded-lg py-2 pl-2.5 pr-4 text-sm shadow-md ring-1 ring-border transition ${
                      active ? "bg-black text-white" : "bg-white text-foreground hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
          </div>
        )}

        {/* botón principal — sticker fijo, nunca cambia de posición */}
        <button
          onClick={toggleMain}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="relative z-10 flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white shadow-lg transition hover:bg-neutral-800"
        >
          <span className="relative flex h-4 w-5 items-center justify-center">
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-white transition-all duration-[350ms] ease-in-out ${
                open ? "translate-y-0 rotate-45" : "-translate-y-[6px] rotate-0"
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-white transition-all duration-[350ms] ease-in-out ${
                open ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-white transition-all duration-[350ms] ease-in-out ${
                open ? "translate-y-0 -rotate-45" : "translate-y-[6px] rotate-0"
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
