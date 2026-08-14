// lib/services/route.service.ts
// Capa de servicio para la guía de rutas de la app de huéspedes. Contenido
// editorial gestionado por el personal (no ligado a ninguna reserva).

import { prisma } from "@/lib/prisma";
import { RouteDifficulty } from "@prisma/client";
import { ALLOWED_ROUTE_ICONS } from "@/lib/route-icons";

export interface RouteStopInput {
  name: string;
  lat: number;
  lng: number;
  order?: number;
}

export interface RouteInput {
  name: string;
  category: string;
  isCaminoStage?: boolean;
  distanceKm: number;
  distanceFromHotelKm?: number | null;
  durationMin: number;
  elevationGainM?: number;
  elevationLossM?: number;
  difficulty?: RouteDifficulty;
  icon?: string;
  imageUrl?: string | null;
  description: string;
  pointsOfInterest?: string[];
  isPublished?: boolean;
  order?: number;
  // Paradas en orden, para el enlace de indicaciones de Google Maps en la
  // app de huéspedes. undefined = no tocar; [] = borrar todas las paradas.
  stops?: RouteStopInput[];
}

function validate(input: Partial<RouteInput>) {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("El nombre de la ruta no puede estar vacío.");
  }
  if (input.category !== undefined && !input.category.trim()) {
    throw new Error("La categoría no puede estar vacía.");
  }
  if (input.description !== undefined && !input.description.trim()) {
    throw new Error("La descripción no puede estar vacía.");
  }
  if (input.distanceKm !== undefined && input.distanceKm <= 0) {
    throw new Error("La distancia debe ser mayor que 0.");
  }
  if (input.durationMin !== undefined && input.durationMin <= 0) {
    throw new Error("La duración debe ser mayor que 0.");
  }
  if (input.icon !== undefined && !ALLOWED_ROUTE_ICONS.includes(input.icon as (typeof ALLOWED_ROUTE_ICONS)[number])) {
    throw new Error(
      `Icono no soportado. Usa uno de: ${ALLOWED_ROUTE_ICONS.join(", ")}.`
    );
  }
  if (input.stops) {
    for (const stop of input.stops) {
      if (!stop.name.trim()) {
        throw new Error("El nombre de cada parada no puede estar vacío.");
      }
      if (stop.lat < -90 || stop.lat > 90 || stop.lng < -180 || stop.lng > 180) {
        throw new Error(`Coordenadas fuera de rango para la parada "${stop.name}".`);
      }
    }
  }
}

function stopsCreateData(stops?: RouteStopInput[]) {
  if (!stops) return undefined;
  return stops
    .map((s, i) => ({ name: s.name.trim(), lat: s.lat, lng: s.lng, order: s.order ?? i }))
    .filter((s) => s.name);
}

function cleanPointsOfInterest(points?: string[]): string[] | undefined {
  if (!points) return undefined;
  return points.map((p) => p.trim()).filter(Boolean);
}

// ── Admin (backoffice / app de staff) ───────────────────────────────────

export async function getAllRoutes() {
  return prisma.route.findMany({
    orderBy: [{ isCaminoStage: "desc" }, { order: "asc" }, { name: "asc" }],
    include: { stops: { orderBy: { order: "asc" } } },
  });
}

export async function getRouteByIdAdmin(id: string) {
  return prisma.route.findUnique({
    where: { id },
    include: { stops: { orderBy: { order: "asc" } } },
  });
}

export async function createRoute(input: RouteInput) {
  validate(input);

  return prisma.route.create({
    data: {
      name: input.name.trim(),
      category: input.category.trim(),
      isCaminoStage: input.isCaminoStage ?? false,
      distanceKm: input.distanceKm,
      distanceFromHotelKm: input.distanceFromHotelKm ?? null,
      durationMin: input.durationMin,
      elevationGainM: input.elevationGainM ?? 0,
      elevationLossM: input.elevationLossM ?? 0,
      difficulty: input.difficulty ?? RouteDifficulty.MODERATE,
      icon: input.icon ?? "walk-outline",
      imageUrl: input.imageUrl ?? null,
      description: input.description.trim(),
      pointsOfInterest: cleanPointsOfInterest(input.pointsOfInterest) ?? [],
      isPublished: input.isPublished ?? true,
      order: input.order ?? 0,
      stops: { create: stopsCreateData(input.stops) },
    },
    include: { stops: { orderBy: { order: "asc" } } },
  });
}

export async function updateRoute(id: string, input: Partial<RouteInput>) {
  validate(input);
  const { stops, ...rest } = input;

  return prisma.route.update({
    where: { id },
    data: {
      ...rest,
      name: rest.name?.trim(),
      category: rest.category?.trim(),
      description: rest.description?.trim(),
      pointsOfInterest: cleanPointsOfInterest(rest.pointsOfInterest),
      ...(stops !== undefined
        ? { stops: { deleteMany: {}, create: stopsCreateData(stops) } }
        : {}),
    },
    include: { stops: { orderBy: { order: "asc" } } },
  });
}

export async function deleteRoute(id: string) {
  return prisma.route.delete({ where: { id } });
}

// ── App de huéspedes (solo lectura, solo publicadas) ────────────────────

export async function getPublishedRoutes() {
  return prisma.route.findMany({
    where: { isPublished: true },
    orderBy: [{ isCaminoStage: "desc" }, { order: "asc" }, { name: "asc" }],
    include: { stops: { orderBy: { order: "asc" } } },
  });
}

export async function getPublishedRouteById(id: string) {
  return prisma.route.findFirst({
    where: { id, isPublished: true },
    include: { stops: { orderBy: { order: "asc" } } },
  });
}
