import { useEffect, useRef, useState } from "react";

/**
 * Detecta si un bloque limitado por CSS está recortando su contenido.
 * Centralizar esta medición mantiene el mismo comportamiento de “Leer más”
 * en todas las vistas donde se reutiliza una reseña.
 */
export default function useClampedContent(value) {
  const ref = useRef(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const measure = () => {
      setIsClamped(element.scrollHeight > element.clientHeight + 1);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return { ref, isClamped };
}
