// lib/service-cutoffs.ts
// Copia en el cliente de SERVICE_CUTOFFS (lib/services/guest-service-request.service.ts
// en el backend) — solo para pintar el estado "cerrado" al instante sin ir al
// servidor. El servidor sigue siendo quien manda: esto es una ayuda visual,
// no la validación real (que ya rechaza la petición si el plazo pasó).
//
// Nota: los plazos se calculan en UTC, igual que el backend (todo el
// proyecto fuerza TZ=UTC). En horario de Cuerres esto puede desplazar la
// hora mostrada por 1-2h según el cambio de hora — aceptado como está,
// coherente con lo que ya valida el servidor.

import type { GuestServiceType } from "@/lib/types";

export const SERVICE_CUTOFFS: Record<
  GuestServiceType,
  { dayOffset: number; hour: number; label: string }
> = {
  BREAKFAST: { dayOffset: -1, hour: 22, label: "Puedes confirmar hasta las 22:00 del día anterior" },
  DINNER: { dayOffset: 0, hour: 20, label: "Confirma antes de las 20:00" },
  CLEANING: { dayOffset: 0, hour: 11, label: "Puedes pedirla antes de las 11:00" },
};

export function getServiceCutoff(type: GuestServiceType, date: Date): Date {
  const cfg = SERVICE_CUTOFFS[type];
  const cutoff = new Date(date);
  cutoff.setUTCDate(cutoff.getUTCDate() + cfg.dayOffset);
  cutoff.setUTCHours(cfg.hour, 0, 0, 0);
  return cutoff;
}

export function isServiceRequestable(
  type: GuestServiceType,
  date: Date,
  now: Date = new Date()
): boolean {
  return now.getTime() < getServiceCutoff(type, date).getTime();
}
