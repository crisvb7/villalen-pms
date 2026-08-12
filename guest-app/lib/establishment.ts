// lib/establishment.ts
// Copia en el cliente de los datos reales de lib/establishment.ts en el
// backend (villalen-pms/lib/establishment.ts) — no hay endpoint todavía que
// sirva esta configuración, así que se duplica a mano. Son datos que casi
// nunca cambian (horarios, teléfono); si cambian allí, cámbialos aquí también.

export const ESTABLISHMENT = {
  phone: "+34 985 857 093",
  email: "reservas@villalen.es",
  checkInTime: "15:00",
  checkOutTime: "12:00",
};
