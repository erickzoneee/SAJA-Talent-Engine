import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  ImageUp,
  RotateCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  Maximize2,
  X,
  AlertTriangle,
  Loader2,
  Video,
  Upload,
  ImageOff,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import type { ProcesoFoto } from '../../types/training';
import { storeMediaFile, rotateStoredMedia } from '../../utils/mediaStore';
import MediaImage, { MediaVideo } from '../../components/MediaImage';
import { fadeUp } from './anims';

// Las fotos de capacitacion se guardan en Supabase Storage (ruta "sb:...") para
// que viajen en la sincronizacion y se vean en TODOS los dispositivos. Antes
// eran base64, que el sync elimina → no aparecian en la tablet del trabajador.
const TRAINING_MEDIA_FOLDER = 'capacitacion';

// ── Encabezado de sub-vista con botón de regreso ─────────────────────────────

interface TrainingHeaderProps {
  icon: React.ElementType;
  gradient: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function TrainingHeader({
  icon: Icon,
  gradient,
  title,
  subtitle,
  onBack,
  right,
}: TrainingHeaderProps) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      {onBack && (
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-surface-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-surface-100 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-surface-400 truncate">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ── Estado vacío ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
}) {
  return (
    <motion.div {...fadeUp} className="glass-card p-12 text-center">
      <Icon size={48} className="mx-auto text-surface-500 mb-4" />
      <p className="text-surface-300 text-lg">{title}</p>
      {hint && <p className="text-surface-500 text-sm mt-1">{hint}</p>}
    </motion.div>
  );
}

// ── Diálogo de confirmación ──────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            className="relative w-full max-w-md glass rounded-2xl border border-surface-600/20 shadow-2xl p-6"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' as const }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  danger ? 'bg-danger-500/15 text-danger-500' : 'bg-primary-500/15 text-primary-400'
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-100">{title}</h3>
                <p className="text-sm text-surface-400 mt-1 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="btn-secondary text-sm">
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className={`${danger ? 'btn-danger' : 'btn-primary'} text-sm`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Visor de imagen a pantalla completa ──────────────────────────────────────

export function FullscreenImage({ src, onClose }: { src: string; onClose: () => void }) {
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-xl glass-light flex items-center justify-center text-white hover:bg-white/10"
      >
        <X size={20} />
      </button>
      <MediaImage value={src} alt="" className="max-h-[90vh] max-w-full object-contain rounded-xl" />
    </motion.div>,
    document.body,
  );
}

// ── Selector de una sola foto (portada) ──────────────────────────────────────

export function SinglePhotoPicker({
  value,
  onChange,
  label,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // v2.19 — visor a pantalla completa de la foto de portada
  const [zoom, setZoom] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await storeMediaFile(file, TRAINING_MEDIA_FOLDER, 'portada'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la foto.');
    } finally {
      setBusy(false);
    }
  }

  async function rotate() {
    if (!value) return;
    setBusy(true);
    try {
      onChange(await rotateStoredMedia(value, TRAINING_MEDIA_FOLDER, 'portada'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card p-4 flex flex-col items-center gap-3">
      <span className="text-xs font-medium text-surface-400 uppercase tracking-wider self-start">
        {label}
      </span>
      {value ? (
        <button
          type="button"
          onClick={() => setZoom(true)}
          title="Ver la imagen más grande"
          className="relative w-full aspect-video rounded-xl overflow-hidden border border-surface-600/30 bg-black/40 cursor-zoom-in group"
        >
          <MediaImage
            value={value}
            alt={label}
            className="w-full h-full object-contain"
            fallback={<span className="text-xs text-surface-500">Cargando…</span>}
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[11px] text-white opacity-80 group-hover:opacity-100">
            <Maximize2 size={12} /> Ver grande
          </span>
        </button>
      ) : (
        <div className="w-full aspect-video rounded-xl border-2 border-dashed border-surface-600/40 flex flex-col items-center justify-center text-surface-500">
          <Camera size={28} />
          <span className="text-xs mt-2">Sin foto</span>
        </div>
      )}
      {busy && (
        <span className="text-xs text-surface-400 flex items-center gap-1.5">
          <Loader2 size={13} className="animate-spin" /> Guardando foto…
        </span>
      )}
      {error && <span className="text-xs text-danger-400 text-center">{error}</span>}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          className="btn-primary text-xs flex items-center gap-1.5"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
        >
          <Camera size={14} /> Tomar foto
        </button>
        <button
          type="button"
          className="btn-secondary text-xs flex items-center gap-1.5"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
        >
          <ImageUp size={14} /> Galería
        </button>
        {value && (
          <>
            <button
              type="button"
              className="btn-secondary text-xs flex items-center gap-1.5"
              onClick={() => setZoom(true)}
              disabled={busy}
            >
              <Maximize2 size={14} /> Ver grande
            </button>
            <button
              type="button"
              className="btn-secondary text-xs flex items-center gap-1.5"
              onClick={rotate}
              disabled={busy}
            >
              <RotateCw size={14} /> Rotar
            </button>
            <button
              type="button"
              className="btn-secondary text-xs flex items-center gap-1.5"
              onClick={() => onChange(undefined)}
              disabled={busy}
            >
              <Trash2 size={14} /> Quitar
            </button>
          </>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <AnimatePresence>
        {zoom && value && <FullscreenImage src={value} onClose={() => setZoom(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Selector de video (portada del proceso / paso) ───────────────────────────
// v2.19 — El video vive en Supabase Storage igual que las fotos; aqui solo se
// guarda la ruta "sb:...". Es opcional: si no hay video, no se muestra nada al
// trabajador.

export function VideoPicker({
  value,
  onChange,
  label,
  hint,
  compact,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  label: string;
  hint?: string;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    // Se toma el archivo ANTES de limpiar el input: al asignar value='' el
    // navegador vacia la lista de archivos.
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await storeMediaFile(file, TRAINING_MEDIA_FOLDER, 'video'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el video.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? '' : 'glass-card p-4'}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-surface-300 flex items-center gap-1.5">
          <Video size={15} className="text-emerald-400" /> {label}
        </span>
        {value && !busy && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-surface-400 hover:text-danger-500 cursor-pointer flex items-center gap-1"
          >
            <Trash2 size={13} /> Quitar
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-surface-500 mb-2">{hint}</p>}

      {value ? (
        <MediaVideo value={value} className="w-full max-h-64 rounded-xl bg-black/50" />
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex-1 border-2 border-dashed border-surface-600/40 rounded-xl py-3 flex items-center justify-center gap-2 text-surface-400 hover:text-surface-200 hover:border-surface-500/60 transition-all text-sm disabled:opacity-50"
          >
            <Upload size={16} /> Subir video
          </button>
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            disabled={busy}
            className="flex-1 border-2 border-dashed border-surface-600/40 rounded-xl py-3 flex items-center justify-center gap-2 text-surface-400 hover:text-surface-200 hover:border-surface-500/60 transition-all text-sm disabled:opacity-50"
          >
            <Video size={16} /> Grabar video
          </button>
        </div>
      )}

      {busy && (
        <p className="text-xs text-surface-400 flex items-center gap-1.5 mt-2">
          <Loader2 size={13} className="animate-spin" /> Subiendo video… puede tardar según tu conexión.
        </p>
      )}
      {error && <p className="text-xs text-danger-400 mt-2 leading-relaxed">{error}</p>}
      {!value && !busy && !error && (
        <p className="text-[11px] text-surface-500 mt-2">
          Opcional · máx 50 MB · se guarda en la nube para verse en todos los dispositivos.
        </p>
      )}

      <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />
      <input ref={camRef} type="file" accept="video/*" capture="environment" onChange={handleFile} className="hidden" />
    </div>
  );
}

// ── Gestor de múltiples fotos por paso (spec 4.4.4) ──────────────────────────

const MAX_FOTOS = 5;

export function PhotoManager({
  fotos,
  onChange,
}: {
  fotos: ProcesoFoto[];
  onChange: (fotos: ProcesoFoto[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    // v2.19 BUGFIX: `e.target.files` es una lista VIVA del input. Al hacer
    // `e.target.value = ''` (para poder volver a elegir la misma foto) esa
    // lista se vacia, asi que hay que COPIARLA antes. Sin la copia la funcion
    // salia por `length === 0` y la foto elegida nunca aparecia — sin foto y
    // sin error, que es justo lo que se reportaba en los pasos.
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const nuevas: ProcesoFoto[] = [];
    try {
      for (const f of files) {
        if (fotos.length + nuevas.length >= MAX_FOTOS) {
          setError(`Solo caben ${MAX_FOTOS} fotos por paso: no se agregaron las demás.`);
          break;
        }
        const url = await storeMediaFile(f, TRAINING_MEDIA_FOLDER, 'paso');
        nuevas.push({ id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, url, desc: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la foto.');
    } finally {
      // Si una foto falla a la mitad, las que SI se guardaron no se pierden.
      if (nuevas.length > 0) onChange([...fotos, ...nuevas]);
      setBusy(false);
    }
  }

  async function rotate(i: number) {
    setBusy(true);
    try {
      const url = await rotateStoredMedia(fotos[i].url, TRAINING_MEDIA_FOLDER, 'paso');
      onChange(fotos.map((f, j) => (j === i ? { ...f, url } : f)));
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= fotos.length) return;
    const arr = [...fotos];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  }

  const full = fotos.length >= MAX_FOTOS;

  return (
    <div className="space-y-3">
      {!full && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="flex-1 border-2 border-dashed border-surface-600/40 rounded-xl py-3 flex items-center justify-center gap-2 text-surface-400 hover:text-surface-200 hover:border-surface-500/60 transition-all text-sm"
          >
            <Camera size={16} /> Tomar foto
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={busy}
            className="flex-1 border-2 border-dashed border-surface-600/40 rounded-xl py-3 flex items-center justify-center gap-2 text-surface-400 hover:text-surface-200 hover:border-surface-500/60 transition-all text-sm"
          >
            <ImageUp size={16} /> Desde galería
          </button>
        </div>
      )}
      <p className="text-[11px] text-surface-500">
        La primera foto es la portada del paso. Máx {MAX_FOTOS} fotos · se comprimen automáticamente.
      </p>

      {busy && (
        <p className="text-xs text-surface-400 flex items-center gap-1.5">
          <Loader2 size={13} className="animate-spin" /> Guardando foto…
        </p>
      )}
      {error && <p className="text-xs text-danger-400 leading-relaxed">{error}</p>}

      {fotos.map((f, i) => (
        <div
          key={f.id}
          className="flex gap-3 bg-surface-800/30 border border-surface-700/30 rounded-xl p-3 items-start"
        >
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-black/40 shrink-0">
            <MediaImage
              value={f.url}
              alt=""
              className="w-full h-full object-cover"
              fallback={<ImageOff size={18} className="text-surface-600" />}
            />
            {i === 0 && (
              <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary-500 text-white px-1.5 py-0.5 rounded">
                Portada
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={f.desc}
              placeholder="¿Qué muestra esta foto?"
              onChange={(e) =>
                onChange(fotos.map((ff, j) => (j === i ? { ...ff, desc: e.target.value } : ff)))
              }
              className="input-field text-xs py-1.5"
            />
            <div className="flex items-center gap-1 mt-2">
              <IconBtn title="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                <ChevronUp size={15} />
              </IconBtn>
              <IconBtn title="Bajar" disabled={i === fotos.length - 1} onClick={() => move(i, 1)}>
                <ChevronDown size={15} />
              </IconBtn>
              <IconBtn title="Rotar" onClick={() => rotate(i)} disabled={busy}>
                <RotateCw size={15} />
              </IconBtn>
              <IconBtn title="Ver" onClick={() => setZoom(f.url)}>
                <Maximize2 size={15} />
              </IconBtn>
              <IconBtn
                title="Eliminar"
                danger
                onClick={() => onChange(fotos.filter((_, j) => j !== i))}
              >
                <Trash2 size={15} />
              </IconBtn>
            </div>
          </div>
        </div>
      ))}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFiles} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      <AnimatePresence>{zoom && <FullscreenImage src={zoom} onClose={() => setZoom(null)} />}</AnimatePresence>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
        disabled
          ? 'text-surface-700 cursor-not-allowed'
          : danger
            ? 'text-surface-400 hover:text-danger-500 hover:bg-danger-500/10 cursor-pointer'
            : 'text-surface-400 hover:text-white hover:bg-white/10 cursor-pointer'
      }`}
    >
      {children}
    </button>
  );
}
