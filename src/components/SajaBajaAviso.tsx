// v2.18 — Aviso de baja en SAJA
// Talent Engine y el sistema SAJA son dos aplicaciones distintas: dar de baja a
// un colaborador AQUI no desactiva su usuario alla. Este aviso (banner fijo +
// confirmacion obligatoria) es el recordatorio para que RH no lo olvide.
// Se usa en el registro de egreso y al poner el expediente en "Inactivo".

import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export const SAJA_BAJA_MENSAJE = 'Verifica dar de baja su usuario en SAJA';

/** Aviso fijo, siempre visible en la pantalla donde se da la baja. */
export function SajaBajaBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-warning-500/40 bg-warning-500/[0.08] p-4 flex items-start gap-3 ${className}`}
    >
      <AlertTriangle size={20} className="text-warning-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-warning-500">{SAJA_BAJA_MENSAJE}</p>
        <p className="text-xs text-surface-400 mt-1 leading-relaxed">
          Talent Engine no desactiva usuarios en SAJA. Entra a SAJA y da de baja el usuario del
          colaborador para que deje de tener acceso al sistema.
        </p>
      </div>
    </div>
  );
}

interface SajaBajaConfirmModalProps {
  open: boolean;
  employeeName: string;
  /** Texto del boton que confirma y ejecuta la baja. */
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmacion obligatoria antes de dejar al colaborador como inactivo.
 * No se puede cerrar por accidente: solo con Cancelar o confirmando.
 */
export function SajaBajaConfirmModal({
  open,
  employeeName,
  confirmLabel = 'Ya lo verifique, continuar',
  onConfirm,
  onCancel,
}: SajaBajaConfirmModalProps) {
  // Sin AnimatePresence a proposito: es un modal BLOQUEANTE a pantalla completa.
  // Con animacion de salida, cerrar y volver a abrir rapido dejaba el overlay
  // montado con opacidad 0 — invisible pero comiendose todos los clics de la
  // pantalla. Se anima solo la entrada y al cerrar desaparece de inmediato.
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="glass-card w-full max-w-lg p-6"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning-500/15 border border-warning-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert size={24} className="text-warning-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white leading-snug">{SAJA_BAJA_MENSAJE}</h3>
            <p className="text-sm text-surface-300 mt-2 leading-relaxed">
              Vas a dejar como <span className="font-semibold text-white">inactivo</span> a{' '}
              <span className="font-semibold text-white break-words">{employeeName}</span>.
            </p>
            <p className="text-sm text-surface-400 mt-2 leading-relaxed">
              Talent Engine <span className="font-semibold">no</span> desactiva usuarios en SAJA.
              Entra a SAJA y da de baja su usuario para que pierda el acceso.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-danger flex items-center gap-2" onClick={onConfirm}>
            <AlertTriangle size={16} />
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
