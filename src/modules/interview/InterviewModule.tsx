import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  User,
  FileText,
  Eye,
  Briefcase,
  Clock,
  Star,
  Trophy,
  Check,
  Camera,
  Search,
  ChevronRight,
  Info,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import type { Candidate, InterviewData, Verdict, JobPosition } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import {
  calculateInterviewScore,
  getVerdict,
  getVerdictLabel,
  getVerdictColor,
  POSITIVE_TRAITS,
  NEGATIVE_TRAITS,
} from '../../utils/scoring';
import { generateId, formatDate, fileToBase64 } from '../../utils/helpers';
import StarRatingComponent from '../../components/StarRating';
import PhotoCapture from '../../components/PhotoCapture';

// ── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'Datos del Candidato',
  'Documentos Adjuntos',
  'Presentacion General',
  'Experiencia Laboral',
  'Disponibilidad',
  'Actitud y Calificacion',
  'Resultado',
];

const STEP_ICONS = [User, FileText, Eye, Briefcase, Clock, Star, Trophy];

const OPEN_QUESTIONS = [
  'Que hace si no entiende una instruccion?',
  'Que hace si ve que un companero hace algo mal?',
  'Que es lo mas importante en un trabajo?',
  'Prefiere trabajar solo o en equipo?',
];

const RATING_CRITERIA: { key: keyof InterviewData['step6']['ratings']; label: string }[] = [
  { key: 'attitude', label: 'Actitud' },
  { key: 'responsibility', label: 'Responsabilidad percibida' },
  { key: 'willingness', label: 'Disposicion para trabajar' },
  { key: 'stability', label: 'Estabilidad' },
  { key: 'communication', label: 'Comunicacion' },
  { key: 'presentation', label: 'Presentacion' },
];

const EMPLOYMENT_TIME_OPTIONS = [
  { value: '<3m', label: 'Menos de 3 meses' },
  { value: '3-6m', label: '3 a 6 meses' },
  { value: '6m-1a', label: '6 meses a 1 ano' },
  { value: '+1a', label: 'Mas de 1 ano' },
];

const CONDITION_KEYS: { key: keyof InterviewData['step5']; label: string }[] = [
  { key: 'standingWork', label: 'Trabajar de pie' },
  { key: 'heavyLifting', label: 'Cargar cosas pesadas' },
  { key: 'gettingDirty', label: 'Ensuciarse' },
  { key: 'repetitiveWork', label: 'Trabajo repetitivo' },
  { key: 'rulesAndUniform', label: 'Reglas y uniforme' },
];

// ── Initial interview data ───────────────────────────────────────────────────

function createEmptyInterviewData(): InterviewData {
  return {
    interviewer: '',
    date: new Date().toISOString().split('T')[0],
    step3: { positives: [], negatives: [], comment: '' },
    step4: {
      lastCompany: '',
      lastPosition: '',
      activities: '',
      exitReason: '',
      hasSimilarExperience: false,
      previousEmploymentTime: '<3m',
      seeksStability: true,
    },
    step5: {
      standingWork: true,
      heavyLifting: true,
      gettingDirty: true,
      repetitiveWork: true,
      rulesAndUniform: true,
      frequentAbsences: false,
      transportation: '',
      availableSchedule: '',
    },
    step6: {
      answers: OPEN_QUESTIONS.map((q) => ({ question: q, answer: '' })),
      ratings: {
        attitude: 3,
        responsibility: 3,
        willingness: 3,
        stability: 3,
        communication: 3,
        presentation: 3,
      },
      observations: '',
    },
    step7: {
      offeredSalary: '',
      offeredSchedule: '',
      startDate: '',
      notes: '',
    },
  };
}

// ── Slide animation variants ─────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

// ── Progress Steps Component ─────────────────────────────────────────────────

function ProgressSteps({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="w-full">
      {/* Mobile: compact */}
      <div className="flex items-center justify-between mb-2 sm:hidden">
        <span className="text-sm text-surface-400">
          Paso {currentStep + 1} de {totalSteps}
        </span>
        <span className="text-sm font-medium text-surface-200">{STEP_LABELS[currentStep]}</span>
      </div>
      <div className="sm:hidden w-full h-2 rounded-full bg-surface-800/60 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
          initial={false}
          animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' as const }}
        />
      </div>

      {/* Desktop: full stepper */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-[40px] right-[40px] h-0.5 bg-surface-700/50" />
        {/* Active line */}
        <motion.div
          className="absolute top-5 left-[40px] h-0.5 bg-gradient-to-r from-primary-500 to-accent-500"
          initial={false}
          animate={{
            width: `${(currentStep / (totalSteps - 1)) * (100 - (80 / (totalSteps * 80 + (totalSteps - 1) * 20)) * 100)}%`,
          }}
          style={{
            width: `${(currentStep / (totalSteps - 1)) * 100}%`,
            maxWidth: 'calc(100% - 80px)',
          }}
          transition={{ duration: 0.4, ease: 'easeInOut' as const }}
        />
        {STEP_LABELS.map((label, idx) => {
          const Icon = STEP_ICONS[idx];
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div key={idx} className="flex flex-col items-center z-10 relative" style={{ width: 80 }}>
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-primary-600 border-primary-500 text-white'
                    : isCurrent
                      ? 'bg-primary-600/30 border-primary-400 text-primary-300 glow-primary'
                      : 'bg-surface-800/60 border-surface-600/40 text-surface-500'
                }`}
                animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </motion.div>
              <span
                className={`text-[10px] mt-1.5 text-center leading-tight font-medium transition-colors ${
                  isCurrent ? 'text-primary-300' : isCompleted ? 'text-surface-300' : 'text-surface-500'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Toggle Button Pair ───────────────────────────────────────────────────────

function ToggleButtons({
  value,
  onChange,
  labelTrue = 'Si',
  labelFalse = 'No',
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  labelTrue?: string;
  labelFalse?: string;
}) {
  return (
    <div className="inline-flex rounded-xl overflow-hidden border border-surface-600/30">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          value
            ? 'bg-primary-600 text-white shadow-inner'
            : 'bg-surface-800/40 text-surface-400 hover:bg-surface-700/50'
        }`}
      >
        {labelTrue}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          !value
            ? 'bg-danger-600 text-white shadow-inner'
            : 'bg-surface-800/40 text-surface-400 hover:bg-surface-700/50'
        }`}
      >
        {labelFalse}
      </button>
    </div>
  );
}

// ── Score Bar Component ──────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-surface-300">{label}</span>
        <span className="font-semibold text-surface-200">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="h-3 rounded-full bg-surface-800/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' as const }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function InterviewModule() {
  const { candidates, updateCandidate, settings } = useStore();
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewData>(createEmptyInterviewData());
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'pending' | 'completed'>('pending');
  const [viewingResult, setViewingResult] = useState<Candidate | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Candidate Filtering ──────────────────────────────────────────────────

  const pendingCandidates = useMemo(
    () =>
      candidates.filter(
        (c) => !c.interviewCompleted && !c.hired
      ),
    [candidates]
  );

  const completedCandidates = useMemo(
    () => candidates.filter((c) => c.interviewCompleted),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const list = filterTab === 'pending' ? pendingCandidates : completedCandidates;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        JOB_POSITIONS[c.position]?.name.toLowerCase().includes(q)
    );
  }, [filterTab, pendingCandidates, completedCandidates, searchQuery]);

  // ── Interview Actions ────────────────────────────────────────────────────

  const startInterview = useCallback((candidate: Candidate) => {
    setActiveCandidate(candidate);
    if (candidate.interviewData) {
      setInterviewData({ ...candidate.interviewData });
    } else {
      setInterviewData(createEmptyInterviewData());
    }
    setCurrentStep(0);
    setDirection(0);
  }, []);

  const goNext = useCallback(() => {
    if (currentStep < 6) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  const updateStep3 = useCallback(
    (field: keyof InterviewData['step3'], value: unknown) => {
      setInterviewData((prev) => ({
        ...prev,
        step3: { ...prev.step3, [field]: value },
      }));
    },
    []
  );

  const updateStep4 = useCallback(
    (field: keyof InterviewData['step4'], value: unknown) => {
      setInterviewData((prev) => ({
        ...prev,
        step4: { ...prev.step4, [field]: value },
      }));
    },
    []
  );

  const updateStep5 = useCallback(
    (field: keyof InterviewData['step5'], value: unknown) => {
      setInterviewData((prev) => ({
        ...prev,
        step5: { ...prev.step5, [field]: value },
      }));
    },
    []
  );

  const updateStep6 = useCallback(
    (field: string, value: unknown) => {
      setInterviewData((prev) => ({
        ...prev,
        step6: { ...prev.step6, [field]: value },
      }));
    },
    []
  );

  const updateStep6Rating = useCallback(
    (key: keyof InterviewData['step6']['ratings'], val: number) => {
      setInterviewData((prev) => ({
        ...prev,
        step6: { ...prev.step6, ratings: { ...prev.step6.ratings, [key]: val } },
      }));
    },
    []
  );

  const updateStep6Answer = useCallback((index: number, answer: string) => {
    setInterviewData((prev) => {
      const answers = [...prev.step6.answers];
      answers[index] = { ...answers[index], answer };
      return { ...prev, step6: { ...prev.step6, answers } };
    });
  }, []);

  const updateStep7 = useCallback(
    (field: keyof InterviewData['step7'], value: string) => {
      setInterviewData((prev) => ({
        ...prev,
        step7: { ...prev.step7, [field]: value },
      }));
    },
    []
  );

  const togglePositive = useCallback(
    (trait: string) => {
      setInterviewData((prev) => {
        const positives = prev.step3.positives.includes(trait)
          ? prev.step3.positives.filter((t) => t !== trait)
          : [...prev.step3.positives, trait];
        return { ...prev, step3: { ...prev.step3, positives } };
      });
    },
    []
  );

  const toggleNegative = useCallback(
    (trait: string) => {
      setInterviewData((prev) => {
        const negatives = prev.step3.negatives.includes(trait)
          ? prev.step3.negatives.filter((t) => t !== trait)
          : [...prev.step3.negatives, trait];
        return { ...prev, step3: { ...prev.step3, negatives } };
      });
    },
    []
  );

  const saveInterview = useCallback(() => {
    if (!activeCandidate) return;
    setSaving(true);
    const score = calculateInterviewScore(interviewData);
    const verdict = getVerdict(score, settings.recommendedThreshold, settings.reservationsThreshold);

    updateCandidate(activeCandidate.id, {
      interviewData,
      interviewScore: score,
      interviewCompleted: true,
      verdict,
    });

    setTimeout(() => {
      setSaving(false);
      setActiveCandidate(null);
      setCurrentStep(0);
    }, 600);
  }, [activeCandidate, interviewData, settings, updateCandidate]);

  // ── Calculated Score (for step 7) ────────────────────────────────────────

  const calculatedScore = useMemo(() => calculateInterviewScore(interviewData), [interviewData]);

  const calculatedVerdict = useMemo(
    () => getVerdict(calculatedScore, settings.recommendedThreshold, settings.reservationsThreshold),
    [calculatedScore, settings]
  );

  // ── Section Score Breakdown (for step 7 bars) ───────────────────────────

  const sectionScores = useMemo(() => {
    const data = interviewData;
    // Attitude & Presentation
    let attitudeRaw = 0;
    const posCount = data.step3.positives.length;
    const negCount = data.step3.negatives.filter((n) => n !== 'Nervioso').length;
    const nervousCount = data.step3.negatives.filter((n) => n === 'Nervioso').length;
    attitudeRaw += posCount * 20;
    attitudeRaw -= negCount * 15;
    attitudeRaw -= nervousCount * 5;
    const starAvg1 =
      (data.step6.ratings.attitude + data.step6.ratings.presentation + data.step6.ratings.willingness) / 3;
    const attitudeScore = Math.max(
      0,
      Math.min(35, (attitudeRaw / 100) * 0.4 * 35 + (starAvg1 / 5) * 0.6 * 35)
    );

    // Experience & Stability
    let expRaw = 0;
    const timeMap: Record<string, number> = { '<3m': 0, '3-6m': 33, '6m-1a': 66, '+1a': 99 };
    expRaw += (timeMap[data.step4.previousEmploymentTime] || 0) * 0.4;
    expRaw += data.step4.seeksStability ? 20 : 0;
    expRaw += data.step4.hasSimilarExperience ? 20 : 0;
    const starAvg2 = (data.step6.ratings.responsibility + data.step6.ratings.stability) / 2;
    const expScore = Math.max(0, Math.min(30, (expRaw / 100) * 0.7 * 30 + (starAvg2 / 5) * 0.3 * 30));

    // Availability
    let availRaw = 0;
    if (data.step5.standingWork) availRaw += 16;
    if (data.step5.heavyLifting) availRaw += 16;
    if (data.step5.gettingDirty) availRaw += 16;
    if (data.step5.repetitiveWork) availRaw += 16;
    if (data.step5.rulesAndUniform) availRaw += 16;
    if (!data.step5.frequentAbsences) availRaw += 20;
    const availScore = Math.max(0, Math.min(20, (availRaw / 100) * 20));

    // Interviewer Rating
    const ratings = data.step6.ratings;
    const avgRating =
      (ratings.attitude +
        ratings.responsibility +
        ratings.willingness +
        ratings.stability +
        ratings.communication +
        ratings.presentation) /
      6;
    const interviewerScore = Math.max(0, Math.min(15, (avgRating / 5) * 15));

    return [
      { label: 'Actitud y Presentacion', value: attitudeScore, max: 35, color: 'bg-gradient-to-r from-blue-500 to-cyan-400' },
      { label: 'Experiencia y Estabilidad', value: expScore, max: 30, color: 'bg-gradient-to-r from-purple-500 to-pink-400' },
      { label: 'Disponibilidad', value: availScore, max: 20, color: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
      { label: 'Calificacion del Entrevistador', value: interviewerScore, max: 15, color: 'bg-gradient-to-r from-amber-500 to-orange-400' },
    ];
  }, [interviewData]);

  // ── Photo handlers for step 2 ──────────────────────────────────────────

  const handleApplicationPhoto = useCallback(
    (base64: string) => {
      if (activeCandidate) {
        updateCandidate(activeCandidate.id, { applicationPhotoUrl: base64 });
        setActiveCandidate((prev) => (prev ? { ...prev, applicationPhotoUrl: base64 } : null));
      }
    },
    [activeCandidate, updateCandidate]
  );

  const handleCvPhoto = useCallback(
    (base64: string) => {
      if (activeCandidate) {
        updateCandidate(activeCandidate.id, { cvPhotoUrl: base64 });
        setActiveCandidate((prev) => (prev ? { ...prev, cvPhotoUrl: base64 } : null));
      }
    },
    [activeCandidate, updateCandidate]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ██  RENDER: VIEW RESULT (read-only completed interview)
  // ══════════════════════════════════════════════════════════════════════════

  if (viewingResult) {
    const c = viewingResult;
    const d = c.interviewData!;
    const score = c.interviewScore ?? 0;
    const verdict = c.verdict ?? 'not_recommended';

    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setViewingResult(null)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
          <div>
            <h2 className="text-2xl font-bold text-surface-100">Resultado de Entrevista</h2>
            <p className="text-surface-400">{c.fullName} &mdash; {JOB_POSITIONS[c.position]?.name}</p>
          </div>
        </div>

        {/* Score & Verdict */}
        <div className="glass-card p-6 text-center space-y-4">
          <div className="relative inline-block">
            <svg className="w-36 h-36" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="8" />
              <motion.circle
                cx="70"
                cy="70"
                r="62"
                fill="none"
                stroke={verdict === 'recommended' ? '#22c55e' : verdict === 'reservations' ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 62}
                strokeDashoffset={2 * Math.PI * 62}
                animate={{ strokeDashoffset: 2 * Math.PI * 62 * (1 - score / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' as const }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-surface-100">{score}</span>
              <span className="text-xs text-surface-400">/ 100</span>
            </div>
          </div>
          <div>
            <span className={`badge text-base px-6 py-2 ${getVerdictColor(verdict)}`}>
              {getVerdictLabel(verdict)}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 space-y-3">
            <h3 className="font-semibold text-surface-200 flex items-center gap-2">
              <User size={16} className="text-primary-400" />
              Datos de la Entrevista
            </h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-surface-400">Entrevistador:</span> <span className="text-surface-200">{d.interviewer || '---'}</span></p>
              <p><span className="text-surface-400">Fecha:</span> <span className="text-surface-200">{formatDate(d.date)}</span></p>
              <p><span className="text-surface-400">Sueldo ofrecido:</span> <span className="text-surface-200">{d.step7.offeredSalary || '---'}</span></p>
              <p><span className="text-surface-400">Horario:</span> <span className="text-surface-200">{d.step7.offeredSchedule || '---'}</span></p>
              <p><span className="text-surface-400">Fecha de ingreso:</span> <span className="text-surface-200">{d.step7.startDate ? formatDate(d.step7.startDate) : '---'}</span></p>
            </div>
          </div>
          <div className="glass-card p-5 space-y-3">
            <h3 className="font-semibold text-surface-200 flex items-center gap-2">
              <Star size={16} className="text-amber-400" />
              Calificaciones
            </h3>
            <div className="space-y-2">
              {RATING_CRITERIA.map((rc) => (
                <div key={rc.key} className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">{rc.label}</span>
                  <StarRatingComponent value={d.step6.ratings[rc.key]} readOnly size={16} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-semibold text-surface-200">Desglose de Puntuacion</h3>
          {(() => {
            const s = interviewData; // we need to recalculate from the viewingResult
            const dat = c.interviewData!;
            let attRaw = 0;
            const pc = dat.step3.positives.length;
            const nc = dat.step3.negatives.filter((n) => n !== 'Nervioso').length;
            const nvc = dat.step3.negatives.filter((n) => n === 'Nervioso').length;
            attRaw += pc * 20; attRaw -= nc * 15; attRaw -= nvc * 5;
            const sa1 = (dat.step6.ratings.attitude + dat.step6.ratings.presentation + dat.step6.ratings.willingness) / 3;
            const attScore = Math.max(0, Math.min(35, (attRaw / 100) * 0.4 * 35 + (sa1 / 5) * 0.6 * 35));
            let eRaw = 0;
            const tm: Record<string, number> = { '<3m': 0, '3-6m': 33, '6m-1a': 66, '+1a': 99 };
            eRaw += (tm[dat.step4.previousEmploymentTime] || 0) * 0.4;
            eRaw += dat.step4.seeksStability ? 20 : 0;
            eRaw += dat.step4.hasSimilarExperience ? 20 : 0;
            const sa2 = (dat.step6.ratings.responsibility + dat.step6.ratings.stability) / 2;
            const eScore = Math.max(0, Math.min(30, (eRaw / 100) * 0.7 * 30 + (sa2 / 5) * 0.3 * 30));
            let avRaw = 0;
            if (dat.step5.standingWork) avRaw += 16;
            if (dat.step5.heavyLifting) avRaw += 16;
            if (dat.step5.gettingDirty) avRaw += 16;
            if (dat.step5.repetitiveWork) avRaw += 16;
            if (dat.step5.rulesAndUniform) avRaw += 16;
            if (!dat.step5.frequentAbsences) avRaw += 20;
            const avScore = Math.max(0, Math.min(20, (avRaw / 100) * 20));
            const r = dat.step6.ratings;
            const ar = (r.attitude + r.responsibility + r.willingness + r.stability + r.communication + r.presentation) / 6;
            const iScore = Math.max(0, Math.min(15, (ar / 5) * 15));
            const bars = [
              { label: 'Actitud y Presentacion', value: attScore, max: 35, color: 'bg-gradient-to-r from-blue-500 to-cyan-400' },
              { label: 'Experiencia y Estabilidad', value: eScore, max: 30, color: 'bg-gradient-to-r from-purple-500 to-pink-400' },
              { label: 'Disponibilidad', value: avScore, max: 20, color: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
              { label: 'Calificacion del Entrevistador', value: iScore, max: 15, color: 'bg-gradient-to-r from-amber-500 to-orange-400' },
            ];
            return bars.map((b, i) => <ScoreBar key={i} {...b} />);
          })()}
        </div>

        {/* Notes */}
        {d.step6.observations && (
          <div className="glass-card p-5 space-y-2">
            <h3 className="font-semibold text-surface-200">Observaciones del Entrevistador</h3>
            <p className="text-sm text-surface-300 whitespace-pre-wrap">{d.step6.observations}</p>
          </div>
        )}
        {d.step7.notes && (
          <div className="glass-card p-5 space-y-2">
            <h3 className="font-semibold text-surface-200">Notas Finales</h3>
            <p className="text-sm text-surface-300 whitespace-pre-wrap">{d.step7.notes}</p>
          </div>
        )}
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ██  RENDER: INTERVIEW WIZARD
  // ══════════════════════════════════════════════════════════════════════════

  if (activeCandidate) {
    const c = activeCandidate;

    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Wizard Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveCandidate(null)}
              className="p-2 rounded-xl text-surface-400 hover:text-surface-200 hover:bg-surface-700/40 transition-colors"
              aria-label="Volver a lista"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-surface-100">Entrevista</h2>
              <p className="text-sm text-surface-400">
                {c.fullName} &mdash; {JOB_POSITIONS[c.position]?.name}
              </p>
            </div>
          </div>
          {c.mathCompleted && (
            <span className="badge badge-blue">
              Examen: {c.mathScore ?? 0} pts
            </span>
          )}
        </div>

        {/* Progress Steps */}
        <div className="glass-card p-4">
          <ProgressSteps currentStep={currentStep} totalSteps={7} />
        </div>

        {/* Step Content */}
        <div className="relative overflow-hidden min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' as const }}
              className="w-full"
            >
              {/* ── STEP 1: Datos del Candidato ─────────────────────────── */}
              {currentStep === 0 && (
                <div className="glass-card p-6 space-y-6">
                  <h3 className="text-lg font-semibold gradient-text">Datos del Candidato</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Nombre completo', value: c.fullName },
                      { label: 'Edad', value: `${c.age} anos` },
                      { label: 'Telefono', value: c.phone },
                      { label: 'Colonia / Zona', value: c.neighborhood },
                      { label: 'Fecha de solicitud', value: formatDate(c.applicationDate) },
                      { label: 'Puesto', value: JOB_POSITIONS[c.position]?.name },
                    ].map((item, i) => (
                      <div key={i} className="glass-light rounded-xl p-4">
                        <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                          {item.label}
                        </span>
                        <p className="text-surface-100 font-medium mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Interviewer Input */}
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Nombre del entrevistador
                    </label>
                    <input
                      type="text"
                      className="input-field max-w-md"
                      placeholder="Ej: Ana Garcia"
                      value={interviewData.interviewer}
                      onChange={(e) =>
                        setInterviewData((prev) => ({ ...prev, interviewer: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 2: Documentos Adjuntos ─────────────────────────── */}
              {currentStep === 1 && (
                <div className="glass-card p-6 space-y-6">
                  <h3 className="text-lg font-semibold gradient-text">Documentos Adjuntos</h3>
                  <p className="text-sm text-surface-400">
                    Capture o suba fotos de la solicitud de empleo y el CV del candidato.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PhotoCapture
                      label="Solicitud de Empleo"
                      currentPhoto={c.applicationPhotoUrl}
                      onCapture={handleApplicationPhoto}
                    />
                    <PhotoCapture
                      label="Curriculum Vitae"
                      currentPhoto={c.cvPhotoUrl}
                      onCapture={handleCvPhoto}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 3: Presentacion General ─────────────────────────── */}
              {currentStep === 2 && (
                <div className="glass-card p-6 space-y-6">
                  <h3 className="text-lg font-semibold gradient-text">
                    Presentacion General (Observacion Directa)
                  </h3>

                  {/* Positive Traits */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Aspectos Positivos (suman puntos)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {POSITIVE_TRAITS.map((trait) => {
                        const active = interviewData.step3.positives.includes(trait);
                        return (
                          <button
                            key={trait}
                            type="button"
                            onClick={() => togglePositive(trait)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                              active
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                                : 'bg-surface-800/40 border-surface-600/30 text-surface-400 hover:border-surface-500/50 hover:text-surface-300'
                            }`}
                          >
                            {active && <Check size={14} className="inline mr-1.5 -mt-0.5" />}
                            {trait}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Negative Traits */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                      <XCircle size={16} />
                      Aspectos Negativos (restan puntos)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {NEGATIVE_TRAITS.map((trait) => {
                        const active = interviewData.step3.negatives.includes(trait);
                        return (
                          <button
                            key={trait}
                            type="button"
                            onClick={() => toggleNegative(trait)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                              active
                                ? 'bg-red-500/20 border-red-500/40 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                                : 'bg-surface-800/40 border-surface-600/30 text-surface-400 hover:border-surface-500/50 hover:text-surface-300'
                            }`}
                          >
                            {active && <Check size={14} className="inline mr-1.5 -mt-0.5" />}
                            {trait}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-amber-300/80">
                        &quot;Nervioso&quot; tiene peso reducido en el calculo final. Es normal que el candidato este
                        nervioso durante la entrevista.
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      Comentarios de observacion
                    </label>
                    <textarea
                      className="input-field min-h-[80px] resize-y"
                      placeholder="Notas sobre la presentacion general del candidato..."
                      value={interviewData.step3.comment}
                      onChange={(e) => updateStep3('comment', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 4: Experiencia Laboral ──────────────────────────── */}
              {currentStep === 3 && (
                <div className="glass-card p-6 space-y-5">
                  <h3 className="text-lg font-semibold gradient-text">Experiencia Laboral y Estabilidad</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-1.5">
                        Ultima empresa
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Nombre de la empresa"
                        value={interviewData.step4.lastCompany}
                        onChange={(e) => updateStep4('lastCompany', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-1.5">
                        Ultimo puesto
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Puesto desempenado"
                        value={interviewData.step4.lastPosition}
                        onChange={(e) => updateStep4('lastPosition', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">
                      Actividades realizadas
                    </label>
                    <textarea
                      className="input-field min-h-[70px] resize-y"
                      placeholder="Describir actividades principales..."
                      value={interviewData.step4.activities}
                      onChange={(e) => updateStep4('activities', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1.5">
                      Motivo de salida
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Razon por la que dejo el empleo anterior"
                      value={interviewData.step4.exitReason}
                      onChange={(e) => updateStep4('exitReason', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-surface-300">
                        Experiencia similar al puesto?
                      </label>
                      <ToggleButtons
                        value={interviewData.step4.hasSimilarExperience}
                        onChange={(v) => updateStep4('hasSimilarExperience', v)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-surface-300">
                        Busca trabajo estable o temporal?
                      </label>
                      <ToggleButtons
                        value={interviewData.step4.seeksStability}
                        onChange={(v) => updateStep4('seeksStability', v)}
                        labelTrue="Estable"
                        labelFalse="Temporal"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-surface-300">
                      Tiempo en trabajos anteriores
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EMPLOYMENT_TIME_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateStep4('previousEmploymentTime', opt.value)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                            interviewData.step4.previousEmploymentTime === opt.value
                              ? 'bg-primary-600/30 border-primary-400/50 text-primary-300'
                              : 'bg-surface-800/40 border-surface-600/30 text-surface-400 hover:border-surface-500/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 5: Disponibilidad ───────────────────────────────── */}
              {currentStep === 4 && (
                <div className="glass-card p-6 space-y-6">
                  <h3 className="text-lg font-semibold gradient-text">Disponibilidad y Condiciones</h3>

                  <div className="space-y-3">
                    {CONDITION_KEYS.map((cond) => (
                      <div
                        key={cond.key}
                        className="flex items-center justify-between p-3 rounded-xl glass-light"
                      >
                        <span className="text-sm text-surface-200 font-medium">{cond.label}</span>
                        <ToggleButtons
                          value={interviewData.step5[cond.key] as boolean}
                          onChange={(v) => updateStep5(cond.key, v)}
                          labelTrue="Sin problema"
                          labelFalse="Tiene problema"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl glass-light">
                    <span className="text-sm text-surface-200 font-medium">Faltas frecuentes</span>
                    <ToggleButtons
                      value={interviewData.step5.frequentAbsences}
                      onChange={(v) => updateStep5('frequentAbsences', v)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-1.5">
                        Transporte
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Como llega al trabajo?"
                        value={interviewData.step5.transportation}
                        onChange={(e) => updateStep5('transportation', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-1.5">
                        Horario disponible
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ej: Lunes a Viernes 8:00 - 17:00"
                        value={interviewData.step5.availableSchedule}
                        onChange={(e) => updateStep5('availableSchedule', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 6: Actitud y Calificacion ──────────────────────── */}
              {currentStep === 5 && (
                <div className="glass-card p-6 space-y-6">
                  <h3 className="text-lg font-semibold gradient-text">Actitud, Respuestas y Calificacion</h3>

                  {/* Open Questions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                      Preguntas Abiertas
                    </h4>
                    {OPEN_QUESTIONS.map((q, idx) => (
                      <div key={idx}>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5">
                          {q}
                        </label>
                        <textarea
                          className="input-field min-h-[60px] resize-y"
                          placeholder="Respuesta del candidato..."
                          value={interviewData.step6.answers[idx]?.answer ?? ''}
                          onChange={(e) => updateStep6Answer(idx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Star Ratings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                      Calificacion por Criterio
                    </h4>
                    <div className="space-y-3">
                      {RATING_CRITERIA.map((rc) => (
                        <div
                          key={rc.key}
                          className="flex items-center justify-between p-3 rounded-xl glass-light"
                        >
                          <span className="text-sm text-surface-200 font-medium">{rc.label}</span>
                          <StarRatingComponent
                            value={interviewData.step6.ratings[rc.key]}
                            onChange={(v) => updateStep6Rating(rc.key, v)}
                            size={22}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Important Observations */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-400" />
                      <h4 className="text-sm font-semibold text-amber-300">
                        Observaciones Importantes
                      </h4>
                    </div>
                    <div className="p-[1px] rounded-xl bg-gradient-to-r from-amber-500/40 to-orange-500/40">
                      <textarea
                        className="w-full min-h-[100px] resize-y bg-surface-900/80 rounded-xl px-4 py-3 text-sm text-surface-200 placeholder-surface-500 outline-none focus:ring-0"
                        placeholder="Este campo es el mas importante. Escriba sus observaciones principales sobre el candidato..."
                        value={interviewData.step6.observations}
                        onChange={(e) => updateStep6('observations', e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-amber-400/60">
                      Este es el campo de mayor relevancia para la decision final.
                    </p>
                  </div>
                </div>
              )}

              {/* ── STEP 7: Resultado Automatico ─────────────────────────── */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  {/* Score Circle */}
                  <div className="glass-card p-6 text-center space-y-4">
                    <h3 className="text-lg font-semibold gradient-text">Resultado Automatico</h3>

                    <div className="relative inline-block">
                      <svg className="w-40 h-40" viewBox="0 0 140 140">
                        <circle
                          cx="70"
                          cy="70"
                          r="62"
                          fill="none"
                          stroke="rgba(148,163,184,0.15)"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="70"
                          cy="70"
                          r="62"
                          fill="none"
                          stroke={
                            calculatedVerdict === 'recommended'
                              ? '#22c55e'
                              : calculatedVerdict === 'reservations'
                                ? '#f59e0b'
                                : '#ef4444'
                          }
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 62}
                          strokeDashoffset={2 * Math.PI * 62}
                          animate={{
                            strokeDashoffset: 2 * Math.PI * 62 * (1 - calculatedScore / 100),
                          }}
                          transition={{ duration: 1.2, ease: 'easeOut' as const }}
                          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                          className="text-5xl font-bold text-surface-100"
                          key={calculatedScore}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.4 }}
                        >
                          {calculatedScore}
                        </motion.span>
                        <span className="text-sm text-surface-400">/ 100</span>
                      </div>
                    </div>

                    <motion.div
                      key={calculatedVerdict}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <span
                        className={`badge text-base px-6 py-2 ${getVerdictColor(calculatedVerdict)}`}
                      >
                        {getVerdictLabel(calculatedVerdict)}
                      </span>
                    </motion.div>

                    <p className="text-xs text-surface-500">
                      Umbrales: Recomendado &ge; {settings.recommendedThreshold} &nbsp;|&nbsp; Con
                      Reservas &ge; {settings.reservationsThreshold}
                    </p>
                  </div>

                  {/* Score Breakdown Bars */}
                  <div className="glass-card p-6 space-y-4">
                    <h4 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                      Desglose por Seccion
                    </h4>
                    {sectionScores.map((s, i) => (
                      <ScoreBar key={i} label={s.label} value={s.value} max={s.max} color={s.color} />
                    ))}
                  </div>

                  {/* Final Details */}
                  <div className="glass-card p-6 space-y-4">
                    <h4 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                      Oferta y Observaciones
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5">
                          Sueldo ofrecido
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ej: $2,500 semanal"
                          value={interviewData.step7.offeredSalary}
                          onChange={(e) => updateStep7('offeredSalary', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5">
                          Horario ofrecido
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ej: L-V 8:00-17:00"
                          value={interviewData.step7.offeredSchedule}
                          onChange={(e) => updateStep7('offeredSchedule', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-300 mb-1.5">
                          Fecha de ingreso propuesta
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          value={interviewData.step7.startDate}
                          onChange={(e) => updateStep7('startDate', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-1.5">
                        Notas finales
                      </label>
                      <textarea
                        className="input-field min-h-[80px] resize-y"
                        placeholder="Observaciones adicionales..."
                        value={interviewData.step7.notes}
                        onChange={(e) => updateStep7('notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentStep === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-30"
          >
            <ArrowLeft size={18} />
            Anterior
          </button>

          <div className="flex items-center gap-2 text-sm text-surface-500">
            {STEP_LABELS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  idx === currentStep
                    ? 'bg-primary-400 scale-125'
                    : idx < currentStep
                      ? 'bg-primary-600/60'
                      : 'bg-surface-600/40'
                } hover:scale-125`}
                aria-label={`Ir al paso ${idx + 1}`}
              />
            ))}
          </div>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={goNext}
              className="btn-primary flex items-center gap-2"
            >
              Siguiente
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={saveInterview}
              disabled={saving}
              className="btn-success flex items-center gap-2"
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}
                  >
                    <Save size={18} />
                  </motion.div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Entrevista
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ██  RENDER: INTERVIEW LIST (VIEW 1)
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Entrevistas</h1>
          <p className="text-surface-400 text-sm mt-1">
            Gestiona las entrevistas de los candidatos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-blue">{pendingCandidates.length} pendientes</span>
          <span className="badge badge-green">{completedCandidates.length} completadas</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="inline-flex rounded-xl overflow-hidden border border-surface-600/30 self-start">
          <button
            type="button"
            onClick={() => setFilterTab('pending')}
            className={`px-5 py-2.5 text-sm font-semibold transition-all ${
              filterTab === 'pending'
                ? 'bg-primary-600 text-white'
                : 'bg-surface-800/40 text-surface-400 hover:bg-surface-700/50'
            }`}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('completed')}
            className={`px-5 py-2.5 text-sm font-semibold transition-all ${
              filterTab === 'completed'
                ? 'bg-primary-600 text-white'
                : 'bg-surface-800/40 text-surface-400 hover:bg-surface-700/50'
            }`}
          >
            Completadas
          </button>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Buscar candidato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Candidate Cards */}
      {filteredCandidates.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-surface-600 mb-4" />
          <p className="text-surface-400">
            {filterTab === 'pending'
              ? 'No hay candidatos pendientes de entrevista.'
              : 'No hay entrevistas completadas.'}
          </p>
          <p className="text-surface-500 text-sm mt-1">
            {filterTab === 'pending'
              ? 'Los candidatos apareceran aqui cuando sean registrados.'
              : 'Las entrevistas completadas apareceran aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCandidates.map((c) => {
              const posInfo = JOB_POSITIONS[c.position];
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="glass-card p-5 flex flex-col gap-4"
                >
                  {/* Candidate Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-600/40 to-accent-600/40 flex items-center justify-center flex-shrink-0 border border-surface-600/20">
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.fullName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <User size={20} className="text-surface-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-surface-100 truncate">{c.fullName}</h3>
                      <p className="text-xs text-surface-400">{posInfo?.name ?? c.position}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-2">
                    {c.mathCompleted && (
                      <span className="badge badge-blue">
                        Examen: {c.mathScore ?? 0}
                      </span>
                    )}
                    {!c.mathCompleted && (
                      <span className="badge" style={{ background: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' }}>
                        Sin examen
                      </span>
                    )}
                    {c.interviewCompleted ? (
                      <span
                        className={`badge ${c.verdict ? getVerdictColor(c.verdict) : 'badge-green'}`}
                      >
                        {c.verdict ? getVerdictLabel(c.verdict) : 'Completada'}
                        {c.interviewScore != null && ` (${c.interviewScore})`}
                      </span>
                    ) : (
                      <span className="badge badge-yellow">Pendiente</span>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto pt-1">
                    {c.interviewCompleted ? (
                      <button
                        type="button"
                        onClick={() => setViewingResult(c)}
                        className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
                      >
                        <Eye size={16} />
                        Ver Resultado
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startInterview(c)}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                      >
                        <ChevronRight size={16} />
                        Iniciar Entrevista
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
