import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Search,
  ArrowLeft,
  ArrowRight,
  Play,
  ClipboardCheck,
  UserCheck,
  ShieldAlert,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import type { Proceso, Pregunta, RespuestaRegistro, RegistroCapacitacion } from '../../types/training';
import { useTrainingStore } from '../../store/useTrainingStore';
import {
  calificar,
  narrativaVisible,
  UMBRAL_RAPIDO_SEG,
  formatDuracion,
} from '../../utils/trainingHelpers';
import { TrainingHeader, EmptyState, FullscreenImage } from './shared';
import { fadeUp, scaleIn, useEmpleados } from './anims';
import NarrationButton from '../../components/NarrationButton';
import MediaImage from '../../components/MediaImage';

type Vista = 'id' | 'lib' | 'portada' | 'present' | 'eval' | 'result' | 'bloqueado';

export default function TrainingFlow({ onBack }: { onBack: () => void }) {
  const { procesos, registros, addRegistro, intentosFallidosHoy } = useTrainingStore();
  const empleados = useEmpleados();

  const [vista, setVista] = useState<Vista>('id');
  const [trab, setTrab] = useState({ nombre: '', numero: '' });
  // Escape hatch: un trabajador que no aparece en la lista (recien contratado,
  // o no registrado aun) puede escribir su nombre a mano.
  const [manual, setManual] = useState(false);
  const [proc, setProc] = useState<Proceso | null>(null);
  const [mpIdx, setMpIdx] = useState(0);
  const [resultado, setResultado] = useState<{ reg: RegistroCapacitacion; bloqueadoTrasEste: boolean } | null>(null);

  // Timestamps de la sesión de capacitación.
  const tInicio = useRef(0);
  const tPresentacion = useRef(0);

  const disponibles = useMemo(
    () => procesos.filter((p) => p.estado === 'publicado' || p.estado === 'autorizado'),
    [procesos],
  );

  function elegirProceso(p: Proceso) {
    const fallidos = intentosFallidosHoy(trab.numero, p.id);
    if (fallidos >= 3) {
      setProc(p);
      setVista('bloqueado');
      return;
    }
    setProc(p);
    setMpIdx(0);
    tInicio.current = Date.now();
    setVista('portada');
  }

  function iniciarPresentacion() {
    tPresentacion.current = Date.now();
    setMpIdx(0);
    setVista('present');
  }

  function terminarEvaluacion(respuestas: RespuestaRegistro[], tEvalSeg: number) {
    if (!proc) return;
    const correctas = respuestas.filter((r) => r.esCorrecta).length;
    const total = respuestas.length;
    const pct = total ? Math.round((correctas / total) * 100) : 0;
    const cal = calificar(pct);
    const finAt = new Date();
    const tTotal = Math.round((finAt.getTime() - tInicio.current) / 1000);
    const tPres = Math.round((Date.now() - tPresentacion.current) / 1000) - tEvalSeg;
    const intentoNum =
      registros.filter((r) => r.empleadoNumero === trab.numero && r.procesoId === proc.id).length + 1;

    const reg: RegistroCapacitacion = {
      id: `rec_${Date.now().toString(36)}`,
      empleadoNombre: trab.nombre,
      empleadoNumero: trab.numero,
      procesoId: proc.id,
      procesoNombre: proc.nombre,
      procesoVersion: proc.version,
      intentoNum,
      inicioAt: new Date(tInicio.current).toISOString(),
      finAt: finAt.toISOString(),
      tiempoTotalSeg: tTotal,
      tiempoPresentacionSeg: Math.max(0, tPres),
      tiempoEvaluacionSeg: tEvalSeg,
      correctas,
      totalPreguntas: total,
      porcentaje: pct,
      calificacion: cal.key,
      pasa: cal.pasa,
      alertaMuyRapido: tEvalSeg < UMBRAL_RAPIDO_SEG,
      respuestas,
    };
    addRegistro(reg);
    // addRegistro actualiza el store de forma sincrona, asi que intentosFallidosHoy
    // ya cuenta ESTE intento fallido. No sumar +1 (doble conteo bloqueaba al 2do fallo).
    const fallidosAhora = intentosFallidosHoy(trab.numero, proc.id);
    setResultado({ reg, bloqueadoTrasEste: !cal.pasa && fallidosAhora >= 3 });
    setVista('result');
  }

  // ── Identificación ──
  if (vista === 'id') {
    const ok = trab.nombre.trim() && trab.numero.trim();
    return (
      <div className="flex flex-col gap-5 h-full">
        <TrainingHeader icon={GraduationCap} gradient="from-blue-500 to-indigo-600" title="Capacitación" subtitle="Identifícate para comenzar" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <motion.div {...scaleIn} className="glass-card p-6 w-full max-w-md">
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3">
                <UserCheck size={30} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-surface-100">¡Hola! Identifícate</h2>
              <p className="text-sm text-surface-400 mt-1">Necesitamos tu nombre y número de empleado para registrar tu capacitación.</p>
            </div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Tu nombre completo</label>
            {empleados.length > 0 && !manual ? (
              <select
                value={trab.numero}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__manual__') {
                    setManual(true);
                    setTrab({ nombre: '', numero: '' });
                    return;
                  }
                  const match = empleados.find((em) => em.numero === v);
                  setTrab((t) => ({ ...t, numero: v, nombre: match ? match.nombre : '' }));
                }}
                className="input-field mb-4 cursor-pointer"
              >
                <option value="">— Selecciona tu nombre —</option>
                {empleados.map((e) => (
                  <option key={e.numero} value={e.numero}>
                    {e.nombre}
                  </option>
                ))}
                <option value="__manual__">Otro — no aparezco en la lista</option>
              </select>
            ) : (
              <>
                <input
                  value={trab.nombre}
                  onChange={(e) => setTrab((t) => ({ ...t, nombre: e.target.value }))}
                  placeholder="Ej: María López García"
                  className="input-field mb-2"
                />
                {empleados.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setManual(false);
                      setTrab({ nombre: '', numero: '' });
                    }}
                    className="text-xs text-primary-400 hover:text-primary-300 mb-4 block"
                  >
                    ← Elegir de la lista
                  </button>
                )}
              </>
            )}
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Número de empleado</label>
            <input
              value={trab.numero}
              onChange={(e) => setTrab((t) => ({ ...t, numero: e.target.value }))}
              placeholder="Ej: EMP-001"
              className="input-field mb-5"
              readOnly={!manual && empleados.some((em) => em.numero === trab.numero)}
            />
            <button onClick={() => setVista('lib')} disabled={!ok} className="btn-primary w-full flex items-center justify-center gap-2">
              Continuar <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Biblioteca ──
  if (vista === 'lib') {
    return (
      <Biblioteca
        nombre={trab.nombre}
        procesos={disponibles}
        onBack={() => setVista('id')}
        onSelect={elegirProceso}
        accent="from-blue-500 to-indigo-600"
      />
    );
  }

  // ── Bloqueado por intentos ──
  if (vista === 'bloqueado' && proc) {
    return (
      <div className="flex flex-col gap-5 h-full">
        <TrainingHeader icon={ShieldAlert} gradient="from-rose-500 to-red-600" title="Límite de intentos" onBack={() => setVista('lib')} />
        <div className="flex-1 flex items-center justify-center">
          <motion.div {...scaleIn} className="glass-card p-8 w-full max-w-md text-center">
            <div className="text-5xl mb-3">🛑</div>
            <h2 className="text-lg font-bold text-surface-100">Has alcanzado el límite de intentos por hoy</h2>
            <p className="text-sm text-surface-400 mt-2">
              Habla con tu supervisor antes de intentar «{proc.nombre}» de nuevo. Él puede desbloquear tus intentos.
            </p>
            <button onClick={() => setVista('lib')} className="btn-secondary mt-6">
              Ver otros procesos
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Portada ──
  if (vista === 'portada' && proc) {
    return (
      <PortadaProceso
        proc={proc}
        onBack={() => setVista('lib')}
        onComenzar={iniciarPresentacion}
      />
    );
  }

  // ── Presentación paso a paso ──
  if (vista === 'present' && proc) {
    return (
      <Presentacion
        proc={proc}
        mpIdx={mpIdx}
        setMpIdx={setMpIdx}
        onBack={() => setVista('portada')}
        onEvaluar={() => setVista('eval')}
      />
    );
  }

  // ── Evaluación ──
  if (vista === 'eval' && proc) {
    return <Evaluacion proc={proc} trabajador={trab} onTerminar={terminarEvaluacion} onBack={() => setVista('present')} />;
  }

  // ── Resultado ──
  if (vista === 'result' && resultado && proc) {
    const cal = calificar(resultado.reg.porcentaje);
    return (
      <div className="flex flex-col gap-5 h-full">
        <TrainingHeader icon={ClipboardCheck} gradient="from-blue-500 to-indigo-600" title="Tu resultado" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center overflow-y-auto">
          <motion.div {...scaleIn} className="glass-card p-8 w-full max-w-lg text-center">
            <div className="text-6xl mb-2">{cal.emoji}</div>
            <h1 className="text-2xl font-bold" style={{ color: cal.color }}>
              {cal.label}
            </h1>
            <div className="text-5xl font-extrabold my-2" style={{ color: cal.color }}>
              {resultado.reg.porcentaje}%
            </div>
            <p className="text-sm text-surface-300">
              {resultado.reg.correctas} de {resultado.reg.totalPreguntas} respuestas correctas
            </p>
            <p className="text-xs text-surface-500 mt-1">
              {trab.nombre} · {proc.nombre} · {formatDuracion(resultado.reg.tiempoTotalSeg)}
            </p>

            <div
              className="rounded-xl p-4 my-5 border text-sm leading-relaxed"
              style={{ background: `${cal.color}15`, borderColor: `${cal.color}40`, color: cal.color }}
            >
              {cal.msg}
            </div>

            {resultado.bloqueadoTrasEste ? (
              <p className="text-sm text-rose-400 mb-4">
                Has alcanzado el límite de intentos por hoy. Habla con tu supervisor.
              </p>
            ) : cal.pasa ? (
              <button onClick={() => { setProc(null); setVista('lib'); }} className="btn-primary w-full">
                Ver más procesos
              </button>
            ) : (
              <button
                onClick={() => { setMpIdx(0); tInicio.current = Date.now(); setVista('portada'); }}
                className="btn-danger w-full flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Volver a ver el proceso
              </button>
            )}
            <button onClick={onBack} className="btn-secondary w-full mt-3">
              Salir
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ BIBLIOTECA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Biblioteca({
  nombre,
  procesos,
  onBack,
  onSelect,
  accent,
}: {
  nombre: string;
  procesos: Proceso[];
  onBack: () => void;
  onSelect: (p: Proceso) => void;
  accent: string;
}) {
  const [busq, setBusq] = useState('');
  const lista = procesos.filter(
    (p) =>
      !busq ||
      p.nombre.toLowerCase().includes(busq.toLowerCase()) ||
      p.area.toLowerCase().includes(busq.toLowerCase()) ||
      p.linea.toLowerCase().includes(busq.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      <TrainingHeader icon={GraduationCap} gradient={accent} title="Elige tu capacitación" subtitle={`Hola, ${nombre}`} onBack={onBack} />
      <div className="relative shrink-0">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        <input value={busq} onChange={(e) => setBusq(e.target.value)} placeholder="Buscar por nombre, área o línea…" className="input-field pl-11" />
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {lista.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Aún no hay procesos disponibles" hint="Pídele a tu supervisor que los publique" />
        ) : (
          lista.map((p, i) => (
            <motion.button
              key={p.id}
              custom={i}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              onClick={() => onSelect(p)}
              className="glass-card p-4 w-full text-left flex items-center gap-4 cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-xl bg-surface-800/60 border border-surface-700/40 overflow-hidden flex items-center justify-center shrink-0">
                {p.portadaInicio ? <MediaImage value={p.portadaInicio} alt="" className="w-full h-full object-cover" /> : <GraduationCap size={22} className="text-surface-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-surface-100 truncate">{p.nombre}</h3>
                  {p.estado === 'autorizado' && (
                    <span className="badge badge-blue text-[10px] flex items-center gap-1">
                      <ShieldCheck size={10} /> Oficial
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="badge badge-green text-[10px]">{p.area}</span>
                  <span className="badge badge-purple text-[10px]">{p.linea}</span>
                  <span className="text-[11px] text-surface-500 self-center">{p.pasos.length} pasos</span>
                </div>
              </div>
              <ArrowRight size={18} className="text-surface-500 group-hover:text-primary-400 transition-colors shrink-0" />
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PORTADA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PortadaProceso({ proc, onBack, onComenzar }: { proc: Proceso; onBack: () => void; onComenzar: () => void }) {
  const catalogs = useTrainingStore((s) => s.catalogs);
  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      <TrainingHeader icon={Play} gradient="from-blue-500 to-indigo-600" title={proc.nombre} subtitle="Antes de empezar, observa el objetivo" onBack={onBack} />
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        <motion.div {...fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PortadaFoto titulo="Así empezamos" src={proc.portadaInicio} />
          <PortadaFoto titulo="Así debe quedar" src={proc.portadaResultado} />
        </motion.div>

        <motion.div {...fadeUp} className="glass-card p-5">
          <h3 className="text-base font-bold text-surface-100 mb-1">Objetivo</h3>
          <p className="text-base text-surface-300 leading-relaxed">{proc.objetivo}</p>
          {proc.portadaNarracion?.trim() && (
            <div className="mt-3 flex items-center gap-3">
              <NarrationButton text={proc.portadaNarracion} label="Escuchar introducción" />
            </div>
          )}
        </motion.div>

        {proc.epp.length > 0 && (
          <motion.div {...fadeUp} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-300 mb-3">🦺 Equipo de protección que debes usar</h3>
            <div className="flex flex-wrap gap-2">
              {proc.epp.map((nombre) => {
                const item = catalogs.epp.find((e) => e.nombre === nombre);
                return (
                  <span key={nombre} className="inline-flex items-center gap-1.5 bg-surface-800/50 border border-surface-700/40 rounded-lg px-3 py-1.5 text-sm text-surface-200">
                    {item?.icono && <span className="text-base">{item.icono}</span>}
                    {nombre}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      <div className="shrink-0">
        <button onClick={onComenzar} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5">
          <Play size={18} /> Comenzar capacitación
        </button>
      </div>
    </div>
  );
}

function PortadaFoto({ titulo, src }: { titulo: string; src?: string }) {
  return (
    <div className="glass-card p-3">
      <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">{titulo}</p>
      <div className="aspect-video rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
        {src ? <MediaImage value={src} alt={titulo} className="w-full h-full object-contain" /> : <span className="text-surface-600 text-sm">Sin foto</span>}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PRESENTACIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Presentacion({
  proc,
  mpIdx,
  setMpIdx,
  onBack,
  onEvaluar,
}: {
  proc: Proceso;
  mpIdx: number;
  setMpIdx: (fn: number | ((i: number) => number)) => void;
  onBack: () => void;
  onEvaluar: () => void;
}) {
  const mp = proc.pasos[mpIdx];
  const total = proc.pasos.length;
  const esUlt = mpIdx === total - 1;
  const [zoom, setZoom] = useState<string | null>(null);
  // Proceso publicado sin pasos: en vez de dejar una pantalla en blanco sin
  // salida, mostrar un aviso navegable (volver o ir directo a la evaluación).
  if (!mp) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <TrainingHeader icon={Play} gradient="from-blue-500 to-indigo-600" title={proc.nombre} subtitle="Sin pasos" onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <EmptyState icon={ShieldAlert} title="Este proceso todavía no tiene pasos" hint="Pídele a tu supervisor que agregue los pasos del proceso" />
          <div className="flex gap-3">
            <button onClick={onBack} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} /> Volver
            </button>
            <button onClick={onEvaluar} className="btn-primary flex items-center gap-2">
              <ClipboardCheck size={16} /> Ir a la evaluación
            </button>
          </div>
        </div>
      </div>
    );
  }
  const texto = narrativaVisible(mp);

  return (
    <div className="flex flex-col gap-4 overflow-hidden h-full">
      <TrainingHeader icon={Play} gradient="from-blue-500 to-indigo-600" title={proc.nombre} subtitle={`Paso ${mpIdx + 1} de ${total}`} onBack={onBack} />

      {/* Progreso */}
      <div className="h-1.5 bg-surface-800/60 rounded-full overflow-hidden shrink-0">
        <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" animate={{ width: `${((mpIdx + 1) / total) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          <motion.div key={mp.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-4">
            {mp.fotos.length > 0 && (
              <div className="glass-card p-2">
                <MediaImage value={mp.fotos[0].url} alt="" onClick={() => setZoom(mp.fotos[0].url)} className="w-full max-h-72 object-contain rounded-xl cursor-zoom-in bg-black/40" />
                {mp.fotos[0].desc && <p className="text-xs text-surface-400 text-center mt-2">{mp.fotos[0].desc}</p>}
              </div>
            )}
            <div className="glass-card p-5">
              <span className="inline-flex items-center bg-blue-500/20 text-blue-300 rounded-full px-3 py-1 text-sm font-semibold mb-3">
                Paso {mpIdx + 1}
              </span>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-surface-100">{mp.nombre}</h2>
                <NarrationButton text={`${mp.nombre}. ${texto}`} compact />
              </div>
              <p className="text-lg text-surface-300 leading-relaxed mt-3">{texto}</p>

              {mp.fotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
                  {mp.fotos.slice(1).map((f) => (
                    <MediaImage key={f.id} value={f.url} alt="" onClick={() => setZoom(f.url)} className="h-20 rounded-lg cursor-zoom-in shrink-0 object-cover" />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 shrink-0">
        {mpIdx > 0 && (
          <button onClick={() => setMpIdx((i) => i - 1)} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3">
            <ArrowLeft size={16} /> Anterior
          </button>
        )}
        {esUlt ? (
          <button onClick={onEvaluar} className="btn-success flex-1 flex items-center justify-center gap-2 py-3 text-base">
            <ClipboardCheck size={18} /> Hacer evaluación
          </button>
        ) : (
          <button onClick={() => setMpIdx((i) => i + 1)} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-base">
            Siguiente <ArrowRight size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>{zoom && <FullscreenImage src={zoom} onClose={() => setZoom(null)} />}</AnimatePresence>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ EVALUACIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Evaluacion({
  proc,
  trabajador,
  onTerminar,
  onBack,
}: {
  proc: Proceso;
  trabajador: { nombre: string; numero: string };
  onTerminar: (respuestas: RespuestaRegistro[], tEvalSeg: number) => void;
  onBack: () => void;
}) {
  // Mezcla aleatoria de preguntas (spec 4.8.1).
  const preguntas = useMemo<Pregunta[]>(() => {
    const arr = [...proc.preguntas];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [proc.preguntas]);

  const [pIdx, setPIdx] = useState(0);
  const [resp, setResp] = useState<(number | null)[]>(() => new Array(preguntas.length).fill(null));
  const tiempos = useRef<number[]>(new Array(preguntas.length).fill(0));
  const tEvalStart = useRef(Date.now());
  const tPreg = useRef(Date.now());

  useEffect(() => {
    tPreg.current = Date.now();
  }, [pIdx]);

  const total = preguntas.length;
  const preg = preguntas[pIdx];
  const esUlt = pIdx === total - 1;
  const letras = ['A', 'B', 'C'];

  function registrarTiempo() {
    tiempos.current[pIdx] += Math.round((Date.now() - tPreg.current) / 1000);
  }

  function elegir(i: number) {
    setResp((r) => r.map((x, j) => (j === pIdx ? i : x)));
  }

  function finalizar() {
    registrarTiempo();
    const respuestas: RespuestaRegistro[] = preguntas.map((q, i) => ({
      preguntaId: q.id,
      respuestaDada: resp[i] ?? -1,
      esCorrecta: resp[i] === q.correcta,
      tiempoSeg: tiempos.current[i],
    }));
    const tEvalSeg = Math.round((Date.now() - tEvalStart.current) / 1000);
    onTerminar(respuestas, tEvalSeg);
  }

  if (!preg) {
    return (
      <div className="flex flex-col gap-5 h-full">
        <TrainingHeader icon={ClipboardCheck} gradient="from-blue-500 to-indigo-600" title="Evaluación" subtitle={trabajador.nombre} onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <EmptyState icon={ClipboardCheck} title="Este proceso no tiene evaluación" hint="Pide a tu supervisor que la genere" />
          <button onClick={onBack} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Volver a los pasos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-hidden h-full">
      <div className="shrink-0">
        <h1 className="text-lg font-bold text-surface-100 flex items-center gap-2">
          <ClipboardCheck size={20} className="text-blue-400" /> Evaluación
        </h1>
        <p className="text-sm text-surface-400">
          Pregunta {pIdx + 1} de {total} · {trabajador.nombre}
        </p>
      </div>
      <div className="h-1.5 bg-surface-800/60 rounded-full overflow-hidden shrink-0">
        <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" animate={{ width: `${((pIdx + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          <motion.div key={pIdx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            <p className="text-xl font-bold text-surface-100 leading-relaxed mb-5">{preg.texto}</p>
            <div className="space-y-3">
              {preg.opciones.map((op, i) => {
                const sel = resp[pIdx] === i;
                return (
                  <button
                    key={i}
                    onClick={() => elegir(i)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                      sel
                        ? 'bg-primary-500/20 border-primary-500/50 text-white'
                        : 'bg-surface-800/40 border-surface-700/40 text-surface-200 hover:bg-surface-700/40 hover:border-surface-600/50'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${sel ? 'bg-primary-500 text-white' : 'bg-surface-700/60 text-surface-300'}`}>
                      {letras[i]}
                    </span>
                    <span className="text-base">{op}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 shrink-0">
        {pIdx > 0 && (
          <button
            onClick={() => {
              registrarTiempo();
              setPIdx((i) => i - 1);
            }}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3"
          >
            <ArrowLeft size={16} /> Anterior
          </button>
        )}
        {esUlt ? (
          <button onClick={finalizar} disabled={resp[pIdx] === null} className="btn-success flex-1 flex items-center justify-center gap-2 py-3 text-base">
            Ver mi resultado <ClipboardCheck size={18} />
          </button>
        ) : (
          <button
            onClick={() => {
              registrarTiempo();
              setPIdx((i) => i + 1);
            }}
            disabled={resp[pIdx] === null}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-base"
          >
            Siguiente <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
