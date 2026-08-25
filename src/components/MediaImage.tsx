import { useEffect, useState } from 'react';
import { resolveMediaSrc } from '../utils/mediaStore';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.9 — Muestra media que puede ser base64 (data:) o una ruta de Supabase
// Storage ("sb:..."). Las rutas se resuelven a una URL firmada temporal. Asi
// las fotos/escaneos capturados en otro dispositivo se ven aqui.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Resuelve un valor de media (data:/http/sb:) a un src mostrable.
 * v2.19 — distingue "todavia resolviendo" (pending) de "no se pudo resolver"
 * (src null y pending false), para no pintar un icono de error mientras carga.
 */
function useMediaSrc(value?: string): { src: string | null; pending: boolean } {
  const immediate =
    value && (value.startsWith('data:') || value.startsWith('http') || value.startsWith('blob:'))
      ? value
      : null;
  const [src, setSrc] = useState<string | null>(immediate);
  const [pending, setPending] = useState(!immediate && !!value);

  useEffect(() => {
    let alive = true;
    if (immediate) {
      setSrc(immediate);
      setPending(false);
      return;
    }
    setSrc(null);
    if (!value) {
      setPending(false);
      return;
    }
    setPending(true);
    resolveMediaSrc(value).then((r) => {
      if (!alive) return;
      setSrc(r);
      setPending(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return { src, pending };
}

interface MediaImageProps {
  value?: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  title?: string;
  /** v2.19 — Contenido a mostrar mientras resuelve (o si no se pudo resolver). */
  fallback?: React.ReactNode;
}

export default function MediaImage({ value, alt = '', className, onClick, title, fallback }: MediaImageProps) {
  const { src, pending } = useMediaSrc(value);
  if (!src) {
    // Placeholder mientras resuelve la URL firmada (o si no se pudo resolver).
    return (
      <div className={`${className ?? ''} flex items-center justify-center`} aria-label={alt}>
        {pending ? null : fallback}
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onClick={onClick} title={title} />;
}

/**
 * v2.19 — Reproductor de un video guardado (data:/http/sb:). Resuelve la URL
 * firmada igual que las fotos y muestra los controles nativos.
 */
export function MediaVideo({
  value,
  className,
  poster,
}: {
  value?: string;
  className?: string;
  poster?: string;
}) {
  const { src, pending } = useMediaSrc(value);
  const { src: posterSrc } = useMediaSrc(poster);
  if (!src) {
    return (
      <div className={`${className ?? ''} flex items-center justify-center text-surface-400 text-sm`}>
        {pending ? 'Cargando video…' : 'No se pudo cargar el video.'}
      </div>
    );
  }
  return (
    <video
      src={src}
      poster={posterSrc ?? undefined}
      controls
      playsInline
      preload="metadata"
      className={className}
    />
  );
}

/** Visor de PDF (u otro archivo) en <iframe>, resolviendo la URL firmada. */
export function MediaFrame({ value, className, title = 'Documento' }: { value?: string; className?: string; title?: string }) {
  const { src } = useMediaSrc(value);
  if (!src) {
    return (
      <div className={`${className ?? ''} flex items-center justify-center text-surface-400 text-sm`}>
        Cargando documento...
      </div>
    );
  }
  return <iframe src={src} title={title} className={className} />;
}
