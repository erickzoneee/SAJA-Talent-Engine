import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className={`relative w-full ${sizeClasses[size]} max-h-[90dvh] flex flex-col glass rounded-2xl border border-surface-600/20 shadow-2xl`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' as const }}
          >
            <div className="flex items-center justify-between gap-2 pl-4 pr-2 sm:px-5 py-2 sm:py-3 border-b border-surface-600/20 shrink-0">
              <h2 className="text-base font-semibold text-surface-100 min-w-0 break-words">
                {title}
              </h2>
              {/* v2.20: en celular este boton es practicamente la unica salida
                  (no hay tecla Escape y el fondo tocable se reduce al margen). */}
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 active:bg-surface-700/50 transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-3 py-3 sm:px-5 sm:py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
