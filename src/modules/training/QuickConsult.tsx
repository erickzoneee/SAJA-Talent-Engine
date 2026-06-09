import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, BookOpen, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Proceso } from '../../types/training';
import { useTrainingStore } from '../../store/useTrainingStore';
import { narrativaVisible } from '../../utils/trainingHelpers';
import { TrainingHeader, EmptyState, FullscreenImage } from './shared';
import { fadeUp } from './anims';
import NarrationButton from '../../components/NarrationButton';

export default function QuickConsult({ onBack }: { onBack: () => void }) {
  const procesos = useTrainingStore((s) => s.procesos);
  const [proc, setProc] = useState<Proceso | null>(null);
  const [mpIdx, setMpIdx] = useState(0);
  const [busq, setBusq] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);

  const disponibles = useMemo(
    () =>
      procesos
        .filter((p) => p.estado === 'publicado' || p.estado === 'autorizado')
        .filter(
          (p) =>
            !busq ||
            p.nombre.toLowerCase().includes(busq.toLowerCase()) ||
            p.area.toLowerCase().includes(busq.toLowerCase()) ||
            p.linea.toLowerCase().includes(busq.toLowerCase()),
        ),
    [procesos, busq],
  );

  // Vista de consulta de un proceso
  if (proc) {
    const mp = proc.pasos[mpIdx];
    return (
      <div className="flex flex-col gap-4 overflow-hidden h-full">
        <TrainingHeader
          icon={BookOpen}
          gradient="from-amber-500 to-orange-600"
          title={proc.nombre}
          subtitle={`Paso ${mpIdx + 1} de ${proc.pasos.length}`}
          onBack={() => setProc(null)}
        />

        {/* Navegación rápida entre pasos */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {proc.pasos.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setMpIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                i === mpIdx ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'glass-light text-surface-400 hover:text-surface-200'
              }`}
            >
              {i + 1}. {m.nombre.split(' ').slice(0, 3).join(' ')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {mp && (
            <AnimatePresence mode="wait">
              <motion.div key={mp.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                {mp.fotos.length > 0 && (
                  <div className="glass-card p-2">
                    <img src={mp.fotos[0].url} alt="" onClick={() => setZoom(mp.fotos[0].url)} className="w-full max-h-64 object-contain rounded-xl cursor-zoom-in bg-black/40" />
                  </div>
                )}
                <div className="glass-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-bold text-amber-300">{mp.nombre}</h2>
                    <NarrationButton text={`${mp.nombre}. ${narrativaVisible(mp)}`} compact />
                  </div>
                  <p className="text-lg text-surface-300 leading-relaxed mt-3">{narrativaVisible(mp)}</p>
                  {mp.fotos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
                      {mp.fotos.slice(1).map((f) => (
                        <img key={f.id} src={f.url} alt="" onClick={() => setZoom(f.url)} className="h-20 rounded-lg cursor-zoom-in shrink-0 object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="flex gap-3 shrink-0">
          {mpIdx > 0 && (
            <button onClick={() => setMpIdx((i) => i - 1)} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3">
              <ArrowLeft size={16} /> Anterior
            </button>
          )}
          {mpIdx < proc.pasos.length - 1 ? (
            <button onClick={() => setMpIdx((i) => i + 1)} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
              Siguiente <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={() => setProc(null)} className="btn-success flex-1 flex items-center justify-center gap-2 py-3">
              <Check size={16} /> Listo
            </button>
          )}
        </div>

        <AnimatePresence>{zoom && <FullscreenImage src={zoom} onClose={() => setZoom(null)} />}</AnimatePresence>
      </div>
    );
  }

  // Biblioteca de consulta
  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      <TrainingHeader icon={SearchIcon} gradient="from-amber-500 to-orange-600" title="Consulta rápida" subtitle="Repasa cualquier proceso sin evaluación" onBack={onBack} />
      <div className="relative shrink-0">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        <input value={busq} onChange={(e) => setBusq(e.target.value)} placeholder="Buscar por nombre, área o línea…" className="input-field pl-11" />
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {disponibles.length === 0 ? (
          <EmptyState icon={BookOpen} title="No se encontraron procesos" />
        ) : (
          disponibles.map((p, i) => (
            <motion.button
              key={p.id}
              custom={i}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              onClick={() => {
                setProc(p);
                setMpIdx(0);
              }}
              className="glass-card p-4 w-full text-left flex items-center gap-3 cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-amber-300 truncate">{p.nombre}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="badge badge-green text-[10px]">{p.area}</span>
                  <span className="badge badge-yellow text-[10px]">{p.linea}</span>
                  <span className="text-[11px] text-surface-500 self-center">{p.pasos.length} pasos</span>
                </div>
              </div>
              <ArrowRight size={18} className="text-surface-500 group-hover:text-amber-400 transition-colors shrink-0" />
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}
