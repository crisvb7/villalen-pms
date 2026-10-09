// app/admin/page.tsx
import { getAllBookings } from "@/lib/services/booking.service";
import { getCleaningStatus } from "@/lib/services/room.service";
import { formatDate, formatCurrency, STATUS_LABELS, STATUS_COLORS, getRoomDisplayName } from "@/lib/utils";
import Link from "next/link";
import { ArrowUpRight, BellRing, AlertCircle, Sparkles } from "lucide-react";
import HeroCarousel from "./_components/hero-carousel";
import CleaningSwitches from "./_components/cleaning-switches";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

export default async function AdminDashboard() {
  const [bookings, rooms] = await Promise.all([
    getAllBookings(),
    getCleaningStatus(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

  const upcoming = bookings.filter(
    (b) =>
      b.checkInDate >= today &&
      ["PENDING", "CONFIRMED"].includes(b.status)
  );

  const pending = bookings.filter((b) => b.status === "PENDING");
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const dirtyRooms = rooms.filter((r) => !r.isClean);
  const unassigned = upcoming.filter((b) => !b.roomId);

  const totalRevenue = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const arrivalsToday = active.filter(
    (b) => sameDay(b.checkInDate, today) && b.status !== "CHECKED_OUT"
  );
  const departuresToday = active.filter((b) => sameDay(b.checkOutDate, today));

  // Ocupación de los próximos 14 días: reservas activas que cubren cada noche,
  // sobre el total de habitaciones.
  const occupancy = Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = new Date(today.getTime() + i * DAY_MS);
    const nights = active.filter(
      (b) => b.status !== "CHECKED_OUT" && b.checkInDate <= day && b.checkOutDate > day
    ).length;
    return {
      day,
      pct: rooms.length ? Math.min(100, Math.round((nights / rooms.length) * 100)) : 0,
    };
  });
  const inHouseToday = active.filter(
    (b) => b.status !== "CHECKED_OUT" && b.checkInDate <= today && b.checkOutDate > today
  ).length;
  const averageOccupancy = Math.round(
    occupancy.reduce((sum, d) => sum + d.pct, 0) / occupancy.length
  );

  const confirmedShare =
    pending.length + confirmed.length > 0
      ? Math.round((confirmed.length / (pending.length + confirmed.length)) * 100)
      : 100;

  // En pantallas de escritorio (xl) el dashboard ocupa exactamente el alto
  // disponible: tres filas que se reparten el espacio y tarjetas cuyo
  // contenido se adapta a la altura de la ventana (.dash-* en glass.css),
  // para no tener que hacer scroll. En pantallas estrechas fluye normal.
  return (
    <div className="dash xl:h-full xl:flex xl:flex-col xl:overflow-hidden">
      <div className="dash-title flex items-center justify-between gap-4">
        <h1 className="text-xl text-white">Resumen de hoy</h1>
        <span className="glass-chip">
          {inHouseToday} de {rooms.length} habitaciones ocupadas
        </span>
      </div>

      <div className="dash-grid grid grid-cols-12 xl:flex-1 xl:min-h-0 xl:grid-rows-[1fr_1fr_1.4fr] glass-stagger">
        {/* Casa en directo */}
        <section className="card dash-card col-span-12 xl:col-span-6 xl:row-span-2 flex flex-col">
          <div className="dash-card-head">
            <h2 className="text-sm text-white/85">Villalén hoy</h2>
            <Link href="/admin/calendario" className="glass-icon-btn !h-8 !w-8" aria-label="Abrir calendario">
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="flex-1 min-h-0">
            <HeroCarousel
              status={
                inHouseToday > 0
                  ? `Hoy · ${inHouseToday} reserva(s) en casa`
                  : "Hoy · casa libre"
              }
            />
          </div>
        </section>

        {/* Llegadas / salidas de hoy */}
        <section className="card dash-card col-span-6 xl:col-span-3 flex flex-col">
          <h2 className="text-sm text-white/85">Llegadas hoy</h2>
          <p className="dash-num">{arrivalsToday.length}</p>
          <p className="mt-auto text-xs text-white/50 truncate">
            {arrivalsToday.length > 0
              ? arrivalsToday.map((b) => b.guest.firstName).join(", ")
              : "Sin llegadas previstas"}
          </p>
          <p className="dash-optional text-xs text-white/40">
            {upcoming.length} próximas llegadas en total
          </p>
        </section>

        <section className="card dash-card col-span-6 xl:col-span-3 flex flex-col">
          <h2 className="text-sm text-white/85">Salidas hoy</h2>
          <p className="dash-num">{departuresToday.length}</p>
          <div className="mt-auto">
            <Link
              href="/admin/limpieza"
              className="glass-chip glass-chip-copper hover:opacity-90 transition-opacity"
            >
              {dirtyRooms.length} por limpiar
            </Link>
          </div>
        </section>

        {/* Pendientes de pago */}
        <section className="card dash-card col-span-6 xl:col-span-3 flex flex-col">
          <h2 className="text-sm text-white/85">Pendientes de pago</h2>
          <p className="dash-num">{pending.length}</p>
          <div className="glass-pill mt-auto !block !py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Confirmadas</span>
              <span className="text-[#78716c]">{confirmedShare}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7e5e4]">
              <div
                className="h-full rounded-full bg-[#c98a5a] glass-fade-in"
                style={{ width: `${confirmedShare}%` }}
              />
            </div>
            <p className="dash-optional mt-1.5 text-[11px] text-[#78716c]">
              {confirmed.length} confirmadas · {pending.length} sin confirmar
            </p>
          </div>
        </section>

        {/* Ingresos */}
        <section className="card dash-card col-span-6 xl:col-span-3 flex flex-col">
          <h2 className="text-sm text-white/85">Ingresos</h2>
          <p className="dash-num dash-num-sm break-words">{formatCurrency(totalRevenue)}</p>
          <p className="mt-auto text-xs text-white/45">Reservas confirmadas · acumulado</p>
        </section>

        {/* Limpieza */}
        <section className="card dash-card col-span-12 md:col-span-6 xl:col-span-3 flex flex-col">
          <div className="dash-card-head">
            <h2 className="text-sm text-white/85">Limpieza</h2>
            <Link href="/admin/limpieza" className="text-xs text-white/50 hover:text-white transition-colors">
              Ver todo →
            </Link>
          </div>
          <div className="dash-scroll">
            <CleaningSwitches
              rooms={rooms.map((r) => ({ id: r.id, name: r.name, isClean: r.isClean }))}
            />
          </div>
        </section>

        {/* Ocupación */}
        <section className="card dash-card col-span-12 md:col-span-6 xl:col-span-3 flex flex-col">
          <h2 className="text-sm text-white/85">Ocupación</h2>
          <div className="flex items-start justify-between">
            <div>
              <p className="dash-num">{occupancy[0]?.pct ?? 0}%</p>
              <p className="mt-1 text-xs text-white/45">Hoy</p>
            </div>
            <div className="text-right">
              <p className="dash-num dash-num-sm text-white/85">{averageOccupancy}%</p>
              <p className="mt-1 text-xs text-white/45">Media 14 días</p>
            </div>
          </div>
          <OccupancyChart points={occupancy} />
        </section>

        {/* Avisos */}
        <section className="card dash-card col-span-12 md:col-span-6 xl:col-span-3 flex flex-col">
          <div className="dash-card-head">
            <h2 className="text-sm text-white/85">Centro de avisos</h2>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#c98a5a] text-white">
              <BellRing size={13} />
            </span>
          </div>
          <div className="dash-scroll space-y-2">
            {pending.length > 0 && (
              <Link href="/admin/reservas?status=PENDING" className="glass-pill">
                <AlertIcon />
                <span className="flex-1 min-w-0">
                  <span className="block">
                    {pending.length} pendiente(s) de confirmar
                  </span>
                  <span className="dash-optional block text-xs font-normal text-[#78716c]">
                    Revisar recepción de transferencias bancarias
                  </span>
                </span>
                <span className="text-xs text-[#a8632b]">Ver →</span>
              </Link>
            )}
            {dirtyRooms.length > 0 && (
              <Link href="/admin/limpieza" className="glass-pill">
                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-[#e3b383] text-[#a8632b]">
                  <Sparkles size={14} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block">
                    {dirtyRooms.length} hab. por limpiar
                  </span>
                  <span className="dash-optional block truncate text-xs font-normal text-[#78716c]">
                    {dirtyRooms.map((r) => r.name).join(", ")}
                  </span>
                </span>
                <span className="text-xs text-[#a8632b]">Gestionar →</span>
              </Link>
            )}
            {unassigned.length > 0 && (
              <Link href={`/admin/calendario?assignBookingId=${unassigned[0].id}`} className="glass-pill">
                <AlertIcon />
                <span className="flex-1 min-w-0">
                  {unassigned.length} sin habitación asignada
                </span>
                <span className="text-xs text-[#a8632b]">Asignar →</span>
              </Link>
            )}
            {pending.length === 0 && dirtyRooms.length === 0 && unassigned.length === 0 && (
              <p className="text-sm text-white/50">Todo en orden, no hay avisos.</p>
            )}
          </div>
        </section>

        {/* Próximas llegadas */}
        <section className="card dash-card col-span-12 md:col-span-6 xl:col-span-3 flex flex-col">
          <div className="dash-card-head">
            <h2 className="text-sm text-white/85">Próximas llegadas</h2>
            <Link href="/admin/reservas" className="text-xs text-white/50 hover:text-white transition-colors">
              Ver todas →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-white/50">No hay llegadas próximas registradas.</p>
          ) : (
            <div className="dash-scroll space-y-1.5">
              {upcoming.slice(0, 8).map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/reservas/${booking.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 transition-colors hover:bg-white/[0.09]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-white/90">
                      {booking.guest.firstName} {booking.guest.lastName}
                    </span>
                    <span className="block truncate text-[11px] text-white/45">
                      {formatDate(booking.checkInDate)} · {getRoomDisplayName(booking)}
                      {!booking.roomId && (
                        <span className="ml-1 text-[#fcd34d]">· Sin asignar</span>
                      )}
                      {" · "}{booking.adults} ad.
                      {booking.children > 0 ? `, ${booking.children} niñ.` : ""}
                    </span>
                  </span>
                  <span className={`badge flex-shrink-0 ${STATUS_COLORS[booking.status]}`}>
                    {STATUS_LABELS[booking.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-[#e3b383] text-[#a8632b]">
      <AlertCircle size={14} />
    </span>
  );
}

// Curva suave de ocupación con el punto de hoy resaltado (como la gráfica de
// "Climate" del diseño de referencia). Se estira para ocupar el alto libre de
// la tarjeta; el punto de hoy va en HTML para que no se deforme al estirar.
function OccupancyChart({ points }: { points: { day: Date; pct: number }[] }) {
  const W = 300;
  const H = 90;
  const PAD = 8;
  const coords = points.map((p, i) => ({
    x: PAD + (i * (W - PAD * 2)) / Math.max(points.length - 1, 1),
    y: H - PAD - (p.pct / 100) * (H - PAD * 2),
  }));

  // Curva Catmull-Rom → Bézier para que la línea no tenga picos.
  let line = coords.length ? `M ${coords[0].x} ${coords[0].y}` : "";
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    line += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  const area = coords.length
    ? `${line} L ${coords[coords.length - 1].x} ${H} L ${coords[0].x} ${H} Z`
    : "";
  const labels = [0, 4, 9, points.length - 1].filter((i) => i < points.length);

  return (
    <div className="mt-3 flex flex-1 min-h-[60px] flex-col">
      <div className="relative flex-1 min-h-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="occupancy-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c98a5a" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c98a5a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#occupancy-fill)" className="glass-fade-in" />
          <path
            d={line}
            fill="none"
            stroke="#c98a5a"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            className="glass-draw"
          />
        </svg>
        {coords[0] && (
          <span
            className="glass-fade-in absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#c98a5a] bg-white"
            style={{ left: `${(coords[0].x / W) * 100}%`, top: `${(coords[0].y / H) * 100}%` }}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-white/40">
        {labels.map((i) => (
          <span key={i}>
            {i === 0
              ? "Hoy"
              : points[i].day.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
          </span>
        ))}
      </div>
    </div>
  );
}
