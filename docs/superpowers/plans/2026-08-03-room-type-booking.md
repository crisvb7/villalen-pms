# Reservas web por tipo de habitación — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El motor de reservas público (`/reserva`) deja elegir una habitación
concreta y solo permite elegir entre **Habitación Doble** o **Apartamento**;
el personal asigna la habitación física concreta después, desde el
calendario del backoffice.

**Architecture:** `Room` gana un campo `type` (DOUBLE/APARTMENT). `Booking.roomId`
pasa a ser opcional (`null` = pendiente de asignar) y `Booking.roomType` guarda
el tipo elegido/asignado. Un nuevo chequeo de disponibilidad "por pool" evita
overbooking a nivel de tipo antes de que exista una habitación concreta. El
backoffice muestra un aviso persistente de reservas sin asignar que enlaza al
calendario, donde se resaltan las habitaciones del tipo correcto y libres para
todo el rango de la reserva; un clic asigna.

**Tech Stack:** Next.js 14 (App Router), Prisma + PostgreSQL, TypeScript,
Tailwind. Sin cambios de librerías.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-08-03-room-type-booking-design.md`.
  Todo requisito de esa spec debe quedar cubierto por alguna tarea de este plan.
- **Este repo no tiene ningún framework de tests** (no hay Jest/Vitest/Playwright,
  ni un solo archivo `*.test.*`). No introduzcas uno como parte de este plan —
  sería una decisión de arquitectura aparte, fuera de alcance. La verificación
  de cada tarea es: `npx tsc --noEmit` (sin errores) + una comprobación manual
  concreta (curl contra la API con el servidor de desarrollo corriendo, o pasos
  de navegador) descrita en cada tarea.
- **Nunca ejecutes `npm run db:migrate` ni `npm run db:seed` contra el
  `DATABASE_URL`/`DIRECT_URL` de producción.** Solo contra una base de datos de
  desarrollo local (Tarea 1). `vercel-build` ya ejecuta `prisma migrate deploy`
  automáticamente en cada despliegue a Vercel — así es como la migración llega
  a producción, sin ningún paso manual sobre la base real.
- Solo las reservas con `source = WEB` (motor de reservas público) usan el
  flujo nuevo de "elige tipo, asigna luego". `MANUAL`, `PHONE`, `CHANNEX`,
  `BOOKING`, `AIRBNB` siguen asignando una habitación concreta directamente al
  crearse — sin cambios de comportamiento para ellas.
- Todo el texto de UI va en español, siguiendo el tono y los mensajes de error
  ya existentes en el código. Sin comentarios salvo que expliquen un motivo no
  obvio (igual que el resto del repo).
- Datos reales de producción (para tener en cuenta al probar manualmente):
  5 habitaciones dobles + 1 Apartamento (una sola fila `Room`), mismo precio y
  capacidad entre las 5 dobles.

---

### Task 1: Base de datos local de desarrollo

**Files:**
- Create: `.env.local` (no versionado — ya cubierto por `.env*` en `.gitignore`)

Sin esto, `prisma migrate dev` y `npm run dev` no tienen a qué base de datos
conectarse. **Nunca apuntes este archivo a la base de producción** — los pasos
de este plan que usan `db:migrate`/`db:seed` **borran datos**.

- [ ] **Step 1: Levantar un Postgres local con Docker**

```bash
docker run --name villalen-pms-dev -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=villalen_pms_dev -p 5433:5432 -d postgres:16
```

(Puerto 5433 en el host para no chocar con un Postgres que ya tengas corriendo
en el 5432 por defecto. Si no tienes Docker, usa cualquier Postgres 14+ que ya
tengas instalado y ajusta la cadena de conexión del paso 2.)

- [ ] **Step 2: Crear `.env.local`**

```env
DATABASE_URL="postgresql://postgres:devpassword@localhost:5433/villalen_pms_dev?schema=public"
DIRECT_URL="postgresql://postgres:devpassword@localhost:5433/villalen_pms_dev?schema=public"
NEXTAUTH_SECRET="dev-secret-cambia-esto"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: Verificar la conexión**

Run: `npx dotenv -e .env.local -- prisma db pull --print`
Expected: sin error de conexión (puede avisar de que no hay tablas — es una
base vacía, es normal).

---

### Task 2: Esquema Prisma — tipo de habitación y reserva sin asignar

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_room_type_and_optional_booking_room/migration.sql` (generado por Prisma, no se escribe a mano)

**Interfaces:**
- Produces: enum `RoomType { DOUBLE, APARTMENT }`; `Room.type: RoomType`
  (default `DOUBLE`); `Booking.roomId: String?`; `Booking.roomType: RoomType`
  (default `DOUBLE`, para que la migración no sea interactiva).

- [ ] **Step 1: Editar el modelo `Room`** (`prisma/schema.prisma`, dentro del
  bloque `model Room { ... }`, justo después de `basePrice`)

```prisma
model Room {
  id          String   @id @default(cuid())
  name        String
  description String?
  capacity    Int
  basePrice   Decimal  @db.Decimal(10, 2)
  type        RoomType @default(DOUBLE)
  isClean     Boolean  @default(true)
  amenities   String[] @default([])
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  channexRoomTypeId String?
  channexRatePlanId String?

  bookings Booking[]

  @@map("rooms")
}

enum RoomType {
  DOUBLE
  APARTMENT
}
```

- [ ] **Step 2: Editar el modelo `Booking`** (`roomId` pasa a opcional, se
  añade `roomType`, la relación `room` pasa a opcional)

```prisma
model Booking {
  id           String        @id @default(cuid())
  guestId      String
  roomId       String?
  roomType     RoomType      @default(DOUBLE)
  checkInDate  DateTime      @db.Date
  checkOutDate DateTime      @db.Date
  totalAmount  Decimal       @db.Decimal(10, 2)
  status       BookingStatus @default(PENDING)
  source       BookingSource @default(WEB)
  depositPaid  Boolean       @default(false)
  notes        String?
  adults       Int           @default(1)
  children     Int           @default(0)

  externalId   String?       @unique
  channelRef   String?

  stripeCustomerId      String?
  stripePaymentMethodId String?
  stripePaymentIntentId String?

  precheckinCompletedAt DateTime?

  sesSubmittedAt     DateTime?
  sesSubmissionError String?

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  guest    Guest     @relation(fields: [guestId], references: [id])
  room     Room?     @relation(fields: [roomId], references: [id])
  invoices Invoice[]

  @@map("bookings")
}
```

> Nota: `roomType` lleva `@default(DOUBLE)` a nivel de base de datos solo para
> que la migración pueda rellenar las filas existentes sin preguntar
> interactivamente por un valor. La app SIEMPRE fija `roomType` explícitamente
> al crear una reserva (Tarea 7) — nunca depende de este default en tiempo de
> ejecución. Para reservas ya existentes con `roomId` no nulo, `roomType`
> queda con este valor por defecto y es inofensivo: en todos los sitios donde
> se muestra el tipo, `room?.name` (el nombre real de la habitación ya
> asignada) tiene prioridad sobre la etiqueta de `roomType` — ver
> `getRoomDisplayName` en la Tarea 3.

- [ ] **Step 3: Generar y aplicar la migración contra la base de desarrollo**

Run: `npx dotenv -e .env.local -- prisma migrate dev --name add_room_type_and_optional_booking_room`
Expected: crea la carpeta de migración, la aplica sin preguntas interactivas,
y termina regenerando el cliente Prisma ("✔ Generated Prisma Client").

- [ ] **Step 4: Verificar tipos generados**

Run: `npx tsc --noEmit`
Expected: **fallará** en varios archivos que asumen `booking.room` /
`room.name` no nulos (`lib/services/*.ts`, `app/admin/page.tsx`, etc.) — es
esperado, se corrige en la Tarea 4. Confirma que el error mencione
"Object is possibly 'null'" en esos sitios (evidencia de que el cambio de
esquema se propagó correctamente a los tipos), no un error de sintaxis en el
propio `schema.prisma`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): añade RoomType y hace roomId opcional en Booking"
```

---

### Task 3: Tipos compartidos y helper de nombre de habitación

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/utils.ts`

**Interfaces:**
- Produces: `ROOM_TYPE_LABELS: Record<string, string>`;
  `getRoomDisplayName(booking: { roomType: string; room?: { name: string } | null }): string`.

- [ ] **Step 1: `lib/types.ts` — re-exportar `RoomType` y actualizar los DTOs**

Modify línea 7-10:
```ts
import { BookingStatus, BookingSource, RoomType } from "@prisma/client";

export { BookingStatus, BookingSource, RoomType };
```

Modify `RoomDTO` (línea 14-25) — añadir `type`:
```ts
export interface RoomDTO {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  type: RoomType;
  isClean: boolean;
  amenities: string[];
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Modify `BookingDTO` (línea 39-58) — `roomId` opcional, añadir `roomType`,
`room` opcional/nulo:
```ts
export interface BookingDTO {
  id: string;
  guestId: string;
  roomId: string | null;
  roomType: RoomType;
  checkInDate: Date;
  checkOutDate: Date;
  totalAmount: number;
  status: BookingStatus;
  source: BookingSource;
  depositPaid: boolean;
  notes: string | null;
  adults: number;
  children: number;
  externalId: string | null;
  channelRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  guest?: GuestDTO;
  room?: RoomDTO | null;
}
```

Modify `CreateBookingInput` (línea 74-94) — `roomId` opcional, añadir `roomType`:
```ts
export interface CreateBookingInput {
  roomId?: string;
  roomType?: RoomType;
  checkInDate: string; // ISO string
  checkOutDate: string; // ISO string
  adults: number;
  children?: number;
  notes?: string;
  source?: BookingSource;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  guest: {
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone?: string;
    nationality?: string;
  };
}
```

- [ ] **Step 2: `lib/utils.ts` — añadir `ROOM_TYPE_LABELS` y `getRoomDisplayName`**

Modify: insertar justo después del bloque `SOURCE_LABELS` (línea 136, antes de
la sección `// ── Validaciones`):

```ts
// ── Tipo de habitación ────────────────────────────────────────────────────

export const ROOM_TYPE_LABELS: Record<string, string> = {
  DOUBLE: "Habitación Doble",
  APARTMENT: "Apartamento",
};

// Si la reserva ya tiene una habitación física asignada, se muestra su
// nombre; si no (reserva web pendiente de asignar), se muestra el tipo.
export function getRoomDisplayName(booking: {
  roomType: string;
  room?: { name: string } | null;
}): string {
  return booking.room?.name ?? ROOM_TYPE_LABELS[booking.roomType] ?? "Sin asignar";
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: mismos errores que en la Tarea 2 (no se han corregido todavía, solo
se ha añadido el helper) — ningún error nuevo originado en `lib/types.ts` o
`lib/utils.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/utils.ts
git commit -m "feat: tipos compartidos y helper de nombre de habitación para reservas sin asignar"
```

---

### Task 4: Barrido de null-safety — todos los puntos que leían `room.name`

**Files:**
- Modify: `app/admin/page.tsx:4,129`
- Modify: `app/admin/facturas/page.tsx:21-26,152`
- Modify: `app/precheckin/[id]/page.tsx:11-27,154`
- Modify: `lib/services/precheckin.service.ts:8-32`
- Modify: `app/api/bookings/[id]/resend-email/route.ts:12,40`
- Modify: `lib/services/invoice.service.ts:14,204`
- Modify: `lib/services/stats.service.ts:96-102`
- Modify: `lib/utils/traveler-record.ts:68,104`

**No incluye** `lib/services/booking.service.ts` (se corrige dentro de las
Tareas 7 y 8, que ya reescriben esas funciones) ni `app/reserva/page.tsx`
(reescritura completa en la Tarea 11) ni `app/admin/reservas/page.tsx` /
`app/admin/calendario/page.tsx` (Tareas 13 y 15).

**Interfaces:**
- Consumes: `ROOM_TYPE_LABELS`, `getRoomDisplayName` (Tarea 3).

- [ ] **Step 1: `app/admin/page.tsx`**

Modify línea 4 (import):
```ts
import { formatDate, formatCurrency, STATUS_LABELS, STATUS_COLORS, getRoomDisplayName } from "@/lib/utils";
```

Modify línea 129 (antes: `{booking.room.name} · {booking.adults} adultos`):
```tsx
                  <p className="text-xs text-stone-400">
                    {getRoomDisplayName(booking)}
                    {!booking.roomId && (
                      <span className="ml-1.5 text-amber-600 font-medium">· Sin asignar</span>
                    )}
                    {" · "}{booking.adults} adultos
                    {booking.children > 0 ? `, ${booking.children} niños` : ""}
                  </p>
```

- [ ] **Step 2: `app/admin/facturas/page.tsx`**

Modify línea 5 (import):
```ts
import { formatDate, formatCurrency, PAYMENT_METHOD_LABELS, ROOM_TYPE_LABELS } from "@/lib/utils";
```

Modify interfaz `Invoice.booking` (línea 21-26):
```ts
  booking: {
    checkInDate: string;
    checkOutDate: string;
    roomType: string;
    guest: { firstName: string; lastName: string; email: string };
    room: { name: string } | null;
  };
```

Modify línea 152 (antes: `{invoice.booking.room.name}`):
```tsx
                    <td className="px-4 py-3 text-stone-700">
                      {invoice.booking.room?.name ?? ROOM_TYPE_LABELS[invoice.booking.roomType]}
                    </td>
```

- [ ] **Step 3: `lib/services/precheckin.service.ts`**

Modify función completa (línea 8-32):
```ts
export async function getBookingForPrecheckin(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: { select: { name: true } } },
  });
  if (!booking) return null;

  return {
    id: booking.id,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    status: booking.status,
    precheckinCompletedAt: booking.precheckinCompletedAt,
    roomType: booking.roomType,
    room: booking.room ? { name: booking.room.name } : null,
    guest: {
      firstName: booking.guest.firstName,
      lastName: booking.guest.lastName,
      documentId: booking.guest.documentId,
      email: booking.guest.email,
      phone: booking.guest.phone,
      nationality: booking.guest.nationality,
      birthDate: booking.guest.birthDate,
    },
  };
}
```

- [ ] **Step 4: `app/precheckin/[id]/page.tsx`**

Modify línea 9 (import, añadir `ROOM_TYPE_LABELS`):
```ts
import { scanMrzFromImage } from "@/lib/utils/mrz-scan";
import { ROOM_TYPE_LABELS } from "@/lib/utils";
```

Modify interfaz `BookingInfo` (línea 11-27):
```ts
interface BookingInfo {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  precheckinCompletedAt: string | null;
  roomType: string;
  room: { name: string } | null;
  guest: {
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone: string | null;
    nationality: string | null;
    birthDate: string | null;
  };
}
```

Modify línea 154 (antes: `<p className="font-medium text-stone-800">{booking.room.name}</p>`):
```tsx
              <p className="font-medium text-stone-800">
                {booking.room?.name ?? ROOM_TYPE_LABELS[booking.roomType]}
              </p>
```

- [ ] **Step 5: `app/api/bookings/[id]/resend-email/route.ts`**

Modify línea 12 (import):
```ts
import { formatDateLong, formatCurrency, getRoomDisplayName } from "@/lib/utils";
```

Modify línea 40 (antes: `roomName: booking.room.name,`):
```ts
          roomName: getRoomDisplayName(booking),
```

- [ ] **Step 6: `lib/services/invoice.service.ts`**

Modify línea 14 (import):
```ts
import { formatCurrency, getRoomDisplayName } from "@/lib/utils";
```

Modify línea 204 (antes: `roomName: booking.room.name,`, dentro de `renderInvoicePdf`):
```ts
      roomName: getRoomDisplayName(booking),
```

- [ ] **Step 7: `lib/services/stats.service.ts`**

Modify bloque "Rendimiento por habitación" (línea 96-102) — excluir reservas
sin habitación asignada de este desglose por habitación física:
```ts
  const roomMap = new Map<string, { roomName: string; bookings: number; revenue: number }>();
  for (const b of bookings) {
    if (!b.roomId || !b.room) continue;
    const entry = roomMap.get(b.roomId) ?? { roomName: b.room.name, bookings: 0, revenue: 0 };
    entry.bookings += 1;
    entry.revenue += parseFloat(b.totalAmount.toString());
    roomMap.set(b.roomId, entry);
  }
```

- [ ] **Step 8: `lib/utils/traveler-record.ts`**

Modify línea 68 (antes: `<NumeroHabitacion>${escapeXml(room?.name ?? "N/A")}</NumeroHabitacion>`):
```ts
    <NumeroHabitacion>${escapeXml(room?.name ?? ROOM_TYPE_LABELS[booking.roomType])}</NumeroHabitacion>
```

Modify línea 104 (antes: `console.log(\`🏠 Habitación: ${room?.name}\`);`):
```ts
  console.log(`🏠 Habitación: ${room?.name ?? ROOM_TYPE_LABELS[booking.roomType]}`);
```

Modify línea 9 (import, añadir `ROOM_TYPE_LABELS`):
```ts
import { formatDate, detectDocumentType, ROOM_TYPE_LABELS } from "@/lib/utils";
```

- [ ] **Step 9: Verificar**

Run: `npx tsc --noEmit`
Expected: **sin errores**. Si queda alguno, es un sitio que este barrido no
cubrió — corrígelo con el mismo patrón (`room?.name ?? ROOM_TYPE_LABELS[...]`
o `getRoomDisplayName(...)`) antes de continuar.

- [ ] **Step 10: Commit**

```bash
git add app/admin/page.tsx app/admin/facturas/page.tsx app/precheckin/[id]/page.tsx lib/services/precheckin.service.ts app/api/bookings/[id]/resend-email/route.ts lib/services/invoice.service.ts lib/services/stats.service.ts lib/utils/traveler-record.ts
git commit -m "fix: soporta reservas sin habitación asignada en todos los puntos que mostraban room.name"
```

---

### Task 5: Room service y API — campo `type` en habitaciones

**Files:**
- Modify: `lib/services/room.service.ts:1,8-21,50-61`
- Modify: `app/api/rooms/route.ts:34,43-50`
- Modify: `app/api/rooms/[id]/route.ts:50-60`

**Interfaces:**
- Produces: `CreateRoomData.type?: RoomType`; `UpdateRoomData.type?: RoomType`
  (heredado de `CreateRoomData`, sin cambios de firma en `updateRoom`).

- [ ] **Step 1: `lib/services/room.service.ts` — import + interfaces**

Modify línea 1-6 (import):
```ts
import { prisma } from "@/lib/prisma";
import { parseISO, isValid, addDays } from "date-fns";
import { pushAvailabilityAndRates } from "@/lib/services/channex.service";
import { RoomType } from "@prisma/client";
```

Modify `CreateRoomData` (línea 8-15):
```ts
export interface CreateRoomData {
  name: string;
  description?: string;
  capacity: number;
  basePrice: number;
  type?: RoomType;
  amenities?: string[];
  imageUrl?: string;
}
```

(`UpdateRoomData` en línea 17-21 no cambia — ya hereda `type` de
`Partial<CreateRoomData>` automáticamente.)

- [ ] **Step 2: `createRoom` — fijar tipo por defecto**

Modify (línea 50-61):
```ts
export async function createRoom(data: CreateRoomData) {
  return prisma.room.create({
    data: {
      name: data.name,
      description: data.description,
      capacity: data.capacity,
      basePrice: data.basePrice,
      type: data.type ?? RoomType.DOUBLE,
      amenities: data.amenities ?? [],
      imageUrl: data.imageUrl,
    },
  });
}
```

(`updateRoom` no necesita cambios de código — ya pasa `data` completo a
Prisma, y `type` ahora es un campo válido de `UpdateRoomData`.)

- [ ] **Step 3: `app/api/rooms/route.ts` — aceptar `type` al crear**

Modify línea 34:
```ts
    const { name, description, capacity, basePrice, amenities, imageUrl, type } = body;
```

Modify línea 43-50:
```ts
    const room = await createRoom({
      name,
      description,
      capacity: Number(capacity),
      basePrice: Number(basePrice),
      type,
      amenities: amenities ?? [],
      imageUrl,
    });
```

- [ ] **Step 4: `app/api/rooms/[id]/route.ts` — aceptar `type` al editar**

Modify línea 50-60 (dentro del `PATCH`, añadir `type: body.type,`):
```ts
    const room = await updateRoom(params.id, {
      name: body.name,
      description: body.description,
      capacity: body.capacity ? Number(body.capacity) : undefined,
      basePrice: body.basePrice ? Number(body.basePrice) : undefined,
      type: body.type,
      isClean: body.isClean,
      amenities: body.amenities,
      imageUrl: body.imageUrl,
      channexRoomTypeId: body.channexRoomTypeId,
      channexRatePlanId: body.channexRatePlanId,
    });
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit` → sin errores.

Con `npm run dev` corriendo y sesión iniciada, en otra terminal:
```bash
curl -s http://localhost:3000/api/rooms | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).data.map(r => ({name: r.name, type: r.type}))))"
```
Expected: cada habitación trae un campo `type` (`"DOUBLE"` por defecto).

- [ ] **Step 6: Commit**

```bash
git add lib/services/room.service.ts app/api/rooms/route.ts app/api/rooms/[id]/route.ts
git commit -m "feat: las habitaciones admiten un campo type (Doble/Apartamento)"
```

---

### Task 6: Chequeo de disponibilidad por tipo (anti-overbooking del pool)

**Files:**
- Modify: `lib/services/booking.service.ts:1-9,15-36`

**Interfaces:**
- Consumes: nada nuevo (usa `prisma`, `BookingStatus` ya importados).
- Produces: `checkRoomTypeAvailability(type: RoomType, checkIn: Date, checkOut: Date, excludeBookingId?: string): Promise<boolean>` — usada por las Tareas 7 y 9.

- [ ] **Step 1: Import de `RoomType`**

Modify línea 7 (antes: `import { BookingStatus, BookingSource } from "@prisma/client";`):
```ts
import { BookingStatus, BookingSource, RoomType } from "@prisma/client";
```

- [ ] **Step 2: Añadir `checkRoomTypeAvailability`**

Modify: insertar justo después de `checkAvailability` (después de la línea 36,
antes del comentario `// ── CRUD Reservas`):

```ts
// Comprueba si queda al menos una habitación del tipo libre para TODO el
// rango [checkIn, checkOut), contando tanto reservas ya asignadas a una
// habitación de ese tipo como reservas web todavía sin asignar de ese tipo.
// Se hace un barrido noche a noche (no un simple conteo de solapes) porque
// un conteo simple rechazaría reservas válidas cuando las reservas
// existentes no coinciden todas en las mismas noches.
export async function checkRoomTypeAvailability(
  type: RoomType,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const totalRoomsOfType = await prisma.room.count({ where: { type } });
  if (totalRoomsOfType === 0) return false;

  const overlapping = await prisma.booking.findMany({
    where: {
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      OR: [{ roomId: null, roomType: type }, { room: { type } }],
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } },
      ],
    },
    select: { checkInDate: true, checkOutDate: true },
  });

  const events = overlapping.flatMap((b) => [
    { date: b.checkInDate.getTime(), delta: 1 },
    { date: b.checkOutDate.getTime(), delta: -1 },
  ]);
  events.sort((a, b) => a.date - b.date || a.delta - b.delta);

  let concurrent = 0;
  for (const e of events) {
    concurrent += e.delta;
    if (concurrent >= totalRoomsOfType) return false;
  }

  return true;
}
```

- [ ] **Step 3: Verificar manualmente (sin caller todavía)**

Con `npm run dev` corriendo, crea un archivo temporal
`scripts/_manual-check.ts`:
```ts
import { checkRoomTypeAvailability } from "@/lib/services/booking.service";
import { RoomType } from "@prisma/client";

checkRoomTypeAvailability(RoomType.DOUBLE, new Date("2099-01-01"), new Date("2099-01-05"))
  .then((r) => console.log("Disponible (fecha lejana, sin reservas):", r));
```
Run: `npx dotenv -e .env.local -- ts-node scripts/_manual-check.ts`
Expected: `Disponible (fecha lejana, sin reservas): true`

Borra `scripts/_manual-check.ts` después (no se commitea).

- [ ] **Step 4: Commit**

```bash
git add lib/services/booking.service.ts
git commit -m "feat: chequeo de disponibilidad por tipo de habitación (anti-overbooking del pool)"
```

---

### Task 7: `createBooking` admite reservas web sin habitación concreta

**Files:**
- Modify: `lib/services/booking.service.ts:70-177`

**Interfaces:**
- Consumes: `checkRoomTypeAvailability` (Tarea 6); `getRoomDisplayName` (Tarea 3); `CreateBookingInput` (Tarea 3, con `roomId`/`roomType` opcionales).

- [ ] **Step 1: Import de `getRoomDisplayName`**

Modify línea 13 (antes: `import { formatDateLong, formatCurrency } from "@/lib/utils";`):
```ts
import { formatDateLong, formatCurrency, getRoomDisplayName } from "@/lib/utils";
```

- [ ] **Step 2: Reescribir `createBooking`**

Modify función completa (línea 70-177):
```ts
export async function createBooking(input: CreateBookingInput) {
  const checkIn = parseISO(input.checkInDate);
  const checkOut = parseISO(input.checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error("Fechas inválidas.");
  }
  if (checkIn >= checkOut) {
    throw new Error("La fecha de salida debe ser posterior a la de entrada.");
  }
  if (checkIn < new Date(new Date().setHours(0, 0, 0, 0))) {
    throw new Error("No se pueden crear reservas en el pasado.");
  }
  if (!input.roomId && !input.roomType) {
    throw new Error("Debes indicar una habitación (roomId) o un tipo de habitación (roomType).");
  }

  let assignedRoomId: string | undefined;
  let roomType: RoomType;
  let pricePerNight: number;

  if (input.roomId) {
    const room = await prisma.room.findUnique({ where: { id: input.roomId } });
    if (!room) throw new Error("Habitación no encontrada.");

    const isAvailable = await checkAvailability(input.roomId, checkIn, checkOut);
    if (!isAvailable) {
      throw new Error(
        "La habitación no está disponible para las fechas seleccionadas. Por favor, elige otras fechas."
      );
    }
    assignedRoomId = room.id;
    roomType = room.type;
    pricePerNight = parseFloat(room.basePrice.toString());
  } else {
    roomType = input.roomType!;
    const isAvailable = await checkRoomTypeAvailability(roomType, checkIn, checkOut);
    if (!isAvailable) {
      throw new Error(
        "No quedan habitaciones de ese tipo disponibles para las fechas seleccionadas. Por favor, elige otras fechas."
      );
    }
    const reference = await prisma.room.findFirst({
      where: { type: roomType },
      orderBy: { basePrice: "asc" },
    });
    if (!reference) throw new Error("No hay habitaciones configuradas de ese tipo.");
    pricePerNight = parseFloat(reference.basePrice.toString());
  }

  const nights = differenceInDays(checkOut, checkIn);
  const totalAmount = parseFloat((pricePerNight * nights).toFixed(2));

  let guest = await prisma.guest.findFirst({
    where: { documentId: input.guest.documentId },
  });

  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        firstName: input.guest.firstName,
        lastName: input.guest.lastName,
        documentId: input.guest.documentId,
        email: input.guest.email,
        phone: input.guest.phone,
        nationality: input.guest.nationality ?? "ES",
      },
    });
  } else {
    guest = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        email: input.guest.email,
        phone: input.guest.phone ?? guest.phone,
      },
    });
  }

  const hasStripeCard = Boolean(input.stripeCustomerId && input.stripePaymentMethodId);
  const isManualStaffEntry = input.source === BookingSource.MANUAL;

  const booking = await prisma.booking.create({
    data: {
      guestId: guest.id,
      roomId: assignedRoomId,
      roomType,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalAmount,
      status:
        hasStripeCard || isManualStaffEntry
          ? BookingStatus.CONFIRMED
          : BookingStatus.PENDING,
      source: input.source ?? BookingSource.WEB,
      depositPaid: false,
      adults: input.adults,
      children: input.children ?? 0,
      notes: input.notes,
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentMethodId: input.stripePaymentMethodId,
    },
    include: { guest: true, room: true },
  });

  if (booking.roomId) {
    await pushAvailabilityAndRates(booking.roomId, checkIn, checkOut);
  }

  const isConfirmed = hasStripeCard || isManualStaffEntry;
  await sendEmail({
    to: booking.guest.email,
    subject: isConfirmed ? "Tu reserva está confirmada" : "Hemos recibido tu solicitud de reserva",
    react: BookingConfirmationEmail({
      guestFirstName: booking.guest.firstName,
      roomName: getRoomDisplayName(booking),
      checkInDate: formatDateLong(booking.checkInDate),
      checkOutDate: formatDateLong(booking.checkOutDate),
      totalAmount: formatCurrency(booking.totalAmount.toString()),
      status: isConfirmed ? "CONFIRMED" : "PENDING",
      precheckinUrl: `${process.env.NEXTAUTH_URL ?? ""}/precheckin/${booking.id}`,
      bankIban: process.env.HOTEL_BANK_IBAN,
    }),
  });

  return booking;
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit` → sin errores nuevos (la ruta `app/api/bookings/route.ts`
todavía envía siempre `roomId`, se actualiza en la Tarea 10 — hasta entonces
`input.roomType` simplemente no se usa desde la API real, pero el tipo ya
compila).

Con el servidor corriendo:
```bash
curl -s -X POST http://localhost:3000/api/bookings -H "Content-Type: application/json" -d '{
  "roomType": "DOUBLE",
  "checkInDate": "2099-03-01",
  "checkOutDate": "2099-03-03",
  "adults": 2,
  "source": "WEB",
  "guest": {"firstName":"Test","lastName":"Manual","documentId":"00000000T","email":"test@example.com"}
}'
```
Expected: `201`, respuesta con `"roomId": null`, `"roomType": "DOUBLE"`,
`"totalAmount"` calculado con el precio de la doble más barata.

- [ ] **Step 4: Commit**

```bash
git add lib/services/booking.service.ts
git commit -m "feat: createBooking admite reservas web sin habitación concreta (roomType)"
```

---

### Task 8: `updateBooking` valida el tipo al asignar habitación + guards de Channex

**Files:**
- Modify: `lib/services/booking.service.ts` (funciones `updateBookingStatus`,
  `updateBooking`, `cancelBooking`, `deleteBooking`)

**Interfaces:**
- Produces: `updateBooking` ahora rechaza asignar un `roomId` cuyo `type` no
  coincida con `booking.roomType` (error: "La habitación elegida no es del
  tipo reservado.") — usado por la Tarea 15 (modo asignación del calendario).

- [ ] **Step 1: `updateBookingStatus` — guard de Channex**

Modify (antes: `await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);`):
```ts
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  depositPaid?: boolean
) {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status,
      ...(depositPaid !== undefined ? { depositPaid } : {}),
    },
    include: { guest: true, room: true },
  });

  if (booking.roomId) {
    await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);
  }

  return booking;
}
```

- [ ] **Step 2: Reescribir `updateBooking`**

Modify función completa:
```ts
export async function updateBooking(
  id: string,
  data: Partial<{
    checkInDate: Date;
    checkOutDate: Date;
    roomId: string;
    status: BookingStatus;
    depositPaid: boolean;
    notes: string;
    adults: number;
    children: number;
  }>
) {
  const previous = await prisma.booking.findUnique({
    where: { id },
    include: { room: true, invoices: { select: { id: true } } },
  });
  if (!previous) throw new Error("Reserva no encontrada.");

  const movesDatesOrRoom = Boolean(data.checkInDate || data.checkOutDate || data.roomId);

  if (movesDatesOrRoom && previous.invoices.length > 0) {
    throw new Error(
      "Esta reserva ya tiene una factura asociada; no se pueden cambiar sus fechas o su habitación."
    );
  }

  let recomputedTotal: number | undefined;

  if (movesDatesOrRoom) {
    const checkIn = data.checkInDate ?? previous.checkInDate;
    const checkOut = data.checkOutDate ?? previous.checkOutDate;
    const targetRoomId = data.roomId ?? previous.roomId;

    if (checkIn >= checkOut) {
      throw new Error("La fecha de salida debe ser posterior a la de entrada.");
    }

    const targetRoom = data.roomId
      ? await prisma.room.findUnique({ where: { id: data.roomId } })
      : previous.room;

    if (data.roomId) {
      if (!targetRoom) throw new Error("Habitación no encontrada.");
      if (targetRoom.type !== previous.roomType) {
        throw new Error("La habitación elegida no es del tipo reservado.");
      }
    }

    if (targetRoomId && targetRoom) {
      const isAvailable = await checkAvailability(targetRoomId, checkIn, checkOut, id);
      if (!isAvailable) {
        throw new Error(
          "Las nuevas fechas u habitación generan un conflicto con otra reserva existente."
        );
      }

      const nights = differenceInDays(checkOut, checkIn);
      recomputedTotal = parseFloat((parseFloat(targetRoom.basePrice.toString()) * nights).toFixed(2));
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...data,
      ...(recomputedTotal !== undefined ? { totalAmount: recomputedTotal } : {}),
    },
    include: { guest: true, room: true },
  });

  const roomChanged = Boolean(data.roomId && data.roomId !== previous.roomId);
  if (roomChanged) {
    if (previous.roomId) {
      await pushAvailabilityAndRates(previous.roomId, previous.checkInDate, previous.checkOutDate);
    }
    if (updated.roomId) {
      await pushAvailabilityAndRates(updated.roomId, updated.checkInDate, updated.checkOutDate);
    }
  } else if (updated.roomId) {
    const syncFrom = previous.checkInDate < updated.checkInDate ? previous.checkInDate : updated.checkInDate;
    const syncTo = previous.checkOutDate > updated.checkOutDate ? previous.checkOutDate : updated.checkOutDate;
    await pushAvailabilityAndRates(updated.roomId, syncFrom, syncTo);
  }

  return updated;
}
```

- [ ] **Step 3: `cancelBooking` y `deleteBooking` — guards de Channex + email**

Modify `cancelBooking`:
```ts
export async function cancelBooking(id: string) {
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED },
    include: { guest: true, room: true },
  });

  if (booking.roomId) {
    await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);
  }

  await sendEmail({
    to: booking.guest.email,
    subject: "Tu reserva ha sido cancelada",
    react: BookingCancelledEmail({
      guestFirstName: booking.guest.firstName,
      roomName: getRoomDisplayName(booking),
      checkInDate: formatDateLong(booking.checkInDate),
      checkOutDate: formatDateLong(booking.checkOutDate),
    }),
  });

  return booking;
}
```

Modify `deleteBooking` (antes: `if (booking) { await pushAvailabilityAndRates(booking.roomId, ...) }`):
```ts
export async function deleteBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });

  await prisma.invoice.deleteMany({ where: { bookingId: id } });
  const deleted = await prisma.booking.delete({ where: { id } });

  if (booking?.roomId) {
    await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);
  }

  return deleted;
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sin errores.

Con el servidor corriendo, usando el `id` de la reserva creada en la Tarea 7
(sin asignar, tipo `DOUBLE`) y el `id` de una habitación real de tipo
`APARTMENT`:
```bash
curl -s -X PATCH http://localhost:3000/api/bookings/<BOOKING_ID> -H "Content-Type: application/json" -d '{"roomId":"<APARTMENT_ROOM_ID>"}'
```
Expected: `422` con `"error":"La habitación elegida no es del tipo reservado."`

Repite con el `id` de una habitación real de tipo `DOUBLE`:
```bash
curl -s -X PATCH http://localhost:3000/api/bookings/<BOOKING_ID> -H "Content-Type: application/json" -d '{"roomId":"<DOUBLE_ROOM_ID>"}'
```
Expected: `200`, la reserva devuelta trae `"roomId"` ya con ese valor y
`"room":{"name": "..."}`.

- [ ] **Step 5: Commit**

```bash
git add lib/services/booking.service.ts
git commit -m "feat: updateBooking valida el tipo de habitación al asignar; guards de Channex sin habitación"
```

---

### Task 9: Disponibilidad por tipo para el motor de reservas público

**Files:**
- Modify: `lib/services/room.service.ts:1-6,97-132`
- Modify: `app/api/rooms/availability/route.ts`

**Interfaces:**
- Consumes: `checkRoomTypeAvailability` (Tarea 6).
- Produces: `getAvailableRoomTypes(checkInDate: string, checkOutDate: string, minCapacity?: number): Promise<{ type: RoomType; available: boolean; price: number; capacity: number }[]>`.

- [ ] **Step 1: Import cruzado en `room.service.ts`**

Modify línea 1-4 (añadir el import de `checkRoomTypeAvailability`):
```ts
import { prisma } from "@/lib/prisma";
import { parseISO, isValid, addDays } from "date-fns";
import { pushAvailabilityAndRates } from "@/lib/services/channex.service";
import { checkRoomTypeAvailability } from "@/lib/services/booking.service";
import { RoomType } from "@prisma/client";
```

- [ ] **Step 2: Reemplazar `getAvailableRooms` por `getAvailableRoomTypes`**

Modify (línea 97-132, sustituye toda la sección `// ── Disponibilidad`):
```ts
// ── Disponibilidad por tipo (motor de reservas público) ───────────────────

export async function getAvailableRoomTypes(
  checkInDate: string,
  checkOutDate: string,
  minCapacity = 1
): Promise<{ type: RoomType; available: boolean; price: number; capacity: number }[]> {
  const ci = parseISO(checkInDate);
  const co = parseISO(checkOutDate);

  if (!isValid(ci) || !isValid(co) || ci >= co) {
    throw new Error("Rango de fechas inválido.");
  }

  const rooms = await prisma.room.findMany({
    where: { capacity: { gte: minCapacity } },
    orderBy: { basePrice: "asc" },
  });

  const types = Array.from(new Set(rooms.map((r) => r.type)));

  const results = await Promise.all(
    types.map(async (type) => {
      const cheapest = rooms.find((r) => r.type === type)!; // rooms ya viene ordenado por basePrice asc
      const available = await checkRoomTypeAvailability(type, ci, co);
      return {
        type,
        available,
        price: parseFloat(cheapest.basePrice.toString()),
        capacity: cheapest.capacity,
      };
    })
  );

  return results.filter((r) => r.available);
}
```

> Nota: asume precio y capacidad uniformes entre las habitaciones de un mismo
> tipo (confirmado para los datos reales: 5 dobles con el mismo precio y
> capacidad). Si en el futuro varían, esto mostraría el precio/capacidad de
> la más barata del tipo — de momento fuera de alcance (ver spec, sección 7).

- [ ] **Step 3: `app/api/rooms/availability/route.ts` — usar la nueva función**

Modify (reemplaza el import y la llamada):
```ts
// app/api/rooms/availability/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAvailableRoomTypes } from "@/lib/services/room.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const guests = parseInt(searchParams.get("guests") ?? "1");

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "Se requieren los parámetros checkIn y checkOut." },
        { status: 400 }
      );
    }

    const types = await getAvailableRoomTypes(checkIn, checkOut, guests);
    return NextResponse.json({ data: types });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "Error al buscar disponibilidad.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sin errores.

```bash
curl -s "http://localhost:3000/api/rooms/availability?checkIn=2099-04-01&checkOut=2099-04-03&guests=2"
```
Expected: `{"data":[{"type":"DOUBLE","available":true,"price":...,"capacity":...},{"type":"APARTMENT","available":true,...}]}`
(dos entradas si ambos tipos tienen capacidad suficiente y están libres esas fechas).

- [ ] **Step 5: Commit**

```bash
git add lib/services/room.service.ts app/api/rooms/availability/route.ts
git commit -m "feat: /api/rooms/availability devuelve disponibilidad por tipo, no por habitación"
```

---

### Task 10: API de reservas — validación por tipo + endpoint de pendientes de asignar

**Files:**
- Modify: `lib/services/booking.service.ts` (nueva función)
- Modify: `app/api/bookings/route.ts:36-84`
- Create: `app/api/bookings/pending-assignment/route.ts`

**Interfaces:**
- Produces: `getPendingRoomAssignmentBookings(): Promise<Booking[]>` (con
  `guest` incluido) — consumida por la Tarea 14 (aviso en el layout admin) vía
  `GET /api/bookings/pending-assignment`.

- [ ] **Step 1: `lib/services/booking.service.ts` — nueva función de consulta**

Modify: insertar después de `getBookingById` (antes de `createBooking`):
```ts
export async function getPendingRoomAssignmentBookings() {
  return prisma.booking.findMany({
    where: {
      roomId: null,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    include: { guest: true },
    orderBy: { checkInDate: "asc" },
  });
}
```

- [ ] **Step 2: `app/api/bookings/route.ts` — POST acepta `roomId` o `roomType`**

Modify línea 41-49 (validación):
```ts
    if ((!body.roomId && !body.roomType) || !body.checkInDate || !body.checkOutDate || !body.guest) {
      return NextResponse.json(
        {
          error:
            "Faltan campos obligatorios: roomId o roomType, checkInDate, checkOutDate, guest.",
        },
        { status: 400 }
      );
    }
```

Modify línea 66-84 (llamada a `createBooking`):
```ts
    const booking = await createBooking({
      roomId: body.roomId,
      roomType: body.roomType,
      checkInDate: body.checkInDate,
      checkOutDate: body.checkOutDate,
      adults: body.adults ?? 1,
      children: body.children ?? 0,
      notes: body.notes,
      source: body.source,
      stripeCustomerId: body.stripeCustomerId,
      stripePaymentMethodId: body.stripePaymentMethodId,
      guest: {
        firstName: body.guest.firstName,
        lastName: body.guest.lastName,
        documentId: body.guest.documentId,
        email: body.guest.email,
        phone: body.guest.phone,
        nationality: body.guest.nationality,
      },
    });
```

- [ ] **Step 3: Nuevo endpoint `GET /api/bookings/pending-assignment`**

Create `app/api/bookings/pending-assignment/route.ts`:
```ts
// app/api/bookings/pending-assignment/route.ts
// Reservas web sin habitación concreta asignada — usado por el aviso del
// backoffice (ver AdminLayout) para saber a cuántas hay que atender.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getPendingRoomAssignmentBookings } from "@/lib/services/booking.service";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const bookings = await getPendingRoomAssignmentBookings();
    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error("[GET /api/bookings/pending-assignment]", error);
    return NextResponse.json(
      { error: "Error al obtener reservas pendientes de asignar." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sin errores.

Repite el curl de creación de reserva web de la Tarea 7, luego:
```bash
curl -s http://localhost:3000/api/bookings/pending-assignment
```
Expected: incluye la reserva recién creada (o `401` si el curl no manda la
cookie de sesión — en ese caso, prueba desde el navegador con sesión iniciada,
o usa `-b cookies.txt` tras loguearte con curl).

- [ ] **Step 5: Commit**

```bash
git add lib/services/booking.service.ts app/api/bookings/route.ts app/api/bookings/pending-assignment/route.ts
git commit -m "feat: API de reservas acepta roomType y expone las pendientes de asignar habitación"
```

---

### Task 11: Motor de reservas público — elegir tipo en vez de habitación

**Files:**
- Modify: `app/reserva/page.tsx` (reescritura completa del archivo)

- [ ] **Step 1: Reescribir el archivo completo**

Modify `app/reserva/page.tsx` en su totalidad:

```tsx
"use client";
// app/reserva/page.tsx
// Motor de Reservas Público — Paso a paso
// El huésped elige un TIPO de habitación (Doble / Apartamento), no una
// habitación física concreta — el personal asigna la habitación real desde
// el backoffice antes de la llegada (ver /admin/calendario).
// Si hay Stripe configurado (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY), el paso 3
// guarda la tarjeta del huésped (tokenizada) y la reserva queda confirmada
// al momento. Si no, se mantiene el flujo original de transferencia bancaria.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO, differenceInDays, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type RoomTypeKey = "DOUBLE" | "APARTMENT";

interface RoomTypeOption {
  type: RoomTypeKey;
  available: boolean;
  price: number;
  capacity: number;
}

const ROOM_TYPE_CONTENT: Record<RoomTypeKey, { label: string; description: string; amenities: string[] }> = {
  DOUBLE: {
    label: "Habitación Doble",
    description:
      "Habitación acogedora con cama doble y baño privado, pensada para una estancia cómoda en plena naturaleza asturiana.",
    amenities: ["WiFi", "Calefacción", "Baño privado", "Ropa de cama incluida"],
  },
  APARTMENT: {
    label: "Apartamento",
    description:
      "Dos habitaciones unidas con un único baño — ideal para familias o grupos que buscan más espacio e independencia dentro de la casa.",
    amenities: ["WiFi", "Calefacción", "Baño privado", "Más espacio", "Ideal para grupos"],
  },
};

interface BookingConfirmation {
  id: string;
  totalAmount: string;
  status: string;
  roomType: RoomTypeKey;
  checkInDate: string;
  checkOutDate: string;
  guest: { firstName: string; lastName: string; email: string };
}

type Step = "search" | "results" | "form" | "success";

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number(amount)
  );

const formatDateEs = (d: string) =>
  format(parseISO(d), "d 'de' MMMM 'de' yyyy", { locale: es });

interface GuestForm {
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone: string;
  notes: string;
}

// ── Paso 3: formulario de datos + tokenización de tarjeta ──────────────────
function BookingFormStep({
  selectedType,
  checkIn,
  checkOut,
  guests,
  nights,
  onBack,
  onSuccess,
}: {
  selectedType: RoomTypeOption;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  onBack: () => void;
  onSuccess: (confirmation: BookingConfirmation) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const stripeEnabled = Boolean(publishableKey);

  const [guestForm, setGuestForm] = useState<GuestForm>({
    firstName: "",
    lastName: "",
    documentId: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let stripeCustomerId: string | undefined;
      let stripePaymentMethodId: string | undefined;

      if (stripeEnabled) {
        if (!stripe || !elements) {
          throw new Error("El formulario de pago aún se está cargando. Inténtalo de nuevo.");
        }
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error("No se pudo leer los datos de la tarjeta.");
        }

        const setupRes = await fetch("/api/payments/setup-intent", { method: "POST" });
        const setupData = await setupRes.json();
        if (!setupRes.ok) throw new Error(setupData.error ?? "No se pudo iniciar el pago.");

        const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
          setupData.data.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: `${guestForm.firstName} ${guestForm.lastName}`.trim(),
                email: guestForm.email,
              },
            },
          }
        );

        if (stripeError) throw new Error(stripeError.message ?? "La tarjeta fue rechazada.");
        if (!setupIntent?.payment_method) {
          throw new Error("No se pudo guardar la tarjeta.");
        }

        stripeCustomerId = setupData.data.customerId;
        stripePaymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method.id;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: selectedType.type,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: guests,
          notes: guestForm.notes,
          source: "WEB",
          stripeCustomerId,
          stripePaymentMethodId,
          guest: {
            firstName: guestForm.firstName,
            lastName: guestForm.lastName,
            documentId: guestForm.documentId,
            email: guestForm.email,
            phone: guestForm.phone,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la reserva.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={onBack} className="btn-ghost mb-4 -ml-2">
          ← Volver a habitaciones
        </button>
        <h2 className="font-serif text-3xl text-stone-800">Tus datos</h2>
      </div>

      <div className="card p-5 mb-6 bg-amber-50 border-amber-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-stone-800">{ROOM_TYPE_CONTENT[selectedType.type].label}</p>
            <p className="text-sm text-stone-500 mt-0.5">
              {checkIn && formatDateEs(checkIn)} → {checkOut && formatDateEs(checkOut)}
            </p>
            <p className="text-sm text-stone-500">
              {nights} {nights === 1 ? "noche" : "noches"} · {guests}{" "}
              {guests === 1 ? "persona" : "personas"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl text-stone-900">
              {formatCurrency(selectedType.price * nights)}
            </p>
            <p className="text-xs text-stone-400">Total estimado</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="label mb-2">Nombre *</label>
            <input
              type="text"
              className="input"
              placeholder="María"
              value={guestForm.firstName}
              onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label mb-2">Apellidos *</label>
            <input
              type="text"
              className="input"
              placeholder="García López"
              value={guestForm.lastName}
              onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="label mb-2">DNI / NIE / Pasaporte *</label>
            <input
              type="text"
              className="input"
              placeholder="12345678A"
              value={guestForm.documentId}
              onChange={(e) =>
                setGuestForm({ ...guestForm, documentId: e.target.value.toUpperCase() })
              }
              required
            />
          </div>
          <div>
            <label className="label mb-2">Teléfono</label>
            <input
              type="tel"
              className="input"
              placeholder="+34 600 000 000"
              value={guestForm.phone}
              onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="label mb-2">Email *</label>
          <input
            type="email"
            className="input"
            placeholder="tu@email.com"
            value={guestForm.email}
            onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
            required
          />
          {!stripeEnabled && (
            <p className="text-xs text-stone-400 mt-1">
              Recibirás las instrucciones de pago en este correo.
            </p>
          )}
        </div>

        <div className="mb-8">
          <label className="label mb-2">Comentarios (opcional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Llegada tardía, alergias, ocasión especial…"
            value={guestForm.notes}
            onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
          />
        </div>

        {stripeEnabled ? (
          <div className="mb-6">
            <label className="label mb-2">Tarjeta (como garantía) *</label>
            <div className="input py-3">
              <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
            </div>
            <p className="text-xs text-stone-400 mt-2">
              🔒 No se realiza ningún cargo ahora. Guardamos tu tarjeta como garantía y
              te cobraremos el importe total más adelante, una vez pase el plazo de
              cancelación gratuita.
            </p>
          </div>
        ) : (
          <div className="bg-stone-50 border border-stone-200 p-4 mb-6 text-sm text-stone-500">
            <p className="font-medium text-stone-700 mb-1">💳 Sin pago ahora</p>
            <p>
              Esta reserva quedará como <strong>PENDIENTE</strong>. En breve recibirás
              un email con los datos para realizar el pago por{" "}
              <strong>transferencia bancaria</strong>. La reserva se confirmará al
              recibir el ingreso.
            </p>
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading || (stripeEnabled && (!stripe || !elements))}
        >
          {loading ? "Procesando…" : "Confirmar solicitud de reserva →"}
        </button>
      </form>
    </div>
  );
}

function ReservaPageContent() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("search");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState<RoomTypeOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const nights =
    checkIn && checkOut
      ? Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))
      : 0;

  const performSearch = async (ci: string, co: string, g: number) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `/api/rooms/availability?checkIn=${ci}&checkOut=${co}&guests=${g}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoomTypes(data.data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || nights < 1) {
      setError("Selecciona fechas válidas (mínimo 1 noche).");
      return;
    }
    await performSearch(checkIn, checkOut, guests);
  };

  useEffect(() => {
    const qpCheckIn = searchParams.get("checkIn");
    const qpCheckOut = searchParams.get("checkOut");
    const qpGuests = searchParams.get("guests");

    if (!qpCheckIn || !qpCheckOut) return;

    const ci = parseISO(qpCheckIn);
    const co = parseISO(qpCheckOut);
    if (!isValid(ci) || !isValid(co) || ci >= co) return;

    const g = qpGuests ? Math.max(1, parseInt(qpGuests, 10) || 1) : 2;

    setCheckIn(qpCheckIn);
    setCheckOut(qpCheckOut);
    setGuests(g);
    performSearch(qpCheckIn, qpCheckOut, g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectType = (type: RoomTypeOption) => {
    setSelectedType(type);
    setStep("form");
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <a href="https://www.villalen.es" className="group">
            <h1 className="font-serif text-xl text-stone-900 group-hover:text-amber-800 transition-colors">
              Villalén
            </h1>
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Motor de Reservas
            </p>
          </a>
          <div className="hidden md:flex items-center gap-3 text-xs text-stone-400">
            {(["search", "results", "form", "success"] as Step[]).map(
              (s, i) => {
                const labels: Record<Step, string> = {
                  search: "1. Fechas",
                  results: "2. Tipo de alojamiento",
                  form: "3. Tus datos",
                  success: "4. Confirmación",
                };
                const isActive = step === s;
                const isPast =
                  ["search", "results", "form", "success"].indexOf(step) > i;
                return (
                  <span
                    key={s}
                    className={`${isActive ? "text-amber-800 font-semibold" : isPast ? "text-stone-600" : ""}`}
                  >
                    {labels[s]}
                    {i < 3 && <span className="ml-3">→</span>}
                  </span>
                );
              }
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {step === "search" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-10 text-center">
              <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">
                Disponibilidad en tiempo real
              </p>
              <h2 className="font-serif text-4xl text-stone-800">
                ¿Cuándo nos visitas?
              </h2>
            </div>

            <form onSubmit={handleSearch} className="card p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="label mb-2">Check-in</label>
                  <input
                    type="date"
                    className="input"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label mb-2">Check-out</label>
                  <input
                    type="date"
                    className="input"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="label mb-2">Número de huéspedes</label>
                <select
                  className="input"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "persona" : "personas"}
                    </option>
                  ))}
                </select>
              </div>

              {nights > 0 && (
                <div className="mb-6 bg-amber-50 border border-amber-200 p-4 text-center">
                  <p className="text-sm text-amber-800">
                    <strong>{nights} {nights === 1 ? "noche" : "noches"}</strong> ·{" "}
                    {formatDateEs(checkIn)} → {formatDateEs(checkOut)}
                  </p>
                </div>
              )}

              {error && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Buscando…" : "Ver disponibilidad →"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-stone-400">
                🔒 Reserva segura. {publishableKey ? "Pago con tarjeta protegido por Stripe." : "Pago por transferencia bancaria al confirmar."}
              </p>
            </div>
          </div>
        )}

        {step === "results" && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-3xl text-stone-800">
                  Tipos de alojamiento disponibles
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {nights} {nights === 1 ? "noche" : "noches"} ·{" "}
                  {checkIn && formatDateEs(checkIn)} →{" "}
                  {checkOut && formatDateEs(checkOut)} ·{" "}
                  {guests} {guests === 1 ? "persona" : "personas"}
                </p>
              </div>
              <button
                onClick={() => setStep("search")}
                className="btn-ghost text-sm"
              >
                ← Cambiar fechas
              </button>
            </div>

            {roomTypes.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-4xl mb-4">😔</p>
                <h3 className="font-serif text-2xl text-stone-700 mb-2">
                  No hay disponibilidad
                </h3>
                <p className="text-stone-500 mb-6">
                  No encontramos alojamiento libre para esas fechas o número
                  de huéspedes. Prueba con otras fechas.
                </p>
                <button onClick={() => setStep("search")} className="btn-secondary">
                  Cambiar fechas
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {roomTypes.map((rt) => {
                  const content = ROOM_TYPE_CONTENT[rt.type];
                  const total = rt.price * nights;
                  return (
                    <div key={rt.type} className="card p-6 flex flex-col md:flex-row gap-6">
                      <div className="h-36 w-full md:w-48 flex-shrink-0 bg-stone-100 flex items-center justify-center text-4xl">
                        🏡
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-2xl text-stone-800 mb-1">
                          {content.label}
                        </h3>
                        <p className="text-xs text-stone-400 mb-3">
                          Hasta {rt.capacity} personas
                        </p>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                          {content.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {content.amenities.map((a) => (
                            <span
                              key={a}
                              className="bg-stone-100 text-stone-600 text-xs px-2 py-1"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between min-w-[160px]">
                        <div className="text-right">
                          <p className="text-xs text-stone-400">
                            {formatCurrency(rt.price)} / noche
                          </p>
                          <p className="font-serif text-3xl text-stone-900">
                            {formatCurrency(total)}
                          </p>
                          <p className="text-xs text-stone-400">
                            {nights} {nights === 1 ? "noche" : "noches"} · IVA incl.
                          </p>
                        </div>
                        <button
                          onClick={() => handleSelectType(rt)}
                          className="btn-primary mt-4 w-full"
                        >
                          Seleccionar →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === "form" && selectedType && (
          <Elements stripe={stripePromise}>
            <BookingFormStep
              selectedType={selectedType}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              nights={nights}
              onBack={() => setStep("results")}
              onSuccess={(data) => {
                setConfirmation(data);
                setStep("success");
              }}
            />
          </Elements>
        )}

        {step === "success" && confirmation && (
          <div className="max-w-xl mx-auto text-center">
            <div className="card p-10">
              <div className="text-5xl mb-6">🎉</div>
              <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">
                {confirmation.status === "CONFIRMED" ? "Reserva confirmada" : "Solicitud recibida"}
              </p>
              <h2 className="font-serif text-3xl text-stone-800 mb-4">
                ¡Gracias, {confirmation.guest.firstName}!
              </h2>
              <p className="text-stone-500 mb-6 leading-relaxed">
                {confirmation.status === "CONFIRMED" ? (
                  <>
                    Tu reserva está <strong>confirmada</strong>. Hemos guardado tu
                    tarjeta como garantía; no se ha realizado ningún cargo todavía.
                    Te enviaremos la confirmación a{" "}
                    <strong>{confirmation.guest.email}</strong>.
                  </>
                ) : (
                  <>
                    Hemos registrado tu solicitud de reserva correctamente. En breve
                    recibirás un email en <strong>{confirmation.guest.email}</strong>{" "}
                    con las instrucciones para realizar el pago por{" "}
                    <strong>transferencia bancaria</strong>. La reserva quedará
                    confirmada en cuanto recibamos el ingreso.
                  </>
                )}
              </p>

              <div className="border border-stone-200 divide-y divide-stone-100 text-left mb-8">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Nº Reserva
                  </span>
                  <span className="font-mono text-sm text-stone-700">
                    {confirmation.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Alojamiento
                  </span>
                  <span className="text-sm text-stone-700">
                    {ROOM_TYPE_CONTENT[confirmation.roomType].label}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Check-in
                  </span>
                  <span className="text-sm text-stone-700">
                    {formatDateEs(confirmation.checkInDate)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Check-out
                  </span>
                  <span className="text-sm text-stone-700">
                    {formatDateEs(confirmation.checkOutDate)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Importe Total
                  </span>
                  <span className="font-serif text-lg text-stone-800">
                    {formatCurrency(confirmation.totalAmount)}
                  </span>
                </div>
              </div>

              {confirmation.status !== "CONFIRMED" && (
                <div className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 mb-8">
                  <p className="font-semibold mb-1">📧 Próximos pasos:</p>
                  <ol className="text-left space-y-1 list-decimal list-inside text-amber-800">
                    <li>Revisa tu bandeja de entrada (y spam).</li>
                    <li>Realiza la transferencia con el importe indicado.</li>
                    <li>Te enviaremos la confirmación definitiva en 24h.</li>
                  </ol>
                </div>
              )}

              <a href="https://www.villalen.es" className="btn-secondary w-full justify-center">
                ← Volver a villalen.es
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReservaPage() {
  return (
    <Suspense>
      <ReservaPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit` → sin errores.

Con el servidor corriendo, abre `http://localhost:3000/reserva` en el
navegador: busca fechas → deben aparecer como máximo 2 tarjetas ("Habitación
Doble", "Apartamento") → selecciona una → completa el formulario → confirma.
Verifica en `/admin/reservas` que la reserva aparece con "Sin asignar".

- [ ] **Step 3: Commit**

```bash
git add app/reserva/page.tsx
git commit -m "feat: el motor de reservas público elige tipo de habitación, no una concreta"
```

---

### Task 12: `/admin/habitaciones` — selector de Tipo

**Files:**
- Modify: `app/admin/habitaciones/page.tsx`

- [ ] **Step 1: Interfaz `Room` y estado del formulario**

Modify línea 7-17 (interfaz):
```ts
interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: string;
  type: string;
  isClean: boolean;
  amenities: string[];
  channexRoomTypeId: string | null;
  channexRatePlanId: string | null;
}
```

Modify línea 24-30 (estado inicial del formulario, añadir `type`):
```ts
  const [form, setForm] = useState({
    name: "",
    description: "",
    capacity: "2",
    basePrice: "",
    amenities: "",
    type: "DOUBLE",
  });
```

- [ ] **Step 2: Enviar `type` al crear**

Modify `handleCreate` (línea 47-71):
```ts
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          capacity: Number(form.capacity),
          basePrice: Number(form.basePrice),
          type: form.type,
          amenities: form.amenities
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
        }),
      });
      setForm({ name: "", description: "", capacity: "2", basePrice: "", amenities: "", type: "DOUBLE" });
      setShowForm(false);
      await fetchRooms();
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 3: Handler para cambiar el tipo de una habitación existente**

Modify: insertar después de `handleDelete` (línea 115-124):
```ts
  const handleTypeChange = async (id: string, type: string) => {
    await fetch(`/api/rooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    await fetchRooms();
  };
```

- [ ] **Step 4: Selector en el formulario de alta**

Modify: dentro del grid de "Capacidad" / "Amenidades" (línea 175-198), añadir
un tercer campo (cambiar el grid a 3 columnas en desktop):
```tsx
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label mb-2">Capacidad (personas) *</label>
              <input
                type="number"
                className="input"
                min="1"
                max="20"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Tipo *</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="DOUBLE">Habitación Doble</option>
                <option value="APARTMENT">Apartamento</option>
              </select>
            </div>
            <div>
              <label className="label mb-2">Amenidades (separadas por coma)</label>
              <input
                type="text"
                className="input"
                placeholder="WiFi, TV, Terraza, Aire acondicionado"
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              />
            </div>
          </div>
```

- [ ] **Step 5: Selector inline por habitación existente**

Modify: en el header de cada tarjeta de habitación (línea 246-274), añadir el
selector junto a "Canales"/"Eliminar":
```tsx
                  <div className="flex items-center gap-3">
                    <select
                      value={room.type}
                      onChange={(e) => handleTypeChange(room.id, e.target.value)}
                      className="chip bg-white text-stone-600 border-stone-200"
                    >
                      <option value="DOUBLE">Doble</option>
                      <option value="APARTMENT">Apartamento</option>
                    </select>
                    <span
                      className={cn(
                        "badge",
                        room.isClean
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      )}
                    >
                      {room.isClean ? "✓ Limpia" : "Sucia"}
                    </span>
                    <button
                      onClick={() => openChannelPanel(room)}
                      className={cn(
                        "chip",
                        room.channexRoomTypeId
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-stone-50 text-stone-500 border-stone-200"
                      )}
                    >
                      {room.channexRoomTypeId ? "✓ Canales" : "Canales"}
                    </button>
                    <button
                      onClick={() => handleDelete(room.id, room.name)}
                      className="chip bg-white text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
```

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit` → sin errores.

En el navegador, `/admin/habitaciones`: cambia el selector de tipo de la
habitación "Apartamento" a `Apartamento` y comprueba (recargando la página)
que se guarda. Confirma que las 5 dobles reales muestran "Doble".

- [ ] **Step 7: Commit**

```bash
git add app/admin/habitaciones/page.tsx
git commit -m "feat: selector de Tipo (Doble/Apartamento) en /admin/habitaciones"
```

---

### Task 13: `/admin/reservas` — columna Habitación por tipo + bloqueo de Check-in

**Files:**
- Modify: `app/admin/reservas/page.tsx`

- [ ] **Step 1: Import e interfaz `Booking`**

Modify línea 1-14 (import, añadir `getRoomDisplayName`):
```ts
import {
  formatDate,
  formatCurrency,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
  getNights,
  isPastFreeCancellation,
  getRoomDisplayName,
} from "@/lib/utils";
```

Modify interfaz `Booking` (línea 16-41) — `roomId`/`roomType` nuevos, `room`
opcional/nulo:
```ts
interface Booking {
  id: string;
  roomId: string | null;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  source: string;
  totalAmount: string;
  depositPaid: boolean;
  stripePaymentMethodId: string | null;
  adults: number;
  children: number;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    documentId: string;
  };
  room: {
    name: string;
    basePrice: string;
  } | null;
  invoices: { id: string }[];
  precheckinCompletedAt: string | null;
  sesSubmittedAt: string | null;
  sesSubmissionError: string | null;
}
```

- [ ] **Step 2: Columna "Habitación" con badge "Sin asignar"**

Modify (línea 277-296, dentro del `<td>` de habitación):
```tsx
                      <td className="px-4 py-3">
                        <p className="text-stone-700">
                          {getRoomDisplayName(booking)}
                          {!booking.roomId && (
                            <span className="badge bg-amber-100 text-amber-800 border-amber-200 ml-2">
                              Sin asignar
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-400">
                          {booking.adults} ad.
                          {booking.children > 0
                            ? ` + ${booking.children} niños`
                            : ""}{" "}
                          · {nights} noche{nights !== 1 ? "s" : ""}
                        </p>
                        {booking.precheckinCompletedAt && (
                          <span className="text-xs text-emerald-600 block">✓ Precheckin</span>
                        )}
                        {booking.sesSubmittedAt && (
                          <span className="text-xs text-emerald-600 block">✓ Enviado a Policía</span>
                        )}
                        {booking.sesSubmissionError && !booking.sesSubmittedAt && (
                          <span className="text-xs text-red-600 block" title={booking.sesSubmissionError}>
                            ⚠ Error envío Policía
                          </span>
                        )}
                      </td>
```

- [ ] **Step 3: Deshabilitar "Check-in" sin habitación asignada**

Modify (línea 393-403, botón de Check-in):
```tsx
                          {booking.status === "CONFIRMED" && (
                            <button
                              onClick={() =>
                                handleStatusChange(booking.id, "CHECKED_IN")
                              }
                              disabled={isUpdating || !booking.roomId}
                              title={!booking.roomId ? "Asigna una habitación antes de hacer el check-in." : undefined}
                              className="chip bg-villalen-600 text-white border-transparent hover:bg-villalen-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Check-in
                            </button>
                          )}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sin errores.

En el navegador, `/admin/reservas`: la reserva web creada en la Tarea 11
muestra "Habitación Doble" + badge "Sin asignar", y su botón "Check-in" (si
llegara a estado CONFIRMED) aparece deshabilitado con el tooltip.

- [ ] **Step 5: Commit**

```bash
git add app/admin/reservas/page.tsx
git commit -m "feat: /admin/reservas muestra el tipo y bloquea el check-in sin habitación asignada"
```

---

### Task 14: Aviso de reservas pendientes de asignar en el backoffice

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Import y estado**

Modify línea 1-9 (import, añadir `useEffect` y `formatDate`):
```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn, formatDate } from "@/lib/utils";
import AdminProviders from "./providers";

interface PendingAssignmentBooking {
  id: string;
  checkInDate: string;
  guest: { firstName: string; lastName: string };
}
```

- [ ] **Step 2: Cargar reservas pendientes (antes del early-return de login)**

Modify (dentro de `AdminChrome`, línea 37-45):
```tsx
function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<PendingAssignmentBooking[]>([]);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    fetch("/api/bookings/pending-assignment")
      .then((r) => r.json())
      .then((data) => setPendingBookings(data.data ?? []))
      .catch(() => {});
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }
```

- [ ] **Step 3: Badge junto a "Reservas" en el sidebar**

Modify el bloque de navegación (línea 89-105 en el original):
```tsx
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const showBadge = item.href === "/admin/reservas" && pendingBookings.length > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 py-2.5 text-sm rounded-xl transition-all relative",
                  collapsed ? "px-0 justify-center" : "px-4",
                  isActive
                    ? "bg-villalen-600 text-white shadow-sm"
                    : "text-stone-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && item.label}
                {showBadge && (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full bg-terracotta-500 text-white text-[10px] font-semibold",
                      collapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto w-5 h-5"
                    )}
                  >
                    {pendingBookings.length}
                  </span>
                )}
              </Link>
            );
          })}
```

- [ ] **Step 4: Barra de aviso bajo el header, visible en cualquier página**

Modify: insertar justo después del `</header>` de la barra superior (después
de la línea 157 del original), antes de `<main>`:
```tsx
        {pendingBookings.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center gap-3 overflow-x-auto">
            <span className="text-xs font-medium text-amber-800 flex-shrink-0">
              🛎️ {pendingBookings.length} reserva(s) web sin habitación asignada:
            </span>
            {pendingBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/calendario?assignBookingId=${b.id}`}
                className="chip bg-white text-amber-800 border-amber-200 hover:bg-amber-100 flex-shrink-0 text-xs"
              >
                {b.guest.firstName} {b.guest.lastName} · {formatDate(b.checkInDate)} →
              </Link>
            ))}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit` → sin errores.

En el navegador, inicia sesión en `/admin`: debe verse el badge junto a
"Reservas" en el sidebar y la barra ámbar bajo la cabecera con la reserva web
pendiente creada antes, en cualquier página del backoffice (prueba navegando
a `/admin/gastos`, por ejemplo — debe seguir visible).

- [ ] **Step 6: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: aviso de reservas web pendientes de asignar habitación en todo el backoffice"
```

---

### Task 15: `/admin/calendario` — modo de asignación de habitación

**Files:**
- Modify: `app/admin/calendario/page.tsx`

**Interfaces:**
- Consumes: `PATCH /api/bookings/:id` con `{ roomId }` (Tarea 8, valida el
  tipo); `ROOM_TYPE_LABELS` (Tarea 3).

- [ ] **Step 1: Imports y envoltura en `Suspense`**

Modify línea 1-20 (imports, añadir `Suspense` y `useSearchParams`/`useRouter`):
```tsx
// app/admin/calendario/page.tsx
"use client";

import { Suspense, useEffect, useState, type DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  format,
  startOfWeek,
  eachDayOfInterval,
  isToday,
  isWeekend,
  isSameDay,
  parseISO,
  isBefore,
  startOfDay,
  addDays,
  subDays,
  differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn, ROOM_TYPE_LABELS } from "@/lib/utils";
```

Modify interfaces (línea 22-42) — añadir `roomType` a `Booking` y `type` a `Room`:
```ts
interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  roomType: string;
  guest: { firstName: string; lastName: string };
  room: { name: string };
  roomId: string | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  type: string;
}
```

- [ ] **Step 2: Renombrar el componente y envolver en `Suspense`**

Modify: cambiar `export default function CalendarioPage() {` (línea 63) por
`function CalendarioPageContent() {`, y al final del archivo (donde cerraba
`CalendarioPage`) añadir:
```tsx
export default function CalendarioPage() {
  return (
    <Suspense>
      <CalendarioPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: Estado del modo asignación**

Modify: dentro de `CalendarioPageContent`, justo después de
`const [banner, setBanner] = useState...` (línea 70):
```tsx
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignBookingId = searchParams.get("assignBookingId");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const assigningBooking = assignBookingId
    ? bookings.find((b) => b.id === assignBookingId) ?? null
    : null;
```

- [ ] **Step 4: Saltar a la semana de la reserva a asignar**

Modify: añadir un nuevo `useEffect` justo después del que carga `loadData()`
(después de la línea 91):
```tsx
  useEffect(() => {
    if (assigningBooking) {
      setViewStart(startOfWeek(parseISO(assigningBooking.checkInDate), { weekStartsOn: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigningBooking?.id]);
```

- [ ] **Step 5: Elegibilidad de habitación y acción de asignar**

Modify: añadir después de `getBooking` (después de la línea 109), antes de
"Alta rápida":
```tsx
  const isRoomEligibleForAssignment = (room: Room) => {
    if (!assigningBooking) return false;
    if (room.type !== assigningBooking.roomType) return false;

    const aCheckIn = startOfDay(parseISO(assigningBooking.checkInDate));
    const aCheckOut = startOfDay(parseISO(assigningBooking.checkOutDate));

    const hasConflict = bookings.some((b) => {
      if (b.id === assigningBooking.id) return false;
      if (b.roomId !== room.id) return false;
      const ci = startOfDay(parseISO(b.checkInDate));
      const co = startOfDay(parseISO(b.checkOutDate));
      return aCheckIn < co && aCheckOut > ci;
    });

    return !hasConflict;
  };

  const cancelAssignment = () => {
    setAssignError(null);
    router.replace("/admin/calendario");
  };

  const handleAssignRoom = async (room: Room) => {
    if (!assigningBooking) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/bookings/${assigningBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.error ?? "No se pudo asignar la habitación.");
        return;
      }
      setBanner({
        type: "success",
        message: `${room.name} asignada a ${assigningBooking.guest.firstName} ${assigningBooking.guest.lastName}.`,
      });
      router.replace("/admin/calendario");
      await loadData();
    } finally {
      setAssigning(false);
    }
  };
```

- [ ] **Step 6: Banner de modo asignación**

Modify: insertar justo antes de `{banner && (` (línea 302 del original):
```tsx
      {assigningBooking && (
        <div className="mb-4 rounded-xl px-4 py-3 bg-violet-50 border border-violet-200 flex items-center justify-between gap-3">
          <p className="text-sm text-violet-900">
            Asignando habitación (<strong>{ROOM_TYPE_LABELS[assigningBooking.roomType]}</strong>)
            para <strong>{assigningBooking.guest.firstName} {assigningBooking.guest.lastName}</strong> —
            haz clic en una celda libre resaltada en verde.
          </p>
          <button onClick={cancelAssignment} className="btn-ghost text-sm flex-shrink-0" disabled={assigning}>
            Cancelar
          </button>
        </div>
      )}
      {assignError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
          {assignError}
        </p>
      )}
```

- [ ] **Step 7: Resaltar filas elegibles/no elegibles y redirigir el clic**

Modify el `onClick` de cada celda (línea 371-373 del original):
```tsx
                          onClick={() => {
                            if (assigningBooking) {
                              if (isRoomEligibleForAssignment(room)) {
                                handleAssignRoom(room);
                              }
                              return;
                            }
                            if (!booking) openQuickCreate(room, day);
                          }}
```

Modify el cálculo de clases de la celda (línea 365-381 del original) —
añadir las variables de elegibilidad y las clases correspondientes:
```tsx
                      const isDragTarget = editMode && draggingId && (!booking || booking.id === draggingId);
                      const isAssignTarget = Boolean(assigningBooking) && isRoomEligibleForAssignment(room);
                      const isAssignBlocked = Boolean(assigningBooking) && !isAssignTarget;
                      return (
                        <td
                          key={day.toISOString()}
                          onDragOver={(e) => handleDragOver(e, room, day)}
                          onDrop={(e) => handleDrop(e, room, day)}
                          onClick={() => {
                            if (assigningBooking) {
                              if (isRoomEligibleForAssignment(room)) {
                                handleAssignRoom(room);
                              }
                              return;
                            }
                            if (!booking) openQuickCreate(room, day);
                          }}
                          className={cn(
                            "border-b border-r p-0.5 text-center transition-colors",
                            today ? "border-l-2 border-r-2 border-l-violet-300 border-r-violet-300 bg-violet-50/50" : "border-stone-50",
                            !booking && !assigningBooking && "cursor-pointer",
                            !booking && isWeekend(day) && !today && "bg-stone-50/60",
                            today ? "hover:bg-violet-100" : "hover:bg-stone-200/70",
                            isDragTarget && !booking && "bg-emerald-50 outline outline-1 outline-emerald-300",
                            isAssignTarget && "bg-emerald-50 outline outline-1 outline-emerald-400 cursor-pointer",
                            isAssignBlocked && "opacity-40 cursor-not-allowed"
                          )}
                        >
```

- [ ] **Step 8: Verificar**

Run: `npx tsc --noEmit` → sin errores.

En el navegador: desde `/admin` (con el aviso de la Tarea 14 visible), pulsa
la reserva web pendiente. Debe navegar a `/admin/calendario?assignBookingId=...`,
saltar a la semana correcta, mostrar el banner morado, resaltar en verde solo
las filas de habitaciones dobles libres para todo el rango de esa reserva
(las demás, atenuadas). Pulsa una celda verde: la reserva desaparece del
aviso (Tarea 14), y en `/admin/reservas` (Tarea 13) el badge "Sin asignar"
desaparece y se muestra el nombre real de la habitación.

- [ ] **Step 9: Commit**

```bash
git add app/admin/calendario/page.tsx
git commit -m "feat: modo de asignación de habitación en el calendario del backoffice"
```

---

### Task 16: Datos de ejemplo y verificación final end-to-end

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Import de `RoomType`**

Modify línea 5:
```ts
import { PrismaClient, BookingStatus, BookingSource, RoomType } from "@prisma/client";
```

- [ ] **Step 2: Marcar explícitamente el tipo de las 3 habitaciones existentes**

Modify los tres bloques `prisma.room.create` (línea 24-84), añadiendo
`type: RoomType.DOUBLE,` justo después de `capacity` en cada uno:

```ts
  const habitacion1 = await prisma.room.create({
    data: {
      name: "Suite Carballo",
      description:
        "Amplia suite con vistas al bosque de robles centenarios. Cama doble de matrimonio con dosel, baño de mármol con bañera exenta y zona de estar independiente. El desayuno incluye productos ecológicos de la finca.",
      capacity: 2,
      type: RoomType.DOUBLE,
      basePrice: 145.0,
      isClean: true,
      amenities: [
        "WiFi",
        "TV",
        "Aire acondicionado",
        "Calefacción",
        "Minibar",
        "Bañera exenta",
        "Terraza privada",
        "Desayuno incluido",
      ],
      imageUrl: "/images/suite-carballo.jpg",
    },
  });

  const habitacion2 = await prisma.room.create({
    data: {
      name: "Habitación A Eira",
      description:
        "Habitación rústica con encanto, decorada con mobiliario artesanal gallego. Camas individuales convertibles en doble, baño con ducha de piedra natural. Perfecta para parejas o viajeros individuales que buscan autenticidad.",
      capacity: 2,
      type: RoomType.DOUBLE,
      basePrice: 89.0,
      isClean: false,
      amenities: [
        "WiFi",
        "TV",
        "Calefacción",
        "Ducha de piedra",
        "Vistas al jardín",
      ],
      imageUrl: "/images/habitacion-eira.jpg",
    },
  });

  const habitacion3 = await prisma.room.create({
    data: {
      name: "Loft O Muíño",
      description:
        "Loft espacioso en la antigua casa del molino, restaurada respetando su arquitectura original. Doble altura, vigas de madera vistas, cocina equipada y zona de trabajo. Ideal para estancias largas.",
      capacity: 4,
      type: RoomType.DOUBLE,
      basePrice: 185.0,
      isClean: true,
      amenities: [
        "WiFi",
        "TV",
        "Cocina equipada",
        "Calefacción",
        "Lavadora",
        "Parking privado",
        "Jardín privado",
      ],
      imageUrl: "/images/loft-muino.jpg",
    },
  });
```

- [ ] **Step 3: Añadir una cuarta habitación "Apartamento"**

Modify: insertar después de la creación de `habitacion3` (después de la
línea 84), antes del `console.log("🏠 Habitaciones creadas:")`:
```ts
  const habitacion4 = await prisma.room.create({
    data: {
      name: "Apartamento",
      description:
        "Dos habitaciones unidas con un único baño, ideales para familias o grupos que buscan más espacio.",
      capacity: 4,
      type: RoomType.APARTMENT,
      basePrice: 160.0,
      isClean: true,
      amenities: ["WiFi", "TV", "Calefacción", "Cocina equipada"],
      imageUrl: "/images/apartamento.jpg",
    },
  });
```

Modify el `console.log` siguiente para incluirla:
```ts
  console.log("🏠 Habitaciones creadas:");
  console.log(`   ✅ ${habitacion1.name} (${habitacion1.basePrice}€/noche)`);
  console.log(`   ✅ ${habitacion2.name} (${habitacion2.basePrice}€/noche)`);
  console.log(`   ✅ ${habitacion3.name} (${habitacion3.basePrice}€/noche)`);
  console.log(`   ✅ ${habitacion4.name} (${habitacion4.basePrice}€/noche)\n`);
```

- [ ] **Step 4: Añadir una reserva web de ejemplo sin asignar**

Modify: insertar después de crear `reserva2` (después de la línea 163),
antes del bloque de facturas:
```ts
  const huesped3 = await prisma.guest.create({
    data: {
      firstName: "Laura",
      lastName: "Sánchez Pardo",
      documentId: "98765432C",
      email: "laura.sanchez@email.com",
      phone: "+34 622 333 444",
      nationality: "ES",
    },
  });

  const reserva3 = await prisma.booking.create({
    data: {
      guestId: huesped3.id,
      roomId: null,
      roomType: RoomType.DOUBLE,
      checkInDate: enTresDias,
      checkOutDate: enUnaSemana,
      totalAmount: 89.0 * 4,
      status: BookingStatus.PENDING,
      source: BookingSource.WEB,
      depositPaid: false,
      adults: 2,
      notes: "Reserva web de ejemplo, pendiente de asignar habitación doble.",
    },
  });

  console.log(
    `   ✅ Reserva #${reserva3.id.slice(-6)} — ${huesped3.firstName} SIN HABITACIÓN ASIGNADA (tipo: Doble)\n`
  );
```

- [ ] **Step 5: Recargar la base de desarrollo con los nuevos datos**

Run: `npx dotenv -e .env.local -- ts-node prisma/seed.ts`
Expected: termina con "✅ Seed completado con éxito.", muestra las 4
habitaciones y la reserva #3 sin habitación asignada.

- [ ] **Step 6: Verificación completa**

Run: `npx tsc --noEmit` → sin errores.
Run: `npm run build` → build completo sin errores.

Con `npm run dev` corriendo, repite manualmente el recorrido completo:
1. Entra en `/admin` (usuario del seed: `admin@casadosouto.es` / `cambiar1234`).
   Debe verse el aviso ámbar con la reserva de ejemplo de Laura Sánchez.
2. `/admin/habitaciones`: confirma que "Apartamento" tiene tipo Apartamento y
   las otras 3 (más la que crees a mano) tipo Doble.
3. `/reserva`: busca fechas que se solapen con la reserva de Laura para 2
   personas → deben verse **ambas** tarjetas (Doble sigue disponible porque
   solo hay 1 de 4 dobles ocupada; Apartamento libre). Completa una reserva
   de tipo Doble.
4. Vuelve a `/admin`: el aviso ahora muestra 2 reservas pendientes.
5. Pulsa la de Laura → aterrizas en el calendario en su semana, con las 3
   dobles libres resaltadas en verde y el Apartamento atenuado (tipo
   incorrecto). Asigna una.
6. Repite con la segunda reserva pendiente.
7. `/admin/reservas`: ambas muestran ya el nombre real de la habitación
   asignada (sin badge "Sin asignar"), y su botón "Check-in" (tras
   confirmarlas) deja de estar deshabilitado.
8. Prueba el límite del pool: crea (a mano, vía `/admin/calendario`, con
   "MANUAL") reservas hasta ocupar las 4 habitaciones dobles en las mismas
   fechas exactas; una quinta búsqueda en `/reserva` para esas fechas debe
   mostrar únicamente "Apartamento" (si sigue libre) o "No hay
   disponibilidad" si también está ocupado.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: datos de ejemplo para el flujo de asignación de habitación (Apartamento + reserva sin asignar)"
```
