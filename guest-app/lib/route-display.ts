// lib/route-display.ts
// Ayudas de presentación para GuestRoute (ver lib/types.ts) — el contenido en
// sí ya viene del backend (/api/guest-app/routes, gestionado desde
// /admin/rutas), esto solo traduce sus valores a lo que pinta la UI.

import { Ionicons } from "@expo/vector-icons";
import type { RouteDifficulty } from "@/lib/types";

export const DIFFICULTY_LABELS: Record<RouteDifficulty, string> = {
  EASY: "Fácil",
  MODERATE: "Moderada",
  HARD: "Difícil",
};

export const DIFFICULTY_COLORS: Record<RouteDifficulty, { bg: string; fg: string }> = {
  EASY: { bg: "#F0F4EF", fg: "#4A6D55" },
  MODERATE: { bg: "#FBF3EA", fg: "#A8632B" },
  HARD: { bg: "#FBE4E1", fg: "#B3432B" },
};

// El backend ya valida el icono contra su propia lista blanca
// (lib/route-icons.ts en villalen-pms) antes de guardar, pero un cliente
// desactualizado no debe romper el render si algún día diverge — de ahí la
// comprobación real contra Ionicons.glyphMap en vez de confiar ciegamente en
// el string que llega.
const FALLBACK_ICON: keyof typeof Ionicons.glyphMap = "walk-outline";

export function getRouteIcon(icon: string): keyof typeof Ionicons.glyphMap {
  return icon in Ionicons.glyphMap ? (icon as keyof typeof Ionicons.glyphMap) : FALLBACK_ICON;
}
