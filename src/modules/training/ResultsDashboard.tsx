import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Search,
  Users,
  CheckCircle2,
  BookOpen,
  Clock,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useTrainingStore } from '../../store/useTrainingStore';
import { calificar, exportarRegistrosCSV, formatDuracion } from '../../utils/trainingHelpers';
import { TrainingHeader } from './shared';
import { fadeUp, listItem } from './anims';

type Tab = 'general' | 'trabajadores' | 'procesos' | 'alertas';

export default function ResultsDashboard({ isAdmin, onBack }: { isAdmin: boolean; onBack: () => void }) {
  const { procesos, registros } = useTrainingStore();
  const [tab, setTab] = useState<Tab>('general');
  const [busq, setBusq] = useState('');

  const publicados = procesos.filter((p) => p.estado === 'publicado' || p.estado === 'autorizado');
  const aprobados = registros.filter((r) => r.pasa);
  const tasa = registros.length ? Math.round((aprobados.length / registros.length) * 100) : 0;
  const uniqTrabs = new Set(registros.map((r) => r.empleadoNumero)).size;
  const alertas = registros.filter((r) => r.alertaMuyRapido);

  const recientes = useMemo(() => [...registros].reverse().slice(0, 10), [registros]);

  const porTrab = useMemo(() => {
    const map = new Map<string, { nombre: string; numero: string; regs: typeof registros }>();
    for (const r of registros) {
      const cur = map.get(r.empleadoNumero) ?? { nombre: r.empleadoNombre, numero: r.empleadoNumero, regs: [] };
      cur.regs.push(r);
      map.set(r.empleadoNumero, cur);
    }
    return [...map.values()].filter((t) => !busq || t.nombre.toLowerCase().includes(busq.toLowerCase()));
  }, [registros, busq]);

  const porProc = useMemo(
    () =>
      publicados.map((p) => {
        const pr = registros.filter((r) => r.procesoId === p.id);
        const ap = pr.filter((r) => r.pasa);
        const prom = pr.length ? Math.round(pr.reduce((s, r) => s + r.porcentaje, 0) / pr.length) : 0;
        const tProm = pr.length ? Math.round(pr.reduce((s, r) => s + r.tiempoTotalSeg, 0) / pr.length) : 0;
        return { proc: p, total: pr.length, aprob: ap.length, prom, tProm };
      }),
    [publicados, registros],
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: 'Resumen' },
    { key: 'trabajadores', label: 'Trabajadores' },
    { key: 'procesos', label: 'Procesos' },
    { key: 'alertas', label: `Alertas${alertas.length ? ` (${alertas.length})` : ''}` },
  ];

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      <TrainingHeader
        icon={BarChart3}
        gradient="from-fuchsia-500 to-purple-600"
        title="Resultados"
        subtitle="Panel de capacitación"
        onBack={onBack}
        right={
          isAdmin && registros.length > 0 ? (
            <button onClick={() => exportarRegistrosCSV(registros)} className="btn-secondary text-sm flex items-center gap-1.5">
              <Download size={15} /> Exportar CSV
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              tab === t.key ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40' : 'glass-light text-surface-400 hover:text-surface-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* RESUMEN */}
        {tab === 'general' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric icon={BookOpen} value={registros.length} label="Capacitaciones" color="text-fuchsia-400" />
              <Metric icon={Users} value={uniqTrabs} label="Trabajadores" color="text-blue-400" />
              <Metric icon={CheckCircle2} value={publicados.length} label="Procesos activos" color="text-emerald-400" />
              <Metric icon={Zap} value={registros.length ? `${tasa}%` : '—'} label="Tasa aprobación" color="text-amber-400" />
            </div>

            <motion.div {...fadeUp} className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-200 mb-3">Últimas capacitaciones</h3>
              {recientes.length === 0 ? (
                <p className="text-sm text-surface-500 py-4 text-center">Aún no hay registros.</p>
              ) : (
                <div className="space-y-1">
                  {recientes.map((r) => {
                    const cal = calificar(r.porcentaje);
                    return (
                      <div key={r.id} className="flex items-center gap-3 py-2 border-b border-surface-700/30 last:border-0">
                        <span className={`badge ${cal.badge} text-[11px] shrink-0`}>{r.porcentaje}%</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-surface-200 truncate">{r.empleadoNombre}</p>
                          <p className="text-xs text-surface-500 truncate">{r.procesoNombre}</p>
                        </div>
                        {r.alertaMuyRapido && <TriangleAlert size={14} className="text-amber-400 shrink-0" />}
                        <span className="text-[11px] text-surface-500 shrink-0">{new Date(r.finAt).toLocaleDateString('es-MX')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* TRABAJADORES */}
        {tab === 'trabajadores' && (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
              <input value={busq} onChange={(e) => setBusq(e.target.value)} placeholder="Buscar trabajador…" className="input-field pl-11" />
            </div>
            {porTrab.length === 0 ? (
              <p className="text-center text-surface-500 text-sm py-8">No se encontraron trabajadores.</p>
            ) : (
              porTrab.map((t, i) => {
                const ap = t.regs.filter((r) => r.pasa).length;
                return (
                  <motion.div key={t.numero} custom={i} variants={listItem} initial="initial" animate="animate" className="glass-card p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-surface-100 truncate">{t.nombre}</p>
                        <p className="text-xs text-surface-500">Emp. {t.numero}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <span className="badge badge-green text-[11px]">{ap} ✅</span>
                        <span className="badge badge-blue text-[11px]">{t.regs.length} total</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {t.regs.slice(-3).reverse().map((r) => {
                        const cal = calificar(r.porcentaje);
                        return (
                          <div key={r.id} className="flex items-center gap-2 py-1.5 border-t border-surface-700/30 text-xs">
                            <span className={`badge ${cal.badge} text-[10px] shrink-0`}>{r.porcentaje}%</span>
                            <span className="text-surface-300 flex-1 truncate">{r.procesoNombre}</span>
                            <span className="text-surface-500 shrink-0">{new Date(r.finAt).toLocaleDateString('es-MX')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}

        {/* PROCESOS */}
        {tab === 'procesos' && (
          porProc.length === 0 ? (
            <p className="text-center text-surface-500 text-sm py-8">No hay procesos publicados aún.</p>
          ) : (
            porProc.map((x, i) => (
              <motion.div key={x.proc.id} custom={i} variants={listItem} initial="initial" animate="animate" className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-surface-100">{x.proc.nombre}</h3>
                  <span className="badge badge-green text-[10px]">{x.proc.area}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <Mini label="Capacitaciones" value={x.total} />
                  <Mini label="Aprobaron" value={x.aprob} color="text-emerald-400" />
                  <Mini label="Promedio" value={x.total ? `${x.prom}%` : '—'} color="text-blue-400" />
                  <Mini label="Tiempo prom." value={x.total ? formatDuracion(x.tProm) : '—'} color="text-amber-400" />
                </div>
                {x.total > 0 && x.prom < 60 && (
                  <p className="text-[11px] text-amber-400/90 mt-2 flex items-center gap-1">
                    <TriangleAlert size={11} /> Tasa baja: este proceso podría necesitar mejorarse.
                  </p>
                )}
              </motion.div>
            ))
          )
        )}

        {/* ALERTAS */}
        {tab === 'alertas' && (
          <>
            <div className="glass-card p-4 flex items-start gap-3">
              <Clock size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-surface-400">
                Evaluaciones completadas en menos de {formatDuracion(90)} se marcan como sospechosamente rápidas:
                puede indicar que el trabajador no leyó las preguntas.
              </p>
            </div>
            {alertas.length === 0 ? (
              <p className="text-center text-surface-500 text-sm py-8">Sin alertas. ¡Todo en orden!</p>
            ) : (
              alertas
                .slice()
                .reverse()
                .map((r, i) => (
                  <motion.div key={r.id} custom={i} variants={listItem} initial="initial" animate="animate" className="glass-card p-4 flex items-center gap-3 border-amber-500/20">
                    <TriangleAlert size={18} className="text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-200 truncate">{r.empleadoNombre}</p>
                      <p className="text-xs text-surface-500 truncate">{r.procesoNombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="badge badge-yellow text-[10px]">{formatDuracion(r.tiempoEvaluacionSeg)}</span>
                      <p className="text-[11px] text-surface-500 mt-1">{r.porcentaje}%</p>
                    </div>
                  </motion.div>
                ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label, color }: { icon: React.ElementType; value: number | string; label: string; color: string }) {
  return (
    <motion.div {...fadeUp} className="glass-card p-4 text-center">
      <Icon size={20} className={`mx-auto mb-1.5 ${color}`} />
      <div className="text-2xl font-bold text-surface-100">{value}</div>
      <div className="text-xs text-surface-500 mt-0.5">{label}</div>
    </motion.div>
  );
}

function Mini({ label, value, color = 'text-surface-200' }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-surface-800/30 border border-surface-700/30 rounded-lg py-2">
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-surface-500">{label}</div>
    </div>
  );
}
