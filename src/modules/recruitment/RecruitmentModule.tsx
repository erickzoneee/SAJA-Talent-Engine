import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  CalendarDays,
  Briefcase,
  FileText,
  ArrowLeft,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  MonitorPlay,
  GraduationCap,
  CalendarClock,
  ClipboardCheck,
  AlertTriangle,
  Captions,
  FastForward,
  ThumbsUp,
  ThumbsDown,
  Award,
  Video,
} from 'lucide-react';
import type { Candidate, JobPosition, OptionKey, ExamQuestionSnapshot } from '../../types';
import {
  JOB_POSITIONS,
  ESCOLARIDAD_OPTIONS,
  TIEMPO_EMPLEO_OPTIONS,
  DISPONIBILIDAD_OPTIONS,
  FUENTE_OPTIONS,
} from '../../types';
import { useStore } from '../../store/useStore';
import { useQuestionBank, buildExam } from '../../store/useQuestionBank';
import {
  EXAM_SPECIFIC_COUNT,
  EXAM_OUTCOME_LABELS,
  getExamOutcome,
} from '../../utils/examBank';
import { DIAGNOSTIC_LABELS } from '../../utils/interviewGuide';
import { generateId, formatDate, getInitials } from '../../utils/helpers';
import { parseVideoSource, RealVideoPlayer, NarratedVideoPlayer } from '../../components/VideoPlayer';
import { receptionNarrationBg } from '../../utils/narrationAssets';

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Video informativo (recepcion) — BRD seccion 3 ─────────────────────────
// Duracion 2:30 (150 s). Diferente al video de bienvenida del primer dia.
// Contenido: horario, dia de pago, BPM, reglas basicas, prestaciones, vacaciones.

const VIDEO_DURATION_SECONDS = 150;

const VIDEO_CAPTIONS: { titulo: string; texto: string }[] = [
  {
    titulo: 'Bienvenido',
    texto: 'Gracias por tu interes en trabajar en Jabones y Amenidades de Calidad. Este video corto te explica como trabajamos aqui.',
  },
  {
    titulo: 'Horario',
    texto: 'Trabajamos de lunes a sabado en jornada completa. La puntualidad es indispensable todos los dias.',
  },
  {
    titulo: 'Dia de pago',
    texto: 'El pago es semanal: recibes tu pago cada sabado.',
  },
  {
    titulo: 'BPM — Buenas Practicas de Manufactura',
    texto: 'Fabricamos productos de higiene. Por eso la cofia, el cubrebocas y el lavado de manos son OBLIGATORIOS. Las BPM protegen el producto y a las personas.',
  },
  {
    titulo: 'Reglas basicas',
    texto: 'Uniforme completo durante toda la jornada. El celular se guarda mientras trabajas. Cada quien mantiene su area limpia y ordenada.',
  },
  {
    titulo: 'Prestaciones',
    texto: 'Tienes todas las prestaciones de ley desde tu contratacion.',
  },
  {
    titulo: 'Vacaciones',
    texto: 'Las vacaciones se generan al cumplir tu primer ano. La empresa cierra la ultima semana del ano para mantenimiento.',
  },
  {
    titulo: 'Tu decides',
    texto: 'Si todo esto te interesa, avisale a recepcion para agendar tu entrevista.',
  },
];

// ─── Animation Variants ──────────────────────────────────────────────────────

const pageTransition = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.25, ease: 'easeIn' as const } },
};

const listItem = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

// ─── Sub-views ───────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'list' }
  | { view: 'ficha' }
  | { view: 'video'; candidateId: string }
  | { view: 'cita'; candidateId: string }
  | { view: 'detail'; candidateId: string }
  | { view: 'exam'; candidateId: string };

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RecruitmentModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'list' });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState.view === 'list' && (
          <motion.div key="list" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <CandidateListView
              onNewCandidate={() => setViewState({ view: 'ficha' })}
              onSelectCandidate={(id) => setViewState({ view: 'detail', candidateId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'ficha' && (
          <motion.div key="ficha" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <FichaRecepcionView
              onBack={() => setViewState({ view: 'list' })}
              onCreated={(id) => setViewState({ view: 'video', candidateId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'video' && (
          <motion.div key="video" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <VideoInformativoView
              candidateId={viewState.candidateId}
              onInterested={(id) => setViewState({ view: 'cita', candidateId: id })}
              onDeclined={() => setViewState({ view: 'list' })}
            />
          </motion.div>
        )}
        {viewState.view === 'cita' && (
          <motion.div key="cita" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <CitaView
              candidateId={viewState.candidateId}
              onDone={(id) => setViewState({ view: 'detail', candidateId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'detail' && (
          <motion.div key="detail" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <CandidateDetail
              candidateId={viewState.candidateId}
              onBack={() => setViewState({ view: 'list' })}
              onStartExam={(id) => setViewState({ view: 'exam', candidateId: id })}
              onWatchVideo={(id) => setViewState({ view: 'video', candidateId: id })}
              onScheduleCita={(id) => setViewState({ view: 'cita', candidateId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'exam' && (
          <motion.div key="exam" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <AdmissionExamView
              candidateId={viewState.candidateId}
              onBack={(id) => setViewState({ view: 'detail', candidateId: id })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 1 : Candidate List (pipeline v2.0)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CandidateListViewProps {
  onNewCandidate: () => void;
  onSelectCandidate: (id: string) => void;
}

function getCandidateStatus(c: Candidate): { label: string; className: string } {
  if (c.hired) return { label: 'Contratado', className: 'badge-green' };
  if (c.interviewV2?.decision === 'no_continuar') return { label: 'No continuo', className: 'badge-red' };
  if (c.admissionExam) {
    return {
      label: `Examen: ${EXAM_OUTCOME_LABELS[c.admissionExam.resultado].label}`,
      className: EXAM_OUTCOME_LABELS[c.admissionExam.resultado].badge,
    };
  }
  if (c.interviewV2) {
    const d = DIAGNOSTIC_LABELS[c.interviewV2.diagnostico];
    return { label: d.label, className: d.badge };
  }
  // Compatibilidad v1
  if (c.verdict === 'recommended') return { label: 'Recomendado', className: 'badge-green' };
  if (c.verdict === 'reservations') return { label: 'Con Reservas', className: 'badge-yellow' };
  if (c.verdict === 'not_recommended') return { label: 'No Recomendado', className: 'badge-red' };
  if (c.interviewCompleted) return { label: 'Entrevistado', className: 'badge-purple' };
  if (c.reception?.cita) return { label: 'Cita agendada', className: 'badge-blue' };
  if (c.reception?.videoDecision === 'interesado') return { label: 'Interesado — sin cita', className: 'badge-blue' };
  if (c.reception?.videoDecision === 'lo_pensara') return { label: 'Lo va a pensar', className: 'badge-yellow' };
  if (c.reception && !c.reception.videoCompleto) return { label: 'Video pendiente', className: 'badge-yellow' };
  return { label: 'En recepcion', className: 'badge-yellow' };
}

function CandidateListView({ onNewCandidate, onSelectCandidate }: CandidateListViewProps) {
  const candidates = useStore((s) => s.candidates);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState<JobPosition | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'recepcion' | 'cita' | 'entrevistado' | 'contratado'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        searchTerm === '' || c.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = filterPosition === '' || c.position === filterPosition;
      let matchesStatus = true;
      if (filterStatus === 'recepcion') matchesStatus = !c.interviewV2 && !c.interviewCompleted && !c.reception?.cita;
      else if (filterStatus === 'cita') matchesStatus = !!c.reception?.cita && !c.interviewV2;
      else if (filterStatus === 'entrevistado') matchesStatus = (!!c.interviewV2 || c.interviewCompleted) && !c.hired;
      else if (filterStatus === 'contratado') matchesStatus = c.hired;
      return matchesSearch && matchesPosition && matchesStatus;
    });
  }, [candidates, searchTerm, filterPosition, filterStatus]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Recepcion de Candidatos</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Etapa 0 — filtro previo · {candidates.length} candidato{candidates.length !== 1 ? 's' : ''} registrado{candidates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={onNewCandidate}>
          <UserPlus size={18} />
          Nueva Ficha (Tablet)
        </button>
      </div>

      {/* Search & Filters */}
      <div className="px-6 pb-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'border-primary-500' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, transition: { duration: 0.25 } }}
              exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 pt-1">
                <select
                  className="input-field"
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value as JobPosition | '')}
                >
                  <option value="">Todos los puestos</option>
                  {(Object.entries(JOB_POSITIONS) as [JobPosition, (typeof JOB_POSITIONS)[JobPosition]][]).map(
                    ([key, val]) => (
                      <option key={key} value={key}>
                        {key} - {val.name}
                      </option>
                    ),
                  )}
                </select>
                <select
                  className="input-field"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="recepcion">En recepcion</option>
                  <option value="cita">Cita agendada</option>
                  <option value="entrevistado">Entrevistado</option>
                  <option value="contratado">Contratado</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div {...fadeUp} className="flex flex-col items-center justify-center py-20 text-surface-500">
              <User size={48} className="mb-3 opacity-40" />
              <p className="text-lg font-medium">Sin candidatos</p>
              <p className="text-sm mt-1">
                {candidates.length === 0
                  ? 'Registra la primera ficha de recepcion para comenzar'
                  : 'No hay resultados con estos filtros'}
              </p>
            </motion.div>
          ) : (
            filtered.map((c, idx) => {
              const status = getCandidateStatus(c);
              return (
                <motion.div
                  key={c.id}
                  custom={idx}
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
                  onClick={() => onSelectCandidate(c.id)}
                >
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt={c.fullName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-surface-700 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(c.fullName)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                    >
                      {getInitials(c.fullName)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-100 truncate">{c.fullName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <Briefcase size={12} />
                        {JOB_POSITIONS[c.position].name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {formatDate(c.applicationDate)}
                      </span>
                      {c.reception?.cita && (
                        <span className="flex items-center gap-1 text-primary-400">
                          <CalendarClock size={12} />
                          Cita: {formatDate(c.reception.cita.fecha)} {c.reception.cita.hora}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.admissionExam && (
                      <span className="badge badge-blue">
                        <GraduationCap size={12} />
                        {c.admissionExam.aciertosTotales}/{c.admissionExam.totalPreguntas}
                      </span>
                    )}
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </div>

                  <ChevronRight size={18} className="text-surface-600 group-hover:text-surface-300 transition-colors flex-shrink-0" />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 2 : Ficha de Registro en Recepcion (10 campos — BRD seccion 3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface FichaRecepcionViewProps {
  onBack: () => void;
  onCreated: (id: string) => void;
}

function FichaRecepcionView({ onBack, onCreated }: FichaRecepcionViewProps) {
  const addCandidate = useStore((s) => s.addCandidate);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    position: '' as JobPosition | '',
    escolaridad: '',
    ultimoTrabajo: '',
    tiempoUltimoEmpleo: '',
    motivoSalida: '',
    disponibilidad: '',
    disponibilidadOtro: '',
    source: '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const today = new Date();

  const formValid =
    form.fullName.trim() !== '' &&
    form.phone.trim() !== '' &&
    form.position !== '' &&
    form.escolaridad !== '' &&
    form.ultimoTrabajo.trim() !== '' &&
    form.tiempoUltimoEmpleo !== '' &&
    form.motivoSalida.trim() !== '' &&
    form.disponibilidad !== '' &&
    (form.disponibilidad !== 'Otro' || form.disponibilidadOtro.trim() !== '') &&
    form.source !== '';

  const handleSave = () => {
    if (!formValid || saving) return;
    setSaving(true);

    const id = generateId();
    const now = new Date().toISOString();

    const candidate: Candidate = {
      id,
      fullName: form.fullName.trim(),
      applicationDate: now.split('T')[0],
      position: form.position as JobPosition,
      phone: form.phone.trim(),
      source: form.source,
      mathCompleted: false,
      interviewCompleted: false,
      hired: false,
      createdAt: now,
      reception: {
        escolaridad: form.escolaridad,
        ultimoTrabajo: form.ultimoTrabajo.trim(),
        tiempoUltimoEmpleo: form.tiempoUltimoEmpleo,
        motivoSalida: form.motivoSalida.trim(),
        disponibilidad: form.disponibilidad,
        disponibilidadOtro: form.disponibilidad === 'Otro' ? form.disponibilidadOtro.trim() : undefined,
        videoCompleto: false,
      },
    };

    addCandidate(candidate);
    setSaving(false);
    onCreated(id);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <button className="p-2 rounded-xl hover:bg-surface-800 transition-colors" onClick={onBack}>
          <ArrowLeft size={20} className="text-surface-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Ficha de Registro — Recepcion</h1>
          <p className="text-sm text-surface-400 mt-0.5">Etapa 0 · sin firma — solo captura de datos</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <motion.div {...fadeUp} className="space-y-5 max-w-2xl mx-auto">
          {/* Guion de recepcion */}
          <div className="glass-card p-4 border-l-4 border-l-primary-500">
            <p className="text-sm text-surface-300 italic">
              "Antes de agendar tu entrevista, te pedimos que llenes una ficha basica y veas un video
              corto sobre como trabajamos aqui."
            </p>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-surface-200 flex items-center gap-2">
              <User size={18} className="text-primary-400" />
              Datos del candidato
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nombre completo"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">
                    <span className="flex items-center gap-1"><Phone size={14} /> Telefono de contacto *</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="input-field"
                    placeholder="Numero de telefono"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value.replace(/[^\d\s+-]/g, ''))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Puesto al que aspira *</label>
                  <select
                    className="input-field"
                    value={form.position}
                    onChange={(e) => setField('position', e.target.value)}
                  >
                    <option value="">Seleccionar puesto</option>
                    {(Object.entries(JOB_POSITIONS) as [JobPosition, (typeof JOB_POSITIONS)[JobPosition]][]).map(
                      ([key, val]) => (
                        <option key={key} value={key}>
                          {val.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Escolaridad maxima *</label>
                <div className="flex flex-wrap gap-2">
                  {ESCOLARIDAD_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField('escolaridad', opt)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.escolaridad === opt
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
                <label className="block text-sm text-surface-400 mb-1">Ultimo lugar donde trabajo *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Empresa o lugar de su ultimo empleo"
                  value={form.ultimoTrabajo}
                  onChange={(e) => setField('ultimoTrabajo', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">¿Cuanto tiempo trabajo ahi? *</label>
                <div className="flex flex-wrap gap-2">
                  {TIEMPO_EMPLEO_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField('tiempoUltimoEmpleo', opt)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.tiempoUltimoEmpleo === opt
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
                <label className="block text-sm text-surface-400 mb-1">¿Por que salio de ese trabajo? *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Respuesta corta"
                  maxLength={120}
                  value={form.motivoSalida}
                  onChange={(e) => setField('motivoSalida', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Disponibilidad de horario *</label>
                <div className="flex flex-wrap gap-2">
                  {DISPONIBILIDAD_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField('disponibilidad', opt)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.disponibilidad === opt
                          ? 'bg-primary-500/20 border-primary-500/60 text-primary-300'
                          : 'bg-surface-900/40 border-surface-700 text-surface-400 hover:border-surface-500'
                      }`}
                    >
                      {opt === 'Otro' ? 'Otro (especifica)' : opt}
                    </button>
                  ))}
                </div>
                {form.disponibilidad === 'Otro' && (
                  <input
                    type="text"
                    className="input-field mt-2"
                    placeholder="Especifica tu disponibilidad"
                    value={form.disponibilidadOtro}
                    onChange={(e) => setField('disponibilidadOtro', e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">¿Como se entero de la vacante? *</label>
                <div className="flex flex-wrap gap-2">
                  {FUENTE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField('source', opt)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.source === opt
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
                <label className="block text-sm text-surface-400 mb-1">Fecha de registro</label>
                <input
                  type="text"
                  className="input-field opacity-60 cursor-not-allowed"
                  value={`${formatDate(today)} — automatica, el sistema la pone solo`}
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={onBack}>
              Cancelar
            </button>
            <button
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={!formValid || saving}
              onClick={handleSave}
            >
              <MonitorPlay size={18} />
              Guardar y ver video informativo
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 3 : Video Informativo (2:30) + decision del candidato
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VideoInformativoViewProps {
  candidateId: string;
  onInterested: (id: string) => void;
  onDeclined: () => void;
}

function VideoInformativoView({ candidateId, onInterested, onDeclined }: VideoInformativoViewProps) {
  const candidate = useStore((s) => s.candidates.find((c) => c.id === candidateId));
  const updateCandidate = useStore((s) => s.updateCandidate);
  const receptionVideoUrl = useStore((s) => s.settings.receptionVideoUrl);
  const receptionNarrationUrl = useStore((s) => s.settings.receptionNarrationUrl);

  const [progress, setProgress] = useState(0); // segundos del video (demostracion)
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [realEnded, setRealEnded] = useState(false);
  const [realProgress, setRealProgress] = useState(0); // 0..1 para video real (archivo)
  const completedRef = useRef(false);

  const source = parseVideoSource(receptionVideoUrl);
  const usingReal = !!source;
  const usingNarration = !usingReal && !!(receptionNarrationUrl ?? '').trim();
  const complete = usingReal || usingNarration ? realEnded : progress >= VIDEO_DURATION_SECONDS;

  useEffect(() => {
    if (usingReal || usingNarration || !playing || complete) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 0.1 * speed, VIDEO_DURATION_SECONDS));
    }, 100);
    return () => clearInterval(interval);
  }, [playing, speed, complete, usingReal, usingNarration]);

  // Registrar visualizacion completa (una sola vez)
  useEffect(() => {
    if (complete && !completedRef.current && candidate) {
      completedRef.current = true;
      updateCandidate(candidateId, {
        reception: {
          ...candidate.reception!,
          videoCompleto: true,
          videoTimestamp: new Date().toISOString(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  if (!candidate || !candidate.reception) {
    return (
      <div className="flex items-center justify-center h-full text-surface-400">
        Candidato no encontrado
      </div>
    );
  }

  const captionIdx = Math.min(
    Math.floor((progress / VIDEO_DURATION_SECONDS) * VIDEO_CAPTIONS.length),
    VIDEO_CAPTIONS.length - 1,
  );
  const caption = VIDEO_CAPTIONS[captionIdx];
  const pct = (progress / VIDEO_DURATION_SECONDS) * 100;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const handleDecision = (decision: 'interesado' | 'lo_pensara') => {
    updateCandidate(candidateId, {
      reception: {
        ...candidate.reception!,
        videoCompleto: true,
        videoTimestamp: candidate.reception!.videoTimestamp ?? new Date().toISOString(),
        videoDecision: decision,
      },
    });
    if (decision === 'interesado') onInterested(candidateId);
    else onDeclined();
  };

  return (
    <>
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Video Informativo</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {candidate.fullName} · 2:30 min · asi trabajamos aqui
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <motion.div {...fadeUp} className="max-w-2xl mx-auto space-y-4">
          {/* Reproductor: narrado (audio TTS), video real, o demostracion */}
          <div className="glass-card overflow-hidden">
            {usingNarration ? (
              <NarratedVideoPlayer
                audioUrl={(receptionNarrationUrl || '').trim()}
                captions={VIDEO_CAPTIONS}
                title="Video Informativo — asi trabajamos aqui"
                backgroundVideoUrl={receptionNarrationBg}
                complete={complete}
                onEnded={() => setRealEnded(true)}
                onProgress={setRealProgress}
              />
            ) : (
              <>
            <div className="aspect-video bg-gradient-to-br from-surface-950 via-primary-950 to-surface-950 relative flex flex-col items-center justify-center">
              {usingReal ? (
                <RealVideoPlayer
                  source={source!}
                  title="Video Informativo — asi trabajamos aqui"
                  complete={complete}
                  onEnded={() => setRealEnded(true)}
                  onProgress={setRealProgress}
                />
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={captionIdx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                      className="text-center px-10"
                    >
                      <Video size={40} className="text-primary-400 mx-auto mb-4 opacity-60" />
                      <h2 className="text-xl font-bold text-surface-100 mb-2">{caption.titulo}</h2>
                    </motion.div>
                  </AnimatePresence>

                  {/* Subtitulos — activados siempre (BRD) */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-black/70 rounded-lg px-4 py-2 flex items-start gap-2">
                      <Captions size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-white leading-snug">{caption.texto}</p>
                    </div>
                  </div>
                </>
              )}

              {complete && (
                <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center ${usingReal ? 'pointer-events-none' : ''}`}>
                  <CheckCircle size={48} className="text-success-500 mb-2" />
                  <p className="text-surface-100 font-semibold">Video completo</p>
                </div>
              )}
            </div>

            {/* Controles (solo demostracion) */}
            {usingReal ? (
              <div className="p-4 space-y-2">
                {source!.kind === 'file' && (
                  <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                      style={{ width: `${Math.round(realProgress * 100)}%` }}
                    />
                  </div>
                )}
                <p className="text-[11px] text-surface-500">
                  Video real ({source!.kind === 'file' ? 'archivo' : source!.kind === 'youtube' ? 'YouTube' : 'Vimeo'}).
                  El sistema registra la visualizacion completa con fecha y hora.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors text-surface-200"
                      onClick={() => setPlaying((p) => !p)}
                      disabled={complete}
                    >
                      {playing && !complete ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors text-surface-200"
                      onClick={() => {
                        completedRef.current = false;
                        setProgress(0);
                        setPlaying(true);
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <span className="text-xs font-mono text-surface-400">
                      {fmt(progress)} / {fmt(VIDEO_DURATION_SECONDS)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FastForward size={14} className="text-surface-500" />
                    {[1, 5, 10].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          speed === s
                            ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/40'
                            : 'text-surface-500 hover:text-surface-300'
                        }`}
                      >
                        x{s}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-surface-500">
                  Reproductor de demostracion — cuando Direccion configure la URL del video real o la
                  narracion (en Configuracion → Videos del sistema) se reproducira aqui. Subtitulos
                  activados siempre.
                </p>
              </div>
            )}
              </>
            )}
          </div>

          {/* Decision — solo al terminar el video */}
          <AnimatePresence>
            {complete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 space-y-4"
              >
                <p className="text-center text-surface-200 font-medium">
                  Si todo esto te interesa, avisale a recepcion.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    className="btn-success flex items-center justify-center gap-2 py-4"
                    onClick={() => handleDecision('interesado')}
                  >
                    <ThumbsUp size={18} />
                    Si me interesa, quiero agendar entrevista
                  </button>
                  <button
                    className="btn-secondary flex items-center justify-center gap-2 py-4"
                    onClick={() => handleDecision('lo_pensara')}
                  >
                    <ThumbsDown size={18} />
                    Gracias, lo voy a pensar
                  </button>
                </div>
                <p className="text-[11px] text-surface-500 text-center">
                  El sistema guarda si el candidato vio el video completo y que boton selecciono.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 4 : Agendar cita con Direccion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CitaViewProps {
  candidateId: string;
  onDone: (id: string) => void;
}

function CitaView({ candidateId, onDone }: CitaViewProps) {
  const candidate = useStore((s) => s.candidates.find((c) => c.id === candidateId));
  const updateCandidate = useStore((s) => s.updateCandidate);
  const authRole = useStore((s) => s.authRole);

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');

  if (!candidate || !candidate.reception) {
    return (
      <div className="flex items-center justify-center h-full text-surface-400">
        Candidato no encontrado
      </div>
    );
  }

  const handleSave = () => {
    if (!fecha || !hora) return;
    updateCandidate(candidateId, {
      reception: {
        ...candidate.reception!,
        videoDecision: 'interesado',
        cita: {
          fecha,
          hora,
          agendadaPor: authRole === 'direction' ? 'Direccion' : 'Recepcion',
          agendadaEn: new Date().toISOString(),
        },
      },
    });
    onDone(candidateId);
  };

  return (
    <>
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Agendar Cita de Entrevista</h1>
          <p className="text-sm text-surface-400 mt-0.5">{candidate.fullName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <motion.div {...fadeUp} className="max-w-lg mx-auto space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-surface-200 flex items-center gap-2">
              <CalendarClock size={18} className="text-primary-400" />
              Cita con Direccion
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Fecha *</label>
                <input
                  type="date"
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Hora *</label>
                <input
                  type="time"
                  className="input-field"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
            </div>
            <div className="glass-light rounded-xl p-3 flex items-start gap-2">
              <ClipboardCheck size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-surface-400">
                Al agendar, el sistema envia la ficha a Direccion para que la revise antes de la
                entrevista. En la entrevista, Direccion ya vera estos datos en pantalla sin volver a
                capturar.
              </p>
            </div>
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={!fecha || !hora}
              onClick={handleSave}
            >
              <CheckCircle size={18} />
              Agendar cita
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 5 : Candidate Detail (pipeline completo)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CandidateDetailProps {
  candidateId: string;
  onBack: () => void;
  onStartExam: (candidateId: string) => void;
  onWatchVideo: (candidateId: string) => void;
  onScheduleCita: (candidateId: string) => void;
}

function CandidateDetail({ candidateId, onBack, onStartExam, onWatchVideo, onScheduleCita }: CandidateDetailProps) {
  const candidate = useStore((s) => s.candidates.find((c) => c.id === candidateId));
  const deleteCandidate = useStore((s) => s.deleteCandidate);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400">
        <XCircle size={48} className="mb-3" />
        <p>Candidato no encontrado</p>
        <button className="btn-secondary mt-4" onClick={onBack}>
          Volver
        </button>
      </div>
    );
  }

  const r = candidate.reception;
  const iv = candidate.interviewV2;
  const exam = candidate.admissionExam;
  const passedFilter = iv?.decision === 'agendar_inicio';
  const status = getCandidateStatus(candidate);

  const handleDelete = () => {
    deleteCandidate(candidateId);
    onBack();
  };

  return (
    <>
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <button className="p-2 rounded-xl hover:bg-surface-800 transition-colors" onClick={onBack}>
          <ArrowLeft size={20} className="text-surface-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold gradient-text">Detalle del Candidato</h1>
        </div>
        <button
          className="p-2 rounded-xl hover:bg-danger-500/20 transition-colors text-surface-500 hover:text-danger-400"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <motion.div {...fadeUp} className="space-y-4 max-w-2xl mx-auto">
          {/* Perfil */}
          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(candidate.fullName)} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}
              >
                {getInitials(candidate.fullName)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-surface-100">{candidate.fullName}</h2>
                  <span className={`badge ${status.className}`}>{status.label}</span>
                </div>
                <p className="text-sm text-primary-400 font-medium mt-0.5">
                  {JOB_POSITIONS[candidate.position].name}
                </p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-surface-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} /> Registro: {formatDate(candidate.applicationDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {candidate.phone}
                  </span>
                  {candidate.age ? <span>{candidate.age} anios</span> : null}
                </div>
                <p className="text-xs text-surface-500 mt-1">Se entero por: {candidate.source}</p>
              </div>
            </div>
          </div>

          {/* Ficha de recepcion */}
          {r && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary-400" />
                Ficha de Recepcion (Etapa 0)
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <DetailRow label="Escolaridad" value={r.escolaridad} />
                <DetailRow label="Ultimo trabajo" value={r.ultimoTrabajo} />
                <DetailRow label="Tiempo ahi" value={r.tiempoUltimoEmpleo} />
                <DetailRow label="Motivo de salida" value={r.motivoSalida} />
                <DetailRow
                  label="Disponibilidad"
                  value={r.disponibilidad === 'Otro' ? `Otro: ${r.disponibilidadOtro ?? ''}` : r.disponibilidad}
                />
              </div>
            </div>
          )}

          {/* Video informativo */}
          {r && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                <MonitorPlay size={16} className="text-primary-400" />
                Video Informativo y Decision
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {r.videoCompleto ? (
                    <span className="badge badge-green">
                      <CheckCircle size={12} /> Video visto completo
                    </span>
                  ) : (
                    <span className="badge badge-yellow">
                      <Clock size={12} /> Video pendiente
                    </span>
                  )}
                  {r.videoTimestamp && (
                    <span className="text-xs text-surface-500">
                      {formatDate(r.videoTimestamp)}{' '}
                      {new Date(r.videoTimestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {r.videoDecision && (
                  <p className="text-surface-300">
                    Boton seleccionado:{' '}
                    <span className={r.videoDecision === 'interesado' ? 'text-success-500 font-medium' : 'text-warning-500 font-medium'}>
                      {r.videoDecision === 'interesado'
                        ? "'Si me interesa, quiero agendar entrevista'"
                        : "'Gracias, lo voy a pensar'"}
                    </span>
                  </p>
                )}
                {r.cita ? (
                  <p className="text-surface-300 flex items-center gap-2">
                    <CalendarClock size={14} className="text-primary-400" />
                    Cita con Direccion: <span className="font-medium text-surface-100">{formatDate(r.cita.fecha)} a las {r.cita.hora}</span>
                    <span className="text-xs text-surface-500">(agendada por {r.cita.agendadaPor})</span>
                  </p>
                ) : (
                  <div className="flex gap-2 pt-1">
                    {!r.videoCompleto && (
                      <button className="btn-secondary text-sm flex items-center gap-2" onClick={() => onWatchVideo(candidateId)}>
                        <Play size={14} /> Ver video
                      </button>
                    )}
                    {r.videoDecision === 'interesado' && (
                      <button className="btn-primary text-sm flex items-center gap-2" onClick={() => onScheduleCita(candidateId)}>
                        <CalendarClock size={14} /> Agendar cita
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Entrevista */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <Award size={16} className="text-primary-400" />
              Entrevista con Direccion
            </h3>
            {iv ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`badge ${DIAGNOSTIC_LABELS[iv.diagnostico].badge}`}>
                    {DIAGNOSTIC_LABELS[iv.diagnostico].label}
                  </span>
                  <span className="text-surface-300">
                    {iv.total}/{39} puntos ({iv.porcentaje}%)
                  </span>
                </div>
                {iv.alertas.length > 0 && (
                  <div className="flex items-start gap-2 bg-danger-500/10 border border-danger-500/30 rounded-xl p-3">
                    <AlertTriangle size={16} className="text-danger-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-danger-400">
                      Alertas (rubros en 0): {iv.alertas.join(', ')}
                    </p>
                  </div>
                )}
                {iv.decision && (
                  <p className="text-surface-300">
                    Decision:{' '}
                    <span className={iv.decision === 'agendar_inicio' ? 'text-success-500 font-medium' : 'text-danger-400 font-medium'}>
                      {iv.decision === 'agendar_inicio' ? 'Agendar inicio de labores' : 'No continuar con el proceso'}
                    </span>
                    {iv.decisionRegistro && (
                      <span className="text-xs text-surface-500 ml-2">
                        ({formatDate(iv.decisionRegistro.fecha)}{' '}
                        {new Date(iv.decisionRegistro.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}{' '}
                        — {iv.decisionRegistro.usuario})
                      </span>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-400">
                {r?.cita
                  ? `Cita agendada para ${formatDate(r.cita.fecha)} a las ${r.cita.hora}. La entrevista se conduce desde el modulo Entrevistas.`
                  : 'Pendiente. El candidato debe pasar por recepcion y agendar cita.'}
              </p>
            )}
          </div>

          {/* Examen de admision */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <GraduationCap size={16} className="text-primary-400" />
              Examen de Admision por Puesto
            </h3>
            {exam ? (
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${
                    exam.resultado === 'aprobado'
                      ? 'bg-success-500/15 text-success-500 ring-1 ring-success-500/30'
                      : exam.resultado === 'con_reserva'
                        ? 'bg-warning-500/15 text-warning-500 ring-1 ring-warning-500/30'
                        : 'bg-danger-500/15 text-danger-500 ring-1 ring-danger-500/30'
                  }`}
                >
                  {exam.aciertosTotales}
                </div>
                <div>
                  <p className="text-surface-200 font-medium">
                    {exam.aciertosTotales} / {exam.totalPreguntas} aciertos
                  </p>
                  <p className="text-xs text-surface-400">
                    Comunes: {exam.aciertosComunes}/10 · Especificas: {exam.aciertosEspecificas}/15
                  </p>
                  <span className={`badge mt-1 ${EXAM_OUTCOME_LABELS[exam.resultado].badge}`}>
                    {EXAM_OUTCOME_LABELS[exam.resultado].label}
                  </span>
                  <p className="text-xs text-surface-500 mt-1">
                    Orientativo — Direccion puede contratar aunque repruebe.
                  </p>
                </div>
              </div>
            ) : passedFilter ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-400">
                  El candidato paso el filtro de entrevista. Aplicar examen en tablet.
                </p>
                <button className="btn-primary flex items-center gap-2" onClick={() => onStartExam(candidateId)}>
                  <Play size={16} />
                  Iniciar Examen
                </button>
              </div>
            ) : (
              <p className="text-sm text-surface-400">
                El examen se aplica despues de la entrevista — solo si el candidato pasa el filtro
                inicial. Es orientativo: Direccion decide aunque repruebe.
              </p>
            )}
            {candidate.mathCompleted && (
              <p className="text-xs text-surface-500 mt-3 border-t border-white/[0.06] pt-2">
                Registro anterior (v1): examen de matematicas {candidate.mathScore}/18.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-surface-100 mb-2">Eliminar Candidato</h3>
              <p className="text-sm text-surface-400 mb-5">
                Se eliminara permanentemente a{' '}
                <span className="text-surface-200 font-medium">{candidate.fullName}</span>. Esta accion
                no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </button>
                <button className="btn-danger flex-1" onClick={handleDelete}>
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-surface-500">{label}</p>
      <p className="text-surface-200">{value || '—'}</p>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 6 : Examen de Admision (10 comunes + 15 especificas — banco editable)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

interface AdmissionExamViewProps {
  candidateId: string;
  onBack: (candidateId: string) => void;
}

function AdmissionExamView({ candidateId, onBack }: AdmissionExamViewProps) {
  const candidate = useStore((s) => s.candidates.find((c) => c.id === candidateId));
  const updateCandidate = useStore((s) => s.updateCandidate);
  const bankQuestions = useQuestionBank((s) => s.questions);

  // El examen se arma UNA vez al montar la vista (seleccion aleatoria de especificas)
  const [examQuestions] = useState(() =>
    candidate ? buildExam(bankQuestions, candidate.position) : [],
  );

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(OptionKey | null)[]>(() => new Array(examQuestions.length).fill(null));
  const [examFinished, setExamFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-full text-surface-400">
        Candidato no encontrado
      </div>
    );
  }

  const specificCount = examQuestions.filter((q) => q.tipo === 'especifica').length;
  const lowBank = specificCount < EXAM_SPECIFIC_COUNT;

  const selectAnswer = (key: OptionKey) => {
    if (examFinished) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = key;
      return next;
    });
  };

  const finishExam = () => {
    setShowConfirmFinish(false);
    let comunes = 0;
    let especificas = 0;
    const snapshot: ExamQuestionSnapshot[] = examQuestions.map((q, idx) => {
      const respuesta = answers[idx] ?? undefined;
      const correct = respuesta === q.correcta;
      if (correct) {
        if (q.tipo === 'comun') comunes++;
        else especificas++;
      }
      return {
        idPregunta: q.id,
        tipo: q.tipo,
        categoria: q.categoria,
        texto: q.texto,
        opciones: q.opciones,
        correcta: q.correcta,
        respuesta,
      };
    });

    const total = comunes + especificas;
    updateCandidate(candidateId, {
      admissionExam: {
        fecha: new Date().toISOString(),
        puesto: candidate.position,
        aciertosComunes: comunes,
        aciertosEspecificas: especificas,
        aciertosTotales: total,
        totalPreguntas: examQuestions.length,
        resultado: getExamOutcome(total),
        duracionSegundos: Math.floor((Date.now() - startTime) / 1000),
        preguntas: snapshot,
      },
    });
    setExamFinished(true);
  };

  const answeredCount = answers.filter((a) => a !== null).length;
  const progress = examQuestions.length > 0 ? ((currentQuestion + 1) / examQuestions.length) * 100 : 0;

  // ─── Resultado ───
  if (examFinished && candidate.admissionExam) {
    const exam = candidate.admissionExam;
    const outcome = EXAM_OUTCOME_LABELS[exam.resultado];
    return (
      <>
        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
          <button className="p-2 rounded-xl hover:bg-surface-800 transition-colors" onClick={() => onBack(candidateId)}>
            <ArrowLeft size={20} className="text-surface-300" />
          </button>
          <h1 className="text-2xl font-bold gradient-text">Resultado del Examen</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <motion.div {...fadeUp} className="max-w-lg mx-auto space-y-5">
            <div className="glass-card p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-5xl font-bold ring-4 ${
                  exam.resultado === 'aprobado'
                    ? 'bg-success-500/15 text-success-500 ring-success-500/30'
                    : exam.resultado === 'con_reserva'
                      ? 'bg-warning-500/15 text-warning-500 ring-warning-500/30'
                      : 'bg-danger-500/15 text-danger-500 ring-danger-500/30'
                }`}
              >
                {exam.aciertosTotales}
              </motion.div>
              <p className="text-surface-300 mt-4 text-lg">
                de <span className="text-surface-100 font-bold">{exam.totalPreguntas}</span> preguntas correctas
              </p>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4">
                <span className={`badge text-base px-5 py-2 ${outcome.badge}`}>{outcome.label}</span>
              </motion.div>
              <p className="text-xs text-surface-500 mt-3">
                Comunes: {exam.aciertosComunes}/10 · Especificas: {exam.aciertosEspecificas}/{specificCount} · 22-25 Aprobado | 18-21 Con reserva | 0-17 No aprobado
              </p>
              <div className="mt-4 glass-light rounded-xl p-3 flex items-start gap-2 text-left">
                <AlertTriangle size={16} className="text-warning-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-surface-400">
                  El examen es ORIENTATIVO — no bloquea la contratacion. Direccion puede contratar
                  aunque el candidato repruebe. El resultado queda registrado como evidencia.
                </p>
              </div>
            </div>

            {/* Resumen */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-300 mb-3">Resumen de Respuestas</h3>
              <div className="grid grid-cols-5 gap-2">
                {exam.preguntas.map((q, idx) => {
                  const isCorrect = q.respuesta === q.correcta;
                  return (
                    <div
                      key={q.idPregunta}
                      title={`${q.categoria}${q.tipo === 'comun' ? ' (comun)' : ''}`}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                        isCorrect
                          ? 'bg-success-500/20 text-success-400 ring-1 ring-success-500/30'
                          : 'bg-danger-500/20 text-danger-400 ring-1 ring-danger-500/30'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={() => onBack(candidateId)}>
              <ChevronLeft size={18} />
              Volver al Perfil
            </button>
          </motion.div>
        </div>
      </>
    );
  }

  if (examQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400">
        <AlertTriangle size={48} className="mb-3 text-warning-500" />
        <p>No hay preguntas activas en el banco para este puesto.</p>
        <button className="btn-secondary mt-4" onClick={() => onBack(candidateId)}>
          Volver
        </button>
      </div>
    );
  }

  // ─── Examen en curso ───
  const question = examQuestions[currentQuestion];

  return (
    <>
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl hover:bg-surface-800 transition-colors" onClick={() => onBack(candidateId)}>
              <ArrowLeft size={20} className="text-surface-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold gradient-text">Examen de Admision — {JOB_POSITIONS[candidate.position].name}</h1>
              <p className="text-xs text-surface-400">
                {candidate.fullName} · sin limite de tiempo · una pregunta a la vez
              </p>
            </div>
          </div>
          <span className="text-sm text-surface-400">
            {answeredCount}/{examQuestions.length}
          </span>
        </div>

        {lowBank && (
          <div className="mb-3 flex items-start gap-2 bg-warning-500/10 border border-warning-500/30 rounded-xl p-3">
            <AlertTriangle size={16} className="text-warning-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-warning-500">
              Este puesto tiene solo {specificCount} preguntas especificas activas (minimo: {EXAM_SPECIFIC_COUNT}).
              Avisa al administrador del banco de preguntas.
            </p>
          </div>
        )}

        {/* Barra de avance */}
        <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' as const }}
          />
        </div>

        <div className="flex gap-1 mt-3 justify-center flex-wrap">
          {examQuestions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestion(idx)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                idx === currentQuestion
                  ? 'bg-primary-500 text-white scale-110'
                  : answers[idx] !== null
                    ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                    : 'bg-surface-800 text-surface-500 hover:bg-surface-700'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl mx-auto"
          >
            <div className="glass-card p-6 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${question.tipo === 'comun' ? 'badge-blue' : 'badge-purple'}`}>
                  {question.tipo === 'comun' ? 'Bloque comun' : 'Especifica del puesto'}
                </span>
                <span className="text-xs text-surface-500">{question.categoria}</span>
              </div>
              <div className="flex items-start gap-3 mb-5">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">
                  {currentQuestion + 1}
                </span>
                <p className="text-surface-100 font-medium leading-relaxed pt-1">{question.texto}</p>
              </div>

              <div className="space-y-2">
                {OPTION_KEYS.map((key) => {
                  const isSelected = answers[currentQuestion] === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectAnswer(key)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                        isSelected
                          ? 'bg-primary-500/15 border-primary-500/50 text-surface-100'
                          : 'bg-surface-900/40 border-surface-700 text-surface-300 hover:border-surface-500 hover:bg-surface-800/60'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                          isSelected ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-400'
                        }`}
                      >
                        {key.toUpperCase()}
                      </span>
                      <span className="text-sm">{question.opciones[key]}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                className="btn-secondary flex items-center gap-2"
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              {currentQuestion === examQuestions.length - 1 ? (
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => {
                    if (answeredCount < examQuestions.length) setShowConfirmFinish(true);
                    else finishExam();
                  }}
                >
                  <CheckCircle size={16} />
                  Finalizar Examen
                </button>
              ) : (
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => setCurrentQuestion((p) => Math.min(examQuestions.length - 1, p + 1))}
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Confirm Finish Modal */}
      <AnimatePresence>
        {showConfirmFinish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmFinish(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-surface-100 mb-2">Finalizar Examen</h3>
              <p className="text-sm text-surface-400 mb-1">
                Has respondido <span className="text-surface-200 font-bold">{answeredCount}</span> de{' '}
                <span className="text-surface-200 font-bold">{examQuestions.length}</span> preguntas.
              </p>
              {answeredCount < examQuestions.length && (
                <p className="text-sm text-warning-500 mb-4">
                  Las preguntas sin responder se contaran como incorrectas.
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button className="btn-secondary flex-1" onClick={() => setShowConfirmFinish(false)}>
                  Continuar
                </button>
                <button className="btn-primary flex-1" onClick={finishExam}>
                  Finalizar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
