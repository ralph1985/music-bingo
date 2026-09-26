---
name: music-bingo-convex
description: Cambia con seguridad el estado autoritativo de Convex de Music Bingo.
license: MIT
compatibility: Requiere la guía Convex generada del repositorio y un despliegue de Convex configurado para comprobaciones de integración.
metadata:
  audience: colaboradores del proyecto
  scope: music-bingo
---

# Cambiar el estado autoritativo del juego

Usa esta skill al cambiar `convex/`, una ruta Next.js que envía comandos administrativos a Convex o una consulta o mutación realtime para jugadores. Convex posee el estado durable del juego; el navegador nunca es autoridad para el ciclo de vida ni para validar premios.

## Antes de editar

1. Lee `convex/_generated/ai/guidelines.md` y después inspecciona `convex/schema.ts`, la función relevante y sus pruebas. Si falta la guía generada, no ejecutes un comando que afecte producción solo para recrearla.
2. Traza todos los llamadores: los componentes de jugador usan funciones públicas y redactadas; las rutas administrativas de Next.js autentican al anfitrión antes de llamar al circuito interno servidor a servidor.
3. Indica qué campos, índices y reglas de transición cambian. Criterio de finalización: el cambio conserva la regla de una partida activa y se puede ejercitar con una prueba.

## Reglas

- Da validadores de argumentos a todas las funciones Convex públicas e internas. Usa `internalQuery`, `internalMutation` e `internalAction` para trabajo exclusivo de servidor.
- No expongas una mutación administrativa como función pública. Valida la sesión administrativa en Next.js y el secreto de comando compartido en el límite HTTP de Convex.
- Las respuestas de jugador pueden exponer su propio cartón, sus propias marcas, el estado de la partida y el recuento o intersección con el cartón de las canciones anunciadas. No expongas cartones ajenos, secretos de identidad ni la playlist/historial completo del anfitrión salvo cambio explícito de producto.
- Conserva atómicas las transiciones de ciclo de vida. Fuerza tamaño de playlist, IDs únicos de canción, posibilidad de unirse, mínimo de jugadores y unicidad de premios en Convex, no solo en UI.
- Añade índices al esquema antes de consultarlos. No ejecutes `convex deploy`, import, export, replace ni borrado de datos de producción sin aprobación explícita del usuario.

## Validación

1. Añade pruebas focalizadas en `convex/*.test.ts` o el `src/server/**/*.test.ts` correspondiente para transiciones permitidas y rechazadas.
2. Ejecuta la prueba focalizada y después `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build`.
3. Para un cambio de estado visible en navegador, ejercita tanto la mutación persistida como la UI renderizada en contextos separados de anfitrión y jugador.
4. Antes de cualquier mutación aprobada en producción, exporta una copia, nombra las tablas y alcance exactos, aplica la acción y consulta el objetivo para verificar el resultado esperado.
