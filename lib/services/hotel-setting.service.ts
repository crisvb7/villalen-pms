// lib/services/hotel-setting.service.ts
// Ajustes globales del hotel (una sola fila, "singleton"). De momento solo
// si el servicio de cena está activo — se enciende en temporada de
// peregrinos y se apaga el resto del año.

import { prisma } from "@/lib/prisma";

const SETTING_ID = "singleton";

export async function getHotelSettings() {
  const settings = await prisma.hotelSetting.upsert({
    where: { id: SETTING_ID },
    update: {},
    create: { id: SETTING_ID },
  });
  return settings;
}

export async function setDinnerServiceEnabled(enabled: boolean) {
  return prisma.hotelSetting.upsert({
    where: { id: SETTING_ID },
    update: { dinnerServiceEnabled: enabled },
    create: { id: SETTING_ID, dinnerServiceEnabled: enabled },
  });
}
