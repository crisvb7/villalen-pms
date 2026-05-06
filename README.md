# 🏡 Hotel PMS — Casa do Souto

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
```

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
| `/` | Página pública principal |
| `/reserva` | **Motor de reservas** — Widget público paso a paso |
| `/admin` | Dashboard PMS (backoffice) |
| `/admin/calendario` | Vista de calendario mensual de ocupación |
| `/admin/reservas` | Lista y gestión de todas las reservas |
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

## 🛡️ Seguridad PCI-DSS

> **AVISO IMPORTANTE**: Este sistema NO almacena, procesa ni transmite datos de tarjetas de crédito.
>
> - ❌ Sin campos PAN (número de tarjeta)
> - ❌ Sin campos de fecha de caducidad
> - ❌ Sin campos CVV/CVC
>
> Los pagos se gestionan exclusivamente mediante:
> - **Transferencia bancaria** (instrucciones enviadas por email)
> - **TPV físico** en el establecimiento

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

## 📡 Webhook Channel Manager (Channex)

Configura en Channex el endpoint: `https://tu-dominio.com/api/webhooks/channex`

**Eventos soportados:**

| Evento Channex | Acción PMS |
|----------------|------------|
| `booking_created` / `booking_new` | Crea reserva con idempotencia |
| `booking_cancelled` / `booking_cancel` | Cancela reserva |
| `booking_modified` / `booking_update` | Actualiza fechas |

**Idempotencia**: Usa el campo `externalId` para evitar duplicados en reintentos.

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

Desarrollado con ❤️ para casas de turismo rural gallegas.
