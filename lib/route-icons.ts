// lib/route-icons.ts
// Nombres de icono de Ionicons (@expo/vector-icons) soportados por la guía
// de rutas de la app de huéspedes. Módulo aparte (sin importar Prisma ni
// nada del servidor) para que tanto la validación del backend
// (lib/services/route.service.ts) como el selector del admin web
// (app/admin/rutas/page.tsx) usen la misma lista sin desincronizarse.
export const ALLOWED_ROUTE_ICONS = [
  "walk-outline",
  "trail-sign-outline",
  "footsteps-outline",
  "sunny-outline",
  "water-outline",
  "boat-outline",
  "camera-outline",
  "flag-outline",
  "compass-outline",
  "bicycle-outline",
  "leaf-outline",
  "paw-outline",
  "map-outline",
  "telescope-outline",
  "bonfire-outline",
] as const;

export type RouteIcon = (typeof ALLOWED_ROUTE_ICONS)[number];
