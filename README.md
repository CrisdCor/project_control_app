# Control de Proyectos

Plataforma de control y seguimiento de proyectos para Veloces. Next.js 16 + Tailwind CSS v4 + Supabase.

## Estado

Proyecto en construcción iterativa. Ver `docs/00-especificacion-tecnica.md` para el modelo de datos, la matriz de permisos y el mapa de páginas completo.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Infraestructura

- **Supabase**: proyecto `project_control_app` (org `CrisdCor-Tablero`).
- **Vercel**: proyecto `project-control-app`, equipo `cristian-david-corrales-ospinas-projects`.
