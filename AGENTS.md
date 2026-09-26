<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Guía del proyecto Music Bingo

## Producto y arquitectura

- Aplicación web móvil, en español, para bingo musical presencial. El anfitrión controla una ronda en `/admin`; los jugadores entran por `/play` o `/play/<code>`.
- Stack: Next.js App Router 16, React 19, TypeScript estricto, Convex, pnpm, Vitest y Playwright. Los despliegues usan Vercel y Convex.
- El estado compartido y autoritativo vive en Convex. El `localStorage` del navegador solo guarda identidad y cartón locales para reentrar desde el mismo navegador.
- El anfitrión reproduce la música fuera de la aplicación y anuncia las canciones manualmente. Spotify solo importa playlists; no añadas reproducción ni anuncios automáticos sin una decisión explícita de producto.

## Antes de cambiar código

- Inspecciona la implementación, la prueba y el llamador relevantes antes de editar. Respeta los imports existentes y usa el alias `@/*` solo donde el runner de pruebas ya lo soporte.
- Para cambios de Next.js, lee primero la guía correspondiente en `node_modules/next/dist/docs/`. Conserva los límites servidor/cliente: añade `"use client"` únicamente si hacen falta APIs de navegador, hooks o manejadores de eventos.
- Para cualquier cambio de Convex, lee primero `convex/_generated/ai/guidelines.md`. Mantén los comandos del anfitrión mediados por servidor y las funciones de Convex internas, salvo que se diseñe expresamente una API pública para jugadores.
- No leas, imprimas, subas ni inventes valores de secretos `.env*`, Vercel, Convex o Spotify. Documenta solamente nombres y presencia de variables.

## Flujo de ramas y entornos

- `main` es producción y está protegida: nunca hagas push directo; los cambios llegan mediante pull request.
- `develop` es la rama de integración y staging. Crea las ramas de trabajo desde `develop`, integra ahí los cambios verificados y prepara la promoción a producción mediante un pull request de `develop` hacia `main`.
- Vercel despliega automáticamente `develop` en `https://develop.bingo.conquense.dev` y `main` en producción; las demás ramas no tienen despliegue automático.
- El backend persistente de staging es el despliegue Convex `cool-wren-187`; producción usa otro despliegue. Antes de cualquier comando que pueda afectar Convex, identifica explícitamente el destino y no uses producción sin aprobación expresa.
- El staging es accesible públicamente y no debe recibir datos reales de producción ni endpoints temporales de prueba. Usa datos sintéticos y conserva los secretos solo en Vercel/Convex.
- `ADMIN_COMMAND_SECRET` debe estar presente y coincidir entre el entorno Vercel que ejecuta la aplicación y el despliegue Convex correspondiente. Nunca imprimas su valor.

## Invariantes del juego

- Un despliegue solo puede tener una partida en `waiting` o `playing`. Las partidas terminales no deben bloquear una nueva.
- Una playlist tiene entre 24 y 75 canciones con identificadores únicos. Un cartón tiene 3 columnas por 4 filas (12 canciones); una línea es una columna vertical de 4 canciones.
- Para empezar hacen falta al menos dos jugadores. La primera línea válida es única; el primer cartón completo válido termina la partida.
- Los jugadores solo pueden entrar en una partida en espera. Las consultas de jugador no deben exponer el historial completo de canciones anunciadas por el anfitrión ni los cartones de otras personas.
- Mantén atómicas las transiciones de ciclo de vida en Convex y conserva las marcas de servidor (`startedAt`, `completedAt`). No uses relojes del navegador como estado autoritativo.

## Seguridad y datos de producción

- Trata cancelar una partida, reemplazar tablas de Convex, borrar registros, cambiar secretos y desplegar en producción como efectos con impacto. Pide aprobación explícita antes de hacerlos.
- Antes de una operación destructiva aprobada en Convex, exporta una copia local, indica tablas y alcance exactos, y lee el resultado. Al vaciar rondas, elimina primero los `players` dependientes y después los `games`.
- Mantén las credenciales administrativas y el secreto de comandos de Convex en servidor a servidor. Valida sesión de administrador, cuerpo de petición y autorización del comando en cada límite.

## Implementación y verificación

- Añade o ajusta cobertura Vitest focalizada junto con cambios de comportamiento. Usa las convenciones existentes de renderizado para componentes y prueba dominio/servidor sin backend real cuando sea posible.
- Ejecuta primero la prueba focalizada y después `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` para un cambio integrado. Ejecuta `NEXT_PUBLIC_CONVEX_URL=<despliegue-QA-aprobado> pnpm test:e2e` si se modifica un flujo de navegador.
- En trabajo de UI móvil, comprueba `/`, `/admin` y la ruta de jugador afectada a 375 px. Verifica etiquetas visibles, foco de teclado y ausencia de overflow horizontal; los iconos SVG son decorativos cuando tienen una etiqueta visible asociada.
- Mantén los errores visibles en el control que los provoca, especialmente en importación y flujos de anfitrión móvil. No exijas herramientas de desarrollo para entender un fallo.

## Higiene del repositorio

- Haz cambios focalizados. No incluyas en commits salida generada de Convex, `.next/`, `.hermes/`, estado local de agentes ni archivos de secretos.
- No hagas commit, push, despliegues ni mutaciones de producción sin petición explícita del usuario. Antes de un commit solicitado, prepara solo las rutas previstas e inspecciona el diff en staging.
- Actualiza README o documentación concreta cuando cambie un flujo visible, un nombre de configuración o una limitación. Mantén `AGENTS.md` conciso; lleva los procedimientos repetibles de varios pasos a `.agents/skills/`.
