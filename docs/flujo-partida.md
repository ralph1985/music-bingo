# Flujo mínimo de partida

## Entradas y permisos

- `/admin` es la entrada de administración. Requiere una sesión obtenida al validar la contraseña fija configurada como secreto de despliegue.
- `/play/<codigo>` es la entrada de jugadores. El código y el QR solo conceden acceso como jugador a esa partida; nunca otorgan permisos de administración.
- El administrador también participa como jugador, pero sus acciones de administración se autorizan con su sesión independiente.

## Estados de la partida

1. `inicio`: todavía no existe una partida activa.
2. `creada`: el administrador ha creado la partida, ha cargado una lista válida de canciones y dispone de un código de unión.
3. `esperando_jugadores`: los jugadores pueden entrar con la URL o el QR, introducir su nombre y recibir su cartón.
4. `en_curso`: el administrador anuncia canciones manualmente; los jugadores marcan su cartón y pueden reclamar premios.
5. `terminada`: se ha validado un cartón completo. No se aceptan más uniones, marcas ni reclamaciones.
6. `cancelada`: el administrador cierra la partida. No se aceptan más uniones, marcas ni reclamaciones.

Una sola partida puede estar activa por instalación. Una partida terminada o cancelada se conserva hasta su TTL, pero no impide crear una nueva.

## Flujo del administrador

1. Abre `/admin` e inicia sesión con la contraseña fija.
2. Pega una lista de canciones o carga TXT/CSV. La aplicación normaliza y muestra una previsualización editable antes de crear la partida.
3. Crea la partida y recibe el enlace de jugador, el código corto y el QR.
4. Se une también como jugador y elige entre uno y cuatro cartones digitales de 3 × 4; la cantidad queda fijada para esa partida.
5. Comparte la URL o QR con los participantes mientras la partida está en `esperando_jugadores`.
6. Inicia la partida. Desde ese momento selecciona manualmente una canción pendiente cada vez que la reproduce fuera de la aplicación. La aplicación registra la canción como `called` y la muestra al administrador con su historial completo.
7. Puede terminar o cancelar la partida. Una canción ya anunciada no puede volver a anunciarse salvo una corrección administrativa explícita que se defina en una fase posterior.

## Flujo de un jugador

1. Abre `/play/<codigo>` desde el QR, el enlace compartido o introduciendo el código en la pantalla de entrada.
2. Escribe su nombre y elige de uno a cuatro cartones. El navegador crea una identidad limitada a esa partida; la cantidad no se puede cambiar al reentrar.
3. Conserva localmente nombre, identidad, cartones y marcas para reentrar desde el mismo dispositivo tras recargar o cerrar la web.
4. Escucha la música fuera de la aplicación. Cuando el administrador anuncia una canción, la aplicación solo recibe una señal anónima; no revela título, artista, ID, enlace ni historial de canciones anunciadas.
5. Marca la casilla que cree correcta. El servidor no confirma si el marcado es correcto en ese momento.
6. Reclama `Línea` al completar una columna vertical de cuatro canciones o `Cartón completo` al completar cualquiera de sus cartones. El servidor valida la reclamación contra las canciones realmente anunciadas.

Una reclamación inválida elimina al jugador de la partida y bloquea futuras marcas y reclamaciones. La primera línea válida se concede una única vez; después se desactiva `Línea` para todos y la partida continúa hasta que se valide un cartón completo.

## Sincronización y desconexión

El estado compartido de la partida es autoritativo en el servidor. El navegador solo usa `localStorage` como identidad y caché de reentrada del dispositivo.

Durante una partida activa se requiere conexión. Si se pierde, la interfaz muestra `sin conexión` y bloquea las marcas y reclamaciones. Al reconectar, recupera el estado y el cursor de eventos antes de volver a habilitar acciones.

Al intentar unirse a otra partida desde el mismo dispositivo se muestra una confirmación: si se acepta, se sustituye la única partida local anterior. Si se borran los datos del navegador, la identidad y el cartón locales se pierden y el móvil vuelve a empezar.
