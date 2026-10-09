// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  BarChart3,
  BedDouble,
  Bell,
  CalendarCheck,
  CalendarDays,
  Coffee,
  ExternalLink,
  FileText,
  Footprints,
  Globe,
  LayoutDashboard,
  LogOut,
  Receipt,
  Sparkles,
  Users,
  Wallet,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import AdminProviders from "./providers";
import "./glass.css";

interface PendingAssignmentBooking {
  id: string;
  checkInDate: string;
  guest: { firstName: string; lastName: string };
}

const navItems: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/admin/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/admin/servicios", label: "Servicios del día", icon: Coffee },
  { href: "/admin/presupuestos", label: "Facturas proforma", icon: FileText },
  { href: "/admin/facturas", label: "Facturas", icon: Receipt },
  { href: "/admin/gastos", label: "Gastos", icon: Banknote },
  { href: "/admin/caja", label: "Caja", icon: Wallet },
  { href: "/admin/huespedes", label: "Huéspedes", icon: Users },
  { href: "/admin/habitaciones", label: "Habitaciones", icon: BedDouble },
  { href: "/admin/limpieza", label: "Limpieza", icon: Sparkles },
  { href: "/admin/rutas", label: "Rutas", icon: Footprints },
];

// Alto de cada icono (40px) + separación (2px) — mueve el indicador activo.
const NAV_STEP = 42;

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

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 6 || hour >= 21) return "Buenas noches";
  if (hour < 14) return "Buenos días";
  return "Buenas tardes";
}

function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [pendingBookings, setPendingBookings] = useState<PendingAssignmentBooking[]>([]);
  const [openMenu, setOpenMenu] = useState<"alerts" | "account" | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);
  // Saludo y fecha solo en el navegador: el servidor corre en UTC (TZ=UTC) y
  // calcularlos allí no coincidiría con la hora local (error de hidratación).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    fetch("/api/bookings/pending-assignment")
      .then((r) => r.json())
      .then((data) => setPendingBookings(data.data ?? []))
      .catch(() => {});
  }, [pathname, searchParams]);

  // Sección pulsada en el menú: el indicador se mueve en el mismo clic, sin
  // esperar a que el servidor devuelva la página nueva.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Cierra los desplegables al navegar, al hacer clic fuera o con Escape.
  useEffect(() => {
    setOpenMenu(null);
    setPendingHref(null);
  }, [pathname]);
  useEffect(() => {
    if (!openMenu) return;
    const onPointer = (e: PointerEvent) => {
      if (!menusRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  // La pantalla de login no lleva el sidebar/backoffice alrededor.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const currentPath = pendingHref ?? pathname;
  const activeIndex = navItems.findIndex((item) =>
    item.exact ? currentPath === item.href : currentPath.startsWith(item.href)
  );
  const userName = session?.user?.name ?? "";
  const firstName = userName.split(" ")[0];
  const initial = (userName || session?.user?.email || "V").charAt(0).toUpperCase();

  return (
    <div className="pms-shell h-screen overflow-hidden">
      <div className="glass-bg" aria-hidden />

      <div className="glass-frame">
        {/* Cabecera */}
        <header className="flex items-center justify-between gap-6 px-8 pt-6 pb-4">
          <div className="min-w-0">
            <p className="text-[28px] font-medium tracking-tight text-white truncate">
              {now ? greeting(now) : "Hola"}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <p className="text-xs text-white/50 mt-0.5">Villalén · Panel de gestión</p>
          </div>

          <div ref={menusRef} className="flex items-center gap-2.5 flex-shrink-0">
            <span className="hidden md:block text-sm text-white/60 mr-2 first-letter:uppercase">
              {now?.toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>

            <Link href="/reserva" className="glass-icon-btn" aria-label="Motor de reservas">
              <ExternalLink size={17} strokeWidth={1.8} />
              <span className="glass-tip">Motor de reservas</span>
            </Link>
            <a
              href="https://www.villalen.es"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-icon-btn"
              aria-label="villalen.es"
            >
              <Globe size={17} strokeWidth={1.8} />
              <span className="glass-tip">villalen.es</span>
            </a>

            {/* Avisos: reservas web sin habitación asignada */}
            <div className="relative">
              <button
                type="button"
                className="glass-icon-btn"
                aria-label="Avisos"
                aria-expanded={openMenu === "alerts"}
                onClick={() => setOpenMenu((m) => (m === "alerts" ? null : "alerts"))}
              >
                <Bell size={17} strokeWidth={1.8} />
                {pendingBookings.length > 0 && (
                  <span className="glass-badge-dot">{pendingBookings.length}</span>
                )}
              </button>
              <div className="glass-popover w-80" data-open={openMenu === "alerts"}>
                <p className="px-3 pt-2 pb-2 text-xs font-medium text-white/50">Avisos</p>
                {pendingBookings.length === 0 ? (
                  <p className="px-3 pb-3 text-sm text-white/70">Todo en orden, no hay avisos.</p>
                ) : (
                  pendingBookings.map((b) => (
                    <Link
                      key={b.id}
                      href={`/admin/calendario?assignBookingId=${b.id}`}
                      className="glass-popover-item"
                    >
                      <span className="w-2 h-2 rounded-full bg-[var(--glass-copper)] flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate">
                          {b.guest.firstName} {b.guest.lastName}
                        </span>
                        <span className="block text-xs text-white/50">
                          Sin habitación · llega el {formatDate(b.checkInDate)}
                        </span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Cuenta */}
            <div className="relative">
              <button
                type="button"
                className="glass-icon-btn !bg-white !text-stone-900 font-semibold text-sm"
                aria-label="Cuenta"
                aria-expanded={openMenu === "account"}
                onClick={() => setOpenMenu((m) => (m === "account" ? null : "account"))}
              >
                {initial}
              </button>
              <div className="glass-popover" data-open={openMenu === "account"}>
                <div className="px-3 pt-2 pb-3">
                  <p className="text-sm font-medium text-white truncate">
                    {userName || "Personal"}
                  </p>
                  {session?.user?.email && (
                    <p className="text-xs text-white/50 truncate">{session.user.email}</p>
                  )}
                  <span className="glass-chip mt-2">Staff · Admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                  className="glass-popover-item hover:!text-red-300"
                >
                  <LogOut size={16} strokeWidth={1.8} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        {pendingBookings.length > 0 && (
          <div className="mx-8 mb-3 flex items-center gap-2 overflow-x-auto rounded-2xl border border-[rgba(201,138,90,0.35)] bg-[rgba(201,138,90,0.14)] px-4 py-2.5">
            <span className="text-xs font-medium text-[#ecbf93] flex-shrink-0">
              🛎️ {pendingBookings.length} reserva(s) web sin habitación asignada:
            </span>
            {pendingBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/calendario?assignBookingId=${b.id}`}
                className="glass-chip flex-shrink-0 hover:bg-white/15 transition-colors"
              >
                {b.guest.firstName} {b.guest.lastName} · {formatDate(b.checkInDate)} →
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-1 min-h-0 gap-6 pl-6 pr-2 pb-6">
          {/* Menú lateral flotante */}
          <div className="flex items-center flex-shrink-0">
            <nav className="glass-nav" aria-label="Secciones">
              <span
                className="glass-nav-indicator"
                aria-hidden
                style={{
                  transform: `translateY(${Math.max(activeIndex, 0) * NAV_STEP}px)`,
                  opacity: activeIndex === -1 ? 0 : 1,
                }}
              />
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeIndex;
                const showBadge = item.href === "/admin/reservas" && pendingBookings.length > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className="glass-nav-item"
                    onClick={(e) => {
                      // Ctrl/Cmd/Mayús+clic abre en otra pestaña: no cambia la sección aquí.
                      if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                        setPendingHref(item.href);
                      }
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.1 : 1.8} />
                    {showBadge && (
                      <span className="glass-badge-dot">{pendingBookings.length}</span>
                    )}
                    <span className="glass-tip">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Contenido — se vuelve a montar al cambiar de sección para
              animar la entrada (ver .glass-page en glass.css). */}
          <main className="flex-1 min-w-0 overflow-auto pr-4 pt-1">
            <div key={pathname} className="glass-page">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
