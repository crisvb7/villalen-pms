// app/layout.tsx
import type { Metadata } from "next";
import PageLoader from "./page-loader";
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
    // "is-loading" bloquea el scroll mientras se ve la pantalla de carga; el
    // script de PageLoader la quita antes de hidratar (de ahí el
    // suppressHydrationWarning).
    <html lang="es" className="is-loading" suppressHydrationWarning>
      <body>
        <PageLoader />
        {children}
      </body>
    </html>
  );
}
