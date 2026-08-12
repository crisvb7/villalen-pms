// lib/theme.ts
// Sistema de diseño de la app de huéspedes — mismos tokens de marca que la
// web (tailwind.config.js: villalen / terracotta / sage / stone) llevados a
// hex para React Native, más Playfair Display (titulares) + DM Sans (UI).
//
// Los tonos "700" de terracotta/sage (en vez de "600", que es lo que usa el
// backoffice web sobre fondos claros) se eligieron aquí porque esta app los
// usa como fondo de botón con texto blanco encima — con "600" el contraste
// normal-text cae a ~3.4:1, por debajo del mínimo WCAG AA (4.5:1); "700" da
// ~4.7 (terracotta) y ~5.8 (sage). Verificado a mano, no es un capricho.

export const colors = {
  background: "#FAFAF9", // stone-50
  surface: "#FFFFFF",
  surfaceMuted: "#F5F5F4", // stone-100
  border: "#E7E5E4", // stone-200
  text: "#1C1917", // stone-900
  textMuted: "#78716C", // stone-500
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "rgba(255,255,255,0.75)",

  // Azul pizarra — hero/fondos oscuros, header, acento de marca.
  primary: "#2C4048", // villalen-800
  primaryDark: "#1F2E33", // villalen-900
  primaryLight: "#5E808A", // villalen-400
  primarySurface: "#EEF2F3", // villalen-50

  // Terracota — CTA principal (botones, confirmar).
  accent: "#A8632B", // terracotta-700 (AA sobre blanco, ver nota arriba)
  accentSoft: "#C17A3C", // terracotta-600, solo para fondos con texto oscuro
  accentSurface: "#FBF3EA", // terracotta-50

  // Salvia — estado confirmado / éxito.
  success: "#4A6D55", // sage-700 (AA sobre blanco)
  successSoft: "#5B8266", // sage-600
  successSurface: "#F0F4EF", // sage-50

  danger: "#B3432B",
  dangerSurface: "#FBE4E1",
  warning: "#B9752E",
  warningSurface: "#FBEBD9",
} as const;

export const fonts = {
  serifMedium: "PlayfairDisplay_500Medium",
  serifSemiBold: "PlayfairDisplay_600SemiBold",
  serifBold: "PlayfairDisplay_700Bold",
  sansRegular: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansSemiBold: "DMSans_600SemiBold",
  sansBold: "DMSans_700Bold",
} as const;

// Múltiplos de 8, como pide la guía de espaciado táctil.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

// Tamaño mínimo de objetivo táctil (44pt iOS / 48dp Android) — usar como
// minHeight/minWidth en cualquier Pressable, no solo en botones grandes.
export const minTouchTarget = 48;
