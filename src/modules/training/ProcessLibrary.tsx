import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Search,
  SquarePen,
  Lock,
  Archive,
  ShieldCheck,
  Send,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import type { Proceso, ProcesoEstado } from '../../types/training';
import { ESTADO_META } from '../../types/training';
import { useTrainingStore } from '../../store/useTrainingStore';
import { TrainingHeader, EmptyState, ConfirmDialog } from './shared';
import { listItem } from './anims';
import Modal from '../../components/Modal';

interface ProcessLibraryProps {
  isAdmin: boolean;
  creadoPor: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onNew: () => void;
}

const FILTROS: { key: ProcesoEstado | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'borrador', label: 'Borradores' },
  { key: 'publicado', label: 'Publicados' },
  { key: 'autorizado', label: 'Autorizados' },
  { key: 'archivado', label: 'Archivados' },
];

export default function ProcessLibrary({ isAdmin, creadoPor, onBack, onEdit, onNew }: ProcessLibraryProps) {
  const { procesos, publicarProceso, autorizarProceso, archivarProceso, marcarListoParaAutorizar, crearNuevaVersion } =
    useTrainingStore();
  const [busq, setBusq] = useState('');
  const [filtro, setFiltro] = useState<ProcesoEstado | 'todos'>('todos');
  const [versionDe, setVersionDe] = useState<Proceso | null>(null);
  const [motivo, setMotivo] = useState('');
  const [confirmAuth, setConfirmAuth] = useState<Proceso | null>(null);
  const [confirmArch, setConfirmArch] = useState<Proceso | null>(null);

  const lista = useMemo(() => {
    return procesos
      .filter((p) => filtro === 'todos' || p.estado === filtro)
      .filter((p) => !busq || p.nombre.toLowerCase().includes(busq.toLowerCase()) || p.area.toLowerCase().includes(busq.toLowerCase()))
      .sort((a, b) => b.creadoAt.localeCompare(a.creadoAt));
  }, [procesos, filtro, busq]);

  function handleNuevaVersion() {
    if (!versionDe || !motivo.trim()) return;
    const nuevoId = crearNuevaVersion(versionDe.id, motivo.trim(), creadoPor);
    setVersionDe(null);
    setMotivo('');
    if (nuevoId) onEdit(nuevoId);
  }

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      <TrainingHeader
        icon={FolderOpen}
        gradient="from-emerald-500 to-green-600"
        title="Mis procesos"
        subtitle={`${procesos.length} proceso${procesos.length !== 1 ? 's' : ''} en total`}
        onBack={onBack}
        right={
          <button onClick={onNew} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={16} /> Nuevo
          </button>
        }
      />

      <div className="relative shrink-0">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          value={busq}
          onChange={(e) => setBusq(e.target.value)}
          placeholder="Buscar proceso…"
          className="input-field pl-11"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              filtro === f.key
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                : 'glass-light text-surface-400 hover:text-surface-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {lista.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No hay procesos" hint="Crea tu primer proceso de capacitación" />
        ) : (
          lista.map((p, i) => {
            const meta = ESTADO_META[p.estado];
            const editable = p.estado === 'borrador' || p.estado === 'publicado';
            return (
              <motion.div key={p.id} custom={i} variants={listItem} initial="initial" animate="animate" className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-800/60 border border-surface-700/40 flex items-center justify-center overflow-hidden shrink-0">
                    {p.portadaInicio ? (
                      <img src={p.portadaInicio} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-surface-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-surface-100">{p.nombre || 'Sin nombre'}</h3>
                      <span className={`badge ${meta.badge} text-[10px]`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className="text-[11px] text-surface-500">v{p.version}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-surface-400">
                      <span>{p.area}</span>
                      <span>·</span>
                      <span>{p.pasos.length} pasos</span>
                      <span>·</span>
                      <span>{p.preguntas.length} preguntas</span>
                    </div>
                    {p.motivoCambio && (
                      <p className="text-[11px] text-surface-500 mt-1 italic">Cambio: {p.motivoCambio}</p>
                    )}
                    {p.estado === 'autorizado' && p.autorizadoPor && (
                      <p className="text-[11px] text-blue-400/80 mt-1 flex items-center gap-1">
                        <ShieldCheck size={11} /> Autorizado por {p.autorizadoPor}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-700/30">
                  {editable && (
                    <button onClick={() => onEdit(p.id)} className="btn-secondary text-xs flex items-center gap-1.5">
                      <SquarePen size={13} /> Editar
                    </button>
                  )}
                  {p.estado === 'borrador' && (
                    <button onClick={() => publicarProceso(p.id)} className="btn-primary text-xs flex items-center gap-1.5">
                      <Send size={13} /> Publicar
                    </button>
                  )}
                  {p.estado === 'publicado' && !p.listoParaAutorizar && (
                    <button onClick={() => marcarListoParaAutorizar(p.id, true)} className="btn-secondary text-xs flex items-center gap-1.5">
                      <ShieldCheck size={13} /> Marcar listo para autorizar
                    </button>
                  )}
                  {p.estado === 'publicado' && p.listoParaAutorizar && (
                    <span className="badge badge-yellow text-[11px] self-center">Esperando autorización</span>
                  )}
                  {isAdmin && p.estado === 'publicado' && (
                    <button onClick={() => setConfirmAuth(p)} className="btn-success text-xs flex items-center gap-1.5">
                      <Lock size={13} /> Autorizar
                    </button>
                  )}
                  {isAdmin && p.estado === 'autorizado' && (
                    <button onClick={() => setVersionDe(p)} className="btn-secondary text-xs flex items-center gap-1.5">
                      <SquarePen size={13} /> Crear nueva versión
                    </button>
                  )}
                  {isAdmin && p.estado !== 'archivado' && (
                    <button onClick={() => setConfirmArch(p)} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Archive size={13} /> Archivar
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Nueva versión */}
      <Modal
        isOpen={!!versionDe}
        onClose={() => {
          setVersionDe(null);
          setMotivo('');
        }}
        title={`Nueva versión de «${versionDe?.nombre ?? ''}»`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-400 leading-relaxed">
            Los procesos autorizados no se editan directamente. Se creará una nueva versión en estado
            <span className="text-surface-200"> Borrador</span> y la versión actual quedará
            <span className="text-surface-200"> archivada</span>.
          </p>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Motivo del cambio *</label>
            <textarea
              autoFocus
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: Se agregó un paso de inspección de calidad."
              className="input-field resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setVersionDe(null);
                setMotivo('');
              }}
              className="btn-secondary text-sm"
            >
              Cancelar
            </button>
            <button onClick={handleNuevaVersion} disabled={!motivo.trim()} className="btn-primary text-sm">
              Crear versión
            </button>
          </div>
        </div>
      </Modal>

      {/* Autorizar */}
      <ConfirmDialog
        open={!!confirmAuth}
        title={`¿Autorizar «${confirmAuth?.nombre ?? ''}»?`}
        message="Una vez autorizado, el proceso queda bloqueado para edición directa y se marca como versión oficial visible para los trabajadores."
        confirmLabel="Autorizar"
        onCancel={() => setConfirmAuth(null)}
        onConfirm={() => {
          if (confirmAuth) autorizarProceso(confirmAuth.id, creadoPor);
          setConfirmAuth(null);
        }}
      />

      {/* Archivar */}
      <ConfirmDialog
        open={!!confirmArch}
        title={`¿Archivar «${confirmArch?.nombre ?? ''}»?`}
        message="El proceso dejará de estar visible para los trabajadores pero se conserva en el historial."
        confirmLabel="Archivar"
        danger
        onCancel={() => setConfirmArch(null)}
        onConfirm={() => {
          if (confirmArch) archivarProceso(confirmArch.id);
          setConfirmArch(null);
        }}
      />
    </div>
  );
}
