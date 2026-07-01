import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Play, Pause, RotateCcw, Captions, Video, Volume2 } from 'lucide-react';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reproductor de VIDEO REAL (v2.1)
// Reproduce un video real cuando hay una URL configurada (archivo MP4/webm,
// YouTube o Vimeo). Si no hay URL, los modulos usan su reproductor de
// demostracion animado. Para archivos se detecta el fin real (evento
// 'ended') como evidencia de visualizacion; para embeds (YouTube/Vimeo) no
// es posible detectar el fin, asi que se ofrece confirmacion manual.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type VideoSource =
  | { kind: 'file'; src: string }
  | { kind: 'youtube'; id: string; src: string }
  | { kind: 'vimeo'; id: string; src: string };

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

/** Convierte una URL pegada por el admin en una fuente reproducible, o null si esta vacia. */
export function parseVideoSource(url?: string | null): VideoSource | null {
  const u = (url ?? '').trim();
  if (!u) return null;

  const yt = u.match(YOUTUBE_RE);
  if (yt) return { kind: 'youtube', id: yt[1], src: u };

  const vm = u.match(VIMEO_RE);
  if (vm) return { kind: 'vimeo', id: vm[1], src: u };

  // Cualquier otra URL http(s) se trata como archivo de video directo (MP4/webm/mov/m3u8).
  if (/^https?:\/\//i.test(u)) return { kind: 'file', src: u };

  return null;
}

/** true si la fuente es un archivo directo (permite detectar el fin de forma automatica). */
export function isTrackableSource(source: VideoSource | null): boolean {
  return source?.kind === 'file';
}

interface RealVideoPlayerProps {
  source: VideoSource;
  title: string;
  /** Se llama cuando el video termina (archivo) o el usuario confirma (embed). */
  onEnded: () => void;
  /** Progreso 0..1 para archivos (opcional). */
  onProgress?: (fraction: number) => void;
  /** Si ya se marco como completo (oculta la confirmacion manual del embed). */
  complete?: boolean;
}

export function RealVideoPlayer({
  source,
  title,
  onEnded,
  onProgress,
  complete,
}: RealVideoPlayerProps) {
  const endedRef = useRef(false);

  if (source.kind === 'file') {
    return (
      <video
        src={source.src}
        controls
        playsInline
        controlsList="nodownload"
        className="w-full h-full object-contain bg-black"
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration > 0) onProgress?.(el.currentTime / el.duration);
        }}
        onEnded={() => {
          if (endedRef.current) return;
          endedRef.current = true;
          onEnded();
        }}
      />
    );
  }

  // YouTube / Vimeo → embed. No se puede detectar el fin de forma fiable,
  // asi que se ofrece confirmacion manual de visualizacion.
  const embedSrc =
    source.kind === 'youtube'
      ? `https://www.youtube.com/embed/${source.id}?rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${source.id}`;

  return (
    <div className="relative w-full h-full bg-black">
      <iframe
        src={embedSrc}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {!complete && (
        <button
          onClick={onEnded}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 text-white text-xs font-medium transition-colors"
        >
          <CheckCircle size={14} className="text-success-500" />
          Ya termine de ver el video
        </button>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Reproductor NARRADO (v2.1) — audio TTS en espanol + laminas y subtitulos
// sincronizados. Es la opcion economica y de guion exacto: la narracion se
// genera con voz sintetica y los subtitulos avanzan con el audio. Registra
// evidencia de visualizacion completa cuando el audio termina.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NarrationCaption {
  titulo: string;
  texto: string;
}

interface NarratedVideoPlayerProps {
  audioUrl: string;
  captions: NarrationCaption[];
  title: string;
  onEnded: () => void;
  onProgress?: (fraction: number) => void;
  complete?: boolean;
  /** Clip de video (mudo, en bucle) que se reproduce de fondo detras de la narracion. */
  backgroundVideoUrl?: string;
}

const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export function NarratedVideoPlayer({
  audioUrl,
  captions,
  title,
  onEnded,
  onProgress,
  complete,
  backgroundVideoUrl,
}: NarratedVideoPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const endedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const fraction = dur > 0 ? Math.min(cur / dur, 1) : 0;
  const captionIdx =
    captions.length > 0
      ? Math.min(Math.floor(fraction * captions.length), captions.length - 1)
      : 0;
  const caption = captions[captionIdx] ?? { titulo: title, texto: '' };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const restart = () => {
    const a = audioRef.current;
    if (!a) return;
    endedRef.current = false;
    a.currentTime = 0;
    void a.play();
    setPlaying(true);
  };

  return (
    <>
      <div className="aspect-video bg-gradient-to-br from-surface-950 via-primary-950 to-surface-950 relative flex flex-col items-center justify-center overflow-hidden">
        {backgroundVideoUrl && (
          <>
            <video
              src={backgroundVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Scrim para legibilidad de titulo y subtitulos */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={captionIdx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 text-center px-10"
          >
            {!backgroundVideoUrl && (
              <Video size={40} className="text-primary-400 mx-auto mb-4 opacity-60" />
            )}
            <h2 className="text-xl font-bold text-white mb-2 drop-shadow-lg">{caption.titulo}</h2>
          </motion.div>
        </AnimatePresence>

        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 rounded-lg px-2 py-1">
          <Volume2 size={12} className="text-primary-300" />
          <span className="text-[10px] text-primary-200 font-medium">Narracion</span>
        </div>

        {/* Subtitulos — activados siempre */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black/70 rounded-lg px-4 py-2 flex items-start gap-2">
            <Captions size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-white leading-snug">{caption.texto}</p>
          </div>
        </div>

        {complete && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
            <CheckCircle size={48} className="text-success-500 mb-2" />
            <p className="text-surface-100 font-semibold">Video completo</p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors text-surface-200 disabled:opacity-50"
            onClick={toggle}
            disabled={complete}
          >
            {playing && !complete ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors text-surface-200"
            onClick={restart}
          >
            <RotateCcw size={16} />
          </button>
          <span className="text-xs font-mono text-surface-400">
            {fmtTime(cur)} / {fmtTime(dur)}
          </span>
          <span className="ml-auto text-[11px] text-surface-500">
            Narracion en espanol · subtitulos activados
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCur(a.currentTime);
          if (a.duration > 0) onProgress?.(a.currentTime / a.duration);
        }}
        onEnded={() => {
          if (endedRef.current) return;
          endedRef.current = true;
          setPlaying(false);
          onEnded();
        }}
      />
    </>
  );
}
