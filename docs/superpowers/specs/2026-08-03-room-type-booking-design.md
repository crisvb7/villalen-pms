# Reservas web por tipo de habitación (Doble / Apartamento)

## Contexto y objetivo

Hoy, el motor de reservas público (`/reserva`) deja elegir una habitación física
concreta. Se quiere que el huésped solo elija entre dos categorías —
**Habitación Doble** o **Apartamento** — y que sea el personal, desde el
backoffice, quien asigne la habitación física concreta antes del check-in.

Datos reales de producción (Supabase): 5 habitaciones dobles (Habitación 3, 4,
7, 8, 9 — mismo precio y capacidad entre ellas) + 1 Apartamento (dos
habitaciones unidas con un solo baño, ya modelado como una única fila `Room`).

Alcance: **solo afecta a reservas con `source = WEB`** (el motor de reservas
público). Las reservas manuales (`MANUAL`, `PHONE`) y las que llegan del
Channel Manager (`CHANNEX`, `BOOKING`, `AIRBNB`) siguen asignando una
habitación física concreta directamente, sin cambios.

No incluye: la futura app de personal/huéspedes, ni notificación por email al
admin (se añadirá cuando exista esa app). Tampoco incluye sincronización con
Channex a nivel de tipo (ver limitación al final).

## 1. Modelo de datos

```prisma
enum RoomType {
  DOUBLE
  APARTMENT
}

model Room {
  // ...campos existentes...
  type RoomType @default(DOUBLE)
}

model Booking {
  // ...campos existentes...
  roomId   String?   // antes obligatorio; null = pendiente de asignar habitación
  room     Room?     @relation(fields: [roomId], references: [id])
  roomType RoomType  // tipo elegido por el huésped (WEB) o tipo de la room asignada (resto de fuentes)
}
```

- Migración de Prisma añade `Room.type` (default `DOUBLE`, no rompe filas
  existentes) y hace `Booking.roomId` nullable + añade `Booking.roomType`
  (backfill: para las reservas existentes, `roomType` se rellena copiando el
  `type` de su `room` actual, ya que todas tienen `roomId` no nulo hoy).
- Tras desplegar, hay que entrar una vez en `/admin/habitaciones` y marcar la
  fila "Apartamento" con tipo `APARTMENT` (las 5 dobles ya quedan correctas
  con el valor por defecto).
- `roomId === null` es el único indicador de "pendiente de asignar
  habitación" — no se añade ningún `BookingStatus` nuevo.

## 2. Flujo de reserva pública (`/reserva`)

- Paso "Habitaciones disponibles" deja de listar filas de `Room`. Llama a
  `GET /api/rooms/availability` (misma ruta y mismos parámetros `checkIn`,
  `checkOut`, `guests`; nueva forma de respuesta) que devuelve, por cada tipo
  con al menos una habitación cuya capacidad cubra `guests`:
  ```json
  { "data": [
    { "type": "DOUBLE", "available": true, "price": "80.00", "capacity": 2 },
    { "type": "APARTMENT", "available": false, "price": "140.00", "capacity": 4 }
  ]}
  ```
- Un tipo se omite directamente de la respuesta si ninguna de sus habitaciones
  tiene capacidad `>= guests`, o si `checkRoomTypeAvailability` (sección 3) da
  negativo para esas fechas — en ambos casos es como si no existiera para esa
  búsqueda. Cada tipo restante se muestra como una tarjeta con un texto
  genérico fijo en el frontend (no tomado de una `Room` física concreta) + el
  precio/capacidad reales devueltos por la API. Si la respuesta viene vacía,
  se reutiliza el mismo estado "No hay disponibilidad" que ya existe hoy.
- Al confirmar, `POST /api/bookings` recibe `roomType` (no `roomId`) cuando la
  reserva es del motor público. El precio total se calcula con el precio del
  tipo (exacto, no estimado, porque las 5 dobles comparten precio).
- La reserva se crea con `roomId: null`, `roomType` fijado, mismo cálculo de
  estado PENDING/CONFIRMED según haya tarjeta Stripe o no (sin cambios ahí).
- Como `roomId` es null, no se llama a `pushAvailabilityAndRates` hasta que
  se asigne una habitación concreta (guard clause simple).

## 3. Anti-overbooking por tipo

Nueva función en `booking.service.ts`:

```ts
async function checkRoomTypeAvailability(
  type: RoomType,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean>
```

- Cuenta habitaciones totales de `type` (`prisma.room.count`).
- Trae las reservas activas (`PENDING | CONFIRMED | CHECKED_IN`) que solapan
  `[checkIn, checkOut)` y son de ese tipo — asignadas a una `Room` de ese tipo,
  o sin asignar (`roomId: null`) con ese `roomType` — excluyendo
  `excludeBookingId` si se pasa.
- Hace un *sweep* noche a noche sobre el rango solicitado: por cada noche,
  cuenta cuántas reservas la cubren; si en alguna noche ese conteo alcanza el
  total de habitaciones del tipo, no hay disponibilidad.
- Se prefiere este barrido noche a noche frente a un conteo simple de
  "reservas que tocan el rango" porque ese conteo simple bloquearía reservas
  válidas cuando las reservas existentes no coinciden en las mismas noches
  (ej. 5 reservas dobles distintas y no solapadas entre sí a lo largo de un
  mes, con una nueva petición que solo se solapa parcialmente con cada una,
  nunca ocupando las 5 habitaciones a la vez).
- Se usa en `GET /api/rooms/availability` (para marcar `available`) y otra vez
  dentro de `createBooking` al crear la reserva (para blindar condiciones de
  carrera entre la búsqueda y el envío del formulario).

La asignación de una habitación física concreta (paso 4) sigue usando
`checkAvailability(roomId, ...)`, ya existente y exacta, sin cambios.

## 4. Aviso al admin + asignación desde el calendario

- `AdminLayout` (envuelve todo `/admin/*` salvo login) añade un contador de
  reservas WEB con `roomId: null` y estado activo (no `CANCELLED`), visible en
  cualquier página del backoffice (badge junto a "Reservas" en el sidebar).
- Al pulsar el aviso, se navega a `/admin/calendario?assignBookingId=<id>`.
- `/admin/calendario`, al detectar `assignBookingId` en la URL:
  - Salta la vista a la semana del `checkInDate` de esa reserva.
  - Entra en "modo asignación" para esa reserva: en cada celda calcula si la
    fila (habitación) tiene `type === booking.roomType` **y** está libre en
    todo el rango `checkIn → checkOut` (no solo el día visible en la celda
    donde se hace clic). Las filas/celdas elegibles se resaltan (mismo patrón
    visual que ya existe para el drag&drop); el resto se atenúa.
  - Una barra superior indica "Asignando habitación ({Doble|Apartamento})
    para {huésped} — haz clic en una celda libre" con botón para cancelar el
    modo.
  - Al hacer clic en una celda elegible, se dispara
    `PATCH /api/bookings/:id` con `{ roomId }` (sin tocar fechas), se sale del
    modo asignación y se recarga el calendario.
- `updateBooking` (en `booking.service.ts`, ya existente) gana una validación:
  si se pasa `roomId`, la `Room` de destino debe tener `type === booking.roomType`
  (si no, error "La habitación elegida no es del tipo reservado."). El
  recálculo de `totalAmount` al cambiar de habitación ya existe y no cambia.

## 5. Otros retoques de UI

- `/admin/reservas`: la columna "Habitación" muestra `"Doble"` / `"Apartamento"`
  (por `roomType`) + badge `"Sin asignar"` cuando `roomId` es `null`, en vez
  del nombre de la habitación física.
- El botón "Check-in" se deshabilita (con tooltip) mientras `roomId` sea
  `null` — es la única acción bloqueada por falta de asignación. Confirmar,
  cobrar, facturar, cancelar, reenviar email, etc. funcionan igual que hoy,
  con o sin habitación asignada.
- `/admin/habitaciones`: el formulario de alta/edición de habitación gana un
  selector "Tipo: Doble / Apartamento" (`Room.type`).

## 6. Limitación conocida (documentada, no resuelta en este cambio)

Channex solo sincroniza disponibilidad por habitación física concreta. Mientras
una reserva web quede sin asignar, esa plaza del tipo no se refleja hacia
Booking.com/Airbnb — hay una ventana de posible overbooking cruzado hasta que
el staff asigne la habitación. Queda fuera de alcance porque solo afecta a
reservas `WEB` y requeriría cambios más profundos en el modelo de sync con
Channex; se documenta como riesgo conocido y se mitiga operativamente
(asignar cuanto antes gracias al aviso en el panel).

## 7. Fuera de alcance

- App de personal / huéspedes.
- Notificación por email al admin (se añadirá junto con la app de personal).
- Cambios en reservas `MANUAL`, `PHONE`, `CHANNEX`, `BOOKING`, `AIRBNB`.
- Gestión de contenido editable por tipo (el texto del widget es genérico y
  fijo en el frontend, no editable desde el admin).
