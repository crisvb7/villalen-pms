// lib/services/push.service.ts
// Notificaciones push nativas de iOS (APNs) para el personal — directo a
// los servidores de Apple, sin pasar por Expo ni ningún otro intermediario.
// Necesita la clave .p8 de Apple Developer (Keys → Apple Push Notifications
// service) en las variables APNS_* (ver .env.example).

import http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";
import { prisma } from "@/lib/prisma";

function apnsHost(): string {
  return process.env.APNS_ENV === "production"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_KEY && process.env.APNS_BUNDLE_ID
  );
}

// El token de proveedor (JWT firmado con la clave .p8) vale hasta 1h según
// Apple; lo cacheamos en memoria del proceso para no firmarlo en cada envío
// (aunque en serverless cada invocación puede partir de cero, no pasa nada).
let cachedToken: { token: string; issuedAt: number } | null = null;

async function getProviderToken(): Promise<string> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const rawKey = process.env.APNS_KEY;
  if (!keyId || !teamId || !rawKey) {
    throw new Error("APNs no configurado (faltan APNS_KEY_ID / APNS_TEAM_ID / APNS_KEY).");
  }

  if (cachedToken && Date.now() - cachedToken.issuedAt < 40 * 60 * 1000) {
    return cachedToken.token;
  }

  const pem = rawKey.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(pem, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuedAt()
    .setIssuer(teamId)
    .sign(privateKey);

  cachedToken = { token, issuedAt: Date.now() };
  return token;
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

function sendToDevice(deviceToken: string, jwt: string, payload: PushPayload): Promise<{ ok: boolean; status: number; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result: { ok: boolean; status: number; error?: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const client = http2.connect(apnsHost());
    client.on("error", (err) => done({ ok: false, status: 0, error: err.message }));
    // Apple normalmente responde en milisegundos; si no hay respuesta en 8s
    // (red caída, etc.) no queremos dejar la petición del huésped colgada.
    const timeout = setTimeout(() => {
      done({ ok: false, status: 0, error: "Timeout esperando respuesta de APNs." });
      client.close();
    }, 8000);

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": process.env.APNS_BUNDLE_ID!,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    let responseBody = "";
    let status = 0;
    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      clearTimeout(timeout);
      client.close();
      done({ ok: status === 200, status, error: status === 200 ? undefined : responseBody });
    });
    req.on("error", (err) => done({ ok: false, status: 0, error: err.message }));

    req.end(
      JSON.stringify({
        aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
        ...payload.data,
      })
    );
  });
}

/**
 * Manda una notificación a todos los dispositivos de staff registrados. Si
 * APNs no está configurado (faltan las env vars) no hace nada — no bloquea
 * al que llama, solo lo avisa en consola (ver isPushConfigured si quieres
 * comprobarlo antes).
 */
export async function sendPushToStaff(payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) {
    console.log("[push] APNs no configurado, no se envía notificación.");
    return;
  }

  const tokens = await prisma.staffPushToken.findMany();
  if (tokens.length === 0) return;

  const jwt = await getProviderToken();
  const results = await Promise.all(tokens.map((t) => sendToDevice(t.token, jwt, payload)));

  // 410 Gone / BadDeviceToken = el dispositivo desinstaló la app o el token
  // ya no es válido — lo quitamos para no seguir intentando en balde.
  const staleIds = tokens
    .filter((_, i) => results[i].status === 410 || results[i].error?.includes("BadDeviceToken"))
    .map((t) => t.id);
  if (staleIds.length > 0) {
    await prisma.staffPushToken.deleteMany({ where: { id: { in: staleIds } } });
  }
}
