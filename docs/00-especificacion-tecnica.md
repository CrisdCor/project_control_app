# Control de Proyectos — Especificación Técnica (v2)

> Proyecto nuevo e independiente del anterior (`project_control_admin`). No sustituye ni reutiliza esa base de datos ni ese repositorio.

## 1. Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS v4 |
| Backend/DB | Supabase (Postgres, Auth, Storage para fotos de perfil) |
| Hosting | Vercel |
| Autenticación | Supabase Auth, usuarios creados por el Administrador (sin autoregistro). Perfil extendido en tabla `profiles`. |

## 2. Infraestructura ya provisionada

| Recurso | Estado | Detalle |
|---|---|---|
| GitHub `CrisdCor/project_control_app` | **Pendiente** | Requiere tu confirmación (ver pregunta al final) |
| Supabase — organización `CrisdCor-Tablero` | Existente | id `nybakckdbxklvpkdwutw` |
| Supabase — proyecto `project_control_app` | ✅ Creado | ref `ijbzdivfdqlflthgwuss` · región `us-east-1` · costo $0/mes |
| Vercel — equipo | Existente (reutilizado) | `cristian-david-corrales-ospinas-projects` |
| Vercel — proyecto | Se crea en el primer despliegue | nombre sugerido: `project-control-app` |

## 3. Modelo de datos (Postgres)

```
profiles            (id uuid PK = auth.users.id, name, email, area, role enum[admin, gestor], photo_url, created_at)
projects            (id, name, leader_id -> profiles, start_date, end_date,
                      admin_closed bool, archived bool, created_by, created_at, updated_at)
tasks                (id, project_id -> projects, title,
                      start_date, end_date,
                      standby_person text, standby_start_date date,
                      cancel_reason text, cancel_date date,
                      finished_at timestamptz,
                      created_by, created_at, updated_at)
task_assignees       (task_id -> tasks, user_id -> profiles)      -- responsables múltiples
task_checklist       (id, task_id -> tasks, created_by -> profiles,
                      note text, response text, is_done bool, created_at)
agenda_items         (id, user_id -> profiles, text, due_date date,
                      done bool, done_at timestamptz, created_at)
```

**Estados** no se guardan como columna fija: se calculan (vista SQL o función) a partir de fechas y de los campos de excepción (`cancel_date`, `finished_at`, `standby_start_date`, `admin_closed`), para que nunca queden desincronizados.

- **Tarea** → prioridad: Cancelada → Finalizada → Stand by → Vencida → En proceso → Pendiente por inicio.
- **Proyecto** → prioridad: Finalizado (cerrado por admin) → Finalizada sin cierre (todas las tareas finalizadas/canceladas, falta cierre) → Atención (tiene tareas vencidas) → Vencido → En proceso → Pendiente por inicio.

Row Level Security (RLS) en Supabase aplicará la matriz de permisos de la sección 4 directamente en la base de datos, no solo en el frontend.

## 4. Matriz de permisos

| Acción | Administrador | Gestor — líder de proyecto | Gestor — responsable de tarea |
|---|---|---|---|
| Crear/editar/eliminar proyecto | ✅ | ❌ | ❌ |
| Ver proyecto | Todos | Solo los propios | — |
| Archivar / cerrar proyecto | ✅ | ❌ | ❌ |
| Crear/eliminar tarea | ✅ | ❌ | ❌ |
| Ver tarea | Todas | Las de sus proyectos | Las propias |
| Editar campo "Tarea" (título) | ✅ | ❌ | ❌ |
| Editar fechas, stand by, cancelar, finalizar | ✅ | ❌ | ✅ |
| Checklist: crear observación/asignación | ✅ | ✅ | ❌ (solo responde/chequea) |
| Checklist: eliminar | ✅ | Solo las propias | Solo las propias |
| Usuarios: crear/editar/eliminar | ✅ | ❌ | ❌ |
| Contraseña propia | ✅ | ✅ | ✅ |

*Nota:* interpreté "podrá editar algunos aspectos internos de las tareas" del líder como su capacidad de gestionar el checklist/observaciones (no los campos núcleo de la tarea), consistente con la sección de Tareas donde dice que si el líder es un gestor "podrá ver esas tareas pero no podrá gestionarlas". Avísame si la lectura no es la que esperabas.

## 5. Mapa de páginas

```
/login
/overview                    (Resumen — home tras login)
/proyectos                   (tabla + filtros)
/proyectos/[id]               (detalle/edición + zona de peligro)
/mi-trabajo                  (todas mis tareas, incluye finalizadas/canceladas)
/usuarios                    (solo Administrador)
/cuaderno                    (agenda personal ampliada)
/perfil                      (edición de perfil / contraseña)
```

Overview, Proyectos y Mi trabajo comparten el `TaskModal` (slide-over derecha→izquierda) y la `TaskTable` como componentes únicos reutilizados.

## 6. Sistema de diseño

- Inspiración: dashboard de Vercel — fondo blanco/gris muy claro (`#fafafa`), bordes sutiles (`#eaeaea`), esquinas redondeadas (8–12px), tipografía sans-serif (Geist o similar), botones negros sólidos como acción primaria.
- Colores funcionales de estado (badges/semáforo): gris = pendiente, azul = en proceso/hoy, ámbar = atención, rojo = vencido, verde = finalizado.
- `max-width` de contenido (~1280px) centrado en cada `main`, con padding lateral responsive; en pantallas ultrawide el contenido no se estira de borde a borde.
- Layout Overview inspirado en la distribución de dos columnas (contenedor grande arriba, secundario abajo a la izquierda; panel angosto a la derecha de la misma altura combinada) — sin tomar la paleta de esa referencia, solo la distribución.
- Animaciones suaves (200–300ms) en expand/collapse, modal slide-over y transiciones de estado.
- Componentes reutilizables previstos: `Sidebar`, `Header`, `FilterBar`, `DataTable` (con orden por columna), `StatusBadge`, `TaskSlideOver`, `ChecklistPanel`, `AgendaWidget`, `Pagination`.

## 7. Roadmap de preparación

1. ~~Crear proyecto Supabase~~ ✅
2. Crear repositorio GitHub `project_control_app`
3. Definir esquema SQL + RLS (migraciones)
4. Scaffold Next.js + Tailwind v4 + estructura de carpetas
5. Autenticación y layout base (Sidebar/Header/Login)
6. Vistas: Proyectos → Tareas → Overview → Usuarios → Cuaderno
7. Primer despliegue a Vercel
