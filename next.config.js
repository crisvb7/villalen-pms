/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prisma necesita estar en la lista de paquetes externos del servidor
    // para que Vercel no intente empaquetarlo como código de cliente
    // (en Next 14.1 esta opción todavía va dentro de "experimental").
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },

  // NEXTAUTH_URL: usa la variable de entorno si existe,
  // si no, construye la URL a partir de VERCEL_URL (asignada automáticamente por Vercel),
  // y como último recurso usa localhost para desarrollo local.
  env: {
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  },
};

module.exports = nextConfig;
