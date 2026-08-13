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

// Solo para el selector del admin web — la app de huéspedes no muestra el
// nombre del icono, así que esta traducción no necesita llegar hasta allí.
export const ROUTE_ICON_LABELS: Record<RouteIcon, string> = {
  "walk-outline": "Caminata",
  "trail-sign-outline": "Señal de sendero",
  "footsteps-outline": "Pisadas",
  "sunny-outline": "Soleado",
  "water-outline": "Agua / Playa",
  "boat-outline": "Barco",
  "camera-outline": "Fotografía",
  "flag-outline": "Meta",
  "compass-outline": "Brújula",
  "bicycle-outline": "Bicicleta",
  "leaf-outline": "Naturaleza",
  "paw-outline": "Fauna",
  "map-outline": "Mapa",
  "telescope-outline": "Mirador",
  "bonfire-outline": "Hoguera / Camping",
};
