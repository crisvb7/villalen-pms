// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Villalén — Panel de gestión",
    template: "%s | Villalén",
  },
  description:
    "Sistema de gestión de Villalén, casa de aldea en Cuerres, Ribadesella (oriente de Asturias).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
