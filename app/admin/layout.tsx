// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import AdminProviders from "./providers";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⬛", exact: true },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: "📊" },
  { href: "/admin/calendario", label: "Calendario", icon: "📆" },
  { href: "/admin/reservas", label: "Reservas", icon: "📅" },
  { href: "/admin/presupuestos", label: "Presupuestos", icon: "📝" },
  { href: "/admin/facturas", label: "Facturas", icon: "🧾" },
  { href: "/admin/gastos", label: "Gastos", icon: "💸" },
  { href: "/admin/caja", label: "Caja", icon: "💰" },
  { href: "/admin/huespedes", label: "Huéspedes", icon: "👤" },
  { href: "/admin/habitaciones", label: "Habitaciones", icon: "🏠" },
  { href: "/admin/limpieza", label: "Limpieza", icon: "🧹" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProviders>
      <AdminChrome>{children}</AdminChrome>
    </AdminProviders>
  );
}

function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  // La pantalla de login no lleva el sidebar/backoffice alrededor.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-stone-100">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 bg-stone-950 text-stone-300 flex flex-col transition-all duration-200 relative",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir menú" : "Minimizar menú"}
          className="absolute -right-3 top-6 z-30 w-6 h-6 flex items-center justify-center rounded-full bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
        >
          <span className="text-xs">{collapsed ? "›" : "‹"}</span>
        </button>

        {/* Logo */}
        <div className={cn("border-b border-stone-800", collapsed ? "px-2 py-6" : "p-6")}>
          <Link href="/admin" className="block group">
            {collapsed ? (
              <p className="font-serif text-lg text-white text-center group-hover:text-amber-400 transition-colors">
                V
              </p>
            ) : (
              <>
                <p className="font-serif text-lg text-white group-hover:text-amber-400 transition-colors">
                  Villalén
                </p>
                <p className="text-xs text-stone-500 mt-0.5 uppercase tracking-widest">
                  PMS · Backoffice
                </p>
              </>
            )}
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
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 py-3 text-sm transition-all",
                  collapsed ? "px-0 justify-center" : "px-6",
                  isActive
                    ? "bg-stone-900 text-white border-l-2 border-amber-500"
                    : "text-stone-400 hover:bg-stone-900 hover:text-white border-l-2 border-transparent"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className={cn("border-t border-stone-800", collapsed ? "px-2 py-4" : "p-6")}>
          <Link
            href="/reserva"
            title={collapsed ? "Motor de reservas" : undefined}
            className="block w-full text-center text-xs text-stone-500 hover:text-amber-400 transition-colors"
          >
            {collapsed ? "↗" : "Motor de reservas →"}
          </Link>
          {!collapsed && (
            <a
              href="https://www.villalen.es"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs text-stone-600 hover:text-stone-400 transition-colors"
            >
              villalen.es ↗
            </a>
          )}
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
            {session?.user?.name && (
              <span className="text-xs text-stone-500">{session.user.name}</span>
            )}
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1">
              Staff · Admin
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="text-xs text-stone-400 hover:text-red-600 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
