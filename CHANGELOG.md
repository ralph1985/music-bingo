# Changelog

Todos los cambios relevantes de Bingo Musical se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [Versionado Semántico](https://semver.org/lang/es/). El repositorio todavía no tiene un tag ni una release de GitHub; la versión publicada en `main` corresponde a `0.1.0` según `package.json`.

## [Unreleased]

### Añadido

- Marca visible `STAGING · develop · No es producción` en entornos no productivos.

### Cambiado

- Rama `develop` como integración y staging persistente en Vercel y Convex.
- Despliegue automático de `develop` en Vercel, manteniendo `main` como producción.
- Flujo de trabajo documentado para ramas, staging y pull requests hacia `main`.

## [0.1.0] - 2026-09-26

### Añadido

- Flujo completo de bingo musical con experiencias separadas para anfitrión (`/admin`) y jugadores (`/play` y `/play/<code>`).
- Creación de partidas con código de seis caracteres, QR, sala de espera y una única partida activa por instalación.
- Importación de playlists desde texto, CSV y Spotify mediante OAuth, con previsualización y validación de errores.
- Backend realtime en Convex para partidas, jugadores, cartones, marcas, canciones anunciadas, línea y bingo.
- Cartones deterministas de 3 × 4 con reentrada desde el mismo navegador.
- Validación autoritativa de marcas, reclamaciones, ganadores y transiciones de partida.
- Controles de anfitrión para iniciar, anunciar canciones, consultar resultados, cancelar y preparar nuevas partidas.
- Autenticación del panel de administración mediante sesión firmada.
- Estado de jugador redactado para no exponer cartones ajenos ni el historial completo del anfitrión.
- Iconos SVG, código QR, favicon de la aplicación y atribución a conquense.dev.

### Cambiado

- Dashboard del anfitrión organizado en pestañas para preparación, sala, anuncios y resultados.
- Interfaz móvil ajustada para conservar el flujo de juego y evitar overflow horizontal.
- Feedback visible para estados de partida, marcas, reclamaciones, resultados e importación de Spotify.
- Acciones administrativas mediadas por rutas de servidor y funciones internas de Convex.

### Corregido

- Creación concurrente de partidas activas y colisiones de códigos.
- Inicio de partida sin los dos jugadores mínimos.
- Restauración de partidas, controles de anfitrión y resultados después de recargar.
- Marcado y desmarcado de canciones según las canciones anunciadas.
- Reclamaciones de línea limitadas a cuatro canciones verticales y condicionadas a las marcas del jugador.
- Restauración del cartón y de la identidad local del jugador.
- Navegación segura a códigos de partida y validación de códigos no disponibles.
- Errores de importación de Spotify mostrados junto al control que los provoca.
- Desbordamiento de los pasos de estado y controles en pantallas móviles.
- Branding residual de la plantilla inicial.

### Seguridad

- Sesiones de administración firmadas y separación entre las rutas de anfitrión y jugador.
- Comandos administrativos protegidos por un secreto servidor a servidor entre Next.js y Convex.
- Funciones administrativas mantenidas como funciones internas de Convex.
- Respuestas de jugador limitadas a los datos necesarios para jugar.

[unreleased]: https://github.com/ralph1985/music-bingo/compare/main...develop
