# Bingo Musical

Aplicación web móvil para organizar y jugar un bingo musical presencial. La persona anfitriona prepara una playlist, comparte un código o QR y anuncia cada canción manualmente; cada jugador usa su propio cartón digital desde el móvil.

Producción: [bingo.conquense.dev](https://bingo.conquense.dev)

Historial de cambios: [CHANGELOG.md](CHANGELOG.md)

## Qué incluye

- Dos experiencias separadas: [administración](#organizar-una-partida) y [jugadores](#jugar-desde-el-móvil).
- Una única partida activa por instalación, con sala de espera, código de seis caracteres y QR para compartir.
- Importación de canciones desde texto, CSV o una playlist de Spotify conectada por OAuth.
- Cartones deterministas de 3 × 4: al volver desde el mismo navegador, el jugador recupera su identidad y su cartón.
- Estado compartido y validación autoritativa de marcas, línea y bingo con Convex.
- Resultados con ganadores, horas de inicio y fin, historial de canciones anunciadas y resumen copiable.
- Interfaz en español, pensada primero para pantallas móviles.

## Alcance y reglas de juego

La música se reproduce fuera de la aplicación. El anfitrión elige y anuncia manualmente una canción de la lista cada vez que suena; Bingo Musical no reproduce música ni sincroniza la reproducción con Spotify.

| Regla | Comportamiento |
| --- | --- |
| Playlist | De 24 a 75 canciones. Se recomiendan 30–45 para grupos grandes. |
| Inicio | Se necesitan al menos dos jugadores para empezar. |
| Cartón | 12 canciones, distribuidas en 3 columnas y 4 filas. |
| Línea | Una columna completa: 4 canciones en vertical. Solo hay una línea ganadora. |
| Bingo | El primer cartón completo validado termina la partida. |
| Inscripciones | Solo están abiertas mientras la sala espera jugadores. |
| Reentrada | El mismo navegador recupera el jugador; al borrar los datos del navegador se pierde esa identidad local. |

La aplicación valida las reclamaciones contra las canciones anunciadas por el anfitrión. Marcar una casilla es una acción del jugador; la comprobación se hace al reclamar línea o bingo.

## Organizar una partida

1. Abre [`/admin`](https://bingo.conquense.dev/admin) e inicia sesión como anfitrión.
2. Importa una lista de canciones y revisa la previsualización.
3. Crea la partida. La sala muestra un código, un enlace y un QR para los jugadores.
4. Espera a que se unan al menos dos personas y pulsa **Iniciar partida**.
5. Reproduce la música por el medio que prefieras y usa la pestaña **Anunciar** para registrar cada canción que suena.
6. Consulta ganadores e historial en **Resultados**. Puedes copiar un resumen o preparar una nueva partida.

### Formatos de importación manual

Pega una canción por línea, con cualquiera de estos formatos:

```text
La Flaca;Jarabe de Palo
Dancing Queen - ABBA
```

También se acepta CSV con columnas `Título`/`Artista` o `Title`/`Artist`. Las canciones repetidas se eliminan durante la importación y las filas inválidas se señalan antes de crear la partida.

### Importar desde Spotify

La importación de Spotify es opcional y requiere configurar OAuth. Desde el panel de anfitrión, conecta una cuenta que tenga acceso a la playlist, pega su URL o URI y revisa las canciones importadas antes de crear la partida.

Funciona con playlists accesibles desde la cuenta conectada, incluidas las propias, colaborativas o guardadas en la biblioteca. La integración solo lee los datos de la playlist; no inicia reproducción ni controla Spotify.

## Jugar desde el móvil

1. Abre el enlace o escanea el QR compartido por el anfitrión. También puedes escribir el código en [`/play`](https://bingo.conquense.dev/play).
2. Introduce tu nombre para recibir un cartón.
3. Marca las canciones que reconozcas mientras escuchas la música.
4. Reclama una línea vertical o bingo cuando corresponda. El servidor valida la jugada y muestra el resultado.

Durante una partida se requiere conexión. La aplicación conserva únicamente la identidad y el cartón del jugador en el almacenamiento local del navegador para permitir reentrar desde el mismo dispositivo.

## Arquitectura

| Capa | Tecnología y responsabilidad |
| --- | --- |
| Interfaz | Next.js App Router, React y TypeScript. |
| Estado compartido | Convex: partidas, jugadores, cartones, marcas y validación de premios. |
| Administración | Rutas de servidor de Next.js protegidas con sesión de administrador. |
| Integración musical | Spotify Web API mediante OAuth Authorization Code, solo para importar playlists. |
| Código QR | Generado en el cliente con `qrcode`. |
| Despliegue | Vercel para la aplicación y Convex para el backend en tiempo real. |
| Pruebas | Vitest para unidad e integración y Playwright para el flujo de navegador. |

Las órdenes administrativas viajan de Next.js a funciones internas de Convex protegidas por un secreto compartido. El navegador de un jugador solo recibe el estado necesario para jugar: su cartón, sus marcas, el estado de la partida y cuántas canciones se han anunciado.

## Desarrollo local

### Requisitos

- Node.js 22 o posterior.
- pnpm 10 (el proyecto fija `pnpm@10.25.0`).
- Una cuenta y un despliegue de Convex para probar el estado compartido.
- Opcionalmente, una aplicación de Spotify Developer para importar playlists.

### Instalar y ejecutar

```bash
git clone https://github.com/ralph1985/music-bingo.git
cd music-bingo
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Configura las variables de la siguiente sección en `.env.local`. Después, inicia o vincula el despliegue de desarrollo de Convex y arranca Next.js:

```bash
pnpm exec convex dev
```

En otra terminal:

```bash
pnpm dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

> `convex dev` es un proceso de desarrollo que sincroniza el backend. Usa un despliegue de desarrollo o de QA para pruebas; no apuntes el entorno local a datos de producción.

## Configuración

`.env.example` enumera la configuración mínima del servidor. Nunca subas `.env.local`, credenciales, tokens ni secretos al repositorio.

| Variable | Necesaria | Dónde se usa | Descripción |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Sí | Next.js | URL HTTPS del despliegue de Convex que usará la aplicación. |
| `ADMIN_PASSWORD_HASH` | Sí | Next.js | Hash `scrypt` de la contraseña de administración. |
| `SESSION_SECRET` | Sí | Next.js | Secreto aleatorio para firmar la sesión de administración y el estado OAuth. |
| `ADMIN_COMMAND_SECRET` | Sí | Next.js y Convex | Mismo secreto de servidor en ambos servicios para autorizar órdenes administrativas internas. |
| `SPOTIFY_CLIENT_ID` | Solo Spotify | Next.js | Identificador de la aplicación de Spotify. |
| `SPOTIFY_CLIENT_SECRET` | Solo Spotify | Next.js | Secreto de la aplicación de Spotify. |
| `SPOTIFY_REDIRECT_URI` | Solo Spotify | Next.js y Spotify | Callback configurado en Spotify Developer Dashboard. |
| `SPOTIFY_TOKEN_ENCRYPTION_KEY` | Solo Spotify | Next.js | Clave base64 de 32 bytes para cifrar el refresh token en la cookie HTTP-only. |

### Secretos de administración

Genera el hash de contraseña y el secreto de sesión desde una terminal interactiva. El script muestra los valores para que los copies directamente al gestor de secretos; no los guarda en archivos.

```bash
pnpm secrets:admin
```

Genera también el secreto de comunicación entre Next.js y Convex:

```bash
pnpm secrets:admin-command
```

Configura `ADMIN_COMMAND_SECRET` con exactamente el mismo valor en Vercel (o `.env.local`) y en el despliegue de Convex. Por ejemplo:

```bash
pnpm exec convex env set ADMIN_COMMAND_SECRET "<el-mismo-valor>"
```

### Configuración opcional de Spotify

1. Crea una aplicación en [Spotify for Developers](https://developer.spotify.com/).
2. Registra la URI de retorno. En local usa `http://localhost:3000/api/admin/spotify/callback`; en producción usa el dominio público seguido de `/api/admin/spotify/callback`.
3. Configura las cuatro variables `SPOTIFY_*` de la tabla anterior.
4. Genera la clave de cifrado sin guardarla en Git:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

La aplicación solicita los permisos `playlist-read-private` y `playlist-read-collaborative`. El refresh token se cifra antes de guardarse en una cookie `HttpOnly` limitada a las rutas de administración.

## Verificación

Ejecuta los controles locales antes de abrir una solicitud de cambio:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Para la prueba de navegador necesitas un `NEXT_PUBLIC_CONVEX_URL` válido. Playwright levanta automáticamente el servidor de desarrollo:

```bash
NEXT_PUBLIC_CONVEX_URL=https://<despliegue-qa>.convex.cloud pnpm test:e2e
```

## Estructura del repositorio

```text
src/app/                 Rutas, páginas y endpoints de Next.js
src/components/          Componentes de anfitrión, jugador, QR e iconos
src/server/              Autenticación, importación y adaptadores de servidor
src/domain/              Reglas de cartas y partida independientes de la UI
src/storage/             Persistencia local para la reentrada del jugador
convex/                  Esquema, funciones de juego y comando administrativo
scripts/                 Generadores locales de secretos
tests/                   Pruebas end-to-end de Playwright
```

## Limitaciones conocidas

- Solo puede haber una partida en espera o en curso por instalación.
- La reproducción y el anuncio automático de canciones no forman parte de la aplicación.
- No hay modo sin conexión durante una partida activa.
- La reentrada depende de conservar los datos locales del mismo navegador.
- La importación de Spotify requiere una cuenta autorizada con acceso a la playlist y está limitada a 75 canciones por partida.

## Contribuir

1. Crea una rama para el cambio.
2. Mantén las rutas de anfitrión y jugador separadas y no expongas secretos ni funciones administrativas al cliente.
3. Añade o ajusta pruebas junto con el cambio.
4. Ejecuta los controles de la sección [Verificación](#verificación).
5. Actualiza este README cuando cambien el flujo, la configuración o las limitaciones de uso.

Consulta `AGENTS.md` antes de modificar código de Next.js o Convex: contiene reglas específicas del proyecto y referencias a la documentación vigente de cada plataforma.

## Licencia

Este proyecto se distribuye bajo la [licencia MIT](LICENSE).
