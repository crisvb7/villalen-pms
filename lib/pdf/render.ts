// lib/pdf/render.ts
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderPdfBuffer(document: ReactElement): Promise<Buffer> {
  return renderToBuffer(document);
}
