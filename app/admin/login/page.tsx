"use client";
// app/admin/login/page.tsx

import { useState, Suspense } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Fotografía real de Villalén */}
      <div className="relative h-[42vh] lg:h-screen">
        <Image
          src="/images/hero-villalen.jpg"
          alt="Casa de aldea Villalén, en Cuerres, Ribadesella"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-villalen-900/80 via-villalen-900/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 lg:p-12">
          <p className="text-xs uppercase tracking-[0.25em] text-white/70 mb-2">
            Casa de aldea · Cuerres, Ribadesella
          </p>
          <h1 className="font-serif italic text-4xl lg:text-5xl text-white">Villalén</h1>
          <p className="hidden lg:block mt-3 max-w-sm text-sm text-white/70 leading-relaxed">
            Oriente de Asturias, a un paso de la costa y de Picos de Europa.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="pms-shell flex items-center justify-center bg-stone-50 px-6 py-16 lg:py-0">
        <div className="w-full max-w-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-villalen-600 mb-2">
            Panel de gestión
          </p>
          <h2 className="font-serif text-2xl text-stone-900 mb-8">Inicia sesión</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="label mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="mb-7">
              <label className="label mb-2" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="mb-5 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={loading}
            >
              {loading ? "Entrando…" : "Entrar →"}
            </button>
          </form>

          <div className="mt-10 h-px w-10 bg-amber-700" />
          <p className="mt-4 text-xs text-stone-400">villalen.es</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
