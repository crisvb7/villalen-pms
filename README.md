# 🏡 Villalén PMS

Sistema de Gestión Hotelera (PMS) y Motor de Reservas a medida para casa de aldea, construido con **Next.js 14**, **Prisma** y **PostgreSQL**.

---

## ⚡ Inicio rápido

### 1. Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ en ejecución
- npm o pnpm

### 2. Instalar dependencias

```bash
cd hotel-pms
npm install
```

### 3. Configurar entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con tu cadena de conexión a PostgreSQL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/hotel_pms?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@localhost:5432/hotel_pms?schema=public"
```

#### Usando Supabase en vez de un Postgres propio

Supabase es Postgres gestionado, compatible tal cual con este proyecto:

1. Crea el proyecto en [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string** y copia:
   - **Transaction pooler** (puerto `6543`, con `?pgbouncer=true` al final) → `DATABASE_URL`. La usa la app en producción/serverless (Vercel).
   - **Direct connection** (puerto `5432`) → `DIRECT_URL`. La necesitan `prisma migrate`/`db push` — el pooler no soporta esas operaciones.
3. En local, `npm run db:migrate` (y `db:seed`, `db:studio`, `create-admin`)
   ya cargan `.env.local` automáticamente vía `dotenv-cli`, y Prisma usa
   `DIRECT_URL` para las migraciones sin que tengas que hacer nada más.
4. En Vercel, añade ambas variables (`DATABASE_URL` y `DIRECT_URL`) en las variables de entorno del proyecto.

> Nota: en el plan gratuito, Supabase pausa el proyecto tras ~7 días sin
> actividad — para un alojamiento con pocas visitas, revisa esto o pasa a un
> plan de pago antes de ir a producción.

### 4. Inicializar base de datos

```bash
# Generar el cliente Prisma
npm run db:generate

# Crear las tablas (primera vez o tras cambios en schema.prisma)
npm run db:migrate

# Cargar datos de prueba
npm run db:seed
```

### 5. Arrancar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en **http://localhost:3000**

> ⚠️ **Zona horaria**: los scripts `dev`/`build`/`start` fuerzan `TZ=UTC` (vía
> `cross-env`) porque las fechas de entrada/salida se guardan como fecha sin
> hora (`@db.Date`) — si el proceso corre en una zona horaria por delante de
> UTC (como España), se cuela un desfase de un día. **En Vercel, añade
> `TZ=UTC` como variable de entorno del proyecto** (`vercel-build` no lleva
> `cross-env` porque las build machines de Vercel son Linux).

---

## 🗺️ Estructura de páginas

| URL | Descripción |
|-----|-------------|
| `/` | Redirige a `/admin/login` — no hay web pública propia, Villalén ya tiene [villalen.es](https://www.villalen.es) |
| `/reserva` | **Motor de reservas** — Widget público paso a paso (para enlazar desde villalen.es u otros canales) |
| `/precheckin/[id]` | Precheckin público del huésped (escaneo de documento opcional) |
| `/admin/login` | Login del backoffice |
| `/admin` | Dashboard PMS (backoffice) |
| `/admin/estadisticas` | Gráficos de ingresos, gastos, ocupación y canales |
| `/admin/calendario` | Vista de calendario mensual de ocupación |
| `/admin/reservas` | Lista y gestión de todas las reservas |
| `/admin/presupuestos` | Presupuestos y conversión a reserva |
| `/admin/facturas` | Facturación |
| `/admin/gastos` | Libro de gastos |
| `/admin/caja` | Arqueo de caja |
| `/admin/huespedes` | Registro de huéspedes |
| `/admin/habitaciones` | Gestión del inventario de habitaciones |
| `/admin/limpieza` | Estado de limpieza de habitaciones |

---

## 🔌 API Endpoints

### Habitaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/rooms` | Listar todas las habitaciones |
| `POST` | `/api/rooms` | Crear habitación |
| `GET` | `/api/rooms/:id` | Detalle de habitación |
| `PATCH` | `/api/rooms/:id` | Actualizar habitación |
| `DELETE` | `/api/rooms/:id` | Eliminar habitación |
| `GET` | `/api/rooms/availability?checkIn=&checkOut=&guests=` | **Buscar disponibilidad** |
| `GET` | `/api/rooms/cleaning` | Estado de limpieza |
| `PATCH` | `/api/rooms/cleaning` | Actualizar limpieza `{id, isClean}` |

### Reservas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/bookings` | Listar reservas (filtro: `?status=`) |
| `POST` | `/api/bookings` | **Crear reserva** (con anti-overbooking) |
| `GET` | `/api/bookings/:id` | Detalle de reserva |
| `PATCH` | `/api/bookings/:id` | Actualizar estado / datos |
| `DELETE` | `/api/bookings/:id` | Eliminar reserva |
| `GET` | `/api/bookings/:id/ficha-viajero` | Descargar XML ficha de viajero |

### Huéspedes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/guests` | Listar huéspedes |

### Facturas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/invoices` | Listar facturas |
| `POST` | `/api/invoices` | Crear factura `{bookingId}` |
| `GET` | `/api/invoices/:id` | Detalle de factura |
| `PATCH` | `/api/invoices/:id` | Marcar como pagada `{isPaid: true}` |

### Webhooks

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/webhooks/beds24` | Recibir reservas del Channel Manager |
| `GET` | `/api/webhooks/beds24` | Health check del endpoint |

---

## 🔐 Autenticación del backoffice

Todo `/admin` (y las rutas de API que no usa el motor de reservas público) requieren
sesión. Login con email + contraseña (NextAuth, `middleware.ts` protege las rutas).

1. Crea el primer usuario:
   ```bash
   ADMIN_EMAIL="tu@email.com" ADMIN_PASSWORD="contraseña_larga" npm run create-admin
   ```
   Es seguro volver a ejecutarlo (actualiza la contraseña si el email ya existe) y no
   toca reservas/huéspedes/habitaciones — puedes usarlo también en producción.
2. En desarrollo, `npm run db:seed` también crea un usuario de prueba
   (`admin@casadosouto.es`, contraseña impresa por consola) — no usar en producción.
3. Inicia sesión en `/admin/login`.

## 💳 TPV Virtual (Stripe)

Si configuras `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y `STRIPE_SECRET_KEY`, el motor de
reservas (`/reserva`) sustituye el aviso de "transferencia bancaria" por un campo de
tarjeta (Stripe Elements). La tarjeta **se guarda como garantía, no se cobra en ese
momento** — la reserva queda `CONFIRMED` directamente. El cobro del importe total lo
decide el personal desde `/admin/reservas` con el botón **"💳 Cobrar ahora"**, que
aparece cuando pasa el plazo de cancelación gratuita (aviso visual, `FREE_CANCELLATION_DAYS`
en `lib/utils.ts`, 7 días por defecto — no dispara nada automáticamente).

Sin esas variables configuradas, `/reserva` se comporta exactamente igual que antes
(transferencia bancaria, reserva `PENDING`).

1. Crea cuenta en [stripe.com](https://stripe.com), copia las claves de **test** de
   `dashboard.stripe.com/apikeys` a `.env.local`.
2. Configura un webhook apuntando a `https://tu-dominio.com/api/webhooks/stripe`
   escuchando `payment_intent.succeeded` y `payment_intent.payment_failed`, y copia su
   firma a `STRIPE_WEBHOOK_SECRET`.
3. Prueba con la tarjeta `4242 4242 4242 4242` (cualquier fecha futura/CVC) para el
   flujo correcto, y `4000 0000 0000 0002` para simular un cobro rechazado.

### 🏦 Migración planeada a Redsys (TPV Virtual de Caja Rural)

Villalén va a sustituir Stripe por el TPV Virtual de Caja Rural (que, como casi todos
los bancos españoles, funciona sobre **Redsys**). El código de Stripe descrito arriba
sigue siendo el que está activo — esto es solo la preparación mientras se gestiona el
alta con el banco.

**Lo que hace falta pedirle a Caja Rural** (ver variables `REDSYS_*` en `.env.example`):
1. Que el TPV Virtual tenga activada la **tokenización / pago por referencia (COF)** —
   es lo que permite guardar la tarjeta al reservar y cobrar de verdad más tarde sin
   que el huésped esté presente, igual que hace Stripe ahora. No es el TPV básico.
2. Acceso al **entorno de pruebas** (sandbox), con sus propias credenciales de test.
3. Confirmar si activan **iNSITE** (formulario de tarjeta embebido en `/reserva`, la
   tarjeta no pasa por nuestro servidor) además de la redirección clásica — es la
   forma de mantener el mismo nivel de alcance PCI-DSS que tenemos con Stripe Elements.

**Equivalencia técnica** (confirmada contra los manuales oficiales de Redsys — REST,
iNSITE y redirección):
- Captura inicial de la tarjeta (CIT) → operación con `DS_MERCHANT_IDENTIFIER: "REQUIRED"`
  y `DS_MERCHANT_COF_TYPE`, devuelve un identificador — equivalente a
  `stripeCustomerId`/`stripePaymentMethodId`.
- Cobro posterior sin el huésped presente (MIT) → se reenvía ese mismo identificador
  en `DS_MERCHANT_IDENTIFIER` — equivalente al botón "💳 Cobrar ahora" actual.
- La primera captura puede requerir autenticación 3D Secure/SCA (PSD2) — el cobro
  posterior normalmente queda exento por ser MIT, pero hay que montar esa pantalla de
  verificación en el primer paso.
- Peticiones firmadas con HMAC-SHA512 (clave de comercio) en vez del SDK de Stripe.

Cuando lleguen las credenciales de test, se reescribe `lib/services/stripe.service.ts`
(o se añade un `lib/services/redsys.service.ts` en paralelo) y el `CardElement` de
`app/reserva/page.tsx`, probando contra el sandbox antes de tocar producción.

## 📧 Emails transaccionales (Resend)

Confirmación de reserva (con enlace de precheckin), cancelación y factura con
PDF adjunto se envían automáticamente al crear/cancelar una reserva o facturarla
(`lib/services/booking.service.ts`, `lib/services/invoice.service.ts`). Sin
`RESEND_API_KEY` configurada, el sitio se comporta igual que antes (solo se
loguea que el envío se omite, nada se rompe).

1. Crea cuenta en [resend.com](https://resend.com), copia tu API key a
   `RESEND_API_KEY` en `.env.local`.
2. Mientras no verifiques un dominio propio en Resend, solo puedes enviar
   desde `onboarding@resend.dev` (útil para probar) — verifica tu dominio antes
   de pasar a producción y actualiza `EMAIL_FROM`.
3. Botón "📧 Reenviar email" en `/admin/reservas` por si hace falta reenviar
   la confirmación a mano (a diferencia del envío automático, este sí muestra
   el error si Resend falla).

## 👮 Ficha Policial (SES.HOSPEDAJES)

Comunicación real al Ministerio del Interior (RD 933/2021), disparada a mano por
el personal desde el botón "📤 Enviar a Policía" en `/admin/reservas` o en el
detalle de la reserva (nunca automática — es una comunicación oficial).

El sobre SOAP (`lib/services/ses.service.ts`) está construido y verificado
contra el manual técnico oficial "Interfaz servicios externos - Servicio de
Comunicación Hospedajes v3.1.2", incluido su ejemplo de petición real. Puntos
clave de la estructura:

- Autenticación **HTTP Basic** (no WS-Security) — usuario/contraseña del
  "Servicio Web" en la cabecera `Authorization`, `<soapenv:Header/>` vacío.
- El cuerpo SOAP solo lleva `codigoArrendador`/`aplicacion`/`tipoOperacion`/
  `tipoComunicacion`; los datos del parte (contrato + cada persona alojada)
  van en un **fichero XML aparte, comprimido en ZIP y codificado en Base64**
  dentro de la etiqueta `<solicitud>` (usa `jszip` para la compresión).
- Se envían **todos los huéspedes de la reserva**, no solo el titular — ver
  "Acompañantes" en el detalle de la reserva, que usa el modelo
  `BookingTraveler`.

1. Alta en [sede.interior.gob.es](https://sede.interior.gob.es/portal/sede/informacion_hospedajes)
   y activación del "Servicio Web" (WS) — el usuario sigue el patrón `NIF+WS`
   (o `CIF+WS` si es sociedad) y te llega una contraseña **distinta** de la
   del portal.
2. Rellena en `.env.local`: `SES_WS_USERNAME`, `SES_WS_PASSWORD`,
   `SES_ENVIRONMENT=test`, `SES_LANDLORD_CODE` (código de arrendador, 10
   dígitos — el mismo para todos tus alojamientos) y `SES_ESTABLISHMENT_CODE`
   (código de establecimiento, uno por alojamiento). Ambos códigos llegan por
   email al darte de alta.
3. Prueba contra el entorno de test (`pre-ses.mir.es`) antes de pasar a
   `production`.

> ⚠️ Códigos sin verificar todavía (el manual no los incluye — se consultan en
> tiempo de ejecución con la operación `catalogo`, ver `queryCatalog()` en
> `ses.service.ts`): el código de tipo de documento para pasaporte (se usa
> `"PAS"` sin confirmar; `NIF`/`NIE` sí están confirmados en el manual), y los
> códigos de forma de pago distintos de `"EFECT"` (efectivo, el único que
> aparece en el ejemplo oficial). Antes de ir a producción, llama a
> `queryCatalog("TIPO_DOCUMENTO")` y `queryCatalog("TIPO_PAGO")` contra el
> entorno de test y ajusta `DOCUMENT_TYPE_CODES`/`mapPaymentMethod` si
> difieren. Además, para direcciones en España el parte exige el **código de
> municipio del INE** (5 dígitos, no el nombre) — se pide en el formulario de
> precheckin y en el admin, pero no hay una base de datos de municipios
> integrada, así que quien lo rellena tiene que buscarlo a mano (enlace al
> callejero del INE incluido en el formulario).

## 📊 Informe para el INE

El INE no tiene una API pública general: selecciona por muestreo qué
alojamientos deben reportar la Encuesta de Ocupación Hotelera. Desde
`/admin/estadisticas` puedes descargar un CSV (viajeros, pernoctaciones,
estancia media, ocupación, nacionalidades) para rellenar el cuestionario a
mano si tu establecimiento es seleccionado — no es un envío automático.

## 🛡️ Seguridad PCI-DSS

> **AVISO IMPORTANTE**: Este sistema NO almacena, procesa ni transmite datos de tarjetas de crédito.
>
> - ❌ Sin campos PAN (número de tarjeta)
> - ❌ Sin campos de fecha de caducidad
> - ❌ Sin campos CVV/CVC
>
> Los pagos se gestionan mediante:
> - **Stripe** (tokenizado): la tarjeta se teclea en un `CardElement` de Stripe.js en
>   el navegador del huésped y viaja directa a Stripe; este servidor solo guarda los
>   IDs que Stripe devuelve (`stripeCustomerId`, `stripePaymentMethodId`,
>   `stripePaymentIntentId`), nunca el número de tarjeta.
> - **Transferencia bancaria** (instrucciones enviadas por email) o **TPV físico**,
>   cuando Stripe no está configurado.

---

## 📋 Ficha de Viajero (Parte de Hospedería)

El sistema genera automáticamente el XML de la ficha de viajero según el Real Decreto 933/2021:

```bash
# Desde la API
GET /api/bookings/{bookingId}/ficha-viajero

# Desde código TypeScript
import { generateTravelerRecordXML } from "@/lib/utils/traveler-record";
await generateTravelerRecordXML("booking-id");
```

El XML se imprime en consola en desarrollo y se devuelve como fichero descargable.

> ⚠️ En producción, integrar con el sistema **SES del MNPR** (Ministerio del Interior) con cifrado apropiado.

---

## 📡 Channel Manager (Beds24) — bidireccional

Booking.com tiene pausada la certificación de nuevos proveedores de conectividad
directa, así que la conexión con Booking/Airbnb/etc. pasa por un agregador ya
certificado: [Beds24](https://beds24.com) (channel manager + PMS, con API v2
documentada en `api.beds24.com/v2`). Cuenta necesaria: crea tu propiedad en su
dashboard, y por cada `Room` de este PMS crea la habitación correspondiente en
Beds24 (te da un `roomId` numérico).

> ⚠️ Esta integración sustituye a la que antes usaba Channex.io (nunca se llegó
> a activar en producción). Los nombres de campo de abajo están tomados de la
> documentación pública de Beds24, pero **no se han verificado todavía contra
> una cuenta real** — antes de darla por buena, sigue el apartado
> "Antes de activarla de verdad" más abajo.

### Entrante (Beds24 → PMS)

En Beds24: **Settings → Properties → Access → Booking webhooks**, activa el
webhook y configura la URL con un secreto propio en la query string (Beds24 no
firma sus webhooks con HMAC, así que el secreto va incrustado en la URL):

```
https://tu-dominio.com/api/webhooks/beds24?secret=TU_BEDS24_WEBHOOK_SECRET
```

| Estado de la reserva (Beds24) | Acción PMS |
|--------------------------------|------------|
| `confirmed` / `new` / `request` | Crea o actualiza la reserva con idempotencia |
| `cancelled` / `black` | Cancela la reserva |

**Idempotencia**: usa el campo `externalId` (el `bookId` de Beds24) para evitar
duplicados en reintentos. **Mapeo de habitación**: por `beds24RoomId`, no por
nombre — si una reserva llega con un `roomId` sin mapear, se asigna a la primera
habitación como fallback y se loguea un error para que el personal la reasigne.

### Saliente (PMS → Beds24)

Cada vez que se crea, cancela, mueve o borra una reserva (desde la web propia o el
backoffice), o cambia el precio de una habitación, el PMS empuja disponibilidad +
tarifa a Beds24 (`lib/services/beds24.service.ts`, endpoint
`POST /inventory/rooms/calendar`) para que las distribuya a los canales y evite
overbooking cruzado. Es *best-effort*: si Beds24 falla o no está configurado, la
operación local no se ve afectada (solo se loguea).

1. Rellena `BEDS24_REFRESH_TOKEN` y `BEDS24_PROPERTY_ID` en `.env.local` (ver
   más abajo cómo obtener el refresh token).
2. En `/admin/habitaciones`, pulsa "Canales" en cada habitación y pega su
   `Room ID` de Beds24. Al guardar se sincroniza automáticamente el próximo
   año de disponibilidad/tarifa; el botón "Sincronizar ahora" repite el envío.
3. Hay un cron diario de reconciliación (`/api/cron/beds24-sync`, ver `vercel.json`)
   como red de seguridad, protegido con `CRON_SECRET`.

### Obtener el `BEDS24_REFRESH_TOKEN`

La API v2 de Beds24 no usa una API key fija como Channex, sino un flujo de
invite-code → refresh token (de larga duración) → access token (24h, se pide
solo internamente, no hace falta guardarlo):

1. En el panel de Beds24: **Settings → Account → Access**, genera un *invite
   code* con los permisos que necesites (como mínimo: leer/escribir
   disponibilidad y tarifas). Caduca en 24h, así que haz el paso 2 enseguida.
2. Cámbialo por un refresh token con `GET /authentication/setup` (header
   `code` con el invite code). El refresh token no caduca mientras se use al
   menos una vez cada 30 días — y el cron diario de reconciliación ya se
   encarga de eso automáticamente en cuanto esté configurado.
3. Guarda ese refresh token como `BEDS24_REFRESH_TOKEN`.

### Antes de activarla de verdad

1. Envía un webhook de prueba desde el panel de Beds24 y compara su payload
   real con la interfaz `Beds24BookingPayload` de
   `app/api/webhooks/beds24/route.ts` (queda logueado el JSON crudo). Ajusta
   los nombres de campo si no coinciden.
2. Prueba `pushAvailabilityAndRates` contra una habitación de pruebas en
   Beds24 y comprueba en su calendario que la disponibilidad/tarifa llega
   como se espera antes de mapear habitaciones reales.

---

## 🔀 Conviviendo con el PMS actual durante la transición

Este código (Beds24 incluido) puede desplegarse **ya**, en paralelo con el PMS
que tenéis contratado hoy, sin ningún riesgo para la operación en curso:
mientras `BEDS24_REFRESH_TOKEN` / `BEDS24_PROPERTY_ID` no estén rellenos, todo
el módulo de Beds24 se queda inerte (no se llama a ninguna API externa, solo
se loguea que el sync se omite) — es exactamente el mismo diseño "apagado por
defecto" que ya tenía Channex y por el que nunca llegó a tocar producción.

Eso permite ir construyendo y probando esta integración —incluso contra una
cuenta Beds24 real y sus sandboxes de prueba— sin que afecte en nada a las
reservas que hoy gestiona el otro PMS.

**Lo que NO se puede hacer en paralelo** es tener **dos sistemas empujando
disponibilidad al mismo canal (Booking.com/Airbnb) para las mismas
habitaciones a la vez**: si el PMS actual y este PMS+Beds24 publican cupo
para la misma habitación física en el mismo canal, un huésped podría reservar
la misma noche por los dos sitios (overbooking cruzado) — ningún channel
manager evita esto si hay dos "dueños" distintos de la misma habitación.

Por eso el corte, cuando llegue (a final de verano, según decidáis), debe ser
puntual, no gradual, para el lado de distribución a canales:

1. Con Beds24 ya configurado y probado (punto anterior) pero **sin mapear
   ninguna habitación real todavía** (sin `beds24RoomId`), no hay ningún
   riesgo — el PMS actual sigue siendo el único que distribuye a los canales.
2. El día del corte: dejar de publicar disponibilidad desde el PMS actual
   hacia Booking/Airbnb (pausar sus conexiones de canal, o cerrarlas si el
   contrato lo permite) **el mismo día** en que se rellenan los `beds24RoomId`
   de todas las habitaciones y se activa el cron de Beds24.
3. Antes de ese día: migrar a mano (o por CSV, si Beds24 lo soporta) las
   reservas futuras que ya tenga el PMS actual, para no perder ninguna
   estancia confirmada por Booking/Airbnb que caiga después del corte.
4. El resto del sistema (facturación, precheckin, ficha de viajero, TPV,
   emails...) ya funciona hoy de forma completamente independiente del
   channel manager — no bloquea nada de lo anterior.

Todo lo demás de este README (huéspedes, facturas, Stripe, SES, etc.) no
depende de si Beds24 está o no configurado, así que se puede seguir
desarrollando y desplegando sin esperar al corte.

---

## 🗄️ Estructura del proyecto

```
hotel-pms/
├── app/
│   ├── page.tsx                    # Página principal pública
│   ├── reserva/
│   │   └── page.tsx                # Motor de reservas (widget)
│   ├── admin/
│   │   ├── layout.tsx              # Layout backoffice con sidebar
│   │   ├── page.tsx                # Dashboard PMS
│   │   ├── calendario/page.tsx     # Vista de calendario
│   │   ├── reservas/page.tsx       # Gestión de reservas
│   │   ├── huespedes/page.tsx      # Registro de huéspedes
│   │   ├── habitaciones/page.tsx   # Inventario de habitaciones
│   │   └── limpieza/page.tsx       # Estado de limpieza
│   └── api/
│       ├── rooms/                  # CRUD habitaciones + disponibilidad
│       ├── bookings/               # CRUD reservas + ficha viajero
│       ├── guests/                 # Huéspedes
│       ├── invoices/               # Facturas
│       └── webhooks/beds24/        # Channel Manager
├── lib/
│   ├── prisma.ts                   # Singleton cliente Prisma
│   ├── types.ts                    # Tipos TypeScript globales
│   ├── utils.ts                    # Utilidades generales
│   └── services/
│       ├── room.service.ts         # Lógica de negocio habitaciones
│       ├── booking.service.ts      # Lógica de negocio reservas
│       ├── beds24.service.ts       # Sync saliente con Beds24
│       └── invoice.service.ts      # Lógica de negocio facturas
│   └── utils/
│       └── traveler-record.ts      # Generador XML ficha viajero
└── prisma/
    ├── schema.prisma               # Modelos de base de datos
    └── seed.ts                     # Datos iniciales de prueba
```

---

## 🚀 Roadmap sugerido

- [ ] **Autenticación** — NextAuth.js con email/password para el backoffice
- [ ] **Email** — Nodemailer / Resend para notificaciones automáticas
- [ ] **Generación PDF** — Facturas en PDF con `@react-pdf/renderer`
- [ ] **Dashboard analítico** — Gráficos de ocupación con Recharts
- [ ] **Integración SES** — Envío real de fichas de viajero a Guardia Civil
- [ ] **Tarifa dinámica** — Precios por temporada / días de semana
- [ ] **Multi-idioma** — i18n para el motor de reservas público
- [ ] **Notificaciones push** — Alertas de nuevas reservas para el staff

---

## 🧪 Pruebas del webhook

```bash
# Simular una nueva reserva desde Booking.com (payload de ejemplo — verifica
# el shape real contra el webhook de prueba que manda Beds24 desde su panel,
# ver "Antes de activarla de verdad" más arriba)
curl -X POST "http://localhost:3000/api/webhooks/beds24?secret=TU_BEDS24_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "BEDS24-TEST-001",
    "roomId": "12345",
    "status": "confirmed",
    "referer": "Booking.com",
    "arrival": "2024-08-15",
    "departure": "2024-08-20",
    "firstName": "Ana",
    "lastName": "Rodríguez",
    "email": "ana@test.com",
    "numAdult": 2,
    "numChild": 0,
    "price": 725
  }'
```

---

Desarrollado con ❤️ para Villalén, casa de aldea en Cuerres, Ribadesella (Asturias).
