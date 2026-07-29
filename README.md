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
| `POST` | `/api/webhooks/channex` | Recibir reservas del Channel Manager |
| `GET` | `/api/webhooks/channex` | Health check del endpoint |

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
el personal desde el botón "📤 Enviar a Policía" en `/admin/reservas` (nunca
automática — es una comunicación oficial, la primera vez conviene revisarla).

1. Alta en [sede.interior.gob.es](https://sede.interior.gob.es/portal/sede/informacion_hospedajes)
   y activación del "Servicio Web" (WS) — te llegan por email un usuario y
   contraseña **distintos** de los del portal.
2. Rellena `SES_WS_USERNAME`, `SES_WS_PASSWORD` y `SES_ENVIRONMENT=test` en `.env.local`.
3. Prueba contra el entorno de test (`pre-ses.mir.es`) antes de pasar a `production`.

> ⚠️ El sobre SOAP (`lib/services/ses.service.ts`) está construido con los
> campos que exige el RD 933/2021, pero **no se ha podido verificar contra el
> WSDL real** de Interior (el endpoint exige credenciales incluso para
> servirlo). Antes de usarlo en producción, solicita el manual técnico al dar
> de alta el Servicio Web y ajusta el envelope si los nombres de
> operación/elemento difieren.

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

## 📡 Channel Manager (Channex) — bidireccional

Booking.com tiene pausada la certificación de nuevos proveedores de conectividad
directa, así que la conexión con Booking/Airbnb/etc. pasa por un agregador ya
certificado: [Channex.io](https://channex.io) (~30$/mes + unos pocos $/alojamiento,
sin permanencia). Cuenta necesaria: crea tu propiedad en su dashboard, y por cada
`Room` de este PMS crea un *room type* + *rate plan* en Channex.

### Entrante (Channex → PMS)

Configura en Channex el endpoint: `https://tu-dominio.com/api/webhooks/channex`

| Evento Channex | Acción PMS |
|----------------|------------|
| `booking_created` / `booking_new` | Crea reserva con idempotencia |
| `booking_cancelled` / `booking_cancel` | Cancela reserva |
| `booking_modified` / `booking_update` | Actualiza fechas |

**Idempotencia**: Usa el campo `externalId` para evitar duplicados en reintentos.

### Saliente (PMS → Channex)

Cada vez que se crea, cancela, mueve o borra una reserva (desde la web propia o el
backoffice), o cambia el precio de una habitación, el PMS empuja disponibilidad +
tarifa a Channex (`lib/services/channex.service.ts`) para que las distribuya a los
canales y evite overbooking cruzado. Es *best-effort*: si Channex falla o no está
configurado, la operación local no se ve afectada (solo se loguea).

1. Rellena `CHANNEX_API_KEY` y `CHANNEX_PROPERTY_ID` en `.env.local`.
2. En `/admin/habitaciones`, pulsa "Canales" en cada habitación y pega su
   `Room Type ID` y `Rate Plan ID` de Channex. Al guardar se sincroniza automáticamente
   el próximo año de disponibilidad/tarifa; el botón "Sincronizar ahora" repite el envío.
3. Hay un cron diario de reconciliación (`/api/cron/channex-sync`, ver `vercel.json`)
   como red de seguridad, protegido con `CRON_SECRET`.

> ⚠️ El shape exacto del endpoint ARI de Channex está implementado según su
> documentación pública (`docs.channex.io`); conviene validarlo contra su entorno
> sandbox en cuanto tengas cuenta, antes de usarlo en producción.

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
│       └── webhooks/channex/       # Channel Manager
├── lib/
│   ├── prisma.ts                   # Singleton cliente Prisma
│   ├── types.ts                    # Tipos TypeScript globales
│   ├── utils.ts                    # Utilidades generales
│   └── services/
│       ├── room.service.ts         # Lógica de negocio habitaciones
│       ├── booking.service.ts      # Lógica de negocio reservas
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
# Simular una nueva reserva desde Booking.com
curl -X POST http://localhost:3000/api/webhooks/channex \
  -H "Content-Type: application/json" \
  -d '{
    "event": "booking_created",
    "booking": {
      "id": "CHANNEX-TEST-001",
      "channel": { "title": "Booking.com" },
      "arrival_date": "2024-08-15",
      "departure_date": "2024-08-20",
      "guest": {
        "first_name": "Ana",
        "last_name": "Rodríguez",
        "email": "ana@test.com",
        "document": "87654321B"
      },
      "rooms": [{
        "id": "room-1",
        "title": "Suite Carballo",
        "occupancy": { "adults": 2, "children": 0 },
        "rate": { "price": 145, "currency": "EUR" }
      }]
    }
  }'
```

---

Desarrollado con ❤️ para Villalén, casa de aldea en Cuerres, Ribadesella (Asturias).
