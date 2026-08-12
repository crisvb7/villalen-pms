// lib/use-unread-count.ts
// Sondea el contador de mensajes no leídos para el badge de la pestaña
// "Recepción". Se detiene mientras la app está en segundo plano (batería).

import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as api from "@/lib/api";

const POLL_INTERVAL_MS = 30_000;

export function useUnreadCount(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    async function poll() {
      try {
        const { data } = await api.fetchUnreadCount();
        setCount(data.count);
      } catch {
        // silencioso: es solo un badge, no bloquea nada si falla una vez
      }
    }

    function stop() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    function start() {
      stop(); // por si ya había un intervalo (evita duplicados al reactivarse)
      poll();
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }

    start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") start();
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [enabled]);

  return count;
}
