// lib/theme.ts
// Sistema de diseño de la app — inspirado en el mockup de Figma Make:
// verde bosque + crema, tipografía serif para titulares, badges pastel
// sólidos (no superposiciones translúcidas).

export const colors = {
  background: "#F8F6F1",
  surface: "#FFFFFF",
  border: "#E8E4DA",
  text: "#1F2421",
  textMuted: "#6B7268",
  // Verde bosque: "primary" para botones/estados activos, "primaryDark"
  // para las cabeceras/hero grandes (login, tarjeta de caja).
  primary: "#2E5C43",
  primaryDark: "#1E3D2E",
  primaryText: "#FFFFFF",
  danger: "#B3432B",
  warning: "#B9752E",
  success: "#2E5C43",
  info: "#2F6FA8",
  avatarBackground: "#EDE8DD",
  // Acento para "hoy" en el calendario — distinto de los colores de estado
  // para no confundirse con "Confirmada"/"En casa" (igual que en la web).
  todayAccent: "#6D5FD1",
};

export const fonts = {
  serifBold: "PlayfairDisplay_700Bold",
  serifSemiBold: "PlayfairDisplay_600SemiBold",
  serifMedium: "PlayfairDisplay_500Medium",
};

// Pares (fondo pastel + texto saturado) para badges y tiles de resumen.
export const tones = {
  green: { bg: "#DCEEE1", fg: "#1E3D2E" },
  blue: { bg: "#DCEAF7", fg: "#2F6FA8" },
  orange: { bg: "#FBEBD9", fg: "#B9752E" },
  red: { bg: "#FBE4E1", fg: "#B3432B" },
  gray: { bg: "#EFEDE6", fg: "#6B7268" },
} as const;

export type Tone = keyof typeof tones;

// Coincide con STATUS_BG en app/admin/calendario/page.tsx (misma paleta que
// usa la web para que el personal no interprete los colores al revés al
// cambiar entre web y móvil).
export const statusTones: Record<string, Tone> = {
  PENDING: "orange",
  CONFIRMED: "green",
  CANCELLED: "red",
  CHECKED_IN: "blue",
  CHECKED_OUT: "gray",
};

export const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  CHECKED_IN: "En casa",
  CHECKED_OUT: "Salida hecha",
};

export const quoteStatusTones: Record<string, Tone> = {
  DRAFT: "gray",
  SENT: "orange",
  ACCEPTED: "green",
  REJECTED: "red",
  EXPIRED: "gray",
};

export const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  EXPIRED: "Caducado",
};
