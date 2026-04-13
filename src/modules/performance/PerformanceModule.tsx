import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Star,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Plus,
  Clock,
  Shield,
  ArrowLeft,
  Search,
  Users,
  FileWarning,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import type {
  Employee,
  Evaluation,
  Incident,
  Bonus,
  Training,
  IncidentType,
} from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import { calculateEvaluationAverage, getPerformanceColor } from '../../utils/scoring';
import { generateId, formatDate, INCIDENT_LABELS } from '../../utils/helpers';
import StarRating from '../../components/StarRating';
import SignaturePad from '../../components/SignaturePad';
import Modal from '../../components/Modal';

// ─── Constants ──────────────────────────────────────────────────────────────

const EVALUATION_TYPES = [
  'Periodo de Prueba',
  '30 dias',
  '60 dias',
  '90 dias',
  'Semestral',
  'Anual',
] as const;

const CRITERIA_LABELS: Record<string, string> = {
  punctuality: 'Puntualidad y asistencia',
  instructions: 'Cumplimiento de instrucciones',
  quality: 'Calidad del trabajo',
  attitude: 'Actitud y disposicion',
  relationships: 'Relacion con companeros',
  bpmCompliance: 'Respeto a BPM y reglamento',
};

const INCIDENT_TYPES: IncidentType[] = [
  'falta_justificada',
  'falta_injustificada',
  'retardo',
  'amonestacion_verbal',
  'amonestacion_escrita',
  'acta_administrativa',
];

const DECISION_OPTIONS = ['Confirmar', 'Extender prueba', 'Rescindir'] as const;

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Animation Variants ─────────────────────────────────────────────────────

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
};

const tabContent = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysInTrial(hireDate: string): number {
  const hire = new Date(hireDate);
  const now = new Date();
  return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilTrialEnd(trialEndDate: string): number {
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

// ─── View Types ─────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'list' }
  | { view: 'employee'; employeeId: string };

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PerformanceModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'list' });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState.view === 'list' && (
          <motion.div key="list" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <EmployeeListView
              onSelectEmployee={(id) => setViewState({ view: 'employee', employeeId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'employee' && (
          <motion.div key="employee" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <EmployeeDashboard
              employeeId={viewState.employeeId}
              onBack={() => setViewState({ view: 'list' })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── VIEW 1: Employee List ──────────────────────────────────────────────────

function EmployeeListView({
  onSelectEmployee,
}: {
  onSelectEmployee: (id: string) => void;
}) {
  const { employees } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'trial' || e.status === 'active'),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return activeEmployees;
    const term = searchTerm.toLowerCase();
    return activeEmployees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(term) ||
        JOB_POSITIONS[e.position]?.name.toLowerCase().includes(term),
    );
  }, [activeEmployees, searchTerm]);

  // Alerts
  const trialAlerts = useMemo(
    () =>
      activeEmployees.filter(
        (e) => e.status === 'trial' && daysUntilTrialEnd(e.trialEndDate) <= 7 && daysUntilTrialEnd(e.trialEndDate) >= 0,
      ),
    [activeEmployees],
  );

  const pendingEvals = useMemo(
    () =>
      activeEmployees.filter((e) => {
        if (e.evaluations.length === 0) return true;
        const lastEval = e.evaluations[0];
        const daysSince = Math.floor(
          (Date.now() - new Date(lastEval.date).getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysSince > 180;
      }),
    [activeEmployees],
  );

  // Summary stats
  const totalActive = activeEmployees.length;
  const totalTrial = activeEmployees.filter((e) => e.status === 'trial').length;
  const totalIncidents = activeEmployees.reduce((sum, e) => sum + e.incidents.length, 0);
  const avgScore = useMemo(() => {
    const scored = activeEmployees.filter((e) => e.evaluations.length > 0);
    if (scored.length === 0) return 0;
    const total = scored.reduce(
      (sum, e) => sum + e.evaluations[0].averageScore,
      0,
    );
    return total / scored.length;
  }, [activeEmployees]);

  return (
    <div className="flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
            <TrendingUp size={28} />
            Seguimiento y Desempeno
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Evaluaciones, incidencias, bonos y capacitaciones
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={20} className="text-primary-400" />}
          label="Empleados Activos"
          value={totalActive}
          accent="primary"
        />
        <StatCard
          icon={<Clock size={20} className="text-amber-400" />}
          label="En Periodo de Prueba"
          value={totalTrial}
          accent="warning"
        />
        <StatCard
          icon={<Star size={20} className="text-emerald-400" />}
          label="Promedio General"
          value={avgScore > 0 ? avgScore.toFixed(1) : '--'}
          accent="success"
        />
        <StatCard
          icon={<AlertTriangle size={20} className="text-rose-400" />}
          label="Total Incidencias"
          value={totalIncidents}
          accent="danger"
        />
      </div>

      {/* Alerts */}
      {(trialAlerts.length > 0 || pendingEvals.length > 0) && (
        <div className="flex flex-col gap-2">
          {trialAlerts.map((emp) => (
            <motion.div
              key={`trial-${emp.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-light rounded-xl px-4 py-3 flex items-center gap-3 border-l-4 border-amber-500 cursor-pointer hover:bg-white/[0.04] transition-colors"
              onClick={() => onSelectEmployee(emp.id)}
            >
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-200">
                  <span className="font-semibold">{emp.fullName}</span> - Periodo de prueba termina en{' '}
                  <span className="text-amber-400 font-bold">{daysUntilTrialEnd(emp.trialEndDate)} dias</span>
                </p>
              </div>
              <ChevronRight size={16} className="text-surface-500 shrink-0" />
            </motion.div>
          ))}
          {pendingEvals.map((emp) => (
            <motion.div
              key={`eval-${emp.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-light rounded-xl px-4 py-3 flex items-center gap-3 border-l-4 border-primary-500 cursor-pointer hover:bg-white/[0.04] transition-colors"
              onClick={() => onSelectEmployee(emp.id)}
            >
              <FileWarning size={18} className="text-primary-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-200">
                  <span className="font-semibold">{emp.fullName}</span> - Evaluacion pendiente
                </p>
              </div>
              <ChevronRight size={16} className="text-surface-500 shrink-0" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          placeholder="Buscar empleado por nombre o puesto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      {/* Employee Cards */}
      <div className="flex flex-col gap-3">
        {filteredEmployees.length === 0 && (
          <div className="glass-card p-10 text-center">
            <Users size={48} className="mx-auto text-surface-600 mb-3" />
            <p className="text-surface-400">
              {searchTerm ? 'No se encontraron empleados' : 'No hay empleados activos'}
            </p>
          </div>
        )}
        {filteredEmployees.map((emp, i) => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            index={i}
            onClick={() => onSelectEmployee(emp.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  const borderColor: Record<string, string> = {
    primary: 'border-primary-500/30',
    warning: 'border-amber-500/30',
    success: 'border-emerald-500/30',
    danger: 'border-rose-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-4 border-t-2 ${borderColor[accent] ?? ''}`}
    >
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-surface-100">{value}</p>
      <p className="text-xs text-surface-400 mt-0.5">{label}</p>
    </motion.div>
  );
}

// ─── Employee Card ──────────────────────────────────────────────────────────

function EmployeeCard({
  employee,
  index,
  onClick,
}: {
  employee: Employee;
  index: number;
  onClick: () => void;
}) {
  const latestEval = employee.evaluations.length > 0 ? employee.evaluations[0] : null;
  const perfColor = latestEval ? getPerformanceColor(latestEval.averageScore) : null;
  const trial = employee.status === 'trial';
  const trialDays = trial ? daysInTrial(employee.hireDate) : 0;

  return (
    <motion.div
      variants={listItem}
      initial="initial"
      animate="animate"
      custom={index}
      onClick={onClick}
      className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
    >
      {/* Avatar */}
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(
          employee.fullName,
        )} flex items-center justify-center text-white font-bold text-sm shrink-0`}
      >
        {employee.photoUrl ? (
          <img
            src={employee.photoUrl}
            alt={employee.fullName}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          getInitials(employee.fullName)
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-surface-100 truncate">
            {employee.fullName}
          </h3>
          <span className={`badge ${trial ? 'badge-yellow' : 'badge-green'} text-[10px]`}>
            {trial ? 'Prueba' : 'Activo'}
          </span>
        </div>
        <p className="text-xs text-surface-400 mt-0.5">
          {JOB_POSITIONS[employee.position]?.name ?? employee.position} ·{' '}
          Ingreso: {formatDate(employee.hireDate)}
        </p>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Evaluation Score */}
        <div className="text-center">
          {latestEval ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-surface-100">
                  {latestEval.averageScore.toFixed(1)}
                </span>
              </div>
              <span className={`badge ${perfColor} text-[10px] mt-1`}>
                {latestEval.averageScore >= 4
                  ? 'Excelente'
                  : latestEval.averageScore >= 3
                    ? 'Regular'
                    : 'Bajo'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-surface-500">Sin eval.</span>
          )}
        </div>

        {/* Incident count */}
        {employee.incidents.length > 0 && (
          <div className="flex items-center gap-1">
            <AlertTriangle size={14} className="text-rose-400" />
            <span className="text-sm font-semibold text-rose-400">
              {employee.incidents.length}
            </span>
          </div>
        )}

        {/* Trial days */}
        {trial && (
          <div className="flex items-center gap-1 text-amber-400">
            <Clock size={14} />
            <span className="text-xs font-medium">{trialDays}d</span>
          </div>
        )}

        <ChevronRight
          size={18}
          className="text-surface-600 group-hover:text-surface-300 transition-colors"
        />
      </div>
    </motion.div>
  );
}

// ─── VIEW 2: Employee Dashboard ─────────────────────────────────────────────

type TabId = 'evaluaciones' | 'incidencias' | 'bonos' | 'capacitaciones';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'evaluaciones', label: 'Evaluaciones', icon: Star },
  { id: 'incidencias', label: 'Incidencias', icon: AlertTriangle },
  { id: 'bonos', label: 'Bonos', icon: Award },
  { id: 'capacitaciones', label: 'Capacitaciones', icon: BookOpen },
];

function EmployeeDashboard({
  employeeId,
  onBack,
}: {
  employeeId: string;
  onBack: () => void;
}) {
  const { employees } = useStore();
  const employee = employees.find((e) => e.id === employeeId);
  const [activeTab, setActiveTab] = useState<TabId>('evaluaciones');

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-surface-400">Empleado no encontrado</p>
        <button className="btn-secondary mt-4" onClick={onBack}>
          Volver
        </button>
      </div>
    );
  }

  const latestEval = employee.evaluations.length > 0 ? employee.evaluations[0] : null;
  const trial = employee.status === 'trial';

  return (
    <div className="flex flex-col gap-5 overflow-y-auto pr-1">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl glass-light text-surface-400 hover:text-surface-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(
              employee.fullName,
            )} flex items-center justify-center text-white font-bold text-base shrink-0`}
          >
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt={employee.fullName}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              getInitials(employee.fullName)
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-surface-100 truncate">
              {employee.fullName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-sm text-surface-400">
                {JOB_POSITIONS[employee.position]?.name}
              </span>
              <span className={`badge ${trial ? 'badge-yellow' : 'badge-green'} text-[10px]`}>
                {trial ? 'Periodo de Prueba' : 'Activo'}
              </span>
              {latestEval && (
                <span className={`badge ${getPerformanceColor(latestEval.averageScore)} text-[10px]`}>
                  <Star size={10} className="fill-current" />
                  {latestEval.averageScore.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-light rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-surface-100">{employee.evaluations.length}</p>
          <p className="text-[11px] text-surface-400">Evaluaciones</p>
        </div>
        <div className="glass-light rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-surface-100">{employee.incidents.length}</p>
          <p className="text-[11px] text-surface-400">Incidencias</p>
        </div>
        <div className="glass-light rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-surface-100">{employee.bonuses.length}</p>
          <p className="text-[11px] text-surface-400">Bonos</p>
        </div>
        <div className="glass-light rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-surface-100">{employee.trainings.length}</p>
          <p className="text-[11px] text-surface-400">Capacitaciones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-light rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary-500/20 text-primary-400 shadow-sm'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} {...tabContent}>
          {activeTab === 'evaluaciones' && <EvaluacionesTab employee={employee} />}
          {activeTab === 'incidencias' && <IncidenciasTab employee={employee} />}
          {activeTab === 'bonos' && <BonosTab employee={employee} />}
          {activeTab === 'capacitaciones' && <CapacitacionesTab employee={employee} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Tab 1: Evaluaciones ────────────────────────────────────────────────────

interface EvalFormData {
  type: string;
  ratings: {
    punctuality: number;
    instructions: number;
    quality: number;
    attitude: number;
    relationships: number;
    bpmCompliance: number;
  };
  observations: string;
  decision: string;
}

const INITIAL_EVAL_FORM: EvalFormData = {
  type: EVALUATION_TYPES[0],
  ratings: {
    punctuality: 0,
    instructions: 0,
    quality: 0,
    attitude: 0,
    relationships: 0,
    bpmCompliance: 0,
  },
  observations: '',
  decision: '',
};

function EvaluacionesTab({ employee }: { employee: Employee }) {
  const { updateEmployee } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EvalFormData>({ ...INITIAL_EVAL_FORM });

  const average = useMemo(
    () => calculateEvaluationAverage(form.ratings),
    [form.ratings],
  );

  const allRated = Object.values(form.ratings).every((r) => r > 0);

  const handleSave = useCallback(() => {
    if (!allRated) return;

    const newEval: Evaluation = {
      id: generateId(),
      date: new Date().toISOString(),
      type: form.type,
      ratings: { ...form.ratings },
      observations: form.observations,
      decision: form.type === 'Periodo de Prueba' ? form.decision : undefined,
      averageScore: parseFloat(average.toFixed(2)),
    };

    updateEmployee(employee.id, {
      evaluations: [newEval, ...employee.evaluations],
    });

    setForm({ ...INITIAL_EVAL_FORM });
    setShowForm(false);
  }, [allRated, form, average, employee, updateEmployee]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-surface-200">
          Historial de Evaluaciones
        </h3>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Nueva Evaluacion
        </button>
      </div>

      {/* Past Evaluations */}
      {employee.evaluations.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center">
          <Star size={40} className="mx-auto text-surface-600 mb-2" />
          <p className="text-surface-400">No hay evaluaciones registradas</p>
        </div>
      )}

      {employee.evaluations.map((ev, i) => (
        <motion.div
          key={ev.id}
          variants={listItem}
          initial="initial"
          animate="animate"
          custom={i}
          className="glass-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge badge-blue text-[10px]">{ev.type}</span>
                <span className="text-xs text-surface-500">{formatDate(ev.date)}</span>
                {ev.decision && (
                  <span
                    className={`badge text-[10px] ${
                      ev.decision === 'Confirmar'
                        ? 'badge-green'
                        : ev.decision === 'Extender prueba'
                          ? 'badge-yellow'
                          : 'badge-red'
                    }`}
                  >
                    {ev.decision}
                  </span>
                )}
              </div>

              {/* Criteria breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3">
                {Object.entries(ev.ratings).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-surface-400 truncate">
                      {CRITERIA_LABELS[key] ?? key}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={10}
                          className={s <= val ? 'fill-amber-400 text-amber-400' : 'text-surface-700'}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {ev.observations && (
                <p className="text-xs text-surface-400 mt-2 italic">
                  {ev.observations}
                </p>
              )}
            </div>

            {/* Score badge */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                  ev.averageScore >= 4
                    ? 'bg-emerald-500/15 border border-emerald-500/30'
                    : ev.averageScore >= 3
                      ? 'bg-amber-500/15 border border-amber-500/30'
                      : 'bg-rose-500/15 border border-rose-500/30'
                }`}
              >
                <span
                  className={`text-lg font-bold ${
                    ev.averageScore >= 4
                      ? 'text-emerald-400'
                      : ev.averageScore >= 3
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {ev.averageScore.toFixed(1)}
                </span>
                <Star
                  size={12}
                  className={`${
                    ev.averageScore >= 4
                      ? 'fill-emerald-400 text-emerald-400'
                      : ev.averageScore >= 3
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-rose-400 text-rose-400'
                  }`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Evaluation Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva Evaluacion" size="md">
        <div className="flex flex-col gap-3">
          {/* Type selector */}
          <div>
            <label className="text-xs text-surface-300 font-medium mb-1 block">
              Tipo de Evaluacion
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input-field text-sm py-2"
            >
              {EVALUATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Star Criteria */}
          <div>
            <label className="text-xs text-surface-300 font-medium mb-1.5 block">
              Criterios de Evaluacion
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CRITERIA_LABELS) as Array<keyof typeof CRITERIA_LABELS>).map(
                (key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 glass-light rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-[11px] text-surface-200 leading-tight">
                      {CRITERIA_LABELS[key]}
                    </span>
                    <StarRating
                      value={form.ratings[key as keyof EvalFormData['ratings']]}
                      onChange={(val) =>
                        setForm({
                          ...form,
                          ratings: { ...form.ratings, [key]: val },
                        })
                      }
                      size={16}
                    />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Average Display */}
          {allRated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-lg px-3 py-2 flex items-center justify-center gap-2 ${
                average >= 4
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : average >= 3
                    ? 'bg-amber-500/15 border border-amber-500/30'
                    : 'bg-rose-500/15 border border-rose-500/30'
              }`}
            >
              <span className="text-xs text-surface-300">Promedio:</span>
              <span
                className={`text-lg font-bold ${
                  average >= 4
                    ? 'text-emerald-400'
                    : average >= 3
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}
              >
                {average.toFixed(2)}
              </span>
              <span
                className={`badge text-[10px] ${
                  average >= 4
                    ? 'badge-green'
                    : average >= 3
                      ? 'badge-yellow'
                      : 'badge-red'
                }`}
              >
                {average >= 4 ? 'Excelente' : average >= 3 ? 'Regular' : 'Bajo'}
              </span>
            </motion.div>
          )}

          {/* Observations */}
          <div>
            <label className="text-xs text-surface-300 font-medium mb-1 block">
              Observaciones
            </label>
            <textarea
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
              className="input-field min-h-[60px] resize-y text-sm"
              placeholder="Comentarios sobre el desempeno del empleado..."
            />
          </div>

          {/* Decision (trial only) */}
          {form.type === 'Periodo de Prueba' && (
            <div>
              <label className="text-xs text-surface-300 font-medium mb-1 block">
                Decision
              </label>
              <div className="flex gap-2 flex-wrap">
                {DECISION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, decision: d })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border ${
                      form.decision === d
                        ? d === 'Confirmar'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : d === 'Extender prueba'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : 'bg-surface-800/50 text-surface-400 border-surface-600/30 hover:border-surface-500/40'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                setShowForm(false);
                setForm({ ...INITIAL_EVAL_FORM });
              }}
            >
              Cancelar
            </button>
            <button
              className="btn-success text-sm flex items-center gap-2"
              onClick={handleSave}
              disabled={
                !allRated ||
                (form.type === 'Periodo de Prueba' && !form.decision)
              }
            >
              <CheckCircle size={16} />
              Guardar Evaluacion
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Incidencias ─────────────────────────────────────────────────────

interface IncidentFormData {
  type: IncidentType;
  date: string;
  description: string;
  signatureUrl: string;
}

function IncidenciasTab({ employee }: { employee: Employee }) {
  const { updateEmployee } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<IncidentFormData>({
    type: 'falta_justificada',
    date: formatDateInput(new Date()),
    description: '',
    signatureUrl: '',
  });

  const isFormal =
    form.type === 'amonestacion_escrita' || form.type === 'acta_administrativa';

  const handleSave = useCallback(() => {
    if (!form.description.trim()) return;

    const newIncident: Incident = {
      id: generateId(),
      date: form.date,
      type: form.type,
      description: form.description,
      signatureUrl: isFormal && form.signatureUrl ? form.signatureUrl : undefined,
    };

    updateEmployee(employee.id, {
      incidents: [newIncident, ...employee.incidents],
    });

    setForm({
      type: 'falta_justificada',
      date: formatDateInput(new Date()),
      description: '',
      signatureUrl: '',
    });
    setShowForm(false);
  }, [form, isFormal, employee, updateEmployee]);

  const sortedIncidents = useMemo(
    () =>
      [...employee.incidents].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [employee.incidents],
  );

  const getTypeBadge = (type: IncidentType): string => {
    switch (type) {
      case 'falta_justificada':
        return 'badge-blue';
      case 'falta_injustificada':
        return 'badge-red';
      case 'retardo':
        return 'badge-yellow';
      case 'amonestacion_verbal':
        return 'badge-purple';
      case 'amonestacion_escrita':
        return 'badge-red';
      case 'acta_administrativa':
        return 'badge-red';
      default:
        return 'badge-blue';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-surface-200">
          Registro de Incidencias
        </h3>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Registrar Incidencia
        </button>
      </div>

      {/* Incident List */}
      {sortedIncidents.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center">
          <Shield size={40} className="mx-auto text-surface-600 mb-2" />
          <p className="text-surface-400">Sin incidencias registradas</p>
        </div>
      )}

      {sortedIncidents.map((inc, i) => (
        <motion.div
          key={inc.id}
          variants={listItem}
          initial="initial"
          animate="animate"
          custom={i}
          className="glass-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${getTypeBadge(inc.type)} text-[10px]`}>
                  {INCIDENT_LABELS[inc.type] ?? inc.type}
                </span>
                <span className="text-xs text-surface-500 flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(inc.date)}
                </span>
              </div>
              <p className="text-sm text-surface-300 mt-2">{inc.description}</p>
              {inc.signatureUrl && (
                <div className="mt-2">
                  <span className="text-[10px] text-surface-500 block mb-1">Firma:</span>
                  <img
                    src={inc.signatureUrl}
                    alt="Firma"
                    className="h-12 rounded-lg border border-surface-600/30"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Incident Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar Incidencia" size="md">
        <div className="flex flex-col gap-5">
          {/* Type */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Tipo de Incidencia
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as IncidentType })}
              className="input-field"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INCIDENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Fecha
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-field"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Descripcion
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field min-h-[100px] resize-y"
              placeholder="Detalle de la incidencia..."
            />
          </div>

          {/* Signature (for formal incidents) */}
          {isFormal && (
            <div>
              <label className="text-sm text-surface-300 font-medium mb-1.5 block">
                Firma del Empleado
              </label>
              {form.signatureUrl ? (
                <div className="flex flex-col gap-2">
                  <img
                    src={form.signatureUrl}
                    alt="Firma"
                    className="h-20 rounded-xl border border-surface-600/30"
                  />
                  <button
                    type="button"
                    className="btn-secondary text-sm self-start"
                    onClick={() => setForm({ ...form, signatureUrl: '' })}
                  >
                    Cambiar firma
                  </button>
                </div>
              ) : (
                <SignaturePad
                  onSave={(sig) => setForm({ ...form, signatureUrl: sig })}
                  width={380}
                  height={150}
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                setShowForm(false);
                setForm({
                  type: 'falta_justificada',
                  date: formatDateInput(new Date()),
                  description: '',
                  signatureUrl: '',
                });
              }}
            >
              Cancelar
            </button>
            <button
              className="btn-danger text-sm flex items-center gap-2"
              onClick={handleSave}
              disabled={!form.description.trim()}
            >
              <AlertTriangle size={16} />
              Registrar Incidencia
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 3: Bonos ───────────────────────────────────────────────────────────

interface BonusFormData {
  period: string;
  amount: string;
  criteria: string;
}

function BonosTab({ employee }: { employee: Employee }) {
  const { updateEmployee } = useStore();
  const [showForm, setShowForm] = useState(false);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [form, setForm] = useState<BonusFormData>({
    period: monthOptions[0]?.value ?? '',
    amount: '',
    criteria: '',
  });

  const handleSave = useCallback(() => {
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0 || !form.criteria.trim()) return;

    const newBonus: Bonus = {
      id: generateId(),
      period: form.period,
      amount: amountNum,
      criteria: form.criteria,
      date: new Date().toISOString(),
    };

    updateEmployee(employee.id, {
      bonuses: [newBonus, ...employee.bonuses],
    });

    setForm({
      period: monthOptions[0]?.value ?? '',
      amount: '',
      criteria: '',
    });
    setShowForm(false);
  }, [form, monthOptions, employee, updateEmployee]);

  const totalBonuses = useMemo(
    () => employee.bonuses.reduce((sum, b) => sum + b.amount, 0),
    [employee.bonuses],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-surface-200">
            Bonos de Productividad
          </h3>
          {totalBonuses > 0 && (
            <p className="text-xs text-surface-400 mt-0.5">
              Total acumulado:{' '}
              <span className="text-emerald-400 font-semibold">
                ${totalBonuses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </p>
          )}
        </div>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Registrar Bono
        </button>
      </div>

      {/* Bonus List */}
      {employee.bonuses.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center">
          <Award size={40} className="mx-auto text-surface-600 mb-2" />
          <p className="text-surface-400">No hay bonos registrados</p>
        </div>
      )}

      {employee.bonuses.map((bonus, i) => (
        <motion.div
          key={bonus.id}
          variants={listItem}
          initial="initial"
          animate="animate"
          custom={i}
          className="glass-card p-4 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Award size={20} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-surface-100">
                ${bonus.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <span className="badge badge-purple text-[10px]">
                {new Date(bonus.period + '-01').toLocaleDateString('es-MX', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <p className="text-xs text-surface-400 mt-1">{bonus.criteria}</p>
          </div>
          <span className="text-xs text-surface-500 shrink-0">
            {formatDate(bonus.date)}
          </span>
        </motion.div>
      ))}

      {/* Bonus Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar Bono" size="md">
        <div className="flex flex-col gap-5">
          {/* Period */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Periodo
            </label>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className="input-field"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Monto ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input-field"
              placeholder="0.00"
            />
          </div>

          {/* Criteria */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Criterios / Motivo
            </label>
            <textarea
              value={form.criteria}
              onChange={(e) => setForm({ ...form, criteria: e.target.value })}
              className="input-field min-h-[80px] resize-y"
              placeholder="Motivo del bono de productividad..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                setShowForm(false);
                setForm({
                  period: monthOptions[0]?.value ?? '',
                  amount: '',
                  criteria: '',
                });
              }}
            >
              Cancelar
            </button>
            <button
              className="btn-success text-sm flex items-center gap-2"
              onClick={handleSave}
              disabled={!form.amount || parseFloat(form.amount) <= 0 || !form.criteria.trim()}
            >
              <Award size={16} />
              Guardar Bono
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tab 4: Capacitaciones ──────────────────────────────────────────────────

interface TrainingFormData {
  topic: string;
  date: string;
  duration: string;
  result: string;
}

function CapacitacionesTab({ employee }: { employee: Employee }) {
  const { updateEmployee } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TrainingFormData>({
    topic: '',
    date: formatDateInput(new Date()),
    duration: '',
    result: '',
  });

  const handleSave = useCallback(() => {
    if (!form.topic.trim() || !form.duration.trim()) return;

    const newTraining: Training = {
      id: generateId(),
      topic: form.topic,
      date: form.date,
      duration: form.duration,
      result: form.result,
    };

    updateEmployee(employee.id, {
      trainings: [newTraining, ...employee.trainings],
    });

    setForm({
      topic: '',
      date: formatDateInput(new Date()),
      duration: '',
      result: '',
    });
    setShowForm(false);
  }, [form, employee, updateEmployee]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-surface-200">
          Historial de Capacitaciones
        </h3>
        <button className="btn-primary text-sm flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Registrar Capacitacion
        </button>
      </div>

      {/* Training List */}
      {employee.trainings.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center">
          <BookOpen size={40} className="mx-auto text-surface-600 mb-2" />
          <p className="text-surface-400">No hay capacitaciones registradas</p>
        </div>
      )}

      {employee.trainings.map((tr, i) => (
        <motion.div
          key={tr.id}
          variants={listItem}
          initial="initial"
          animate="animate"
          custom={i}
          className="glass-card p-4 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-surface-100">{tr.topic}</h4>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(tr.date)}
              </span>
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Clock size={12} />
                {tr.duration}
              </span>
              {tr.result && (
                <span className="badge badge-green text-[10px]">{tr.result}</span>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Training Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar Capacitacion" size="md">
        <div className="flex flex-col gap-5">
          {/* Topic */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Tema
            </label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="input-field"
              placeholder="Nombre de la capacitacion..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Fecha
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input-field"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Duracion
            </label>
            <input
              type="text"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="input-field"
              placeholder="Ej: 2 horas, 1 dia, 40 minutos..."
            />
          </div>

          {/* Result */}
          <div>
            <label className="text-sm text-surface-300 font-medium mb-1.5 block">
              Resultado
            </label>
            <input
              type="text"
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              className="input-field"
              placeholder="Aprobado, Pendiente, etc..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                setShowForm(false);
                setForm({
                  topic: '',
                  date: formatDateInput(new Date()),
                  duration: '',
                  result: '',
                });
              }}
            >
              Cancelar
            </button>
            <button
              className="btn-success text-sm flex items-center gap-2"
              onClick={handleSave}
              disabled={!form.topic.trim() || !form.duration.trim()}
            >
              <BookOpen size={16} />
              Guardar Capacitacion
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
