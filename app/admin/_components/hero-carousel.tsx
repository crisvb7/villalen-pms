// app/admin/_components/hero-carousel.tsx
// Tarjeta principal del dashboard: fotos de la casa en carrusel (como la
// "cámara" del diseño de referencia), con fundido cruzado entre imágenes.
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  { src: "/images/hero-villalen.jpg", label: "Villalén" },
  { src: "/images/rooms/apartamento-1.jpg", label: "Apartamento" },
  { src: "/images/rooms/doble-1.jpg", label: "Habitación doble" },
  { src: "/images/rooms/apartamento-2.jpg", label: "Apartamento" },
  { src: "/images/rooms/doble-2.jpg", label: "Habitación doble" },
];

const AUTOPLAY_MS = 6000;

export default function HeroCarousel({ status }: { status: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [index, paused]);

  const go = (delta: number) => setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);

  return (
    <div
      className="relative h-full min-h-[220px] xl:min-h-0 overflow-hidden rounded-[18px] bg-black/20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          src={slide.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: i === index ? 1 : 0,
            transform: i === index ? "scale(1)" : "scale(1.04)",
            transition: "opacity 700ms ease, transform 1200ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#292524]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#c98a5a] animate-pulse" />
        {status}
      </span>

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Foto anterior"
        className="glass-icon-btn !absolute left-3 top-[calc(50%-16px)] !h-8 !w-8 backdrop-blur-md"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Foto siguiente"
        className="glass-icon-btn !absolute right-3 top-[calc(50%-16px)] !h-8 !w-8 backdrop-blur-md"
      >
        <ChevronRight size={16} />
      </button>

      <div className="absolute bottom-4 left-4 flex gap-1.5">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ver foto ${i + 1}`}
            className="h-1.5 rounded-full bg-white transition-all duration-300"
            style={{ width: i === index ? 18 : 6, opacity: i === index ? 1 : 0.5 }}
          />
        ))}
      </div>

      <span className="absolute bottom-3.5 right-4 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs text-white backdrop-blur-md">
        {SLIDES[index].label}
      </span>
    </div>
  );
}
