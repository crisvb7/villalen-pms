// app/api/rooms/upload/route.ts
// Sube la foto de una habitación a Vercel Blob y devuelve la URL pública
// para guardar en Room.imageUrl (ver app/admin/habitaciones/page.tsx).
// Mismo patrón que app/api/routes/upload/route.ts (fotos de rutas).
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
    const blob = await put(`habitaciones/${randomUUID()}.${EXT_BY_TYPE[file.type]}`, file, {
      access: "public",
    });
    return NextResponse.json({ data: { url: blob.url } });
  } catch (error) {
    console.error("[POST /api/rooms/upload]", error);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }
}
