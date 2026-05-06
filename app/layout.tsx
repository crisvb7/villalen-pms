// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Casa do Souto — Casa de Aldea",
    template: "%s | Casa do Souto",
  },
  description:
    "Casa de aldea en el corazón de Galicia. Reserva tu estancia en un entorno de naturaleza y tradición.",
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
