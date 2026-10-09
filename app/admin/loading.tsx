// app/admin/loading.tsx
// Se muestra al instante al pulsar una sección mientras el servidor prepara
// la página: así el cambio de sección se nota en el mismo clic.

export default function AdminLoading() {
  return (
    <div className="glass-loading" aria-busy="true" aria-label="Cargando sección">
      <div className="glass-skeleton h-7 w-56" />
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div className="glass-skeleton h-28" />
        <div className="glass-skeleton h-28" />
        <div className="glass-skeleton h-28" />
      </div>
      <div className="glass-skeleton mt-4 h-72" />
    </div>
  );
}
