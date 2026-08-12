// lib/config.ts
// URL del backend (el mismo Next.js de villalen-pms, ver ../app/api/guest-app).
// Se define en guest-app/.env como EXPO_PUBLIC_API_URL (ver .env.example).
//
// - Simulador iOS: puede usar http://localhost:3000
// - Emulador Android: usa http://10.0.2.2:3000 (localhost del host desde el emulador)
// - Dispositivo físico: usa la IP LAN de tu ordenador, p.ej. http://192.168.1.50:3000
// - Producción: la URL pública donde esté desplegado el backend (Vercel, etc.)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
