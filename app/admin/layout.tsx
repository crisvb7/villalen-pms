// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn, formatDate } from "@/lib/utils";
import AdminProviders from "./providers";

interface PendingAssignmentBooking {
  id: string;
  checkInDate: string;
  guest: { firstName: string; lastName: string };
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⬛", exact: true },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: "📊" },
  { href: "/admin/calendario", label: "Calendario", icon: "📆" },
  { href: "/admin/reservas", label: "Reservas", icon: "📅" },
  { href: "/admin/servicios", label: "Servicios del día", icon: "🥐" },
  { href: "/admin/presupuestos", label: "Presupuestos", icon: "📝" },
  { href: "/admin/facturas", label: "Facturas", icon: "🧾" },
  { href: "/admin/gastos", label: "Gastos", icon: "💸" },
  { href: "/admin/caja", label: "Caja", icon: "💰" },
  { href: "/admin/huespedes", label: "Huéspedes", icon: "👤" },
  { href: "/admin/habitaciones", label: "Habitaciones", icon: "🏠" },
  { href: "/admin/limpieza", label: "Limpieza", icon: "🧹" },
  { href: "/admin/rutas", label: "Rutas", icon: "🥾" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProviders>
      <Suspense>
        <AdminChrome>{children}</AdminChrome>
      </Suspense>
    </AdminProviders>
  );
}

function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<PendingAssignmentBooking[]>([]);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    fetch("/api/bookings/pending-assignment")
      .then((r) => r.json())
      .then((data) => setPendingBookings(data.data ?? []))
      .catch(() => {});
  }, [pathname, searchParams]);

  // La pantalla de login no lleva el sidebar/backoffice alrededor.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="pms-shell h-screen overflow-hidden flex bg-stone-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 bg-villalen-900 text-stone-300 flex flex-col transition-all duration-200 relative",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir menú" : "Minimizar menú"}
          className="absolute -right-3 top-6 z-30 w-6 h-6 flex items-center justify-center rounded-full bg-villalen-800 border border-villalen-600/40 text-stone-300 hover:bg-villalen-600 hover:text-white transition-colors shadow-sm"
        >
          <span className="text-xs">{collapsed ? "›" : "‹"}</span>
        </button>

        {/* Logo */}
        <div className={cn("border-b border-white/10", collapsed ? "px-2 py-6" : "p-6")}>
          <Link href="/admin" className="block group">
            {collapsed ? (
              <p className="font-serif text-lg text-white text-center group-hover:text-terracotta-300 transition-colors">
                V
              </p>
            ) : (
              <>
                <p className="font-serif text-lg text-white group-hover:text-terracotta-300 transition-colors">
                  Villalén
                </p>
                <p className="text-xs text-stone-400 mt-0.5">PMS · Backoffice</p>
              </>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const showBadge = item.href === "/admin/reservas" && pendingBookings.length > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 py-2.5 text-sm rounded-xl transition-all relative",
                  collapsed ? "px-0 justify-center" : "px-4",
                  isActive
                    ? "bg-villalen-600 text-white shadow-sm"
                    : "text-stone-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && item.label}
                {showBadge && (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full bg-terracotta-500 text-white text-[10px] font-semibold",
                      collapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto w-5 h-5"
                    )}
                  >
                    {pendingBookings.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className={cn("border-t border-white/10", collapsed ? "px-2 py-4" : "p-6")}>
          <Link
            href="/reserva"
            title={collapsed ? "Motor de reservas" : undefined}
            className="block w-full text-center text-xs text-stone-400 hover:text-terracotta-300 transition-colors"
          >
            {collapsed ? "↗" : "Motor de reservas →"}
          </Link>
          {!collapsed && (
            <a
              href="https://www.villalen.es"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs text-stone-500 hover:text-stone-300 transition-colors"
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
              <span className="text-sm text-stone-600 font-medium">{session.user.name}</span>
            )}
            <span className="badge bg-terracotta-100 text-terracotta-800">
              Staff · Admin
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="text-sm text-stone-400 hover:text-red-600 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {pendingBookings.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center gap-3 overflow-x-auto">
            <span className="text-xs font-medium text-amber-800 flex-shrink-0">
              🛎️ {pendingBookings.length} reserva(s) web sin habitación asignada:
            </span>
            {pendingBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/calendario?assignBookingId=${b.id}`}
                className="chip bg-white text-amber-800 border-amber-200 hover:bg-amber-100 flex-shrink-0 text-xs"
              >
                {b.guest.firstName} {b.guest.lastName} · {formatDate(b.checkInDate)} →
              </Link>
            ))}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
