import { useEffect, useState } from 'react';
import { resolveMediaSrc } from '../utils/mediaStore';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.9 — Muestra media que puede ser base64 (data:) o una ruta de Supabase
// Storage ("sb:..."). Las rutas se resuelven a una URL firmada temporal. Asi
// las fotos/escaneos capturados en otro dispositivo se ven aqui.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Resuelve un valor de media (data:/http/sb:) a un src mostrable. */
function useMediaSrc(value?: string): string | null {
  const immediate =
    value && (value.startsWith('data:') || value.startsWith('http') || value.startsWith('blob:'))
      ? value
      : null;
  const [src, setSrc] = useState<string | null>(immediate);

  useEffect(() => {
    let alive = true;
    if (immediate) {
      setSrc(immediate);
      return;
    }
    setSrc(null);
    resolveMediaSrc(value).then((r) => {
      if (alive) setSrc(r);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return src;
}

interface MediaImageProps {
  value?: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export default function MediaImage({ value, alt = '', className, onClick, title }: MediaImageProps) {
  const src = useMediaSrc(value);
  if (!src) {
    // Placeholder mientras resuelve la URL firmada (o si no se pudo resolver).
    return <div className={className} aria-label={alt} />;
  }
  return <img src={src} alt={alt} className={className} onClick={onClick} title={title} />;
}

/** Visor de PDF (u otro archivo) en <iframe>, resolviendo la URL firmada. */
export function MediaFrame({ value, className, title = 'Documento' }: { value?: string; className?: string; title?: string }) {
  const src = useMediaSrc(value);
  if (!src) {
    return (
      <div className={`${className ?? ''} flex items-center justify-center text-surface-400 text-sm`}>
        Cargando documento...
      </div>
    );
  }
  return <iframe src={src} title={title} className={className} />;
}
