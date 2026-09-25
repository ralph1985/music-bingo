# Bingo Musical

Aplicación web móvil para jugar al bingo musical con cartones digitales, una partida compartida y música reproducida fuera de la web.

El MVP está en desarrollo. La administración y los jugadores usarán rutas separadas; los jugadores se unirán mediante un código o QR y cada cartón será determinista para poder recuperarse en el mismo dispositivo.

## Desarrollo local

Requisitos: Node.js 22 y pnpm.

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:3000`.

## Validación

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

## Configuración

Copia `.env.example` a un archivo local no rastreado cuando el proyecto requiera servicios externos. No guardes secretos, tokens ni URLs privadas en Git.

## Estado

El flujo funcional y las decisiones del MVP están documentados en `docs/flujo-partida.md`. El proyecto de referencia Python no forma parte de este repositorio ni se modifica desde aquí.

## Licencia

Pendiente de definir antes de publicar una versión estable.
