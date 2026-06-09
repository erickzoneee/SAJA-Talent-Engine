import { useEffect, useState } from 'react';
import { Volume2, Pause, VolumeX } from 'lucide-react';
import { detenerVoz, hablar, vozDisponible } from '../utils/trainingHelpers';
import { useTrainingStore } from '../store/useTrainingStore';

interface NarrationButtonProps {
  text: string;
  label?: string;
  /** Estilo compacto (sólo ícono) para barras de pasos. */
  compact?: boolean;
  className?: string;
}

/**
 * Botón de narración por voz (spec 4.5). Usa Web Speech API nativa del navegador.
 * Alterna entre reproducir y pausar; se detiene al desmontar o cambiar de texto.
 */
export default function NarrationButton({
  text,
  label = 'Escuchar',
  compact = false,
  className = '',
}: NarrationButtonProps) {
  const [playing, setPlaying] = useState(false);
  const rate = useTrainingStore((s) => s.vozPref.rate);
  const disponible = vozDisponible();

  // Detener la narración al desmontar o cuando cambia el texto a leer.
  useEffect(() => () => detenerVoz(), [text]);

  function toggle() {
    if (playing) {
      detenerVoz();
      setPlaying(false);
      return;
    }
    const ok = hablar(text, rate, {
      onEnd: () => setPlaying(false),
      onError: () => setPlaying(false),
    });
    if (ok) setPlaying(true);
  }

  if (!disponible) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-surface-500 ${className}`}
        title="Este dispositivo no tiene voz disponible"
      >
        <VolumeX size={compact ? 16 : 14} />
        {!compact && 'Voz no disponible'}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-xl border transition-all cursor-pointer ${
        playing
          ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
          : 'bg-surface-800/40 border-surface-700/40 text-surface-300 hover:bg-surface-700/40 hover:text-white'
      } ${compact ? 'p-2' : 'px-3 py-2 text-sm font-medium'} ${className}`}
      aria-label={playing ? 'Pausar narración' : label}
    >
      {playing ? <Pause size={compact ? 16 : 16} /> : <Volume2 size={compact ? 16 : 16} />}
      {!compact && <span>{playing ? 'Pausar' : label}</span>}
    </button>
  );
}
