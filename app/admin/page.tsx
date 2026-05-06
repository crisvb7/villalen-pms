// app/admin/page.tsx
import { getAllBookings } from "@/lib/services/booking.service";
import { getCleaningStatus } from "@/lib/services/room.service";
import { formatDate, formatCurrency, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [bookings, rooms] = await Promise.all([
    getAllBookings(),
    getCleaningStatus(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = bookings.filter(
    (b) =>
      b.checkInDate >= today &&
      ["PENDING", "CONFIRMED"].includes(b.status)
  );

  const pending = bookings.filter((b) => b.status === "PENDING");
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const dirtyRooms = rooms.filter((r) => !r.isClean);

  const totalRevenue = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-stone-800">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1">
          Resumen de la operativa del establecimiento
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <p className="label mb-2">Próximas llegadas</p>
          <p className="font-serif text-4xl text-stone-800">{upcoming.length}</p>
          <p className="text-xs text-stone-400 mt-1">próximos 7 días</p>
        </div>
        <div className="card p-5">
          <p className="label mb-2">Pendientes pago</p>
          <p className="font-serif text-4xl text-amber-700">{pending.length}</p>
          <p className="text-xs text-stone-400 mt-1">sin confirmar</p>
        </div>
        <div className="card p-5">
          <p className="label mb-2">Hab. sucias</p>
          <p className="font-serif text-4xl text-red-600">{dirtyRooms.length}</p>
          <p className="text-xs text-stone-400 mt-1">
            de {rooms.length} total
          </p>
        </div>
        <div className="card p-5">
          <p className="label mb-2">Ingresos (confirmadas)</p>
          <p className="font-serif text-2xl text-emerald-700">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-stone-400 mt-1">acumulado total</p>
        </div>
      </div>

      {/* Alertas */}
      {(pending.length > 0 || dirtyRooms.length > 0) && (
        <div className="mb-8 grid gap-3">
          {pending.length > 0 && (
            <div className="border-l-4 border-amber-500 bg-amber-50 p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-amber-900 text-sm">
                  ⚠️ {pending.length} reserva(s) pendiente(s) de confirmación
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Revisar recepción de transferencias bancarias
                </p>
              </div>
              <Link href="/admin/reservas?status=PENDING" className="text-xs text-amber-800 underline">
                Ver →
              </Link>
            </div>
          )}
          {dirtyRooms.length > 0 && (
            <div className="border-l-4 border-red-400 bg-red-50 p-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-red-900 text-sm">
                  🧹 {dirtyRooms.length} habitación(es) pendiente(s) de limpieza
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  {dirtyRooms.map((r) => r.name).join(", ")}
                </p>
              </div>
              <Link href="/admin/limpieza" className="text-xs text-red-800 underline">
                Gestionar →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Próximas llegadas */}
      <div className="card">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-serif text-xl text-stone-800">Próximas llegadas</h2>
          <Link href="/admin/reservas" className="text-xs text-amber-800 hover:underline">
            Ver todas →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="p-10 text-center text-stone-400">
            No hay llegadas próximas registradas.
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {upcoming.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-stone-800 text-sm">
                    {booking.guest.firstName} {booking.guest.lastName}
                  </p>
                  <p className="text-xs text-stone-400">
                    {booking.room.name} · {booking.adults} adultos
                    {booking.children > 0 ? `, ${booking.children} niños` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-stone-700">
                    {formatDate(booking.checkInDate)}
                  </p>
                  <span className={`badge mt-1 ${STATUS_COLORS[booking.status]}`}>
                    {STATUS_LABELS[booking.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
