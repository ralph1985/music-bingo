---
name: music-bingo-mobile-ui
description: Revisa cambios de UI móvil de Music Bingo con flujos accesibles.
license: MIT
compatibility: Requiere una aplicación local en marcha o un despliegue de QA aprobado para inspección en navegador.
metadata:
  audience: colaboradores del proyecto
  scope: music-bingo
---

# Revisar un flujo móvil de Music Bingo

Usa esta skill para cambios en páginas, componentes, estilos, compartición QR, controles del anfitrión, cartones de jugadores o feedback inline. El objetivo de aceptación es una experiencia móvil comprensible a 375 px tanto para anfitrión como para jugador.

## Procedimiento

1. Lee el componente modificado, sus pruebas directas y la ruta relevante. Mantén controles de anfitrión en `/admin` y entrada de jugador en `/play` o `/play/<code>`; no mezcles sus permisos ni estado.
2. Añade o actualiza la prueba focalizada de renderizado o comportamiento antes de cambiar el comportamiento de UI. Prueba las etiquetas y estados visibles, no solo detalles de implementación.
3. Inspecciona la ruta renderizada con viewport de 375 px. Compara `document.documentElement.scrollWidth` con `window.innerWidth` y revisa los controles, diálogos y feedback afectados.
4. Comprueba teclado y táctil: los botones conservan texto visible, los iconos son decorativos cuando acompañan texto, el foco es visible, los campos tienen etiquetas, los diálogos exponen su título y los errores aparecen junto al control que los causó.
5. Ejecuta la prueba de componente relevante y después los comandos de verificación de `music-bingo-verify`.

## Restricciones del proyecto

- Mantén legible el ciclo de vida: preparar, sala de espera, en juego y resultados. Empezar no está disponible hasta que se hayan unido dos jugadores.
- El código compartido y QR deben seguir siendo legibles y copiables. No hagas el QR la única vía de entrada; `/play` acepta un código.
- El anfitrión anuncia música manualmente. La UI de jugador puede mostrar su cartón y feedback validado, pero no debe convertir la importación de Spotify en reproducción.
- Conserva la reentrada desde el mismo navegador mediante almacenamiento local, tratando Convex como fuente de verdad tras recarga o reconexión.
