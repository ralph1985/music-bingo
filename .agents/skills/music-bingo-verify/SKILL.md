---
name: music-bingo-verify
description: Verifica cambios de Music Bingo antes de commit o release.
license: MIT
compatibility: Requiere Node.js 22, pnpm 10 y una URL de Convex configurada para pruebas de navegador.
metadata:
  audience: colaboradores del proyecto
  scope: music-bingo
---

# Verificar un cambio de Music Bingo

Usa esta skill para un cambio terminado de código, configuración, UI o documentación en este repositorio. Verifica el alcance previsto antes de un commit, push o release solicitado; no autoriza esos efectos por sí misma.

## Cuándo usarla

- Un cambio afecta comportamiento de la aplicación, cobertura de pruebas, estilos, configuración, guía para agentes o documentación.
- El usuario pide verificar, hacer commit, push, release o revisar un cambio.
- No la uses para desplegar, borrar datos de producción ni cambiar secretos. Esas acciones requieren una petición explícita y su propia aprobación.

## Procedimiento

1. Inspecciona `git status --short --branch`, los diffs sin preparar/en staging y las pruebas relevantes. Confirma que cada archivo modificado pertenece a la tarea y que no se incluyen `.env*`, salida generada, `.hermes/`, `.next/` ni estado local de agentes.
2. Ejecuta la prueba Vitest focalizada para la lógica o componente modificado. Si cambia un comportamiento visible, haz que la prueba falle antes de implementarlo.
3. Ejecuta la batería local completa:

   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

   Criterio de finalización: los cuatro comandos terminan correctamente.
4. Para flujos de navegador afectados, usa un despliegue de QA aprobado en lugar de datos de producción:

   ```bash
   NEXT_PUBLIC_CONVEX_URL=https://<despliegue-qa-aprobado>.convex.cloud pnpm test:e2e
   ```

   Criterio de finalización: pasan todas las pruebas Playwright.
5. Para cambios de UI móvil, inspecciona la ruta relevante a 375 px. Confirma que los controles tienen texto visible o nombre accesible, el foco es visible, los errores inline se leen y `document.documentElement.scrollWidth` coincide con el ancho de viewport.
6. Si el usuario pidió explícitamente commit, prepara solo las rutas previstas, inspecciona `git diff --cached` y haz commit. Si pidió explícitamente push, lee `git ls-remote origin refs/heads/main` y confirma que coincide con `git rev-parse HEAD`.

## Comprobaciones del proyecto

- Una partida necesita una playlist de 24–75 canciones y dos jugadores antes de poder comenzar.
- La ruta de jugador y la prueba de navegador necesitan un `NEXT_PUBLIC_CONVEX_URL` válido.
- Un build completo puede leer `.env.local`; nunca imprimas ni modifiques ese archivo al verificar.
- Una batería de pruebas correcta no demuestra que se haya producido una mutación o despliegue en producción. Lee el objetivo externo después de cualquier efecto solicitado.
