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
} from 'lucide-react';
import { createPortal } from 'react-dom';
import type { ProcesoFoto } from '../../types/training';
import { comprimirFoto, rotarFoto90 } from '../../utils/trainingHelpers';
import { fadeUp } from './anims';

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
      <img src={src} alt="" className="max-h-[90vh] max-w-full object-contain rounded-xl" />
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await comprimirFoto(file));
    } finally {
      setBusy(false);
    }
  }

  async function rotate() {
    if (!value) return;
    setBusy(true);
    try {
      onChange(await rotarFoto90(value));
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
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-surface-600/30 bg-black/40">
          <img src={value} alt={label} className="w-full h-full object-contain" />
        </div>
      ) : (
        <div className="w-full aspect-video rounded-xl border-2 border-dashed border-surface-600/40 flex flex-col items-center justify-center text-surface-500">
          <Camera size={28} />
          <span className="text-xs mt-2">Sin foto</span>
        </div>
      )}
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
  const [zoom, setZoom] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const nuevas: ProcesoFoto[] = [];
      for (const f of Array.from(files)) {
        if (fotos.length + nuevas.length >= MAX_FOTOS) break;
        const url = await comprimirFoto(f);
        nuevas.push({ id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, url, desc: '' });
      }
      onChange([...fotos, ...nuevas]);
    } finally {
      setBusy(false);
    }
  }

  async function rotate(i: number) {
    setBusy(true);
    try {
      const url = await rotarFoto90(fotos[i].url);
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

      {fotos.map((f, i) => (
        <div
          key={f.id}
          className="flex gap-3 bg-surface-800/30 border border-surface-700/30 rounded-xl p-3 items-start"
        >
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-black/40 shrink-0">
            <img src={f.url} alt="" className="w-full h-full object-cover" />
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
