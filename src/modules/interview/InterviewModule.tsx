import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  User,
  CalendarClock,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Briefcase,
  GraduationCap,
  Clock,
  MessageSquare,
  Award,
  CalendarCheck,
  Ban,
  Phone,
} from 'lucide-react';
import type { RubricScore, Verdict } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import {
  INTERVIEW_SECTIONS,
  INTERVIEW_MAX_SCORE,
  SCORE_SCALE,
  computeInterviewDiagnostic,
  DIAGNOSTIC_LABELS,
  PUNTUALIDAD_OPTIONS,
} from '../../utils/interviewGuide';
import { formatDate, getInitials } from '../../utils/helpers';

// ─── Animations ──────────────────────────────────────────────────────────────

const pageTransition = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.25, ease: 'easeIn' as const } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

const AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-600',
  'from-indigo-500 to-cyan-500',
  'from-pink-500 to-violet-600',
  'from-amber-500 to-red-500',
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// ─── Main ────────────────────────────────────────────────────────────────────

type ViewState = { view: 'list' } | { view: 'interview'; candidateId: string };

export default function InterviewModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'list' });

  // v2.4: sin AnimatePresence mode="wait" — el cambio de vista es inmediato y
  // solo se anima la entrada (una salida atorada dejaba la pantalla vacia).
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {viewState.view === 'list' && (
        <motion.div key="list" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <InterviewListView onStart={(id) => setViewState({ view: 'interview', candidateId: id })} />
        </motion.div>
      )}
      {viewState.view === 'interview' && (
        <motion.div key="interview" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <InterviewGuideFlow
            candidateId={viewState.candidateId}
            onExit={() => setViewState({ view: 'list' })}
          />
        </motion.div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIST : candidatos con cita / pendientes de entrevista
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function InterviewListView({ onStart }: { onStart: (id: string) => void }) {
  const candidates = useStore((s) => s.candidates);

  const pending = useMemo(
    () =>
      candidates
        .filter(
          (c) =>
            !c.hired &&
            !c.interviewV2 &&
            (c.reception?.cita || c.reception?.videoDecision === 'interesado' || c.mathCompleted),
        )
        .sort((a, b) => {
          const fa = a.reception?.cita ? `${a.reception.cita.fecha}T${a.reception.cita.hora}` : '9999';
          const fb = b.reception?.cita ? `${b.reception.cita.fecha}T${b.reception.cita.hora}` : '9999';
          return fa.localeCompare(fb);
        }),
    [candidates],
  );

  const done = useMemo(() => candidates.filter((c) => c.interviewV2), [candidates]);

  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <h1 className="text-2xl font-bold gradient-text">Guia de Entrevista Interactiva</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          5 secciones · calificacion en tiempo real · diagnostico automatico · la decision final
          siempre es de Direccion
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
        {/* Pendientes */}
        <div>
          <h2 className="text-sm font-semibold text-surface-300 mb-2 flex items-center gap-2">
            <CalendarClock size={16} className="text-primary-400" />
            Pendientes de entrevista ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="glass-card p-8 text-center text-surface-500">
              <ClipboardList size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                No hay candidatos con cita pendiente. Los candidatos llegan aqui desde Recepcion
                (Etapa 0) cuando ven el video informativo y agendan su cita.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((c) => (
                <motion.div key={c.id} {...fadeUp} className="glass-card p-4 flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(c.fullName)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                  >
                    {getInitials(c.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-100 truncate">{c.fullName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <Briefcase size={12} /> {JOB_POSITIONS[c.position].name}
                      </span>
                      {c.reception?.cita ? (
                        <span className="flex items-center gap-1 text-primary-400 font-medium">
                          <CalendarClock size={12} />
                          {formatDate(c.reception.cita.fecha)} · {c.reception.cita.hora}
                        </span>
                      ) : (
                        <span className="badge badge-yellow text-[10px]">Sin cita registrada</span>
                      )}
                    </div>
                  </div>
                  <button className="btn-primary flex items-center gap-2" onClick={() => onStart(c.id)}>
                    <ClipboardList size={16} />
                    Iniciar Entrevista
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Completadas */}
        {done.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-surface-300 mb-2 flex items-center gap-2">
              <CheckCircle size={16} className="text-success-500" />
              Entrevistas completadas ({done.length})
            </h2>
            <div className="space-y-2">
              {done.map((c) => {
                const iv = c.interviewV2!;
                const d = DIAGNOSTIC_LABELS[iv.diagnostico];
                return (
                  <div key={c.id} className="glass-card p-4 flex items-center gap-3 flex-wrap">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(c.fullName)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
                    >
                      {getInitials(c.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-200 truncate">{c.fullName}</p>
                      <p className="text-xs text-surface-500">
                        {formatDate(iv.fecha)} · {iv.total}/{INTERVIEW_MAX_SCORE} pts ({iv.porcentaje}%)
                      </p>
                    </div>
                    <span className={`badge ${d.badge}`}>{d.label}</span>
                    {iv.decision && (
                      <span className={`badge ${iv.decision === 'agendar_inicio' ? 'badge-green' : 'badge-red'}`}>
                        {iv.decision === 'agendar_inicio' ? (
                          <>
                            <CalendarCheck size={12} /> Inicio agendado
                          </>
                        ) : (
                          <>
                            <Ban size={12} /> No continuo
                          </>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW : guia interactiva (inicio → 4 secciones → diagnostico → decision)
// Pasos: 0 = inicio (datos heredados), 1..4 = secciones S2..S5, 5 = diagnostico
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STEP_LABELS = ['Datos', 'Actitud', 'Experiencia', 'Aprender', 'Disponibilidad', 'Diagnostico'];

interface InterviewGuideFlowProps {
  candidateId: string;
  onExit: () => void;
}

function InterviewGuideFlow({ candidateId, onExit }: InterviewGuideFlowProps) {
  const candidate = useStore((s) => s.candidates.find((c) => c.id === candidateId));
  const updateCandidate = useStore((s) => s.updateCandidate);
  const settings = useStore((s) => s.settings);
  const authRole = useStore((s) => s.authRole);

  const [step, setStep] = useState(0);
  const [entrevistador, setEntrevistador] = useState(settings.directorName || 'Direccion General');
  const [puntualidad, setPuntualidad] = useState('');
  const [comoLlego, setComoLlego] = useState('');
  const [scores, setScores] = useState<Record<string, RubricScore>>({});
  const [obsSeccion, setObsSeccion] = useState<Record<string, string>>({});
  const [obsFinales, setObsFinales] = useState('');
  const [savedDecision, setSavedDecision] = useState<'agendar_inicio' | 'no_continuar' | null>(null);
  const [confirmDecision, setConfirmDecision] = useState<'agendar_inicio' | 'no_continuar' | null>(null);

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400">
        <XCircle size={48} className="mb-3" />
        <p>Candidato no encontrado</p>
        <button className="btn-secondary mt-4" onClick={onExit}>
          Volver
        </button>
      </div>
    );
  }

  const diagnostic = computeInterviewDiagnostic(scores);

  const setScore = (rubroId: string, value: RubricScore) =>
    setScores((prev) => ({ ...prev, [rubroId]: value }));

  const sectionComplete = (sectionIdx: number) => {
    const section = INTERVIEW_SECTIONS[sectionIdx];
    return section.rubros.every((r) => scores[r.id] !== undefined);
  };

  const handleDecision = (decision: 'agendar_inicio' | 'no_continuar') => {
    const now = new Date().toISOString();
    const usuario = `${entrevistador} (${authRole === 'direction' ? 'Direccion' : 'Supervisor'})`;
    const verdict: Verdict = diagnostic.verdict;

    updateCandidate(candidateId, {
      interviewV2: {
        entrevistador,
        fecha: now,
        puntualidadEntrevista: puntualidad,
        comoLlego,
        scores,
        observacionesSeccion: obsSeccion,
        observacionesFinales: obsFinales,
        total: diagnostic.total,
        porcentaje: diagnostic.porcentaje,
        diagnostico: verdict,
        alertas: diagnostic.alertas,
        decision,
        decisionRegistro: { fecha: now, usuario },
      },
      interviewCompleted: true,
      interviewScore: diagnostic.porcentaje,
      verdict,
    });
    setConfirmDecision(null);
    setSavedDecision(decision);
  };

  // ─── Pantalla final: decision registrada ───
  if (savedDecision) {
    const d = DIAGNOSTIC_LABELS[diagnostic.verdict];
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div {...fadeUp} className="glass-card p-8 max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${
              savedDecision === 'agendar_inicio'
                ? 'bg-success-500/15 text-success-500 ring-4 ring-success-500/30'
                : 'bg-danger-500/15 text-danger-500 ring-4 ring-danger-500/30'
            }`}
          >
            {savedDecision === 'agendar_inicio' ? <CalendarCheck size={36} /> : <Ban size={36} />}
          </motion.div>
          <h2 className="text-xl font-bold text-surface-100">
            {savedDecision === 'agendar_inicio' ? 'Inicio de labores agendado' : 'Proceso detenido'}
          </h2>
          <p className="text-sm text-surface-400 mt-2">
            La decision quedo registrada con fecha, hora y usuario en el expediente del candidato.
          </p>
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-surface-300">
              {candidate.fullName} · {diagnostic.total}/{INTERVIEW_MAX_SCORE} pts ({diagnostic.porcentaje}%)
            </p>
            <span className={`badge ${d.badge}`}>{d.label}</span>
          </div>
          {savedDecision === 'agendar_inicio' && (
            <p className="text-xs text-surface-500 mt-4">
              Siguiente paso: aplicar el examen de admision desde Recepcion → Detalle del candidato.
            </p>
          )}
          <button className="btn-primary w-full mt-6" onClick={onExit}>
            Volver a la lista
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Header con stepper */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button className="p-2 rounded-xl hover:bg-surface-800 transition-colors" onClick={onExit}>
            <ArrowLeft size={20} className="text-surface-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold gradient-text">Entrevista — {candidate.fullName}</h1>
            <p className="text-xs text-surface-400">
              {JOB_POSITIONS[candidate.position].name} · Puntaje en vivo:{' '}
              <span className="text-surface-200 font-semibold">
                {diagnostic.total}/{INTERVIEW_MAX_SCORE}
              </span>
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1">
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-all ${
                  idx < step
                    ? 'bg-primary-500'
                    : idx === step
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500'
                      : 'bg-surface-800'
                }`}
              />
              <span className={`text-[10px] ${idx === step ? 'text-primary-400 font-semibold' : 'text-surface-500'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* v2.4: sin AnimatePresence mode="wait" — el cambio de paso es inmediato
          (una salida atorada dejaba la pantalla vacia); solo se anima la entrada */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <>
          {/* ─── PASO 0: Datos del candidato (heredados de recepcion) ─── */}
          {step === 0 && (
            <motion.div key="s0" {...fadeUp} className="max-w-2xl mx-auto space-y-4">
              <div className="glass-card p-4 border-l-4 border-l-primary-500">
                <p className="text-sm text-surface-300">
                  <span className="font-semibold text-surface-100">Seccion 1 — Datos del candidato.</span>{' '}
                  Se heredan de la ficha de recepcion — solo confirmar y completar. No se califica.
                </p>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                  <User size={16} className="text-primary-400" />
                  Ficha heredada de Recepcion
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <InfoRow label="Nombre" value={candidate.fullName} />
                  <InfoRow label="Puesto al que aspira" value={JOB_POSITIONS[candidate.position].name} />
                  <InfoRow label="Telefono" value={candidate.phone} icon={<Phone size={11} />} />
                  <InfoRow label="Fecha de registro" value={formatDate(candidate.applicationDate)} />
                  {candidate.reception && (
                    <>
                      <InfoRow label="Escolaridad" value={candidate.reception.escolaridad} />
                      <InfoRow label="Ultimo trabajo" value={candidate.reception.ultimoTrabajo} />
                      <InfoRow label="Tiempo en ultimo empleo" value={candidate.reception.tiempoUltimoEmpleo} />
                      <InfoRow label="Motivo de salida" value={candidate.reception.motivoSalida} />
                      <InfoRow
                        label="Disponibilidad declarada"
                        value={
                          candidate.reception.disponibilidad.toUpperCase() === 'OTRO'
                            ? `OTRO: ${candidate.reception.disponibilidadOtro ?? ''}`
                            : candidate.reception.disponibilidad
                        }
                      />
                      <InfoRow label="Se entero por" value={candidate.source} />
                    </>
                  )}
                </div>
                {candidate.reception?.cita && (
                  <p className="text-xs text-primary-400 mt-3 flex items-center gap-1">
                    <CalendarClock size={12} />
                    Cita agendada: {formatDate(candidate.reception.cita.fecha)} a las {candidate.reception.cita.hora}
                  </p>
                )}
              </div>

              <div className="glass-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
                  <ClipboardList size={16} className="text-primary-400" />
                  Completar para iniciar
                </h3>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Entrevistador</label>
                  <input
                    type="text"
                    className="input-field"
                    value={entrevistador}
                    onChange={(e) => setEntrevistador(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Puntualidad a la entrevista *</label>
                  <div className="flex flex-wrap gap-2">
                    {PUNTUALIDAD_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPuntualidad(opt)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                          puntualidad === opt
                            ? 'bg-primary-500/20 border-primary-500/60 text-primary-300'
                            : 'bg-surface-900/40 border-surface-700 text-surface-400 hover:border-surface-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">¿Como llego al trabajo? (transporte)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: caminando, bicicleta, transporte publico..."
                    value={comoLlego}
                    onChange={(e) => setComoLlego(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={puntualidad === '' || entrevistador.trim() === ''}
                  onClick={() => setStep(1)}
                >
                  Confirmar datos e iniciar entrevista
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── PASOS 1-4: Secciones calificables ─── */}
          {step >= 1 && step <= 4 && (
            <SectionScreen
              key={`s${step}`}
              sectionIdx={step - 1}
              scores={scores}
              setScore={setScore}
              observacion={obsSeccion[INTERVIEW_SECTIONS[step - 1].id] ?? ''}
              setObservacion={(text) =>
                setObsSeccion((prev) => ({ ...prev, [INTERVIEW_SECTIONS[step - 1].id]: text }))
              }
              onPrev={() => setStep(step - 1)}
              onNext={() => setStep(step + 1)}
              canContinue={sectionComplete(step - 1)}
              isLast={step === 4}
            />
          )}

          {/* ─── PASO 5: Diagnostico automatico + decision ─── */}
          {step === 5 && (
            <motion.div key="s5" {...fadeUp} className="max-w-2xl mx-auto space-y-4">
              <DiagnosticScreen
                total={diagnostic.total}
                porcentaje={diagnostic.porcentaje}
                verdict={diagnostic.verdict}
                alertas={diagnostic.alertas}
                obsFinales={obsFinales}
                setObsFinales={setObsFinales}
                onPrev={() => setStep(4)}
                onDecide={(d) => setConfirmDecision(d)}
              />
            </motion.div>
          )}
        </>
      </div>

      {/* Modal de confirmacion de decision */}
      <AnimatePresence>
        {confirmDecision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDecision(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-surface-100 mb-2">
                {confirmDecision === 'agendar_inicio' ? 'Agendar inicio de labores' : 'No continuar con el proceso'}
              </h3>
              <p className="text-sm text-surface-400 mb-2">
                {candidate.fullName} · {diagnostic.total}/{INTERVIEW_MAX_SCORE} pts ·{' '}
                {DIAGNOSTIC_LABELS[diagnostic.verdict].label}
              </p>
              {confirmDecision === 'agendar_inicio' && diagnostic.verdict === 'not_recommended' && (
                <div className="flex items-start gap-2 bg-danger-500/10 border border-danger-500/30 rounded-xl p-3 mb-3">
                  <AlertTriangle size={16} className="text-danger-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-danger-400">
                    El diagnostico es NO RECOMENDABLE. Para contratarlo se requerira autorizacion
                    expresa de Direccion en el modulo de Contratacion.
                  </p>
                </div>
              )}
              {confirmDecision === 'agendar_inicio' && diagnostic.verdict === 'reservations' && (
                <div className="flex items-start gap-2 bg-warning-500/10 border border-warning-500/30 rounded-xl p-3 mb-3">
                  <Eye size={16} className="text-warning-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-warning-500">
                    Candidato CON RESERVA: si se contrata, el sistema activara seguimiento especial
                    automatico.
                  </p>
                </div>
              )}
              <p className="text-xs text-surface-500 mb-4">
                La decision quedara registrada con fecha, hora y usuario. El diagnostico queda como
                evidencia aunque Direccion decida diferente.
              </p>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setConfirmDecision(null)}>
                  Cancelar
                </button>
                <button
                  className={`flex-1 ${confirmDecision === 'agendar_inicio' ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => handleDecision(confirmDecision)}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-surface-500 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-surface-200">{value || '—'}</p>
    </div>
  );
}

// ─── Pantalla de seccion (rubros con botones 3-2-1-0) ───────────────────────

interface SectionScreenProps {
  sectionIdx: number;
  scores: Record<string, RubricScore>;
  setScore: (rubroId: string, value: RubricScore) => void;
  observacion: string;
  setObservacion: (text: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canContinue: boolean;
  isLast: boolean;
}

function SectionScreen({
  sectionIdx,
  scores,
  setScore,
  observacion,
  setObservacion,
  onPrev,
  onNext,
  canContinue,
  isLast,
}: SectionScreenProps) {
  const section = INTERVIEW_SECTIONS[sectionIdx];

  return (
    <motion.div {...fadeUp} className="max-w-2xl mx-auto space-y-4">
      <div className="glass-card p-4 border-l-4 border-l-accent-500">
        <h2 className="text-base font-bold text-surface-100">
          Seccion {section.numero} — {section.titulo}
        </h2>
        <p className="text-xs text-surface-400 mt-1 flex items-start gap-1.5">
          <Eye size={13} className="mt-0.5 flex-shrink-0 text-accent-400" />
          {section.notaEntrevistador}
        </p>
      </div>

      {section.rubros.map((rubro, idx) => {
        const current = scores[rubro.id];
        return (
          <div key={rubro.id} className="glass-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-surface-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-accent-500/20 text-accent-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                {rubro.label}
              </h3>
              {current !== undefined && (
                <span
                  className={`badge ${
                    current === 3 ? 'badge-green' : current === 2 ? 'badge-blue' : current === 1 ? 'badge-yellow' : 'badge-red'
                  }`}
                >
                  {current} pts
                </span>
              )}
            </div>

            <div className="glass-light rounded-xl p-3 space-y-2">
              <p className="text-sm text-surface-300 flex items-start gap-2">
                <MessageSquare size={14} className="text-primary-400 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="text-surface-500 text-xs block">Pregunta sugerida</span>
                  {rubro.preguntaSugerida}
                </span>
              </p>
              <p className="text-sm text-surface-400 flex items-start gap-2">
                <Eye size={14} className="text-accent-400 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="text-surface-500 text-xs block">Que buscar</span>
                  {rubro.queBuscar}
                </span>
              </p>
            </div>

            {/* Botones de calificacion 3-2-1-0 */}
            <div className="grid grid-cols-4 gap-2">
              {SCORE_SCALE.map((s) => {
                const active = current === s.value;
                return (
                  <motion.button
                    key={s.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setScore(rubro.id, s.value)}
                    title={s.descripcion}
                    className={`rounded-xl border py-3 px-1 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      active
                        ? `${s.activeClass} ring-2 border-transparent`
                        : 'bg-surface-900/40 border-surface-700 hover:border-surface-500'
                    }`}
                  >
                    <span className={`text-xl font-bold ${active ? '' : s.color}`}>{s.value}</span>
                    <span
                      className={`text-[10px] font-medium leading-tight text-center ${active ? 'text-white/90' : 'text-surface-400'}`}
                    >
                      {s.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Observaciones de la seccion */}
      <div className="glass-card p-5">
        <label className="text-sm text-surface-400 mb-2 flex items-center gap-2">
          <MessageSquare size={14} className="text-primary-400" />
          Observaciones de la seccion (opcional)
        </label>
        <textarea
          className="input-field min-h-[70px] resize-y"
          placeholder="Notas libres del entrevistador..."
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-secondary flex items-center gap-2" onClick={onPrev}>
          <ChevronLeft size={16} />
          Anterior
        </button>
        <button className="btn-primary flex items-center gap-2" disabled={!canContinue} onClick={onNext}>
          {isLast ? 'Ver diagnostico' : 'Siguiente seccion'}
          <ChevronRight size={16} />
        </button>
      </div>
      {!canContinue && (
        <p className="text-xs text-warning-500 text-center">
          Califica todos los rubros de la seccion para continuar.
        </p>
      )}
    </motion.div>
  );
}

// ─── Pantalla de diagnostico ─────────────────────────────────────────────────

interface DiagnosticScreenProps {
  total: number;
  porcentaje: number;
  verdict: Verdict;
  alertas: string[];
  obsFinales: string;
  setObsFinales: (text: string) => void;
  onPrev: () => void;
  onDecide: (d: 'agendar_inicio' | 'no_continuar') => void;
}

function DiagnosticScreen({
  total,
  porcentaje,
  verdict,
  alertas,
  obsFinales,
  setObsFinales,
  onPrev,
  onDecide,
}: DiagnosticScreenProps) {
  const d = DIAGNOSTIC_LABELS[verdict];
  const colorRing =
    verdict === 'recommended'
      ? 'bg-success-500/15 text-success-500 ring-success-500/30'
      : verdict === 'reservations'
        ? 'bg-warning-500/15 text-warning-500 ring-warning-500/30'
        : 'bg-danger-500/15 text-danger-500 ring-danger-500/30';

  return (
    <>
      <div className="glass-card p-8 text-center">
        <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-4">
          Diagnostico automatico del sistema
        </h2>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className={`w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center ring-4 ${colorRing}`}
        >
          <span className="text-4xl font-bold">{total}</span>
          <span className="text-xs opacity-80">de {INTERVIEW_MAX_SCORE} pts</span>
        </motion.div>
        <p className="text-surface-300 mt-3 text-lg font-semibold">{porcentaje}%</p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-3">
          <span className={`badge text-base px-5 py-2 ${d.badge}`}>{d.label}</span>
          <p className="text-xs text-surface-500 mt-2">{d.detail}</p>
        </motion.div>
        <p className="text-[11px] text-surface-600 mt-3">
          33-39 pts (85%+): Recomendable · 24-32 (62-84%): Con reserva · 0-23 o cualquier rubro en 0:
          No recomendable
        </p>
      </div>

      {/* Regla de negocio: alertas destacadas aunque el puntaje sea alto */}
      {alertas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-5 border-2 border-danger-500/50 bg-danger-500/5"
        >
          <h3 className="font-bold text-danger-400 flex items-center gap-2">
            <AlertTriangle size={18} />
            {alertas.length === 1 ? 'ALERTA DETECTADA' : `${alertas.length} ALERTAS DETECTADAS`}
          </h3>
          <ul className="mt-2 space-y-1">
            {alertas.map((a) => (
              <li key={a} className="text-sm text-danger-300 flex items-center gap-2">
                <XCircle size={13} className="flex-shrink-0" />
                {a} — calificado con 0 (alerta)
              </li>
            ))}
          </ul>
          <p className="text-xs text-surface-400 mt-3">
            Una sola alerta grave puede ser mas importante que el puntaje total. Queda registrada en
            el expediente. La decision final siempre es de Direccion.
          </p>
        </motion.div>
      )}

      {/* Observaciones finales */}
      <div className="glass-card p-5">
        <label className="text-sm text-surface-400 mb-2 flex items-center gap-2">
          <MessageSquare size={14} className="text-primary-400" />
          Observaciones finales
        </label>
        <textarea
          className="input-field min-h-[80px] resize-y"
          placeholder="Comentarios finales de Direccion sobre el candidato..."
          value={obsFinales}
          onChange={(e) => setObsFinales(e.target.value)}
        />
      </div>

      {/* Decision */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
          <Award size={16} className="text-primary-400" />
          Decision de Direccion
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button className="btn-success flex items-center justify-center gap-2 py-4" onClick={() => onDecide('agendar_inicio')}>
            <CalendarCheck size={18} />
            Agendar inicio de labores
          </button>
          <button className="btn-danger flex items-center justify-center gap-2 py-4" onClick={() => onDecide('no_continuar')}>
            <Ban size={18} />
            No continuar con el proceso
          </button>
        </div>
        <p className="text-[11px] text-surface-500 text-center flex items-center justify-center gap-1">
          <Clock size={11} />
          Ambas opciones quedan registradas con fecha, hora y usuario.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-secondary flex items-center gap-2" onClick={onPrev}>
          <ChevronLeft size={16} />
          Volver a Disponibilidad
        </button>
        <p className="text-xs text-surface-500 flex items-center gap-1">
          <GraduationCap size={13} />
          El examen de admision se aplica despues, solo si pasa el filtro.
        </p>
      </div>
    </>
  );
}
