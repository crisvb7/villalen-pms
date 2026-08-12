// lib/service-meta.ts
// Metadatos de presentación de cada tipo de servicio — compartido entre la
// pantalla de Inicio (resumen) y la de Servicios (gestión con toggles).

import type { GuestServiceType } from "@/lib/types";

export const SERVICE_META: Record<
  GuestServiceType,
  { label: string; description: string; icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap }
> = {
  BREAKFAST: {
    label: "Desayuno mañana",
    description: "Desayuno continental en el comedor, de 8:30 a 10:30.",
    icon: "cafe-outline",
  },
  DINNER: {
    label: "Cena esta noche",
    description: "Menú del peregrino con productos de la huerta.",
    icon: "wine-outline",
  },
  CLEANING: {
    label: "Limpieza de habitación",
    description: "Limpieza completa y cambio de toallas.",
    icon: "sparkles-outline",
  },
};

export const SERVICE_ORDER: GuestServiceType[] = ["BREAKFAST", "DINNER", "CLEANING"];
