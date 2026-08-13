// app/api/routes/upload/route.ts
// Sube la foto de una ruta a Vercel Blob y devuelve la URL pública para
// guardar en Route.imageUrl (ver app/admin/rutas/page.tsx). Requiere la
// variable BLOB_READ_WRITE_TOKEN (se genera sola al activar Blob Storage en
// el proyecto de Vercel).
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa JPG, PNG o WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "La imagen no puede superar 5MB." }, { status: 400 });
  }

  try {
    const blob = await put(`rutas/${randomUUID()}.${EXT_BY_TYPE[file.type]}`, file, {
      access: "public",
    });
    return NextResponse.json({ data: { url: blob.url } });
  } catch (error) {
    console.error("[POST /api/routes/upload]", error);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }
}
