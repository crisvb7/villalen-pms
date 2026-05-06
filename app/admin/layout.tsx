// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⬛", exact: true },
  { href: "/admin/calendario", label: "Calendario", icon: "📆" },
  { href: "/admin/reservas", label: "Reservas", icon: "📅" },
  { href: "/admin/huespedes", label: "Huéspedes", icon: "👤" },
  { href: "/admin/habitaciones", label: "Habitaciones", icon: "🏠" },
  { href: "/admin/limpieza", label: "Limpieza", icon: "🧹" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-stone-100">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-stone-950 text-stone-300 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-stone-800">
          <Link href="/" className="block group">
            <p className="font-serif text-lg text-white group-hover:text-amber-400 transition-colors">
              Casa do Souto
            </p>
            <p className="text-xs text-stone-500 mt-0.5 uppercase tracking-widest">
              PMS · Backoffice
            </p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-sm transition-all",
                  isActive
                    ? "bg-stone-900 text-white border-l-2 border-amber-500"
                    : "text-stone-400 hover:bg-stone-900 hover:text-white border-l-2 border-transparent"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-6 border-t border-stone-800">
          <Link
            href="/reserva"
            className="block w-full text-center text-xs text-stone-500 hover:text-amber-400 transition-colors"
          >
            Motor de reservas →
          </Link>
          <Link
            href="/"
            className="block w-full text-center text-xs text-stone-600 hover:text-stone-400 transition-colors"
          >
            ← Web pública
          </Link>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between">
          <div className="text-sm text-stone-400">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1">
              Staff · Admin
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
