# Villalén PMS — App de gestión (móvil)

App interna (staff) para gestionar reservas y habitaciones desde el móvil,
hablando con **el mismo backend y base de datos** que la web
(`villalen-pms`, Next.js + Prisma + Postgres/Supabase). No hay una base de
datos independiente: las rutas `/api/*` existentes sirven a ambas.

## Cómo se conecta con el backend

- `../app/api/mobile/auth/login` — login con email+contraseña (misma tabla
  `User` que `/admin/login`), devuelve un JWT.
- `../app/api/mobile/auth/me` — valida el token guardado.
- El resto de rutas (`/api/bookings`, `/api/rooms`, `/api/rooms/cleaning`,
  etc.) son las mismas que usa la web. `requireAuth()` (`../lib/auth.ts`)
  acepta tanto la cookie de NextAuth (web) como
  `Authorization: Bearer <token>` (móvil) — no ha hecho falta duplicar
  ninguna ruta.

El token se guarda en el almacén seguro del dispositivo (Keychain/Keystore)
vía `expo-secure-store`, dura 30 días, y viaja en cada request.

## Puesta en marcha

1. En la raíz del repo, define `MOBILE_JWT_SECRET` en `.env.local` (distinto
   de `NEXTAUTH_SECRET`, ver `.env.example`) y arranca el backend:

   ```bash
   cd ..
   npm run dev
   ```

2. En `mobile/`, copia el env y ajusta la URL del backend:

   ```bash
   cp .env.example .env
   ```

   - Simulador iOS → `http://localhost:3000`
   - Emulador Android → `http://10.0.2.2:3000`
   - Dispositivo físico (mismo WiFi) → `http://<IP-LAN-de-tu-ordenador>:3000`

3. Arranca la app:

   ```bash
   npm install
   npm run ios       # o: npm run android / npm start
   ```

   Usa las mismas credenciales que ya tengas en `/admin/login` (o crea una
   con `npm run create-admin` en la raíz del repo).

## Pantallas incluidas (MVP)

- **Hoy** — entradas/salidas del día, resumen de limpieza.
- **Reservas** — lista filtrable por estado + detalle (confirmar, marcar
  entrada/salida, cancelar).
- **Habitaciones** — estado de limpieza con toggle.

Pendiente para más adelante: caja, facturas, gastos,
estadísticas, gestión de huéspedes/habitaciones (alta/edición) — todas
pueden seguir el mismo patrón (`lib/api.ts` + una pantalla).

## Publicar con Xcode / Android Studio

Este proyecto usa el flujo "prebuild" de Expo: las carpetas nativas
`ios/`/`android/` **no se versionan** (se regeneran) y se generan así:

```bash
npx expo prebuild
```

- **Xcode**: abre `ios/*.xcworkspace` (no el `.xcodeproj`), configura tu
  equipo de firma en Signing & Capabilities, y compila/archiva desde ahí.
- **Android Studio**: abre la carpeta `android/`, deja que sincronice
  Gradle, y genera el APK/AAB desde Build → Generate Signed Bundle/APK.

Antes de repetir `expo prebuild` sobre cambios nativos manuales, revisa
`npx expo prebuild --clean` si quieres regenerar desde cero. El
`bundleIdentifier` (iOS) / `package` (Android) ya están fijados en
`app.json` como `es.villalen.pmsadmin` — cámbialos si prefieres otro.

Para builds firmados sin instalar Xcode/Android Studio localmente también
existe `eas build` (servicio de Expo), pero no está configurado aquí.
