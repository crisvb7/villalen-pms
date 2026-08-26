// lib/pdf/assets.ts
// Imágenes reales de Villalén embebidas en los PDF (factura/factura proforma).
// Se leen una sola vez del disco y se cachean en memoria.

import fs from "fs";
import path from "path";

let heroImage: Buffer | null = null;
let logoImage: Buffer | null = null;

export function getHeroImage(): Buffer {
  if (!heroImage) {
    heroImage = fs.readFileSync(path.join(process.cwd(), "public", "images", "hero-villalen.jpg"));
  }
  return heroImage;
}

export function getLogoImage(): Buffer {
  if (!logoImage) {
    logoImage = fs.readFileSync(path.join(process.cwd(), "public", "logo-villalen.png"));
  }
  return logoImage;
}
