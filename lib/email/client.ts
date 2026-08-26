// lib/email/client.ts
// Cliente de emails transaccionales (Resend). Mismo patrón best-effort +
// feature-flag que beds24.service.ts / ses.service.ts: si no está
// configurado, se omite en silencio; los disparos automáticos nunca deben
// romper la operación que los originó, solo el reenvío manual puede pedir
// que el error se propague (throwOnError).

import { Resend } from "resend";
import type { ReactNode } from "react";

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}

export function isEmailConfigured(): boolean {
  return getClient() !== null;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  react: ReactNode;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail(
  input: SendEmailInput,
  options?: { throwOnError?: boolean }
): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.log(`[Email] No configurado (falta RESEND_API_KEY). Envío a ${input.to} omitido.`);
    return;
  }

  try {
    const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      react: input.react,
      attachments: input.attachments,
    });

    if (error) throw new Error(error.message);

    console.log(`[Email] ✅ Enviado a ${input.to}: "${input.subject}"`);
  } catch (error) {
    console.error(`[Email] ❌ Error al enviar a ${input.to}:`, error);
    if (options?.throwOnError) throw error;
  }
}
