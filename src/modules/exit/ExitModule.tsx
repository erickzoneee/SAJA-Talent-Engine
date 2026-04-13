import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  LogOut,
  FileText,
  Eye,
  Star,
  ChevronRight,
  Printer,
  Award,
  Phone,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Gift,
  CheckCircle2,
} from 'lucide-react';
import type { Employee, ExitData, ExitType, LetterType } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import { suggestLetterType } from '../../utils/scoring';
import {
  formatDate,
  EXIT_TYPE_LABELS,
  LETTER_TYPE_LABELS,
  generateId,
  getInitials,
} from '../../utils/helpers';
import StarRating from '../../components/StarRating';

// ── Constants ────────────────────────────────────────────────────────────────

const EXIT_TYPES: { value: ExitType; label: string }[] = [
  { value: 'renuncia', label: 'Renuncia voluntaria' },
  { value: 'fin_contrato', label: 'Fin de contrato eventual' },
  { value: 'rescision', label: 'Rescision por la empresa' },
  { value: 'mutuo_acuerdo', label: 'Mutuo acuerdo' },
  { value: 'abandono', label: 'Abandono de empleo' },
  { value: 'incapacidad', label: 'Incapacidad / Medica' },
];

const LETTER_OPTIONS: { value: LetterType; label: string; color: string; badgeClass: string; desc: string }[] = [
  { value: 'A', label: 'BUENA RECOMENDACION', color: 'text-emerald-400', badgeClass: 'badge-green', desc: 'Carta calida y positiva para colaboradores ejemplares' },
  { value: 'B', label: 'RECOMENDACION REGULAR', color: 'text-amber-400', badgeClass: 'badge-yellow', desc: 'Carta neutra y profesional, confirma empleo' },
  { value: 'C', label: 'MINIMA', color: 'text-red-400', badgeClass: 'badge-red', desc: 'Solo confirma fechas y puesto' },
];

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

function letterBadgeClass(type: LetterType): string {
  if (type === 'A') return 'badge-green';
  if (type === 'B') return 'badge-yellow';
  return 'badge-red';
}

// ── Animation Variants ───────────────────────────────────────────────────────

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

// ── Types ────────────────────────────────────────────────────────────────────

type ViewState =
  | { kind: 'list' }
  | { kind: 'register'; employeeId: string }
  | { kind: 'detail'; employeeId: string }
  | { kind: 'letter'; employeeId: string }
  | { kind: 'references' };

// ── Main Component ───────────────────────────────────────────────────────────

export default function ExitModule() {
  const [view, setView] = useState<ViewState>({ kind: 'list' });

  return (
    <AnimatePresence mode="wait">
      {view.kind === 'list' && (
        <motion.div key="list" {...pageTransition}>
          <EmployeeListView
            onRegister={(id) => setView({ kind: 'register', employeeId: id })}
            onDetail={(id) => setView({ kind: 'detail', employeeId: id })}
            onReferences={() => setView({ kind: 'references' })}
          />
        </motion.div>
      )}
      {view.kind === 'register' && (
        <motion.div key="register" {...pageTransition}>
          <ExitRegistrationView
            employeeId={view.employeeId}
            onBack={() => setView({ kind: 'list' })}
            onComplete={(id) => setView({ kind: 'letter', employeeId: id })}
          />
        </motion.div>
      )}
      {view.kind === 'detail' && (
        <motion.div key="detail" {...pageTransition}>
          <ExitDetailView
            employeeId={view.employeeId}
            onBack={() => setView({ kind: 'list' })}
            onViewLetter={(id) => setView({ kind: 'letter', employeeId: id })}
          />
        </motion.div>
      )}
      {view.kind === 'letter' && (
        <motion.div key="letter" {...pageTransition}>
          <LetterPreviewView
            employeeId={view.employeeId}
            onBack={() => setView({ kind: 'detail', employeeId: view.employeeId })}
          />
        </motion.div>
      )}
      {view.kind === 'references' && (
        <motion.div key="references" {...pageTransition}>
          <ReferenceLookupView onBack={() => setView({ kind: 'list' })} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 1: Employee List (Active / Exited tabs)
// ══════════════════════════════════════════════════════════════════════════════

function EmployeeListView({
  onRegister,
  onDetail,
  onReferences,
}: {
  onRegister: (id: string) => void;
  onDetail: (id: string) => void;
  onReferences: () => void;
}) {
  const { employees } = useStore();
  const [tab, setTab] = useState<'active' | 'exited'>('active');
  const [search, setSearch] = useState('');

  const activeEmployees = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'inactive')
        .filter((e) => e.fullName.toLowerCase().includes(search.toLowerCase())),
    [employees, search],
  );

  const exitedEmployees = useMemo(
    () =>
      employees
        .filter((e) => e.status === 'inactive' && e.exitData)
        .filter((e) => e.fullName.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          const da = a.exitData?.exitDate ?? '';
          const db = b.exitData?.exitDate ?? '';
          return db.localeCompare(da);
        }),
    [employees, search],
  );

  const currentList = tab === 'active' ? activeEmployees : exitedEmployees;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Modulo de Egreso</h1>
          <p className="text-surface-400 text-sm mt-1">
            Gestion de egresos, entrevistas de salida y cartas de recomendacion
          </p>
        </div>
        <button onClick={onReferences} className="btn-secondary flex items-center gap-2">
          <Phone size={16} />
          Consulta de Referencias
        </button>
      </div>

      {/* Tabs */}
      <div className="glass-card p-1 inline-flex gap-1">
        <button
          onClick={() => setTab('active')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === 'active'
              ? 'bg-primary-500/20 text-primary-400 shadow-lg'
              : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
          }`}
        >
          <UserCheck size={14} className="inline mr-2 -mt-0.5" />
          Colaboradores Activos ({employees.filter((e) => e.status !== 'inactive').length})
        </button>
        <button
          onClick={() => setTab('exited')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === 'exited'
              ? 'bg-primary-500/20 text-primary-400 shadow-lg'
              : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
          }`}
        >
          <UserX size={14} className="inline mr-2 -mt-0.5" />
          Egresados ({employees.filter((e) => e.status === 'inactive' && e.exitData).length})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Buscar colaborador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      {/* List */}
      {currentList.length === 0 ? (
        <motion.div {...fadeUp} className="glass-card p-12 text-center">
          <LogOut size={40} className="mx-auto text-surface-600 mb-3" />
          <p className="text-surface-400">
            {search
              ? 'No se encontraron resultados'
              : tab === 'active'
                ? 'No hay colaboradores activos registrados'
                : 'No hay registros de egresados'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {currentList.map((emp, i) => (
            <motion.div
              key={emp.id}
              custom={i}
              variants={listItem}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass-card p-4 flex items-center gap-4 group"
            >
              {/* Avatar */}
              <div
                className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.fullName)} flex items-center justify-center shrink-0`}
              >
                {emp.photoUrl ? (
                  <img src={emp.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">{getInitials(emp.fullName)}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-surface-100 font-semibold truncate">{emp.fullName}</p>
                <p className="text-surface-400 text-sm">
                  {JOB_POSITIONS[emp.position]?.name ?? emp.position}
                </p>
              </div>

              {/* Date & badges */}
              <div className="flex items-center gap-3">
                {tab === 'active' && (
                  <span className="text-surface-500 text-xs">
                    Ingreso: {formatDate(emp.hireDate)}
                  </span>
                )}
                {tab === 'exited' && emp.exitData && (
                  <>
                    <span className="text-surface-500 text-xs">
                      Egreso: {formatDate(emp.exitData.exitDate)}
                    </span>
                    <span className={`badge ${letterBadgeClass(emp.exitData.letterType)}`}>
                      Carta {emp.exitData.letterType} - {LETTER_TYPE_LABELS[emp.exitData.letterType].name}
                    </span>
                  </>
                )}
              </div>

              {/* Action */}
              {tab === 'active' ? (
                <button
                  onClick={() => onRegister(emp.id)}
                  className="btn-danger flex items-center gap-2 text-sm py-2 px-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <LogOut size={14} />
                  Registrar Egreso
                </button>
              ) : (
                <button
                  onClick={() => onDetail(emp.id)}
                  className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
                >
                  <Eye size={14} />
                  Ver Detalle
                  <ChevronRight size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 2: Exit Registration Form
// ══════════════════════════════════════════════════════════════════════════════

interface ExitFormState {
  exitDate: string;
  exitType: ExitType;
  reason: string;
  observations: string;
  interview: {
    mainReason: string;
    liked: string;
    disliked: string;
    supervisorRating: number;
    environmentRating: number;
    wouldRecommend: string;
    suggestions: string;
  };
  letterType: LetterType;
}

function createEmptyForm(): ExitFormState {
  return {
    exitDate: new Date().toISOString().split('T')[0],
    exitType: 'renuncia',
    reason: '',
    observations: '',
    interview: {
      mainReason: '',
      liked: '',
      disliked: '',
      supervisorRating: 0,
      environmentRating: 0,
      wouldRecommend: 'Si',
      suggestions: '',
    },
    letterType: 'B',
  };
}

function ExitRegistrationView({
  employeeId,
  onBack,
  onComplete,
}: {
  employeeId: string;
  onBack: () => void;
  onComplete: (id: string) => void;
}) {
  const { employees, updateEmployee, settings } = useStore();
  const employee = employees.find((e) => e.id === employeeId);
  const [form, setForm] = useState<ExitFormState>(createEmptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const [suggestedType, setSuggestedType] = useState<LetterType | null>(null);

  // Compute employee history summary
  const history = useMemo(() => {
    if (!employee) return null;
    const evalAvg =
      employee.evaluations.length > 0
        ? employee.evaluations.reduce((s, e) => s + e.averageScore, 0) / employee.evaluations.length
        : 0;
    const hireMs = new Date(employee.hireDate).getTime();
    const nowMs = Date.now();
    const months = Math.floor((nowMs - hireMs) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    const timeStr = years > 0 ? `${years} ano${years > 1 ? 's' : ''} ${remainMonths} mes${remainMonths !== 1 ? 'es' : ''}` : `${months} mes${months !== 1 ? 'es' : ''}`;

    return {
      evalAvg: evalAvg.toFixed(2),
      evalCount: employee.evaluations.length,
      incidentCount: employee.incidents.length,
      bonusCount: employee.bonuses.length,
      bonusTotal: employee.bonuses.reduce((s, b) => s + b.amount, 0),
      timeInCompany: timeStr,
      months,
    };
  }, [employee]);

  // When exitType changes, compute suggested letter
  const computeSuggestedLetter = useCallback(() => {
    if (!employee) return;
    const tempEmployee: Employee = {
      ...employee,
      exitData: {
        exitDate: form.exitDate,
        exitType: form.exitType,
        reason: form.reason,
        observations: form.observations,
        exitInterview: {
          mainReason: form.interview.mainReason,
          liked: form.interview.liked,
          disliked: form.interview.disliked,
          supervisorRating: form.interview.supervisorRating,
          environmentRating: form.interview.environmentRating,
          wouldRecommend: form.interview.wouldRecommend,
          suggestions: form.interview.suggestions,
        },
        letterType: 'B',
        letterGenerated: false,
      },
    };
    const suggested = suggestLetterType(tempEmployee);
    setSuggestedType(suggested);
  }, [employee, form.exitDate, form.exitType, form.reason, form.observations, form.interview]);

  // Trigger suggestion when form data changes
  useMemo(() => {
    computeSuggestedLetter();
  }, [computeSuggestedLetter]);

  if (!employee) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertTriangle size={40} className="mx-auto text-amber-400 mb-3" />
        <p className="text-surface-400">Colaborador no encontrado</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Regresar
        </button>
      </div>
    );
  }

  const handleSubmit = () => {
    const exitData: ExitData = {
      exitDate: form.exitDate,
      exitType: form.exitType,
      reason: form.reason,
      observations: form.observations,
      exitInterview: {
        mainReason: form.interview.mainReason,
        liked: form.interview.liked,
        disliked: form.interview.disliked,
        supervisorRating: form.interview.supervisorRating,
        environmentRating: form.interview.environmentRating,
        wouldRecommend: form.interview.wouldRecommend,
        suggestions: form.interview.suggestions,
      },
      letterType: form.letterType,
      letterGenerated: false,
    };

    updateEmployee(employee.id, {
      status: 'inactive',
      exitData,
    });

    onComplete(employee.id);
  };

  const updateInterview = (field: keyof ExitFormState['interview'], value: string | number) => {
    setForm((prev) => ({
      ...prev,
      interview: { ...prev.interview, [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn-secondary p-2.5 rounded-xl">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Registro de Egreso</h1>
          <p className="text-surface-400 text-sm mt-0.5">
            {employee.fullName} - {JOB_POSITIONS[employee.position]?.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main form - 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* Exit Data Section */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <LogOut size={18} className="text-primary-400" />
              Datos del Egreso
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1.5">Fecha de egreso</label>
                <input
                  type="date"
                  value={form.exitDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, exitDate: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1.5">Tipo de egreso</label>
                <select
                  value={form.exitType}
                  onChange={(e) => setForm((prev) => ({ ...prev, exitType: e.target.value as ExitType }))}
                  className="input-field"
                >
                  {EXIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Motivo detallado</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="input-field min-h-[80px] resize-y"
                placeholder="Describa el motivo de salida..."
              />
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Observaciones</label>
              <textarea
                value={form.observations}
                onChange={(e) => setForm((prev) => ({ ...prev, observations: e.target.value }))}
                className="input-field min-h-[80px] resize-y"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {/* Exit Interview Section */}
          <div className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <FileText size={18} className="text-primary-400" />
              Entrevista de Salida
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1.5">
                  Motivo principal de salida
                </label>
                <input
                  type="text"
                  value={form.interview.mainReason}
                  onChange={(e) => updateInterview('mainReason', e.target.value)}
                  className="input-field"
                  placeholder="Cual fue el motivo principal?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-surface-400 mb-1.5">
                    Lo que mas le gusto de trabajar aqui
                  </label>
                  <textarea
                    value={form.interview.liked}
                    onChange={(e) => updateInterview('liked', e.target.value)}
                    className="input-field min-h-[70px] resize-y"
                    placeholder="Aspectos positivos..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1.5">
                    Lo que menos le gusto
                  </label>
                  <textarea
                    value={form.interview.disliked}
                    onChange={(e) => updateInterview('disliked', e.target.value)}
                    className="input-field min-h-[70px] resize-y"
                    placeholder="Aspectos negativos..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-surface-400 mb-2">
                    Calificacion del supervisor directo
                  </label>
                  <StarRating
                    value={form.interview.supervisorRating}
                    onChange={(val) => updateInterview('supervisorRating', val)}
                    size={28}
                  />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-2">
                    Calificacion del ambiente de trabajo
                  </label>
                  <StarRating
                    value={form.interview.environmentRating}
                    onChange={(val) => updateInterview('environmentRating', val)}
                    size={28}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-2">
                  Recomendaria la empresa a un conocido?
                </label>
                <div className="flex gap-2">
                  {(['Si', 'No', 'Tal vez'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateInterview('wouldRecommend', opt)}
                      className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                        form.interview.wouldRecommend === opt
                          ? opt === 'Si'
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : opt === 'No'
                              ? 'bg-red-500/20 border-red-500/50 text-red-400'
                              : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                          : 'bg-surface-800/40 border-white/10 text-surface-400 hover:bg-white/5'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1.5">
                  Sugerencias de mejora
                </label>
                <textarea
                  value={form.interview.suggestions}
                  onChange={(e) => updateInterview('suggestions', e.target.value)}
                  className="input-field min-h-[70px] resize-y"
                  placeholder="Que mejoraria de la empresa?"
                />
              </div>
            </div>
          </div>

          {/* Letter Type Selection */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Award size={18} className="text-primary-400" />
              Tipo de Carta de Recomendacion
            </h2>

            {suggestedType && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-light p-3 rounded-xl flex items-center gap-3"
              >
                <CheckCircle2 size={18} className="text-primary-400 shrink-0" />
                <p className="text-sm text-surface-300">
                  Sugerencia del sistema basada en historial:{' '}
                  <span className={`font-bold ${LETTER_OPTIONS.find((l) => l.value === suggestedType)?.color}`}>
                    Carta {suggestedType} - {LETTER_TYPE_LABELS[suggestedType].name}
                  </span>
                </p>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, letterType: suggestedType }))}
                  className="btn-secondary text-xs py-1.5 px-3 ml-auto shrink-0"
                >
                  Usar sugerencia
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {LETTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, letterType: opt.value }))}
                  className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                    form.letterType === opt.value
                      ? `${opt.badgeClass.replace('badge-', 'bg-')}/10 border-current ${opt.color}`
                      : 'bg-surface-800/30 border-white/10 text-surface-400 hover:bg-white/5'
                  }`}
                  style={
                    form.letterType === opt.value
                      ? {
                          borderColor:
                            opt.value === 'A'
                              ? 'rgba(34,197,94,0.5)'
                              : opt.value === 'B'
                                ? 'rgba(245,158,11,0.5)'
                                : 'rgba(239,68,68,0.5)',
                          backgroundColor:
                            opt.value === 'A'
                              ? 'rgba(34,197,94,0.1)'
                              : opt.value === 'B'
                                ? 'rgba(245,158,11,0.1)'
                                : 'rgba(239,68,68,0.1)',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${opt.badgeClass} text-xs`}>Carta {opt.value}</span>
                  </div>
                  <p className={`font-bold text-sm ${form.letterType === opt.value ? opt.color : ''}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Letter preview toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Eye size={14} />
              {showPreview ? 'Ocultar vista previa' : 'Ver vista previa de la carta'}
            </button>

            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white text-gray-900 rounded-xl p-8 mt-2 max-h-[400px] overflow-y-auto">
                    <LetterContent employee={employee} letterType={form.letterType} exitDate={form.exitDate} companyName={settings.companyName} directorName={settings.directorName} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 justify-end">
            <button onClick={onBack} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.exitDate || !form.reason}
              className="btn-danger flex items-center gap-2"
            >
              <LogOut size={16} />
              Registrar Egreso
            </button>
          </div>
        </div>

        {/* Sidebar: History Summary */}
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-400" />
              Resumen del Colaborador
            </h3>

            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(employee.fullName)} flex items-center justify-center shrink-0`}
              >
                {employee.photoUrl ? (
                  <img src={employee.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <span className="text-white text-lg font-bold">{getInitials(employee.fullName)}</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-surface-100">{employee.fullName}</p>
                <p className="text-sm text-surface-400">{JOB_POSITIONS[employee.position]?.name}</p>
              </div>
            </div>

            {history && (
              <div className="space-y-3 pt-2">
                <HistoryRow
                  icon={<Clock size={14} className="text-primary-400" />}
                  label="Tiempo en la empresa"
                  value={history.timeInCompany}
                />
                <HistoryRow
                  icon={<TrendingUp size={14} className="text-emerald-400" />}
                  label="Promedio evaluaciones"
                  value={`${history.evalAvg} / 5.00 (${history.evalCount} eval.)`}
                />
                <HistoryRow
                  icon={<ShieldAlert size={14} className="text-amber-400" />}
                  label="Incidencias registradas"
                  value={String(history.incidentCount)}
                />
                <HistoryRow
                  icon={<Gift size={14} className="text-purple-400" />}
                  label="Bonos otorgados"
                  value={`${history.bonusCount} ($${history.bonusTotal.toLocaleString()})`}
                />
              </div>
            )}
          </div>

          {/* Employment details */}
          <div className="glass-card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
              Datos Laborales
            </h3>
            <DetailRow label="No. Expediente" value={String(employee.expedientNumber)} />
            <DetailRow label="Fecha de ingreso" value={formatDate(employee.hireDate)} />
            <DetailRow label="Tipo de contrato" value={employee.contractType === 'eventual' ? 'Eventual' : 'Indefinido'} />
            <DetailRow label="Area" value={employee.area} />
            <DetailRow label="Supervisor" value={employee.supervisor} />
            <DetailRow label="Salario" value={`$${employee.salary.toLocaleString()}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-surface-500">{label}</p>
        <p className="text-sm text-surface-200 font-medium">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-surface-500">{label}</span>
      <span className="text-sm text-surface-200">{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 3: Exit Detail (for exited employees)
// ══════════════════════════════════════════════════════════════════════════════

function ExitDetailView({
  employeeId,
  onBack,
  onViewLetter,
}: {
  employeeId: string;
  onBack: () => void;
  onViewLetter: (id: string) => void;
}) {
  const { employees } = useStore();
  const employee = employees.find((e) => e.id === employeeId);

  if (!employee || !employee.exitData) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertTriangle size={40} className="mx-auto text-amber-400 mb-3" />
        <p className="text-surface-400">Registro de egreso no encontrado</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Regresar
        </button>
      </div>
    );
  }

  const exit = employee.exitData;
  const interview = exit.exitInterview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-secondary p-2.5 rounded-xl">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Detalle de Egreso</h1>
            <p className="text-surface-400 text-sm mt-0.5">{employee.fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${letterBadgeClass(exit.letterType)} text-sm`}>
            Carta {exit.letterType} - {LETTER_TYPE_LABELS[exit.letterType].name}
          </span>
          <button
            onClick={() => onViewLetter(employee.id)}
            className="btn-primary flex items-center gap-2"
          >
            <FileText size={16} />
            Ver Carta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exit data */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
            <LogOut size={18} className="text-primary-400" />
            Datos del Egreso
          </h2>
          <div className="space-y-3">
            <DetailRow label="Fecha de egreso" value={formatDate(exit.exitDate)} />
            <DetailRow label="Tipo de egreso" value={EXIT_TYPE_LABELS[exit.exitType]} />
            <div>
              <p className="text-xs text-surface-500 mb-1">Motivo</p>
              <p className="text-sm text-surface-200 glass-light p-3 rounded-lg">{exit.reason || '---'}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 mb-1">Observaciones</p>
              <p className="text-sm text-surface-200 glass-light p-3 rounded-lg">{exit.observations || '---'}</p>
            </div>
          </div>
        </div>

        {/* Interview */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
            <FileText size={18} className="text-primary-400" />
            Entrevista de Salida
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-surface-500">Motivo principal</p>
              <p className="text-sm text-surface-200">{interview.mainReason || '---'}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Lo que mas le gusto</p>
              <p className="text-sm text-surface-200">{interview.liked || '---'}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Lo que menos le gusto</p>
              <p className="text-sm text-surface-200">{interview.disliked || '---'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-surface-500 mb-1">Supervisor</p>
                <StarRating value={interview.supervisorRating} readOnly size={20} />
              </div>
              <div>
                <p className="text-xs text-surface-500 mb-1">Ambiente</p>
                <StarRating value={interview.environmentRating} readOnly size={20} />
              </div>
            </div>
            <div>
              <p className="text-xs text-surface-500">Recomendaria la empresa?</p>
              <span
                className={`badge mt-1 ${
                  interview.wouldRecommend === 'Si'
                    ? 'badge-green'
                    : interview.wouldRecommend === 'No'
                      ? 'badge-red'
                      : 'badge-yellow'
                }`}
              >
                {interview.wouldRecommend}
              </span>
            </div>
            <div>
              <p className="text-xs text-surface-500">Sugerencias</p>
              <p className="text-sm text-surface-200">{interview.suggestions || '---'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employment summary */}
      <div className="glass-card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-surface-100">Resumen Laboral</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Puesto"
            value={JOB_POSITIONS[employee.position]?.name ?? employee.position}
          />
          <SummaryCard label="Ingreso" value={formatDate(employee.hireDate)} />
          <SummaryCard label="Egreso" value={formatDate(exit.exitDate)} />
          <SummaryCard
            label="Evaluaciones"
            value={
              employee.evaluations.length > 0
                ? `${(employee.evaluations.reduce((s, e) => s + e.averageScore, 0) / employee.evaluations.length).toFixed(1)} / 5`
                : 'Sin evaluaciones'
            }
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-light p-4 rounded-xl">
      <p className="text-xs text-surface-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-surface-100">{value}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 4: Letter Preview & Print
// ══════════════════════════════════════════════════════════════════════════════

function LetterPreviewView({
  employeeId,
  onBack,
}: {
  employeeId: string;
  onBack: () => void;
}) {
  const { employees, settings } = useStore();
  const employee = employees.find((e) => e.id === employeeId);

  if (!employee || !employee.exitData) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertTriangle size={40} className="mx-auto text-amber-400 mb-3" />
        <p className="text-surface-400">Datos no disponibles</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Regresar
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-secondary p-2.5 rounded-xl">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Carta de Recomendacion</h1>
            <p className="text-surface-400 text-sm mt-0.5">
              {employee.fullName} - Carta {employee.exitData.letterType}
            </p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer size={16} />
          Imprimir
        </button>
      </div>

      {/* Letter */}
      <div className="bg-white text-gray-900 rounded-xl p-10 max-w-3xl mx-auto shadow-2xl print:shadow-none print:rounded-none print:p-8 print:max-w-none">
        <LetterContent
          employee={employee}
          letterType={employee.exitData.letterType}
          exitDate={employee.exitData.exitDate}
          companyName={settings.companyName}
          directorName={settings.directorName}
        />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .glass, .glass-card, .glass-light { background: transparent !important; border: none !important; backdrop-filter: none !important; }
        }
      `}</style>
    </div>
  );
}

function LetterContent({
  employee,
  letterType,
  exitDate,
  companyName,
  directorName,
}: {
  employee: Employee;
  letterType: LetterType;
  exitDate: string;
  companyName: string;
  directorName: string;
}) {
  const positionName = JOB_POSITIONS[employee.position]?.name ?? employee.position;
  const today = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="font-serif leading-relaxed">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
        <h1 className="text-xl font-bold text-gray-800 uppercase tracking-wider">{companyName}</h1>
        <p className="text-sm text-gray-500 mt-1">Carta de Recomendacion Laboral</p>
      </div>

      <p className="text-right text-sm text-gray-600 mb-6">
        Ciudad de Mexico, a {today}
      </p>

      <p className="font-bold text-gray-700 mb-4">A QUIEN CORRESPONDA:</p>

      {letterType === 'A' && (
        <div className="space-y-4 text-gray-700 text-sm">
          <p>
            Por medio de la presente, me es grato recomendar ampliamente al(la) C.{' '}
            <strong>{employee.fullName}</strong>, quien laboro en nuestra empresa desde el{' '}
            <strong>{formatDate(employee.hireDate)}</strong> hasta el{' '}
            <strong>{formatDate(exitDate)}</strong>, desempenando el puesto de{' '}
            <strong>{positionName}</strong>.
          </p>
          <p>
            Durante su estancia en nuestra organizacion, el(la) C. {employee.fullName} demostro ser
            una persona altamente responsable, comprometida, puntual y con una excelente actitud
            hacia el trabajo y hacia sus companeros. Su desempeno fue consistentemente sobresaliente,
            cumpliendo y superando las expectativas de su puesto.
          </p>
          <p>
            Es una persona de confianza, con gran capacidad de trabajo en equipo, iniciativa propia
            y disposicion para aprender y mejorar continuamente. Su conducta fue siempre
            ejemplar y contribuyo positivamente al ambiente laboral.
          </p>
          <p>
            Por todo lo anterior, recomiendo ampliamente al(la) C. {employee.fullName} para cualquier
            oportunidad laboral que se le presente, con la certeza de que sera un excelente
            elemento para cualquier organizacion.
          </p>
        </div>
      )}

      {letterType === 'B' && (
        <div className="space-y-4 text-gray-700 text-sm">
          <p>
            Por medio de la presente, hago constar que el(la) C.{' '}
            <strong>{employee.fullName}</strong> laboro en{' '}
            <strong>{companyName}</strong> desde el{' '}
            <strong>{formatDate(employee.hireDate)}</strong> hasta el{' '}
            <strong>{formatDate(exitDate)}</strong>, desempenando el puesto de{' '}
            <strong>{positionName}</strong>.
          </p>
          <p>
            Durante el tiempo que formo parte de nuestra organizacion, el(la) C. {employee.fullName}{' '}
            cumplio con las funciones asignadas a su puesto de manera satisfactoria, manteniendo
            una conducta adecuada conforme a las politicas internas de la empresa.
          </p>
          <p>
            Se extiende la presente carta a solicitud del interesado(a) y para los fines
            que al mismo(a) convengan.
          </p>
        </div>
      )}

      {letterType === 'C' && (
        <div className="space-y-4 text-gray-700 text-sm">
          <p>
            Por medio de la presente, se hace constar que el(la) C.{' '}
            <strong>{employee.fullName}</strong> laboro en{' '}
            <strong>{companyName}</strong> durante el periodo comprendido del{' '}
            <strong>{formatDate(employee.hireDate)}</strong> al{' '}
            <strong>{formatDate(exitDate)}</strong>, ocupando el puesto de{' '}
            <strong>{positionName}</strong>.
          </p>
          <p>
            Se extiende la presente constancia a solicitud del interesado(a) y para los fines
            legales que al mismo(a) convengan.
          </p>
        </div>
      )}

      {/* Signature */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-600">Atentamente,</p>
        <div className="mt-10 border-t border-gray-400 w-64 mx-auto pt-2">
          <p className="font-bold text-gray-800 text-sm">{directorName}</p>
          <p className="text-xs text-gray-500">{companyName}</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW 5: Reference Lookup
// ══════════════════════════════════════════════════════════════════════════════

function ReferenceLookupView({ onBack }: { onBack: () => void }) {
  const { employees } = useStore();
  const [search, setSearch] = useState('');

  const exitedEmployees = useMemo(
    () =>
      employees
        .filter((e) => e.status === 'inactive' && e.exitData)
        .filter((e) => e.fullName.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          const da = a.exitData?.exitDate ?? '';
          const db = b.exitData?.exitDate ?? '';
          return db.localeCompare(da);
        }),
    [employees, search],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn-secondary p-2.5 rounded-xl">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Consulta de Referencias</h1>
          <p className="text-surface-400 text-sm mt-0.5">
            Busque ex-colaboradores para consulta telefonica de referencias
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-lg">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Buscar ex-colaborador por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-11"
          autoFocus
        />
      </div>

      {/* Reference Guide */}
      <div className="glass-card p-5 border-amber-500/30">
        <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-3">
          <Phone size={14} />
          Guia para Referencias Telefonicas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="glass-light p-3 rounded-lg">
            <span className="badge badge-green text-xs mb-2">Carta A</span>
            <p className="text-surface-300 mt-2">
              Puede confirmar todos los datos, hablar positivamente del desempeno y recomendar
              abiertamente. Mencionar cualidades destacadas.
            </p>
          </div>
          <div className="glass-light p-3 rounded-lg">
            <span className="badge badge-yellow text-xs mb-2">Carta B</span>
            <p className="text-surface-300 mt-2">
              Confirmar datos laborales (puesto, fechas, funciones). Respuestas neutrales sobre
              desempeno. No entrar en detalles adicionales.
            </p>
          </div>
          <div className="glass-light p-3 rounded-lg">
            <span className="badge badge-red text-xs mb-2">Carta C</span>
            <p className="text-surface-300 mt-2">
              Solo confirmar fechas de ingreso/egreso y puesto ocupado. No dar opinion sobre
              desempeno. Respuestas minimas.
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {search.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Search size={40} className="mx-auto text-surface-600 mb-3" />
          <p className="text-surface-400">Escriba el nombre del ex-colaborador para buscar</p>
        </div>
      ) : exitedEmployees.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserX size={40} className="mx-auto text-surface-600 mb-3" />
          <p className="text-surface-400">No se encontraron ex-colaboradores con ese nombre</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exitedEmployees.map((emp, i) => {
            const exit = emp.exitData!;
            return (
              <motion.div
                key={emp.id}
                custom={i}
                variants={listItem}
                initial="initial"
                animate="animate"
                className="glass-card p-5"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.fullName)} flex items-center justify-center shrink-0`}
                  >
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <span className="text-white text-lg font-bold">{getInitials(emp.fullName)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-surface-100 text-lg">{emp.fullName}</p>
                      <span className={`badge ${letterBadgeClass(exit.letterType)} text-sm`}>
                        Carta {exit.letterType} - {LETTER_TYPE_LABELS[exit.letterType].name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-surface-400">
                      <span>{JOB_POSITIONS[emp.position]?.name}</span>
                      <span>Ingreso: {formatDate(emp.hireDate)}</span>
                      <span>Egreso: {formatDate(exit.exitDate)}</span>
                      <span>Tipo: {EXIT_TYPE_LABELS[exit.exitType]}</span>
                    </div>
                  </div>
                </div>

                {/* Reference guide for this employee */}
                <div className="mt-4 glass-light p-4 rounded-xl">
                  <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold mb-2">
                    Guia de respuesta telefonica
                  </p>
                  {exit.letterType === 'A' && (
                    <div className="text-sm text-emerald-300 space-y-1">
                      <p>Confirmar: nombre, puesto, fechas, funciones, desempeno positivo.</p>
                      <p>Puede recomendar abiertamente. Mencionar puntualidad, responsabilidad y actitud.</p>
                    </div>
                  )}
                  {exit.letterType === 'B' && (
                    <div className="text-sm text-amber-300 space-y-1">
                      <p>Confirmar: nombre, puesto, fechas laborales.</p>
                      <p>Respuestas neutrales. No emitir juicios sobre desempeno.</p>
                    </div>
                  )}
                  {exit.letterType === 'C' && (
                    <div className="text-sm text-red-300 space-y-1">
                      <p>Confirmar unicamente: nombre completo, fechas de ingreso y egreso, puesto ocupado.</p>
                      <p>No dar informacion adicional. Respuestas breves y factuales.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
