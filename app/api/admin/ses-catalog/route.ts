// app/api/admin/ses-catalog/route.ts
// Comprueba la conexión con SES.HOSPEDAJES (TLS + credenciales + sobre SOAP)
// sin mandar ningún dato de huésped: usa la operación de solo lectura
// "catalogo", pensada exactamente para esto antes de dar el salto a
// producción (ver README, sección "Ficha Policial").

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { queryCatalog, isSesConfigured, getSesEnvironment } from "@/lib/services/ses.service";
import { requireAuth } from "@/lib/auth";

const VALID_TABLAS = ["SEXO", "TIPO_DOCUMENTO", "TIPO_PAGO", "TIPO_PARENTESCO", "TIPO_ESTABLECIMIENTO"] as const;
type Tabla = (typeof VALID_TABLAS)[number];

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ ok: false, message: "No autorizado.", environment: null }, { status: 401 });
  }

  if (!isSesConfigured()) {
    return NextResponse.json({ ok: false, message: "SES no está configurado.", environment: null }, { status: 400 });
  }

  const tablaParam = req.nextUrl.searchParams.get("tabla");
  const tabla = tablaParam && (VALID_TABLAS as readonly string[]).includes(tablaParam) ? (tablaParam as Tabla) : undefined;

  const result = await queryCatalog(tabla);
  return NextResponse.json({ ...result, environment: getSesEnvironment() }, { status: result.ok ? 200 : 502 });
}
