// app/admin/ses-test/page.tsx
// Herramienta de diagnóstico: comprueba que las credenciales SES.HOSPEDAJES
// configuradas en Vercel funcionan (TLS + auth + sobre SOAP) sin mandar
// ningún dato de huésped, usando la operación de solo lectura "catalogo".
// No está en el menú lateral a propósito — es para usar una vez antes de
// pasar SES_ENVIRONMENT a "production", no un flujo del día a día.
"use client";

import { useState } from "react";

const TABLAS = [
  { value: "", label: "Catálogo completo" },
  { value: "SEXO", label: "SEXO" },
  { value: "TIPO_DOCUMENTO", label: "TIPO_DOCUMENTO" },
  { value: "TIPO_PAGO", label: "TIPO_PAGO" },
  { value: "TIPO_PARENTESCO", label: "TIPO_PARENTESCO" },
  { value: "TIPO_ESTABLECIMIENTO", label: "TIPO_ESTABLECIMIENTO" },
] as const;

interface CatalogResult {
  ok: boolean;
  message: string;
  environment: "test" | "production" | null;
  entries?: { codigo: string; descripcion: string }[];
  error?: string;
}

export default function SesTestPage() {
  const [tabla, setTabla] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CatalogResult | null>(null);

  async function handleTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/ses-catalog${tabla ? `?tabla=${tabla}` : ""}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl text-villalen-900 mb-2">Verificar conexión SES.HOSPEDAJES</h1>
      <p className="text-sm text-stone-500 mb-6">
        Llama a la operación de solo lectura <code>catalogo</code> del Ministerio del Interior — comprueba
        TLS, credenciales y el sobre SOAP sin mandar ningún dato de huésped ni crear ningún parte. Úsalo
        para confirmar que las credenciales funcionan antes de pasar <code>SES_ENVIRONMENT</code> a
        <code> production</code>.
      </p>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Tabla de catálogo</label>
          <select
            value={tabla}
            onChange={(e) => setTabla(e.target.value)}
            className="input w-full"
          >
            {TABLAS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleTest} disabled={loading} className="btn-primary">
          {loading ? "Probando…" : "Verificar conexión"}
        </button>

        {result && (
          <div
            className={`rounded-lg p-4 text-sm ${
              result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
            }`}
          >
            <p className="font-medium">
              {result.ok ? "✅ Conexión correcta" : "❌ Error"}
              {result.environment && (
                <span className="ml-2 font-normal opacity-70">
                  (entorno: {result.environment === "production" ? "producción" : "test"})
                </span>
              )}
            </p>
            <p className="mt-1">{result.ok ? result.message : result.error}</p>

            {result.entries && result.entries.length > 0 && (
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="text-left opacity-70">
                    <th className="pr-4 py-1">Código</th>
                    <th className="py-1">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {result.entries.map((e) => (
                    <tr key={e.codigo} className="border-t border-emerald-100">
                      <td className="pr-4 py-1 font-mono">{e.codigo}</td>
                      <td className="py-1">{e.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
