// app/page.tsx
// Sin página pública propia: el alojamiento ya tiene web (villalen.es).
// Este PMS es solo herramienta de gestión, así que "/" va directa al login.
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/admin/login");
}
