import {
  HomeIcon,
  FolderIcon,
  CheckSquareIcon,
  UsersIcon,
  NotebookIcon,
  CalendarIcon,
  UserCircleIcon,
} from "@/components/icons";

export const NAV_SECTIONS = [
  {
    id: "principal",
    label: "Principal",
    icon: HomeIcon,
    items: [
      { href: "/overview", label: "Resumen", icon: HomeIcon },
      { href: "/mi-trabajo", label: "Mi trabajo", icon: CheckSquareIcon },
    ],
  },
  {
    id: "gestion",
    label: "Gestión",
    icon: FolderIcon,
    items: [
      { href: "/bitacoras", label: "Bitácoras", icon: FolderIcon },
      { href: "/reuniones", label: "Reuniones", icon: CalendarIcon },
      { href: "/cuaderno", label: "Agenda", icon: NotebookIcon },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: UserCircleIcon,
    items: [
      { href: "/perfil", label: "Mi perfil", icon: UserCircleIcon },
      { href: "/usuarios", label: "Usuarios", icon: UsersIcon, adminOnly: true },
    ],
  },
];
