import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Award,
  PenTool,
  Play,
  Pause,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Search,
  User,
  Calendar,
  Briefcase,
  FileText,
  AlertTriangle,
  Video,
  Lock,
  HelpCircle,
  Captions,
  FastForward,
  MapPin,
  Ban,
  Film,
  X,
  Info,
} from 'lucide-react';
import type { Employee, OnboardingModule as OnboardingModuleType } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import {
  QUIZ_MODULES,
  getQuizQuestions,
  getVideoQuizQuestions,
  getOnboardingVideoScript,
  getDefaultOnboardingModules,
  videoPassThreshold,
  VIDEO_MAX_ATTEMPTS,
  VIDEO_PASS_PERCENT,
} from '../../utils/onboardingModules';
import { createEmptyTour } from '../../utils/tourChecklist';
import { ONBOARDING_DOC_KEYS } from '../../utils/documentsV2';
import { formatDate } from '../../utils/helpers';
import { parseVideoSource, RealVideoPlayer, NarratedVideoPlayer } from '../../components/VideoPlayer';
import { getOnboardingSceneClips, getReceptionVideoScript, receptionSceneClips } from '../../utils/narrationAssets';

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-600',
  'from-indigo-500 to-cyan-500',
  'from-pink-500 to-violet-600',
  'from-amber-500 to-red-500',
];

const PASS_THRESHOLD = 4; // At least 4/5 correct (70% = 3.5, rounded up)

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

// ─── Sub-views ───────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'list' }
  | { view: 'dashboard'; employeeId: string }
  | { view: 'module'; employeeId: string; moduleId: number }
  | { view: 'completed'; employeeId: string }
  // v2.8: videoteca — todos los videos del sistema, para verlos en cualquier momento
  | { view: 'videoteca' };

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'list' });

  // v2.4: sin AnimatePresence mode="wait" aqui — con reproductores de video
  // adentro, una animacion de salida atorada dejaba la pantalla en negro al
  // volver de un video (habia que salirse o recargar el modulo). El cambio de
  // vista ahora es inmediato y solo se anima la entrada.
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {viewState.view === 'list' && (
        <motion.div key="list" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <EmployeeListView
            onSelectEmployee={(id) => setViewState({ view: 'dashboard', employeeId: id })}
            onOpenVideoteca={() => setViewState({ view: 'videoteca' })}
          />
        </motion.div>
      )}
      {viewState.view === 'videoteca' && (
        <motion.div key="videoteca" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <VideotecaView onBack={() => setViewState({ view: 'list' })} />
        </motion.div>
      )}
      {viewState.view === 'dashboard' && (
        <motion.div key="dashboard" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <OnboardingDashboard
            employeeId={viewState.employeeId}
            onBack={() => setViewState({ view: 'list' })}
            onSelectModule={(moduleId) =>
              setViewState({ view: 'module', employeeId: viewState.employeeId, moduleId })
            }
            onCompleted={() =>
              setViewState({ view: 'completed', employeeId: viewState.employeeId })
            }
          />
        </motion.div>
      )}
      {viewState.view === 'module' && (
        <motion.div key="module" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <ModuleDetailView
            employeeId={viewState.employeeId}
            moduleId={viewState.moduleId}
            onBack={() =>
              setViewState({ view: 'dashboard', employeeId: viewState.employeeId })
            }
          />
        </motion.div>
      )}
      {viewState.view === 'completed' && (
        <motion.div key="completed" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <CompletionScreen
            employeeId={viewState.employeeId}
            onBack={() =>
              setViewState({ view: 'dashboard', employeeId: viewState.employeeId })
            }
            onBackToList={() => setViewState({ view: 'list' })}
          />
        </motion.div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 1: Employee List
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EmployeeListView({
  onSelectEmployee,
  onOpenVideoteca,
}: {
  onSelectEmployee: (id: string) => void;
  onOpenVideoteca: () => void;
}) {
  const { employees } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const eligibleEmployees = useMemo(() => {
    return employees
      .filter((e) => e.status === 'trial' || e.status === 'active')
      .filter((e) =>
        e.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [employees, searchTerm]);

  function getCompletedCount(emp: Employee): number {
    return emp.onboardingProgress.modules.filter((m) => m.completed).length;
  }

  function getProgressPercent(emp: Employee): number {
    const total = emp.onboardingProgress.modules.length || 18;
    return Math.round((getCompletedCount(emp) / total) * 100);
  }

  return (
    <div className="flex flex-col gap-6 overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-100">Onboarding / Induccion</h1>
            <p className="text-sm text-surface-400">
              {eligibleEmployees.length} colaborador{eligibleEmployees.length !== 1 ? 'es' : ''} en proceso
            </p>
          </div>
        </div>
        {/* v2.8: acceso a la videoteca — ver cualquier video del sistema cuando sea */}
        <button className="btn-secondary flex items-center gap-2" onClick={onOpenVideoteca}>
          <Film size={16} />
          Videoteca
        </button>
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          placeholder="Buscar colaborador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {eligibleEmployees.length === 0 ? (
          <motion.div {...fadeUp} className="glass-card p-12 text-center">
            <GraduationCap size={48} className="mx-auto text-surface-500 mb-4" />
            <p className="text-surface-400 text-lg">No hay colaboradores en induccion</p>
            <p className="text-surface-500 text-sm mt-1">
              Contrata candidatos desde el modulo de Contratacion
            </p>
          </motion.div>
        ) : (
          eligibleEmployees.map((emp, i) => {
            const completedCount = getCompletedCount(emp);
            const total = emp.onboardingProgress.modules.length || 18;
            const percent = getProgressPercent(emp);
            const allDone = completedCount === total && emp.onboardingProgress.certificateGenerated;

            return (
              <motion.div
                key={emp.id}
                custom={i}
                variants={listItem}
                initial="initial"
                animate="animate"
                exit="exit"
                className="glass-card p-5 flex items-center gap-4 cursor-pointer group"
                onClick={() => onSelectEmployee(emp.id)}
              >
                {/* Avatar */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(emp.fullName)} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                >
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    getInitials(emp.fullName)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-surface-100 truncate">
                      {emp.fullName}
                    </h3>
                    {allDone && (
                      <span className="badge-green text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        Completado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <Briefcase size={12} />
                      {JOB_POSITIONS[emp.position]?.name ?? emp.position}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(emp.hireDate)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-surface-800/60 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          percent === 100
                            ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                            : 'bg-gradient-to-r from-primary-500 to-accent-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' as const, delay: i * 0.05 }}
                      />
                    </div>
                    <span className="text-xs font-medium text-surface-300 whitespace-nowrap">
                      {completedCount}/{total}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight
                  size={20}
                  className="text-surface-500 group-hover:text-primary-400 transition-colors shrink-0"
                />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 2: Onboarding Dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OnboardingDashboard({
  employeeId,
  onBack,
  onSelectModule,
  onCompleted,
}: {
  employeeId: string;
  onBack: () => void;
  onSelectModule: (moduleId: number) => void;
  onCompleted: () => void;
}) {
  const { employees } = useStore();
  const employee = employees.find((e) => e.id === employeeId);

  if (!employee) {
    return (
      <div className="glass-card p-8 text-center">
        <XCircle size={48} className="mx-auto text-danger-500 mb-4" />
        <p className="text-surface-300">Empleado no encontrado</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Volver
        </button>
      </div>
    );
  }

  const modules = employee.onboardingProgress.modules;
  const completedCount = modules.filter((m) => m.completed).length;
  const total = modules.length;
  const percent = Math.round((completedCount / total) * 100);
  const allCompleted = completedCount === total;

  // ─── v2.0: candados de cierre del onboarding (BRD reglas 11-13) ───
  const isV2 = modules.some((m) => m.isVideo);
  const recorridoDone = !!employee.recorrido?.completadoEn && !!employee.recorrido?.firmaUrl;
  const docsV2 = employee.signedDocsV2;
  // Solo los 5 documentos de ingreso: la renuncia voluntaria (documento de
  // baja) no debe bloquear el cierre del onboarding
  const docsDone = docsV2
    ? ONBOARDING_DOC_KEYS.every((k) => !!docsV2[k]?.firmadoUrl)
    : true; // expedientes v1 sin documentos v2
  const hasEval15 = employee.evaluations.some((e) => e.type.includes('15'));
  const hasEval30 = employee.evaluations.some((e) => e.type.includes('30'));
  const cierreReady = allCompleted && (!isV2 || recorridoDone) && docsDone && hasEval15 && hasEval30;

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      {/* Back + Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-surface-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-surface-100">Panel de Induccion</h1>
          <p className="text-xs text-surface-400">Progreso de modulos de induccion</p>
        </div>
      </div>

      {/* Employee Info Card */}
      <motion.div {...fadeUp} className="glass-card p-5 shrink-0">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarGradient(employee.fullName)} flex items-center justify-center text-white font-bold text-lg shrink-0`}
          >
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
            ) : (
              getInitials(employee.fullName)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-surface-100 truncate">{employee.fullName}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-surface-400">
              <span className="flex items-center gap-1">
                <Briefcase size={12} />
                {JOB_POSITIONS[employee.position]?.name ?? employee.position}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Ingreso: {formatDate(employee.hireDate)}
              </span>
              <span className={`badge ${employee.status === 'trial' ? 'badge-yellow' : 'badge-green'}`}>
                {employee.status === 'trial' ? 'Periodo de Prueba' : 'Activo'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold gradient-text">{percent}%</div>
            <div className="text-xs text-surface-400">{completedCount}/{total} modulos</div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-4 h-2.5 bg-surface-800/60 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              percent === 100
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : 'bg-gradient-to-r from-primary-500 to-accent-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: 'easeOut' as const }}
          />
        </div>

        {/* v2.0: Cierre del onboarding con candados */}
        {allCompleted && !employee.onboardingProgress.certificateGenerated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-3 rounded-xl border ${
              cierreReady
                ? 'bg-success-500/10 border-success-500/20'
                : 'bg-warning-500/10 border-warning-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 text-sm ${cierreReady ? 'text-green-400' : 'text-yellow-400'}`}>
                <Award size={18} />
                <span>
                  {cierreReady
                    ? 'Todos los requisitos cumplidos. Genera la constancia.'
                    : 'Videos completados — faltan requisitos para cerrar el onboarding.'}
                </span>
              </div>
              <button
                onClick={onCompleted}
                disabled={!cierreReady}
                className="btn-success text-xs py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generar Constancia
              </button>
            </div>
            {!cierreReady && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                {isV2 && (
                  <span className={recorridoDone ? 'text-green-400' : 'text-surface-400'}>
                    {recorridoDone ? '✓' : '✗'} Recorrido firmado
                  </span>
                )}
                <span className={docsDone ? 'text-green-400' : 'text-surface-400'}>
                  {docsDone ? '✓' : '✗'} 5 documentos firmados subidos
                </span>
                <span className={hasEval15 ? 'text-green-400' : 'text-surface-400'}>
                  {hasEval15 ? '✓' : '✗'} Evaluacion dia 15
                </span>
                <span className={hasEval30 ? 'text-green-400' : 'text-surface-400'}>
                  {hasEval30 ? '✓' : '✗'} Evaluacion dia 30
                </span>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Module Grid */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* v2.0: recorrido por instalaciones (Carmen, checklist estandarizado) */}
        {isV2 && <RecorridoSection employee={employee} />}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {modules.map((mod, i) => {
            const hasQuiz = mod.isVideo ? !!mod.critical : QUIZ_MODULES.includes(mod.id);
            const quizTotal = mod.isVideo ? (mod.questionsCount ?? 5) : 5;
            const passMin = mod.isVideo ? videoPassThreshold(quizTotal) : PASS_THRESHOLD;
            const quizPassed = hasQuiz && mod.quizScore !== undefined && mod.quizScore >= passMin;
            const quizFailed = hasQuiz && mod.quizScore !== undefined && mod.quizScore < passMin;
            // v2.0: orden secuencial obligatorio — no puede avanzar sin aprobar el anterior
            const locked = !!mod.isVideo && !mod.completed && modules.slice(0, i).some((m) => !m.completed);

            return (
              <motion.div
                key={mod.id}
                custom={i}
                variants={listItem}
                initial="initial"
                animate="animate"
                className={`glass-card p-4 group relative overflow-hidden ${
                  mod.completed ? 'border-green-500/20' : ''
                } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!locked) onSelectModule(mod.id);
                }}
              >
                {/* Completed overlay shimmer */}
                {mod.completed && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent pointer-events-none" />
                )}

                <div className="flex items-start gap-3 relative z-10">
                  {/* Module number */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      mod.completed
                        ? 'bg-green-500/20 text-green-400'
                        : locked
                          ? 'bg-surface-800/60 text-surface-600'
                          : 'bg-surface-700/50 text-surface-400'
                    }`}
                  >
                    {mod.completed ? <CheckCircle size={18} /> : locked ? <Lock size={15} /> : mod.id}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-surface-200 truncate group-hover:text-white transition-colors">
                      {mod.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Delivered by */}
                      <span className="text-[10px] text-surface-500 flex items-center gap-1">
                        {mod.isVideo ? <Video size={10} /> : <User size={10} />}
                        {mod.deliveredBy.length > 20
                          ? mod.deliveredBy.slice(0, 20) + '...'
                          : mod.deliveredBy}
                      </span>

                      {/* Duration */}
                      <span className="text-[10px] text-surface-500 flex items-center gap-1">
                        <Clock size={10} />
                        {mod.duration}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {mod.isVideo && mod.critical && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold badge-red">
                          CRITICO
                        </span>
                      )}
                      {hasQuiz && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            quizPassed
                              ? 'badge-green'
                              : quizFailed
                                ? 'badge-red'
                                : 'badge-purple'
                          }`}
                        >
                          {mod.quizScore !== undefined
                            ? `Eval: ${mod.quizScore}/${quizTotal}`
                            : `Eval ${quizTotal} preguntas`}
                        </span>
                      )}
                      {mod.isVideo && !mod.critical && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold badge-blue">
                          Solo confirmacion
                        </span>
                      )}
                      {mod.blocked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold badge-red flex items-center gap-1">
                          <Ban size={8} /> Bloqueado
                        </span>
                      )}
                      {mod.dudas && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold badge-yellow flex items-center gap-1">
                          <HelpCircle size={8} /> Tiene dudas
                        </span>
                      )}

                      {mod.requiresSignature && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                            mod.signatureUrl ? 'badge-green' : 'badge-blue'
                          }`}
                        >
                          <PenTool size={8} />
                          {mod.signatureUrl ? 'Firmado' : 'Firma requerida'}
                        </span>
                      )}

                      {mod.completed && mod.completedDate && (
                        <span className="text-[10px] text-surface-500">
                          {formatDate(mod.completedDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <ChevronRight
                    size={16}
                    className="text-surface-600 group-hover:text-primary-400 transition-colors shrink-0 mt-1"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — RECORRIDO POR INSTALACIONES (BRD etapa 9)
// Carmen guia con checklist estandarizado: mismos puntos para todos, en el
// mismo orden. Firma al terminar. El sistema lo registra como completado.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RecorridoSection({ employee }: { employee: Employee }) {
  const { updateEmployee } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [signing, setSigning] = useState(false);

  const tour = employee.recorrido ?? createEmptyTour();
  const doneCount = tour.items.filter((i) => i.done).length;
  const allItemsDone = doneCount === tour.items.length;
  const completed = !!tour.completadoEn && !!tour.firmaUrl;

  const toggleItem = (id: string) => {
    if (completed) return;
    // Leer el estado mas reciente del store: varios taps rapidos en la tablet
    // no deben perderse entre renders.
    const fresh = useStore.getState().employees.find((e) => e.id === employee.id)?.recorrido ?? tour;
    updateEmployee(employee.id, {
      recorrido: {
        ...fresh,
        items: fresh.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
      },
    });
  };

  const handleSignature = (dataUrl: string) => {
    updateEmployee(employee.id, {
      recorrido: {
        ...tour,
        firmaUrl: dataUrl,
        completadoEn: new Date().toISOString(),
      },
    });
    setSigning(false);
  };

  return (
    <motion.div {...fadeUp} className="glass-card p-5">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            completed ? 'bg-green-500/20 text-green-400' : 'bg-accent-500/20 text-accent-400'
          }`}
        >
          {completed ? <CheckCircle size={18} /> : <MapPin size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-surface-200">
            Recorrido por instalaciones — checklist estandarizado
          </h3>
          <p className="text-xs text-surface-400">
            Guia: {tour.guia} · mismos puntos para todos, en el mismo orden
            {completed && tour.completadoEn ? ` · completado ${formatDate(tour.completadoEn)}` : ''}
          </p>
        </div>
        <span className={`badge ${completed ? 'badge-green' : allItemsDone ? 'badge-yellow' : 'badge-blue'}`}>
          {completed ? 'Completado y firmado' : `${doneCount}/${tour.items.length}`}
        </span>
        <ChevronRight
          size={16}
          className={`text-surface-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-1.5">
              {tour.items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  disabled={completed}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                    item.done
                      ? 'bg-success-500/10 text-surface-200'
                      : 'bg-surface-800/30 text-surface-400 hover:bg-surface-700/30'
                  } ${completed ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {item.done ? (
                    <CheckCircle size={16} className="text-success-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-surface-600 shrink-0" />
                  )}
                  <span className="text-sm">
                    {idx + 1}. {item.label}
                  </span>
                </button>
              ))}
            </div>

            {!completed && allItemsDone && !signing && (
              <button
                className="btn-success mt-4 flex items-center gap-2 text-sm"
                onClick={() => setSigning(true)}
              >
                <PenTool size={15} />
                Firmar recorrido completado ({tour.guia.split(' ')[0]})
              </button>
            )}
            {!completed && !allItemsDone && (
              <p className="text-xs text-surface-500 mt-3">
                Marca todos los puntos del recorrido para habilitar la firma.
              </p>
            )}
            {signing && (
              <div className="mt-4">
                <InlineSignaturePad onSave={handleSignature} onCancel={() => setSigning(false)} />
              </div>
            )}
            {completed && tour.firmaUrl && (
              <div className="mt-4 bg-surface-900/60 rounded-xl p-3 inline-block border border-surface-700/30">
                <img src={tour.firmaUrl} alt="Firma del recorrido" className="max-h-20 object-contain" />
                <p className="text-[10px] text-surface-500 text-center mt-1">{tour.guia}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 3: Module Detail / Quiz / Signature
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ModuleDetailView({
  employeeId,
  moduleId,
  onBack,
}: {
  employeeId: string;
  moduleId: number;
  onBack: () => void;
}) {
  const { employees } = useStore();
  const employee = employees.find((e) => e.id === employeeId);

  if (!employee) return null;

  const mod = employee.onboardingProgress.modules.find((m) => m.id === moduleId);
  if (!mod) return null;

  // v2.0: los modulos de video de la semana 1 tienen su propio flujo
  // (reproductor + confirmacion digital o mini evaluacion 70% / 3 intentos)
  if (mod.isVideo) {
    return <VideoModuleView employee={employee} mod={mod} onBack={onBack} />;
  }

  const hasQuiz = QUIZ_MODULES.includes(moduleId);

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      {/* Back + Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-surface-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-surface-100 truncate">
            Modulo {mod.id}: {mod.name}
          </h1>
          <p className="text-xs text-surface-400">{employee.fullName}</p>
        </div>
        {mod.completed && (
          <span className="badge-green text-xs">Completado</span>
        )}
      </div>

      {/* Module content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5">
        {/* Module info card */}
        <motion.div {...fadeUp} className="glass-card p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-surface-500 uppercase tracking-wider">Impartido por</span>
              <p className="text-sm text-surface-200 mt-1 flex items-center gap-2">
                <User size={14} className="text-primary-400" />
                {mod.deliveredBy}
              </p>
            </div>
            <div>
              <span className="text-xs text-surface-500 uppercase tracking-wider">Duracion</span>
              <p className="text-sm text-surface-200 mt-1 flex items-center gap-2">
                <Clock size={14} className="text-accent-400" />
                {mod.duration}
              </p>
            </div>
            {mod.completedDate && (
              <div>
                <span className="text-xs text-surface-500 uppercase tracking-wider">Completado</span>
                <p className="text-sm text-surface-200 mt-1 flex items-center gap-2">
                  <Calendar size={14} className="text-green-400" />
                  {formatDate(mod.completedDate)}
                </p>
              </div>
            )}
            {mod.quizScore !== undefined && (
              <div>
                <span className="text-xs text-surface-500 uppercase tracking-wider">Calificacion Quiz</span>
                <p className="text-sm text-surface-200 mt-1 flex items-center gap-2">
                  <Star size={14} className="text-yellow-400" />
                  {mod.quizScore}/5 ({mod.quizScore >= PASS_THRESHOLD ? 'Aprobado' : 'No aprobado'})
                </p>
              </div>
            )}
          </div>

          {/* Features row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {hasQuiz && (
              <span className="badge-purple text-xs">
                <BookOpen size={12} /> Incluye quiz
              </span>
            )}
            {mod.requiresSignature && (
              <span className="badge-blue text-xs">
                <PenTool size={12} /> Requiere firma
              </span>
            )}
          </div>
        </motion.div>

        {/* Quiz Section */}
        {hasQuiz && (
          <QuizSection
            employeeId={employeeId}
            moduleId={moduleId}
            existingScore={mod.quizScore}
            moduleCompleted={mod.completed}
          />
        )}

        {/* Signature Section */}
        {mod.requiresSignature && (
          <SignatureSection
            employeeId={employeeId}
            moduleId={moduleId}
            existingSignature={mod.signatureUrl}
            moduleCompleted={mod.completed}
          />
        )}

        {/* Mark as completed */}
        {!mod.completed && (
          <MarkCompleteSection
            employeeId={employeeId}
            moduleId={moduleId}
            hasQuiz={hasQuiz}
            quizScore={mod.quizScore}
            requiresSignature={mod.requiresSignature}
            signatureUrl={mod.signatureUrl}
            onCompleted={onBack}
          />
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — VISTA DE MODULO DE VIDEO (BRD seccion 7)
// Reproductor con evidencia de visualizacion (timestamp). No criticos: solo
// confirmacion digital. Criticos: mini evaluacion con minimo 70%; si reprueba
// repite el video COMPLETO; maximo 3 intentos → alerta a Direccion + bloqueo.
// Boton 'Tengo dudas' → alerta inmediata a RH y jefe directo.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function VideoModuleView({
  employee,
  mod,
  onBack,
}: {
  employee: Employee;
  mod: OnboardingModuleType;
  onBack: () => void;
}) {
  const { updateEmployee, addAlert, authRole } = useStore();
  const onboardingVideoUrls = useStore((s) => s.settings.onboardingVideoUrls);
  const onboardingNarrationUrls = useStore((s) => s.settings.onboardingNarrationUrls);

  const durationSec = Math.round((mod.durationMin ?? 2) * 60);
  const questions = mod.critical ? getVideoQuizQuestions(mod.id) : [];
  const passMin = videoPassThreshold(questions.length);
  const attempts = mod.attempts ?? 0;

  const source = parseVideoSource(onboardingVideoUrls?.[mod.id]);
  const usingReal = !!source;
  const narrationUrl = onboardingNarrationUrls?.[mod.id];
  const usingNarration = !usingReal && !!(narrationUrl ?? '').trim();

  // Reproductor
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [watchedThisSession, setWatchedThisSession] = useState(false);
  const [realEnded, setRealEnded] = useState(false);
  const [realProgress, setRealProgress] = useState(0); // 0..1 para video real (archivo)
  const viewedRecorded = useRef(false);

  // Mini evaluacion
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [dudasSent, setDudasSent] = useState(!!mod.dudas);
  // v2.8: volver a ver un video ya completado, sin afectar el avance
  const [rewatch, setRewatch] = useState(false);

  const videoComplete = usingReal || usingNarration ? realEnded : progress >= durationSec;

  const updateModule = (partial: Partial<OnboardingModuleType>) => {
    const updatedModules = employee.onboardingProgress.modules.map((m) =>
      m.id === mod.id ? { ...m, ...partial } : m,
    );
    updateEmployee(employee.id, {
      onboardingProgress: { ...employee.onboardingProgress, modules: updatedModules },
    });
  };

  // Avance del reproductor simulado (solo cuando no hay video real ni narracion)
  useEffect(() => {
    if (usingReal || usingNarration || !playing || videoComplete || mod.blocked) return;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 0.1 * speed, durationSec));
    }, 100);
    return () => clearInterval(interval);
  }, [playing, speed, videoComplete, durationSec, mod.blocked, usingReal, usingNarration]);

  // Evidencia de visualizacion con timestamp (regla de negocio 4).
  // Al RE-VER un video ya completado no se vuelve a registrar evidencia ni se
  // pisa la fecha original: solo es una reproduccion para consulta.
  useEffect(() => {
    if (videoComplete && !viewedRecorded.current) {
      viewedRecorded.current = true;
      setWatchedThisSession(true);
      if (!mod.completed) updateModule({ viewedAt: new Date().toISOString() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoComplete]);

  const handleDudas = () => {
    if (dudasSent) return;
    setDudasSent(true);
    updateModule({ dudas: true });
    addAlert({
      tipo: 'tengo_dudas',
      mensaje: `${employee.fullName} presiono 'Tengo dudas' en el video '${mod.name}'.`,
      empleadoId: employee.id,
      destinatarios: ['RH', employee.supervisor || 'Jefe directo'],
    });
  };

  const handleConfirmViewed = () => {
    updateModule({
      completed: true,
      completedDate: new Date().toISOString(),
      viewedAt: mod.viewedAt ?? new Date().toISOString(),
    });
    onBack();
  };

  const restartVideo = () => {
    viewedRecorded.current = false;
    setProgress(0);
    setWatchedThisSession(false);
    setRealEnded(false);
    setPlaying(true);
  };

  // v2.8: reproduce de nuevo un video ya completado sin tocar el avance
  const startRewatch = () => {
    viewedRecorded.current = true; // ya esta completado: no volver a registrar
    setProgress(0);
    setRealEnded(false);
    setPlaying(true);
    setRewatch(true);
  };
  const stopRewatch = () => {
    setRewatch(false);
    setPlaying(false);
  };

  // Reproductor visible: cuando el modulo no esta completado (flujo normal) o
  // cuando se pidio volver a verlo (rewatch). Nunca durante la mini evaluacion.
  const showPlayer = (!mod.completed || rewatch) && !mod.blocked && !quizStarted;

  const handleQuizAnswer = () => {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = selected;
    setAnswers(newAnswers);
    setSelected(null);

    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      return;
    }

    // Calificar
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (newAnswers[i] === questions[i].correct) correct++;
    }
    setLastScore(correct);
    setQuizStarted(false);

    if (correct >= passMin) {
      // Aprobado → modulo completado
      updateModule({
        quizScore: correct,
        completed: true,
        completedDate: new Date().toISOString(),
      });
    } else {
      const newAttempts = attempts + 1;
      if (newAttempts >= VIDEO_MAX_ATTEMPTS) {
        // Tercer intento fallido: alerta inmediata a Direccion + bloqueo
        updateModule({ quizScore: correct, attempts: newAttempts, blocked: true });
        addAlert({
          tipo: 'video_reprobado_3',
          mensaje: `${employee.fullName} reprobo 3 veces la evaluacion del video '${mod.name}'. Modulo bloqueado.`,
          empleadoId: employee.id,
          destinatarios: ['Direccion'],
        });
      } else {
        updateModule({ quizScore: correct, attempts: newAttempts });
      }
      // Debe repetir el video COMPLETO antes de volver a contestar
      setWatchedThisSession(false);
      viewedRecorded.current = false;
      setProgress(0);
      setRealEnded(false);
      setPlaying(false);
    }
  };

  const startQuiz = () => {
    setAnswers(new Array(questions.length).fill(null));
    setCurrentQ(0);
    setSelected(null);
    setLastScore(null);
    setQuizStarted(true);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const pct = (progress / durationSec) * 100;

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      {/* Back + Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-surface-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-surface-100 truncate">
            Video {mod.id}: {mod.name}
          </h1>
          <p className="text-xs text-surface-400">
            {employee.fullName} · {mod.duration}
            {mod.critical ? ` · CRITICO — evaluacion ${questions.length} preguntas, minimo ${VIDEO_PASS_PERCENT}%` : ' · solo confirmacion'}
          </p>
        </div>
        {mod.completed && <span className="badge badge-green text-xs">Completado</span>}
        {mod.blocked && (
          <span className="badge badge-red text-xs">
            <Ban size={11} /> Bloqueado
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* Bloqueado: 3 intentos fallidos */}
        {mod.blocked && (
          <motion.div {...fadeUp} className="glass-card p-5 border-2 border-danger-500/50 bg-danger-500/5">
            <div className="flex items-start gap-3">
              <Ban size={20} className="text-danger-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-danger-400 font-semibold text-sm">
                  Modulo bloqueado — 3 intentos fallidos
                </p>
                <p className="text-surface-400 text-xs mt-1">
                  Se envio una alerta inmediata a Direccion. El colaborador no puede continuar hasta
                  que Direccion revise el caso y desbloquee el modulo.
                </p>
                {authRole === 'direction' ? (
                  <button
                    className="btn-danger text-xs py-2 px-4 mt-3"
                    onClick={() => updateModule({ blocked: false, attempts: 0 })}
                  >
                    Desbloquear modulo (Direccion)
                  </button>
                ) : (
                  <p className="text-xs text-danger-400 mt-2 font-medium">
                    Solo Direccion puede desbloquear este modulo.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Resultado si ya esta completado */}
        {mod.completed && (
          <motion.div {...fadeUp} className="glass-card p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                <CheckCircle size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-200 font-semibold">
                  {mod.critical
                    ? `Evaluacion aprobada: ${mod.quizScore}/${questions.length} (minimo ${passMin})`
                    : 'Visualizacion confirmada digitalmente'}
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  {mod.viewedAt && `Video visto completo: ${formatDate(mod.viewedAt)} ${new Date(mod.viewedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
                  {mod.completedDate && ` · Completado: ${formatDate(mod.completedDate)}`}
                </p>
              </div>
              {/* v2.8: volver a ver el video en cualquier momento */}
              {!rewatch ? (
                <button className="btn-secondary text-sm flex items-center gap-2 shrink-0" onClick={startRewatch}>
                  <RotateCcw size={15} />
                  Volver a ver el video
                </button>
              ) : (
                <button className="btn-secondary text-sm flex items-center gap-2 shrink-0" onClick={stopRewatch}>
                  <X size={15} />
                  Cerrar
                </button>
              )}
            </div>
            {rewatch && (
              <p className="text-xs text-primary-300 mt-3 flex items-center gap-1.5">
                <Info size={13} className="shrink-0" />
                Estas volviendo a ver el video. Tu avance y tu evaluacion no cambian.
              </p>
            )}
          </motion.div>
        )}

        {/* Reproductor (flujo normal o re-ver un video ya completado) */}
        {showPlayer && (
          <motion.div {...fadeUp} className="glass-card overflow-hidden">
            {usingNarration ? (
              <NarratedVideoPlayer
                audioUrl={(narrationUrl || '').trim()}
                captions={getOnboardingVideoScript(mod.id)}
                title={`Video ${mod.id}: ${mod.name}`}
                sceneClips={getOnboardingSceneClips(mod.id)}
                complete={videoComplete}
                onEnded={() => setRealEnded(true)}
                onProgress={setRealProgress}
                onRestart={() => setRealEnded(false)}
              />
            ) : (
              <>
            <div className="aspect-video bg-gradient-to-br from-surface-950 via-primary-950 to-surface-950 relative flex flex-col items-center justify-center">
              {usingReal ? (
                <RealVideoPlayer
                  source={source!}
                  title={`Video ${mod.id}: ${mod.name}`}
                  complete={videoComplete}
                  onEnded={() => setRealEnded(true)}
                  onProgress={setRealProgress}
                  onRestart={() => setRealEnded(false)}
                />
              ) : (
                <>
                  <Video size={40} className="text-primary-400 mb-3 opacity-60" />
                  <h2 className="text-lg font-bold text-surface-100 px-8 text-center">{mod.name}</h2>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-black/70 rounded-lg px-4 py-2 flex items-start gap-2">
                      <Captions size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-white leading-snug">
                        {videoComplete
                          ? 'Video completo. Gracias por tu atencion.'
                          : `Reproduciendo '${mod.name}' — subtitulos activados.`}
                      </p>
                    </div>
                  </div>
                </>
              )}
              {/* El overlay opaco solo cubre el reproductor de demostracion. Para
                  el video real se omite: taparia los controles nativos y no
                  dejaria volver a verlo desde el inicio. */}
              {videoComplete && !usingReal && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                  <CheckCircle size={44} className="text-success-500 mb-2" />
                  <p className="text-surface-100 font-semibold">Video visto completo</p>
                  <p className="text-xs text-surface-400">Evidencia registrada con fecha y hora</p>
                </div>
              )}
            </div>
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
                  El sistema guarda evidencia de visualizacion con timestamp al terminar el video.
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
                      disabled={videoComplete}
                    >
                      {playing && !videoComplete ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 transition-colors text-surface-200"
                      onClick={restartVideo}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <span className="text-xs font-mono text-surface-400">
                      {fmt(progress)} / {fmt(durationSec)}
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
                  narracion (en Configuracion → Videos del sistema) se reproducira aqui, con evidencia
                  de visualizacion.
                </p>
              </div>
            )}
              </>
            )}
          </motion.div>
        )}

        {/* Resultado del ultimo intento fallido */}
        {!mod.completed && !mod.blocked && lastScore !== null && lastScore < passMin && (
          <motion.div {...fadeUp} className="glass-card p-4 border border-danger-500/30 bg-danger-500/5">
            <p className="text-sm text-danger-400 font-semibold flex items-center gap-2">
              <XCircle size={16} />
              No aprobado: {lastScore}/{questions.length} (minimo {passMin} = {VIDEO_PASS_PERCENT}%)
            </p>
            <p className="text-xs text-surface-400 mt-1">
              Intento {attempts} de {VIDEO_MAX_ATTEMPTS}. Debe repetir el video COMPLETO antes de
              volver a contestar.
            </p>
          </motion.div>
        )}

        {/* Accion segun tipo de video */}
        {!mod.completed && !mod.blocked && !quizStarted && (
          <motion.div {...fadeUp} className="glass-card p-5 space-y-3">
            {mod.critical ? (
              <>
                <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                  <BookOpen size={16} className="text-accent-400" />
                  Mini evaluacion ({questions.length} preguntas · minimo {passMin} correctas = {VIDEO_PASS_PERCENT}%)
                </h3>
                <p className="text-xs text-surface-400">
                  La evaluacion se habilita al terminar de ver el video completo.
                  {attempts > 0 && ` Intentos usados: ${attempts}/${VIDEO_MAX_ATTEMPTS}.`}
                </p>
                <button
                  className="btn-primary flex items-center gap-2 text-sm"
                  disabled={!watchedThisSession}
                  onClick={startQuiz}
                >
                  <Play size={15} />
                  {attempts > 0 ? 'Volver a contestar' : 'Iniciar evaluacion'}
                </button>
                {!watchedThisSession && (
                  <p className="text-[11px] text-warning-500">
                    Primero ve el video completo{attempts > 0 ? ' (otra vez, despues de reprobar)' : ''}.
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                  <CheckCircle size={16} className="text-success-500" />
                  Confirmacion de visualizacion
                </h3>
                <p className="text-xs text-surface-400">
                  Este video no lleva evaluacion — solo confirmacion digital de que se vio completo.
                </p>
                <button
                  className="btn-success flex items-center gap-2 text-sm"
                  disabled={!videoComplete && !watchedThisSession}
                  onClick={handleConfirmViewed}
                >
                  <CheckCircle size={15} />
                  Confirmo que vi el video completo
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Mini evaluacion en curso */}
        {quizStarted && !mod.blocked && (
          <motion.div {...scaleIn} className="glass-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                <BookOpen size={16} className="text-accent-400" />
                Mini evaluacion — {mod.name}
              </h3>
              <span className="badge badge-blue text-xs font-bold">
                Pregunta {currentQ + 1} de {questions.length}
              </span>
            </div>
            <div className="h-1.5 bg-surface-800/60 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-500 to-primary-500 rounded-full"
                animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* v2.4 — Requerimiento 5: pregunta mas grande y visible */}
                <div className="p-4 rounded-xl bg-primary-500/10 border-l-4 border-l-primary-500 border border-primary-500/20">
                  <p className="text-lg md:text-xl text-white font-bold leading-relaxed">
                    {questions[currentQ].question}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {questions[currentQ].options.map((option, optIdx) => (
                    <button
                      key={optIdx}
                      onClick={() => setSelected(optIdx)}
                      className={`w-full text-left p-4 rounded-xl text-base transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                        selected === optIdx
                          ? 'bg-primary-500/25 border-2 border-primary-500/60 text-white font-semibold'
                          : 'bg-surface-800/40 border-2 border-surface-700/30 text-surface-200 hover:bg-surface-700/40 hover:border-surface-500/50'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          selected === optIdx
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-700/60 text-surface-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-end">
              <button
                onClick={handleQuizAnswer}
                disabled={selected === null}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {currentQ < questions.length - 1 ? 'Siguiente' : 'Finalizar'}
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Boton 'Tengo dudas' — siempre disponible (regla de negocio 7) */}
        <motion.div {...fadeUp} className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle size={18} className="text-warning-500" />
            <p className="text-xs text-surface-400">
              ¿El colaborador tiene dudas sobre este tema? Se genera alerta inmediata a RH y jefe directo.
            </p>
          </div>
          <button
            className={`text-xs py-2 px-4 rounded-xl font-semibold transition-all ${
              dudasSent
                ? 'bg-warning-500/15 text-warning-500 cursor-default'
                : 'btn-secondary'
            }`}
            onClick={handleDudas}
            disabled={dudasSent}
          >
            {dudasSent ? 'Alerta enviada a RH y jefe directo' : 'Tengo dudas'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Quiz Section ────────────────────────────────────────────────────────────

function QuizSection({
  employeeId,
  moduleId,
  existingScore,
  moduleCompleted,
}: {
  employeeId: string;
  moduleId: number;
  existingScore?: number;
  moduleCompleted: boolean;
}) {
  const { employees, updateEmployee } = useStore();
  const questions = useMemo(() => getQuizQuestions(moduleId), [moduleId]);

  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [showResults, setShowResults] = useState(existingScore !== undefined);
  const [score, setScore] = useState<number | undefined>(existingScore);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showSupervisorDecision, setShowSupervisorDecision] = useState(false);

  if (questions.length === 0) return null;

  function handleSelectOption(optionIndex: number) {
    if (showResults) return;
    setSelectedOption(optionIndex);
  }

  function handleNextQuestion() {
    if (selectedOption === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedOption;
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Grade quiz
      let correct = 0;
      const finalAnswers = [...newAnswers];
      for (let i = 0; i < questions.length; i++) {
        if (finalAnswers[i] === questions[i].correct) {
          correct++;
        }
      }
      setScore(correct);
      setShowResults(true);

      // Save score to employee
      const employee = employees.find((e) => e.id === employeeId);
      if (employee) {
        const updatedModules = employee.onboardingProgress.modules.map((m) =>
          m.id === moduleId ? { ...m, quizScore: correct } : m
        );
        updateEmployee(employeeId, {
          onboardingProgress: { ...employee.onboardingProgress, modules: updatedModules },
        });
      }

      if (correct < PASS_THRESHOLD) {
        setShowSupervisorDecision(true);
      }
    }
  }

  function handleRetakeQuiz() {
    setStarted(true);
    setCurrentQuestion(0);
    setAnswers(new Array(questions.length).fill(null));
    setShowResults(false);
    setScore(undefined);
    setSelectedOption(null);
    setShowSupervisorDecision(false);
  }

  function handleSupervisorContinue() {
    // Supervisor decided to continue with note despite failed quiz
    setShowSupervisorDecision(false);
  }

  // Already completed with score
  if (existingScore !== undefined && moduleCompleted) {
    return (
      <motion.div {...fadeUp} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-accent-400" />
          Resultado del Quiz
        </h3>
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${
              existingScore >= PASS_THRESHOLD
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {existingScore}/5
          </div>
          <div>
            <p className="text-sm text-surface-200 font-semibold">
              {existingScore >= PASS_THRESHOLD ? 'Aprobado' : 'No aprobado (continuado por supervisor)'}
            </p>
            <p className="text-xs text-surface-400 mt-1">
              {existingScore >= PASS_THRESHOLD
                ? 'El colaborador aprobo el quiz satisfactoriamente.'
                : 'El supervisor decidio continuar a pesar de la calificacion.'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Not started yet
  if (!started && !showResults) {
    return (
      <motion.div {...fadeUp} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-accent-400" />
          Quiz del Modulo
        </h3>
        <p className="text-sm text-surface-400 mb-4">
          Este modulo incluye un quiz de {questions.length} preguntas. Se requiere un minimo de {PASS_THRESHOLD}/{questions.length} respuestas correctas para aprobar.
        </p>
        <button onClick={() => setStarted(true)} className="btn-primary flex items-center gap-2">
          <Play size={16} />
          Iniciar Quiz
        </button>
      </motion.div>
    );
  }

  // Show results
  if (showResults && score !== undefined) {
    const passed = score >= PASS_THRESHOLD;

    return (
      <motion.div {...scaleIn} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <Star size={16} className="text-yellow-400" />
          Resultado del Quiz
        </h3>

        <div className="flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center text-2xl font-bold ${
              passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {score}/{questions.length}
            <span className="text-[10px] font-normal mt-0.5">
              {passed ? 'Aprobado' : 'No aprobado'}
            </span>
          </div>

          <div className="flex-1">
            {passed ? (
              <div>
                <p className="text-sm text-green-400 font-semibold flex items-center gap-2">
                  <CheckCircle size={16} />
                  Quiz aprobado correctamente
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  El colaborador demostro comprension del tema.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-red-400 font-semibold flex items-center gap-2">
                  <XCircle size={16} />
                  No alcanzo la calificacion minima
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  Se requieren al menos {PASS_THRESHOLD} respuestas correctas.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Show answers review */}
        <div className="space-y-2">
          {questions.map((q, idx) => {
            const userAnswer = answers[idx];
            const isCorrect = userAnswer === q.correct;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl text-xs ${
                  isCorrect
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <p className="text-surface-300 font-medium">{idx + 1}. {q.question}</p>
                <p className={`mt-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? 'Correcto' : `Incorrecta. Respuesta correcta: ${q.options[q.correct]}`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Supervisor decision for failed quiz */}
        {showSupervisorDecision && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <AlertTriangle size={16} />
              <span className="font-semibold">Decision del Supervisor</span>
            </div>
            <p className="text-xs text-surface-400">
              El colaborador no aprobo el quiz. El supervisor puede decidir repetirlo o continuar con una nota.
            </p>
            <div className="flex gap-3">
              <button onClick={handleRetakeQuiz} className="btn-secondary text-xs py-2 px-4 flex items-center gap-2">
                <RotateCcw size={14} />
                Repetir Quiz
              </button>
              <button onClick={handleSupervisorContinue} className="btn-primary text-xs py-2 px-4 flex items-center gap-2">
                <ChevronRight size={14} />
                Continuar con Nota
              </button>
            </div>
          </motion.div>
        )}

        {!showSupervisorDecision && !passed && (
          <button onClick={handleRetakeQuiz} className="btn-secondary text-xs py-2 px-4 flex items-center gap-2">
            <RotateCcw size={14} />
            Repetir Quiz
          </button>
        )}
      </motion.div>
    );
  }

  // Actively taking quiz
  const q = questions[currentQuestion];

  return (
    <motion.div {...scaleIn} className="glass-card p-5 space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <BookOpen size={16} className="text-accent-400" />
          Quiz
        </h3>
        <span className="badge badge-blue text-xs font-bold">
          Pregunta {currentQuestion + 1} de {questions.length}
        </span>
      </div>

      <div className="h-1.5 bg-surface-800/60 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-accent-500 to-primary-500 rounded-full"
          animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* v2.4 — Requerimiento 5: pregunta mas grande y visible */}
          <div className="p-4 rounded-xl bg-primary-500/10 border-l-4 border-l-primary-500 border border-primary-500/20">
            <p className="text-lg md:text-xl text-white font-bold leading-relaxed">{q.question}</p>
          </div>

          <div className="space-y-2.5">
            {q.options.map((option, optIdx) => (
              <button
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full text-left p-4 rounded-xl text-base transition-all duration-200 cursor-pointer ${
                  selectedOption === optIdx
                    ? 'bg-primary-500/25 border-2 border-primary-500/60 text-white font-semibold'
                    : 'bg-surface-800/40 border-2 border-surface-700/30 text-surface-200 hover:bg-surface-700/40 hover:border-surface-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      selectedOption === optIdx
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-700/60 text-surface-300'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          onClick={handleNextQuestion}
          disabled={selectedOption === null}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {currentQuestion < questions.length - 1 ? 'Siguiente' : 'Finalizar'}
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Signature Section ───────────────────────────────────────────────────────

function SignatureSection({
  employeeId,
  moduleId,
  existingSignature,
  moduleCompleted,
}: {
  employeeId: string;
  moduleId: number;
  existingSignature?: string;
  moduleCompleted: boolean;
}) {
  const { employees, updateEmployee } = useStore();
  const [signatureData, setSignatureData] = useState<string | undefined>(existingSignature);
  const [isSigning, setIsSigning] = useState(false);

  function handleSaveSignature(dataUrl: string) {
    setSignatureData(dataUrl);
    setIsSigning(false);

    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      const updatedModules = employee.onboardingProgress.modules.map((m) =>
        m.id === moduleId ? { ...m, signatureUrl: dataUrl } : m
      );
      updateEmployee(employeeId, {
        onboardingProgress: { ...employee.onboardingProgress, modules: updatedModules },
      });
    }
  }

  if (signatureData && !isSigning) {
    return (
      <motion.div {...fadeUp} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-4">
          <PenTool size={16} className="text-blue-400" />
          Firma del Colaborador
        </h3>
        <div className="bg-surface-900/60 rounded-xl p-4 flex items-center justify-center border border-surface-700/30">
          <img
            src={signatureData}
            alt="Firma"
            className="max-h-32 object-contain"
          />
        </div>
        {!moduleCompleted && (
          <button
            onClick={() => setIsSigning(true)}
            className="btn-secondary text-xs mt-3 py-2 px-4 flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Firmar de Nuevo
          </button>
        )}
      </motion.div>
    );
  }

  if (isSigning) {
    return (
      <motion.div {...scaleIn} className="glass-card p-5">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-4">
          <PenTool size={16} className="text-blue-400" />
          Firma del Colaborador
        </h3>
        <InlineSignaturePad
          onSave={handleSaveSignature}
          onCancel={() => setIsSigning(false)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeUp} className="glass-card p-5">
      <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-3">
        <PenTool size={16} className="text-blue-400" />
        Firma del Colaborador
      </h3>
      <p className="text-sm text-surface-400 mb-4">
        Se requiere la firma del colaborador para confirmar que comprendio el contenido del modulo.
      </p>
      <button onClick={() => setIsSigning(true)} className="btn-primary flex items-center gap-2">
        <PenTool size={16} />
        Firmar
      </button>
    </motion.div>
  );
}

// ─── Inline Signature Pad ────────────────────────────────────────────────────

function InlineSignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Dark background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Hint line
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, rect.height * 0.7);
    ctx.lineTo(rect.width - 20, rect.height * 0.7);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  function getCanvasPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPosRef.current) return;

    const pos = getCanvasPos(e);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
  }

  function endDraw() {
    setIsDrawing(false);
    lastPosRef.current = null;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, rect.height * 0.7);
    ctx.lineTo(rect.width - 20, rect.height * 0.7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    setHasDrawn(false);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-surface-500 text-center">
        Firme con el dedo o mouse en el area de abajo
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl border border-surface-700/50 cursor-crosshair touch-none"
        style={{ height: '180px' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex justify-between">
        <div className="flex gap-2">
          <button onClick={handleClear} className="btn-secondary text-xs py-2 px-4 flex items-center gap-2">
            <RotateCcw size={14} />
            Limpiar
          </button>
          <button onClick={onCancel} className="btn-secondary text-xs py-2 px-4">
            Cancelar
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasDrawn}
          className="btn-success text-xs py-2 px-4 flex items-center gap-2"
        >
          <CheckCircle size={14} />
          Guardar Firma
        </button>
      </div>
    </div>
  );
}

// ─── Mark Complete Section ───────────────────────────────────────────────────

function MarkCompleteSection({
  employeeId,
  moduleId,
  hasQuiz,
  quizScore,
  requiresSignature,
  signatureUrl,
  onCompleted,
}: {
  employeeId: string;
  moduleId: number;
  hasQuiz: boolean;
  quizScore?: number;
  requiresSignature: boolean;
  signatureUrl?: string;
  onCompleted: () => void;
}) {
  const { employees, updateEmployee } = useStore();

  const quizDone = !hasQuiz || quizScore !== undefined;
  const signatureDone = !requiresSignature || !!signatureUrl;
  const canComplete = quizDone && signatureDone;

  const missingItems: string[] = [];
  if (!quizDone) missingItems.push('completar el quiz');
  if (!signatureDone) missingItems.push('registrar la firma');

  function handleMarkComplete() {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    const updatedModules = employee.onboardingProgress.modules.map((m) =>
      m.id === moduleId
        ? { ...m, completed: true, completedDate: new Date().toISOString() }
        : m
    );

    updateEmployee(employeeId, {
      onboardingProgress: { ...employee.onboardingProgress, modules: updatedModules },
    });

    onCompleted();
  }

  return (
    <motion.div {...fadeUp} className="glass-card p-5">
      {!canComplete ? (
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-surface-200 font-semibold">Requisitos pendientes</p>
            <p className="text-xs text-surface-400 mt-1">
              Para completar este modulo es necesario: {missingItems.join(' y ')}.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400" />
            <div>
              <p className="text-sm text-surface-200 font-semibold">Listo para completar</p>
              <p className="text-xs text-surface-400 mt-0.5">
                Todos los requisitos del modulo han sido cumplidos.
              </p>
            </div>
          </div>
          <button onClick={handleMarkComplete} className="btn-success flex items-center gap-2 text-sm">
            <CheckCircle size={16} />
            Marcar Completado
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 4: Completion / Congratulations Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

function CompletionScreen({
  employeeId,
  onBack,
  onBackToList,
}: {
  employeeId: string;
  onBack: () => void;
  onBackToList: () => void;
}) {
  const { employees, updateEmployee } = useStore();
  const employee = employees.find((e) => e.id === employeeId);
  const [generated, setGenerated] = useState(false);

  const confettiParticles = useMemo<ConfettiParticle[]>(() => {
    const colors = ['#338dff', '#d946ef', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[i % colors.length],
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      rotation: Math.random() * 360,
      size: 4 + Math.random() * 8,
    }));
  }, []);

  if (!employee) return null;

  const modules = employee.onboardingProgress.modules;
  const quizModules = modules.filter(
    (m) => (m.isVideo ? m.critical : QUIZ_MODULES.includes(m.id)) && m.quizScore !== undefined,
  );

  function handleGenerate() {
    updateEmployee(employeeId, {
      onboardingProgress: {
        ...employee!.onboardingProgress,
        certificateGenerated: true,
        completedDate: new Date().toISOString(),
      },
    });
    setGenerated(true);
  }

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full relative">
      {/* Confetti Animation */}
      {generated && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size * 1.4,
                backgroundColor: p.color,
                borderRadius: p.size > 8 ? '2px' : '50%',
              }}
              initial={{
                y: `${p.y}vh`,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: p.rotation + 720,
                opacity: [1, 1, 0.8, 0],
                x: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeIn' as const,
              }}
            />
          ))}
        </div>
      )}

      {/* Back */}
      <div className="flex items-center gap-3 shrink-0 z-10">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-surface-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-surface-100">Constancia de Induccion</h1>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-5">
        {/* Congratulations Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' as const }}
          className="glass-card p-8 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-accent-500/10 to-green-500/10 pointer-events-none" />

          <motion.div
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
              <Award size={40} className="text-white" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-bold gradient-text relative z-10">
            {generated ? 'Constancia Generada' : 'Induccion Completada'}
          </h2>
          <p className="text-surface-300 mt-2 relative z-10">
            {employee.fullName} ha completado exitosamente todos los modulos de induccion.
          </p>

          {!generated && !employee.onboardingProgress.certificateGenerated && (
            <motion.button
              onClick={handleGenerate}
              className="btn-success mt-6 inline-flex items-center gap-2 text-sm relative z-10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Award size={16} />
              Generar Constancia de Induccion
            </motion.button>
          )}

          {(generated || employee.onboardingProgress.certificateGenerated) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 inline-flex items-center gap-2 text-green-400 text-sm font-semibold relative z-10"
            >
              <CheckCircle size={18} />
              Constancia generada exitosamente
              {employee.onboardingProgress.completedDate && (
                <span className="text-surface-400 font-normal ml-2">
                  {formatDate(employee.onboardingProgress.completedDate)}
                </span>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Employee Summary */}
        <motion.div {...fadeUp} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-4">
            <User size={16} className="text-primary-400" />
            Datos del Colaborador
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-surface-500 uppercase tracking-wider">Nombre</span>
              <p className="text-surface-200 mt-1 font-medium">{employee.fullName}</p>
            </div>
            <div>
              <span className="text-surface-500 uppercase tracking-wider">Puesto</span>
              <p className="text-surface-200 mt-1 font-medium">
                {JOB_POSITIONS[employee.position]?.name ?? employee.position}
              </p>
            </div>
            <div>
              <span className="text-surface-500 uppercase tracking-wider">Fecha Ingreso</span>
              <p className="text-surface-200 mt-1 font-medium">{formatDate(employee.hireDate)}</p>
            </div>
            <div>
              <span className="text-surface-500 uppercase tracking-wider">No. Expediente</span>
              <p className="text-surface-200 mt-1 font-medium">{employee.expedientNumber}</p>
            </div>
          </div>
        </motion.div>

        {/* Quiz Scores Summary */}
        {quizModules.length > 0 && (
          <motion.div {...fadeUp} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-4">
              <Star size={16} className="text-yellow-400" />
              Resumen de Quizzes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {quizModules.map((mod) => {
                const quizTotal = mod.isVideo ? (mod.questionsCount ?? 5) : 5;
                const passMin = mod.isVideo ? videoPassThreshold(quizTotal) : PASS_THRESHOLD;
                const passed = (mod.quizScore ?? 0) >= passMin;
                return (
                  <div
                    key={mod.id}
                    className={`p-3 rounded-xl ${
                      passed
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-surface-300 font-medium truncate pr-2">
                        M{mod.id}: {mod.name.length > 30 ? mod.name.slice(0, 30) + '...' : mod.name}
                      </span>
                      <span
                        className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-yellow-400'}`}
                      >
                        {mod.quizScore}/{quizTotal}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* All Modules Summary */}
        <motion.div {...fadeUp} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2 mb-4">
            <FileText size={16} className="text-accent-400" />
            Detalle de Modulos Completados
          </h3>
          <div className="space-y-2">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30 border border-surface-700/20"
              >
                <div className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {mod.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-surface-200 font-medium truncate">{mod.name}</p>
                </div>
                {mod.quizScore !== undefined && (
                  <span
                    className={`text-xs font-semibold ${
                      mod.quizScore >= (mod.isVideo ? videoPassThreshold(mod.questionsCount ?? 5) : PASS_THRESHOLD)
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    Eval: {mod.quizScore}/{mod.isVideo ? (mod.questionsCount ?? 5) : 5}
                  </span>
                )}
                {mod.signatureUrl && (
                  <PenTool size={12} className="text-blue-400 shrink-0" />
                )}
                {mod.completedDate && (
                  <span className="text-[10px] text-surface-500 shrink-0">
                    {formatDate(mod.completedDate)}
                  </span>
                )}
                <CheckCircle size={14} className="text-green-400 shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Back to list */}
        <div className="flex justify-center pb-4">
          <button onClick={onBackToList} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} />
            Volver a la Lista
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.8 — VIDEOTECA
// Todos los videos del sistema (el informativo de recepcion + los 11 de
// onboarding) en un solo lugar, para verlos EN CUALQUIER MOMENTO, sin depender
// de un colaborador ni del avance del onboarding. Usa los mismos reproductores
// (narrado / real / demostracion) que el resto del sistema.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface VideotecaItem {
  key: string;
  titulo: string;
  subtitulo: string;
  critical?: boolean;
  videoUrl?: string;
  narrationUrl?: string;
  captions: { titulo: string; texto: string }[];
  sceneClips: string[];
}

function VideotecaView({ onBack }: { onBack: () => void }) {
  const settings = useStore((s) => s.settings);
  const [selected, setSelected] = useState<VideotecaItem | null>(null);

  const items: VideotecaItem[] = useMemo(() => {
    return [
      {
        key: 'reception',
        titulo: 'Video de recepcion (informativo)',
        subtitulo: 'Se muestra a los candidatos en la recepcion',
        videoUrl: settings.receptionVideoUrl,
        narrationUrl: settings.receptionNarrationUrl,
        captions: getReceptionVideoScript(),
        sceneClips: receptionSceneClips,
      },
      ...getDefaultOnboardingModules().map((m) => ({
        key: `onb-${m.id}`,
        titulo: `${m.id}. ${m.name}`,
        subtitulo: `Onboarding · ${m.duration}`,
        critical: m.critical,
        videoUrl: settings.onboardingVideoUrls?.[m.id],
        narrationUrl: settings.onboardingNarrationUrls?.[m.id],
        captions: getOnboardingVideoScript(m.id),
        sceneClips: getOnboardingSceneClips(m.id),
      })),
    ];
  }, [settings]);

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl glass-light flex items-center justify-center text-surface-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Film size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-100">Videoteca</h1>
            <p className="text-sm text-surface-400">
              {items.length} videos del sistema — disponibles para verlos en cualquier momento
            </p>
          </div>
        </div>
      </div>

      {/* Grid de videos */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((item, i) => {
            const hasReal = !!parseVideoSource(item.videoUrl);
            const hasNarration = !hasReal && !!(item.narrationUrl ?? '').trim();
            return (
              <motion.button
                key={item.key}
                custom={i}
                variants={listItem}
                initial="initial"
                animate="animate"
                type="button"
                onClick={() => setSelected(item)}
                className="glass-card p-4 text-left group hover:border-primary-500/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center shrink-0 group-hover:from-primary-500/30 group-hover:to-accent-500/30 transition-colors">
                    <Play size={18} className="text-primary-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-surface-100 leading-snug">{item.titulo}</h3>
                    <p className="text-[11px] text-surface-500 mt-1">{item.subtitulo}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {item.critical && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold badge-red">CRITICO</span>
                      )}
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold badge-blue">
                        {hasReal ? 'Video' : hasNarration ? 'Narrado' : 'Guion'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Reproductor en modal */}
      <AnimatePresence>
        {selected && <VideotecaPlayer item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

function VideotecaPlayer({ item, onClose }: { item: VideotecaItem; onClose: () => void }) {
  const source = parseVideoSource(item.videoUrl);
  const usingReal = !!source;
  const usingNarration = !usingReal && !!(item.narrationUrl ?? '').trim();
  const [ended, setEnded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">{item.titulo}</h3>
            <p className="text-xs text-surface-500">Videoteca · reproduccion libre</p>
          </div>
          <button className="btn-secondary text-sm flex items-center gap-1.5 shrink-0" onClick={onClose}>
            <X size={15} /> Cerrar
          </button>
        </div>

        {usingReal ? (
          <div className="aspect-video bg-black">
            <RealVideoPlayer
              source={source!}
              title={item.titulo}
              complete={ended}
              onEnded={() => setEnded(true)}
              onRestart={() => setEnded(false)}
            />
          </div>
        ) : usingNarration ? (
          <NarratedVideoPlayer
            audioUrl={(item.narrationUrl || '').trim()}
            captions={item.captions}
            title={item.titulo}
            sceneClips={item.sceneClips}
            complete={ended}
            onEnded={() => setEnded(true)}
            onRestart={() => setEnded(false)}
          />
        ) : (
          <div className="p-5 space-y-3">
            <div className="p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-start gap-2">
              <Info size={16} className="text-warning-500 mt-0.5 shrink-0" />
              <p className="text-xs text-surface-300">
                Este video aun no tiene una URL de video real ni narracion configurada (Configuracion →
                Videos del sistema). Mientras tanto, este es el guion del video:
              </p>
            </div>
            <div className="space-y-2">
              {item.captions.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-800/40">
                  <p className="text-xs font-semibold text-primary-300">{c.titulo}</p>
                  <p className="text-sm text-surface-200 mt-1 leading-snug">{c.texto}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
