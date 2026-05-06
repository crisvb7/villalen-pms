// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-stone-900">Casa do Souto</h1>
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Casa de Aldea · Galicia
            </p>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/reserva"
              className="btn-primary text-sm"
            >
              Reservar Estancia
            </Link>
            <Link
              href="/admin"
              className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
            >
              Staff →
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-amber-700">
          Alojamiento Rural · Caldas de Reis · Pontevedra
        </p>
        <h2 className="font-serif text-5xl text-stone-900 leading-tight mb-6">
          Donde el tiempo<br />
          <em>se detiene</em>
        </h2>
        <p className="mx-auto max-w-xl text-stone-500 text-lg mb-10 leading-relaxed">
          Sumérgete en la Galicia más auténtica. Piedra, naturaleza, silencio y
          los mejores productos de la tierra. Tu refugio particular a orillas del
          Umia.
        </p>
        <Link href="/reserva" className="btn-primary text-base px-8 py-4">
          Consultar Disponibilidad
        </Link>
      </section>

      {/* Habitaciones preview */}
      <section className="border-t border-stone-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h3 className="font-serif text-3xl text-stone-800 mb-12 text-center">
            Nuestros Alojamientos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-stone-200">
            {[
              {
                name: "Suite Carballo",
                price: "145",
                capacity: "2 personas",
                desc: "Con vistas al bosque de robles. Baño de mármol, terraza privada y desayuno incluido.",
              },
              {
                name: "Habitación A Eira",
                price: "89",
                capacity: "1–2 personas",
                desc: "El encanto de la arquitectura gallega tradicional. Ducha de piedra natural y jardín compartido.",
              },
              {
                name: "Loft O Muíño",
                price: "185",
                capacity: "hasta 4 personas",
                desc: "Antigua casa del molino restaurada. Cocina equipada, doble altura y jardín propio.",
              },
            ].map((room, i) => (
              <div
                key={i}
                className={`p-8 ${i < 2 ? "border-r border-stone-200" : ""} hover:bg-stone-50 transition-colors`}
              >
                <div className="h-40 bg-stone-100 mb-6 flex items-center justify-center">
                  <span className="text-4xl">🏡</span>
                </div>
                <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">
                  Desde {room.price}€/noche
                </p>
                <h4 className="font-serif text-xl text-stone-800 mb-1">
                  {room.name}
                </h4>
                <p className="text-xs text-stone-400 mb-3">{room.capacity}</p>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {room.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/reserva" className="btn-secondary">
              Ver disponibilidad →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-10 text-center">
        <p className="text-xs text-stone-400">
          © {new Date().getFullYear()} Casa do Souto · Lugar de Exemplo, s/n ·
          Caldas de Reis, Pontevedra ·{" "}
          <a
            href="mailto:info@casadosouto.es"
            className="underline hover:text-stone-600"
          >
            info@casadosouto.es
          </a>
        </p>
        <p className="mt-2 text-xs text-stone-300">
          Los pagos se realizan por transferencia bancaria o TPV físico en el
          establecimiento. No almacenamos datos de tarjetas.
        </p>
      </footer>
    </main>
  );
}
