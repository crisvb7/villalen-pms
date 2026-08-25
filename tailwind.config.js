/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        // La lista termina en las fuentes de emoji del sistema (igual que el
        // stack por defecto de Tailwind) — sin ellas, el navegador intenta
        // dibujar los emoji con 'DM Sans'/Segoe UI, que solo tienen versiones
        // monocromas y deformadas de algunos símbolos en vez del emoji real.
        sans: [
          "'DM Sans'",
          "system-ui",
          "sans-serif",
          "'Apple Color Emoji'",
          "'Segoe UI Emoji'",
          "'Segoe UI Symbol'",
          "'Noto Color Emoji'",
        ],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        stone: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // Azul pizarra de la fachada real de Villalén — acento de marca,
        // usado con moderación (login, detalles puntuales) y como color de
        // acción principal en el backoffice (ver .pms-shell en globals.css).
        villalen: {
          50: "#eef2f3",
          200: "#c3d1d4",
          400: "#5e808a",
          600: "#3e5a63",
          800: "#2c4048",
          900: "#1f2e33",
        },
        // Terracota cálida — acento secundario del backoffice (avisos,
        // estado "pendiente"), sustituye al ámbar en las zonas rediseñadas.
        terracotta: {
          50: "#fbf3ea",
          100: "#f7e9d8",
          300: "#e3b383",
          600: "#c17a3c",
          700: "#a8632b",
          800: "#8a4e1e",
        },
        // Salvia — acento de éxito/confirmación del backoffice.
        sage: {
          50: "#f0f4ef",
          100: "#e7efe4",
          300: "#a9c2a0",
          600: "#5b8266",
          700: "#4a6d55",
          800: "#3d5d45",
        },
      },
      backgroundImage: {
        "stone-texture":
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
