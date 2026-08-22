# Backlog — próximas iteraciones

> Documento de planeación. Nada de esto está construido todavía; queda aquí para no perder el contexto entre sesiones.

## 1. Tablero Kanban por proyecto

- **Dónde vive**: toggle "Lista / Tablero" dentro de `/proyectos/[id]`, junto a la tabla de tareas existente (no una ruta nueva).
- **Columnas**: una por cada valor de `TASK_STATUS` (Pendiente por inicio, En proceso, Stand by, Vencida, Finalizada, Cancelada), mismos colores que los badges actuales.
- **Orden dentro de columna**: fecha de compromiso ascendente, desde `v_task_status` (ya existe, no requiere cambios de esquema).
- **Tarjeta**: título, responsable(s), semáforo de fecha, punto de nota pendiente si aplica. Clic abre el `TaskDrawer` existente — sin lógica de edición nueva.
- **Fuera de alcance del primer corte**: drag-and-drop entre columnas. Mover a "Cancelada"/"Finalizada" necesita datos que un arrastre no captura bien (motivo, fecha); ese cambio de estado se sigue haciendo desde el drawer. Drag-and-drop puede evaluarse después como mejora.
- **Esfuerzo estimado**: bajo. Es una vista de lectura nueva sobre datos y permisos que ya existen.

## 2. Reuniones (extracción de tareas y responsabilidades)

Objetivo: registrar una reunión y de ahí desprender ítems de acción que luego se conviertan en Tarea, Proyecto o pendiente de Agenda.

### Modelo de datos propuesto

```
meetings                (id, title, date, project_id nullable, created_by, notes, created_at)
meeting_participants    (meeting_id, user_id)
meeting_action_items    (id, meeting_id, description, suggested_responsible nullable,
                          suggested_due_date nullable,
                          converted_to enum(none, task, project, agenda),
                          converted_ref_id uuid nullable, created_at)
```

### Flujo

1. Se crea una reunión (título, fecha, participantes, proyecto asociado opcional).
2. Durante o después, se registran ítems de acción: descripción + responsable sugerido + fecha sugerida (captura liviana, no son tareas completas todavía).
3. Cada ítem tiene tres acciones de conversión:
   - **Convertir en tarea** → abre el `TaskDrawer` de creación, prellenado, dentro del proyecto asociado (o eligiendo uno).
   - **Convertir en proyecto** → abre el modal de creación de proyecto, prellenado con el nombre del ítem.
   - **Convertir en pendiente de agenda** → inserta directo en `agenda_items` del responsable sugerido (o de quien convierte).
4. Al convertir, el ítem queda marcado como resuelto y enlazado al registro creado (para trazabilidad).

### Decisión pendiente de permisos

Hoy solo el Administrador crea proyectos y tareas. Falta decidir si:
- (a) el líder de proyecto puede *capturar* ítems de acción y convertir a Agenda libremente, pero convertir a Tarea/Proyecto requiere que un Administrador lo ejecute, o
- (b) se relaja el permiso de creación de tareas para que el líder también pueda convertir directamente dentro de sus propios proyectos.

Esto define si hay que tocar RLS de `tasks`/`projects` o si Reuniones se apoya 100% en las reglas actuales.

### Ubicación en la app

Nueva sección "Reuniones" en el Sidebar (junto a Proyectos, dentro de "Gestión"), con listado + detalle por reunión, siguiendo el mismo patrón visual que Proyectos.

### Esfuerzo estimado

Medio-alto: 2 tablas nuevas + RLS, una vista de listado, una vista de detalle con captura de ítems, y 3 flujos de conversión que reutilizan modales/drawers existentes.

---

**Sugerencia para retomar**: empezar por el Kanban (esfuerzo bajo, cierra una funcionalidad ya anunciada) y dejar Reuniones para una sesión con más margen, comenzando por resolver la decisión de permisos antes de tocar esquema.
