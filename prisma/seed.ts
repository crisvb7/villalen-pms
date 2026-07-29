// prisma/seed.ts
// Script de semilla para datos iniciales de prueba
// Ejecutar: npm run db:seed

import { PrismaClient, BookingStatus, BookingSource } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEV_ADMIN_EMAIL = "admin@casadosouto.es";
const DEV_ADMIN_PASSWORD = "cambiar1234";

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...\n");

  // ── Limpiar datos existentes (en orden por FK) ──────────────────────────
  await prisma.invoice.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.room.deleteMany();
  console.log("🗑️  Datos anteriores eliminados.\n");

  // ── Crear Habitaciones ─────────────────────────────────────────────────
  const habitacion1 = await prisma.room.create({
    data: {
      name: "Suite Carballo",
      description:
        "Amplia suite con vistas al bosque de robles centenarios. Cama doble de matrimonio con dosel, baño de mármol con bañera exenta y zona de estar independiente. El desayuno incluye productos ecológicos de la finca.",
      capacity: 2,
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

  console.log("🏠 Habitaciones creadas:");
  console.log(`   ✅ ${habitacion1.name} (${habitacion1.basePrice}€/noche)`);
  console.log(`   ✅ ${habitacion2.name} (${habitacion2.basePrice}€/noche)`);
  console.log(`   ✅ ${habitacion3.name} (${habitacion3.basePrice}€/noche)\n`);

  // ── Crear Huéspedes de prueba ──────────────────────────────────────────
  const huesped1 = await prisma.guest.create({
    data: {
      firstName: "María",
      lastName: "García Fernández",
      documentId: "12345678A",
      email: "maria.garcia@email.com",
      phone: "+34 666 111 222",
      nationality: "ES",
    },
  });

  const huesped2 = await prisma.guest.create({
    data: {
      firstName: "James",
      lastName: "Morrison",
      documentId: "AB123456",
      email: "j.morrison@gmail.com",
      phone: "+44 7700 900000",
      nationality: "GB",
    },
  });

  console.log("👤 Huéspedes creados:");
  console.log(
    `   ✅ ${huesped1.firstName} ${huesped1.lastName} (${huesped1.email})`
  );
  console.log(
    `   ✅ ${huesped2.firstName} ${huesped2.lastName} (${huesped2.email})\n`
  );

  // ── Crear Reservas de prueba ───────────────────────────────────────────
  const hoy = new Date();
  const enTresDias = new Date(hoy);
  enTresDias.setDate(hoy.getDate() + 3);
  const enUnaSemana = new Date(hoy);
  enUnaSemana.setDate(hoy.getDate() + 7);
  const enDiezDias = new Date(hoy);
  enDiezDias.setDate(hoy.getDate() + 10);
  const enQuinceDias = new Date(hoy);
  enQuinceDias.setDate(hoy.getDate() + 15);

  const reserva1 = await prisma.booking.create({
    data: {
      guestId: huesped1.id,
      roomId: habitacion1.id,
      checkInDate: enTresDias,
      checkOutDate: enUnaSemana,
      totalAmount: 145.0 * 4, // 4 noches
      status: BookingStatus.CONFIRMED,
      source: BookingSource.WEB,
      depositPaid: true,
      adults: 2,
      notes: "Huésped VIP. Solicita llegada anticipada (13:00h).",
    },
  });

  const reserva2 = await prisma.booking.create({
    data: {
      guestId: huesped2.id,
      roomId: habitacion3.id,
      checkInDate: enDiezDias,
      checkOutDate: enQuinceDias,
      totalAmount: 185.0 * 5, // 5 noches
      status: BookingStatus.PENDING,
      source: BookingSource.BOOKING,
      depositPaid: false,
      adults: 3,
      children: 1,
      externalId: "BK-2024-EXT-001",
      channelRef: "Booking.com",
    },
  });

  console.log("📅 Reservas creadas:");
  console.log(
    `   ✅ Reserva #${reserva1.id.slice(-6)} — ${huesped1.firstName} en ${habitacion1.name} (CONFIRMADA)`
  );
  console.log(
    `   ✅ Reserva #${reserva2.id.slice(-6)} — ${huesped2.firstName} en ${habitacion3.name} (PENDIENTE)\n`
  );

  // ── Factura de prueba ──────────────────────────────────────────────────
  const subtotal = 145.0 * 4;
  const tax = subtotal * 0.1; // IVA turístico 10%
  const total = subtotal + tax;

  await prisma.invoice.create({
    data: {
      bookingId: reserva1.id,
      subtotal,
      tax,
      total,
      isPaid: true,
      invoiceNumber: "FAC-2024-001",
      pdfUrl: null,
    },
  });

  console.log("🧾 Factura de prueba creada: FAC-2024-001\n");

  // ── Usuario de desarrollo para /admin/login ──────────────────────────────
  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: DEV_ADMIN_EMAIL },
    update: { passwordHash },
    create: { email: DEV_ADMIN_EMAIL, passwordHash, name: "Admin" },
  });
  console.log("👤 Usuario de desarrollo para /admin/login:");
  console.log(`   Email:      ${DEV_ADMIN_EMAIL}`);
  console.log(`   Contraseña: ${DEV_ADMIN_PASSWORD}`);
  console.log("   ⚠️  Solo para desarrollo — usa `npm run create-admin` en producción.\n");

  console.log(
    "✅ Seed completado con éxito. Base de datos lista para desarrollo.\n"
  );
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
