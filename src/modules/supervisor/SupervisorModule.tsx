import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Clock,
  ClipboardList,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  FileText,
  Calendar,
  ChevronRight,
  Shield,
  Eye,
  ArrowLeft,
  Printer,
  User,
  Briefcase,
  Award,
  ShieldAlert,
  GraduationCap,
  Star,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  DollarSign,
  Building2,
} from 'lucide-react';
import type { Employee, Candidate } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import {
  formatDate,
  daysUntil,
  getInitials,
  INCIDENT_LABELS,
} from '../../utils/helpers';
import {
  getVerdictLabel,
  getVerdictColor,
  getPerformanceColor,
} from '../../utils/scoring';
import StarRating from '../../components/StarRating';

// ── Constants ────────────────────────────────────────────────────────────────

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

const DOCUMENT_LABELS: Record<string, string> = {
  solicitud: 'Solicitud de empleo',
  ine: 'INE / Identificacion',
  actaNacimiento: 'Acta de nacimiento',
  curp: 'CURP',
  imss: 'NSS / IMSS',
  comprobanteDomicilio: 'Comprobante de domicilio',
  comprobanteEstudios: 'Comprobante de estudios',
  cartasRecomendacion: 'Cartas de recomendacion',
  antecedentesNoPenales: 'Antecedentes no penales',
  rfc: 'RFC',
};

const DOSSIER_TABS = [
  { id: 'personal', label: 'Info Personal', icon: User },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'onboarding', label: 'Onboarding', icon: GraduationCap },
  { id: 'evaluations', label: 'Evaluaciones', icon: TrendingUp },
  { id: 'incidents', label: 'Incidencias', icon: ShieldAlert },
  { id: 'bonuses', label: 'Bonos', icon: Award },
] as const;

type DossierTab = (typeof DOSSIER_TABS)[number]['id'];

// ── Animation Variants ───────────────────────────────────────────────────────

const pageTransition = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.25, ease: 'easeIn' as const } },
};

const cardAnimation = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

// ── Types ────────────────────────────────────────────────────────────────────

type ViewState =
  | { kind: 'dashboard' }
  | { kind: 'dossier'; employeeId: string };

// ── Main Component ───────────────────────────────────────────────────────────

export default function SupervisorModule() {
  const [view, setView] = useState<ViewState>({ kind: 'dashboard' });

  return (
    <AnimatePresence mode="wait">
      {view.kind === 'dashboard' && (
        <motion.div key="dashboard" {...pageTransition}>
          <DashboardView onSelectEmployee={(id) => setView({ kind: 'dossier', employeeId: id })} />
        </motion.div>
      )}
      {view.kind === 'dossier' && (
        <motion.div key="dossier" {...pageTransition}>
          <DossierView
            employeeId={view.employeeId}
            onBack={() => setView({ kind: 'dashboard' })}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard View
// ══════════════════════════════════════════════════════════════════════════════

function DashboardView({
  onSelectEmployee,
}: {
  onSelectEmployee: (id: string) => void;
}) {
  const { employees, candidates } = useStore();
  const [searchGrid, setSearchGrid] = useState('');

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status !== 'inactive');
    const onTrial = active.filter((e) => e.status === 'trial');

    // Pending evaluations: active employees with 0 evaluations, or last eval > 90 days
    const now = Date.now();
    const pendingEvals = active.filter((e) => {
      if (e.evaluations.length === 0) return true;
      const lastEval = new Date(e.evaluations[e.evaluations.length - 1].date).getTime();
      return now - lastEval > 90 * 24 * 60 * 60 * 1000;
    });

    // Interviews this month
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().split('T')[0];
    const interviewsThisMonth = candidates.filter(
      (c) =>
        c.interviewCompleted &&
        c.interviewData &&
        c.interviewData.date >= monthStart &&
        c.interviewData.date <= monthEnd,
    );

    return {
      totalActive: active.length,
      onTrial: onTrial.length,
      pendingEvals: pendingEvals.length,
      interviewsThisMonth: interviewsThisMonth.length,
    };
  }, [employees, candidates]);

  // ── Alerts ───────────────────────────────────────────────────────────────

  const alerts = useMemo(() => {
    const items: { type: 'warning' | 'danger' | 'info'; message: string; employeeId?: string }[] = [];

    const active = employees.filter((e) => e.status !== 'inactive');

    // Trial periods expiring in 7 days
    active.forEach((e) => {
      if (e.status === 'trial' && e.trialEndDate) {
        const days = daysUntil(e.trialEndDate);
        if (days >= 0 && days <= 7) {
          items.push({
            type: 'danger',
            message: `Periodo de prueba de ${e.fullName} vence en ${days} dia${days !== 1 ? 's' : ''}`,
            employeeId: e.id,
          });
        }
      }
    });

    // Missing documents
    active.forEach((e) => {
      const docs = e.documents;
      const missing = Object.entries(docs).filter(
        ([key, val]) => !val.done && key !== 'antecedentesNoPenales',
      );
      if (missing.length > 0) {
        items.push({
          type: 'warning',
          message: `${e.fullName} tiene ${missing.length} documento${missing.length > 1 ? 's' : ''} pendiente${missing.length > 1 ? 's' : ''}`,
          employeeId: e.id,
        });
      }
    });

    // Incomplete onboarding
    active.forEach((e) => {
      const totalModules = e.onboardingProgress.modules.length;
      const completedModules = e.onboardingProgress.modules.filter((m) => m.completed).length;
      if (totalModules > 0 && completedModules < totalModules) {
        items.push({
          type: 'info',
          message: `${e.fullName} tiene onboarding incompleto (${completedModules}/${totalModules} modulos)`,
          employeeId: e.id,
        });
      }
    });

    // Upcoming evaluations (>90 days since last)
    const now = Date.now();
    active.forEach((e) => {
      if (e.evaluations.length > 0) {
        const lastEval = new Date(e.evaluations[e.evaluations.length - 1].date).getTime();
        const daysSince = Math.floor((now - lastEval) / (1000 * 60 * 60 * 24));
        if (daysSince > 90) {
          items.push({
            type: 'warning',
            message: `${e.fullName} requiere evaluacion (${daysSince} dias desde la ultima)`,
            employeeId: e.id,
          });
        }
      }
    });

    return items;
  }, [employees]);

  // ── Recent Interviews ────────────────────────────────────────────────────

  const recentInterviews = useMemo(() => {
    return candidates
      .filter((c) => c.interviewCompleted && c.verdict)
      .sort((a, b) => {
        const da = a.interviewData?.date ?? a.createdAt;
        const db = b.interviewData?.date ?? b.createdAt;
        return db.localeCompare(da);
      })
      .slice(0, 5);
  }, [candidates]);

  // ── Active employees grid ────────────────────────────────────────────────

  const activeEmployees = useMemo(
    () =>
      employees
        .filter((e) => e.status !== 'inactive')
        .filter((e) => e.fullName.toLowerCase().includes(searchGrid.toLowerCase()))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [employees, searchGrid],
  );

  // ── Stat card config ─────────────────────────────────────────────────────

  const statCards: { label: string; value: number; icon: React.ElementType; color: string; glow: string }[] = [
    {
      label: 'Colaboradores activos',
      value: stats.totalActive,
      icon: Users,
      color: 'text-primary-400',
      glow: 'shadow-primary-500/20',
    },
    {
      label: 'En periodo de prueba',
      value: stats.onTrial,
      icon: Clock,
      color: 'text-amber-400',
      glow: 'shadow-amber-500/20',
    },
    {
      label: 'Evaluaciones pendientes',
      value: stats.pendingEvals,
      icon: ClipboardList,
      color: 'text-purple-400',
      glow: 'shadow-purple-500/20',
    },
    {
      label: 'Entrevistas este mes',
      value: stats.interviewsThisMonth,
      icon: UserPlus,
      color: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
          <LayoutDashboard size={24} />
          Panel del Supervisor
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Vista general del estado del equipo y alertas importantes
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              custom={i}
              variants={cardAnimation}
              initial="initial"
              animate="animate"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`glass-card p-5 cursor-default hover:shadow-xl ${card.glow}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color} bg-white/5`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-surface-100">{card.value}</p>
              <p className="text-sm text-surface-400 mt-1">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card p-5"
          style={{ borderColor: 'rgba(245,158,11,0.3)' }}
        >
          <h2 className="text-base font-semibold text-amber-400 flex items-center gap-2 mb-4">
            <AlertTriangle size={18} />
            Alertas y Pendientes ({alerts.length})
          </h2>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {alerts.map((alert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 glass-light p-3 rounded-xl group"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    alert.type === 'danger'
                      ? 'bg-red-400'
                      : alert.type === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-blue-400'
                  }`}
                />
                <p className="text-sm text-surface-300 flex-1">{alert.message}</p>
                {alert.employeeId && (
                  <button
                    onClick={() => onSelectEmployee(alert.employeeId!)}
                    className="text-primary-400 hover:text-primary-300 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Interviews */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card p-5 xl:col-span-1"
        >
          <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2 mb-4">
            <ClipboardList size={18} className="text-primary-400" />
            Entrevistas Recientes
          </h2>
          {recentInterviews.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">Sin entrevistas recientes</p>
          ) : (
            <div className="space-y-2">
              {recentInterviews.map((c) => (
                <div key={c.id} className="glass-light p-3 rounded-xl flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(c.fullName)} flex items-center justify-center shrink-0`}
                  >
                    <span className="text-white text-xs font-bold">{getInitials(c.fullName)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-200 truncate">{c.fullName}</p>
                    <p className="text-xs text-surface-500">
                      {c.interviewData ? formatDate(c.interviewData.date) : '---'}
                    </p>
                  </div>
                  {c.verdict && (
                    <span className={`badge ${getVerdictColor(c.verdict)} text-[10px] whitespace-nowrap`}>
                      {getVerdictLabel(c.verdict)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Active Employees Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="glass-card p-5 xl:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
              <Users size={18} className="text-primary-400" />
              Colaboradores Activos
            </h2>
            <div className="relative w-60">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchGrid}
                onChange={(e) => setSearchGrid(e.target.value)}
                className="input-field text-sm py-2 pl-9"
              />
              <Eye size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            </div>
          </div>

          {activeEmployees.length === 0 ? (
            <div className="text-center py-10">
              <Users size={36} className="mx-auto text-surface-600 mb-2" />
              <p className="text-surface-500 text-sm">
                {searchGrid ? 'Sin resultados' : 'No hay colaboradores activos'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {activeEmployees.map((emp, i) => {
                const latestEval =
                  emp.evaluations.length > 0
                    ? emp.evaluations[emp.evaluations.length - 1]
                    : null;

                return (
                  <motion.div
                    key={emp.id}
                    custom={i}
                    variants={cardAnimation}
                    initial="initial"
                    animate="animate"
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    onClick={() => onSelectEmployee(emp.id)}
                    className="glass-light p-4 rounded-xl cursor-pointer group hover:bg-white/[0.08] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(emp.fullName)} flex items-center justify-center shrink-0`}
                      >
                        {emp.photoUrl ? (
                          <img
                            src={emp.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-xs font-bold">
                            {getInitials(emp.fullName)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-100 truncate">
                          {emp.fullName}
                        </p>
                        <p className="text-xs text-surface-400">
                          {JOB_POSITIONS[emp.position]?.name ?? emp.position}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-surface-600 group-hover:text-primary-400 transition-colors shrink-0"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`badge text-[10px] ${
                          emp.status === 'trial' ? 'badge-yellow' : 'badge-green'
                        }`}
                      >
                        {emp.status === 'trial' ? 'Prueba' : 'Activo'}
                      </span>
                      <span className="text-xs text-surface-500">
                        <Calendar size={10} className="inline mr-1 -mt-0.5" />
                        {formatDate(emp.hireDate)}
                      </span>
                      {latestEval && (
                        <span
                          className={`badge text-[10px] ${getPerformanceColor(latestEval.averageScore)}`}
                        >
                          Eval: {latestEval.averageScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Employee Dossier View
// ══════════════════════════════════════════════════════════════════════════════

function DossierView({
  employeeId,
  onBack,
}: {
  employeeId: string;
  onBack: () => void;
}) {
  const { employees, candidates } = useStore();
  const employee = employees.find((e) => e.id === employeeId);
  const [activeTab, setActiveTab] = useState<DossierTab>('personal');

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

  const candidate = candidates.find((c) => c.id === employee.candidateId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn-secondary p-2.5 rounded-xl">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Expediente del Colaborador</h1>
            <p className="text-surface-400 text-sm mt-0.5">Dossier completo</p>
          </div>
        </div>
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
          <Printer size={16} />
          Imprimir
        </button>
      </div>

      {/* Employee header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 glow-primary"
      >
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(employee.fullName)} flex items-center justify-center shrink-0 shadow-lg`}
          >
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover"
              />
            ) : (
              <span className="text-white text-2xl font-bold">
                {getInitials(employee.fullName)}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-surface-100">{employee.fullName}</h2>
            <p className="text-surface-400 text-sm mt-0.5">
              {JOB_POSITIONS[employee.position]?.name ?? employee.position} &mdash;{' '}
              {employee.area}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className={`badge ${
                  employee.status === 'trial'
                    ? 'badge-yellow'
                    : employee.status === 'active'
                      ? 'badge-green'
                      : 'badge-red'
                }`}
              >
                {employee.status === 'trial'
                  ? 'Periodo de Prueba'
                  : employee.status === 'active'
                    ? 'Activo'
                    : 'Inactivo'}
              </span>
              <span className="badge badge-blue">Exp. #{employee.expedientNumber}</span>
              <span className="badge badge-purple">
                {employee.contractType === 'eventual' ? 'Eventual' : 'Indefinido'}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden lg:flex items-center gap-6">
            <QuickStat
              label="Evaluaciones"
              value={String(employee.evaluations.length)}
              sub={
                employee.evaluations.length > 0
                  ? `Prom: ${(employee.evaluations.reduce((s, e) => s + e.averageScore, 0) / employee.evaluations.length).toFixed(1)}`
                  : 'Sin eval.'
              }
            />
            <QuickStat
              label="Incidencias"
              value={String(employee.incidents.length)}
              sub={employee.incidents.length === 0 ? 'Limpio' : 'Registradas'}
            />
            <QuickStat
              label="Bonos"
              value={String(employee.bonuses.length)}
              sub={`$${employee.bonuses.reduce((s, b) => s + b.amount, 0).toLocaleString()}`}
            />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="glass-card p-1 inline-flex gap-1 flex-wrap print:hidden">
        {DOSSIER_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary-500/20 text-primary-400 shadow-lg'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} {...fadeUp}>
          {activeTab === 'personal' && (
            <PersonalInfoTab employee={employee} candidate={candidate} />
          )}
          {activeTab === 'documents' && <DocumentsTab employee={employee} />}
          {activeTab === 'onboarding' && <OnboardingTab employee={employee} />}
          {activeTab === 'evaluations' && <EvaluationsTab employee={employee} />}
          {activeTab === 'incidents' && <IncidentsTab employee={employee} />}
          {activeTab === 'bonuses' && <BonusesTab employee={employee} />}
        </motion.div>
      </AnimatePresence>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .glass, .glass-card, .glass-light { background: transparent !important; border: 1px solid #ddd !important; backdrop-filter: none !important; }
        }
      `}</style>
    </div>
  );
}

function QuickStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-surface-100">{value}</p>
      <p className="text-xs text-surface-400">{label}</p>
      <p className="text-[10px] text-surface-500">{sub}</p>
    </div>
  );
}

// ── Tab: Personal Info ───────────────────────────────────────────────────────

function PersonalInfoTab({
  employee,
  candidate,
}: {
  employee: Employee;
  candidate?: Candidate;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2">
          <User size={16} className="text-primary-400" />
          Datos Personales
        </h3>
        <div className="space-y-3">
          <InfoRow label="Nombre completo" value={employee.fullName} />
          <InfoRow label="No. Expediente" value={String(employee.expedientNumber)} />
          <InfoRow label="NSS / IMSS" value={employee.imssNumber || '---'} />
          <InfoRow label="Datos bancarios" value={employee.bankDetails || '---'} />
          {candidate && (
            <>
              <InfoRow label="Edad" value={String(candidate.age)} />
              <InfoRow label="Telefono" value={candidate.phone || '---'} />
              <InfoRow label="Colonia" value={candidate.neighborhood || '---'} />
              <InfoRow label="Fuente de reclutamiento" value={candidate.source || '---'} />
            </>
          )}
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2">
          <Briefcase size={16} className="text-primary-400" />
          Datos Laborales
        </h3>
        <div className="space-y-3">
          <InfoRow label="Puesto" value={JOB_POSITIONS[employee.position]?.name ?? employee.position} />
          <InfoRow label="Area" value={employee.area} />
          <InfoRow label="Supervisor" value={employee.supervisor} />
          <InfoRow label="Fecha de ingreso" value={formatDate(employee.hireDate)} />
          <InfoRow label="Salario" value={`$${employee.salary.toLocaleString()}`} />
          <InfoRow label="Horario" value={employee.schedule} />
          <InfoRow
            label="Tipo de contrato"
            value={employee.contractType === 'eventual' ? 'Eventual' : 'Indefinido'}
          />
          <InfoRow label="Fin periodo prueba" value={formatDate(employee.trialEndDate)} />
          <InfoRow
            label="Prueba extendida"
            value={employee.trialExtended ? 'Si' : 'No'}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-none">
      <span className="text-xs text-surface-500">{label}</span>
      <span className="text-sm text-surface-200 font-medium text-right max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );
}

// ── Tab: Documents ───────────────────────────────────────────────────────────

function DocumentsTab({ employee }: { employee: Employee }) {
  const docs = employee.documents;
  const entries = Object.entries(docs) as [string, { done: boolean; photoUrl?: string }][];
  const completedCount = entries.filter(([, v]) => v.done).length;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2">
          <FileText size={16} className="text-primary-400" />
          Documentos ({completedCount}/{entries.length})
        </h3>
        <div className="w-32 h-2 rounded-full bg-surface-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
            style={{ width: `${(completedCount / entries.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className={`glass-light p-3 rounded-xl flex items-center gap-3 ${
              val.done ? 'border-l-2 border-l-emerald-500/50' : 'border-l-2 border-l-red-500/30'
            }`}
          >
            {val.done ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <XCircle size={16} className="text-red-400 shrink-0" />
            )}
            <span className="text-sm text-surface-300 flex-1">
              {DOCUMENT_LABELS[key] ?? key}
            </span>
            {val.done && val.photoUrl && (
              <Eye size={14} className="text-primary-400 cursor-pointer" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Onboarding ──────────────────────────────────────────────────────────

function OnboardingTab({ employee }: { employee: Employee }) {
  const progress = employee.onboardingProgress;
  const totalModules = progress.modules.length;
  const completedModules = progress.modules.filter((m) => m.completed).length;

  return (
    <div className="space-y-4">
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2">
            <GraduationCap size={16} className="text-primary-400" />
            Progreso de Onboarding ({completedModules}/{totalModules})
          </h3>
          {progress.certificateGenerated && (
            <span className="badge badge-green">Certificado Generado</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full bg-surface-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: totalModules > 0 ? `${(completedModules / totalModules) * 100}%` : '0%' }}
            transition={{ duration: 0.8, ease: 'easeOut' as const }}
          />
        </div>

        {progress.finalQuizScore !== undefined && (
          <p className="text-sm text-surface-300">
            Calificacion quiz final: <strong className="text-primary-400">{progress.finalQuizScore}%</strong>
          </p>
        )}
      </div>

      <div className="glass-card p-6 space-y-2">
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3">
          Modulos
        </h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {progress.modules.map((mod) => (
            <div
              key={mod.id}
              className={`glass-light p-3 rounded-xl flex items-center gap-3 ${
                mod.completed ? 'opacity-100' : 'opacity-60'
              }`}
            >
              {mod.completed ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-surface-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-200 truncate">{mod.name}</p>
                <p className="text-xs text-surface-500">
                  {mod.deliveredBy} &middot; {mod.duration}
                </p>
              </div>
              {mod.completed && mod.completedDate && (
                <span className="text-xs text-surface-500">{formatDate(mod.completedDate)}</span>
              )}
              {mod.quizScore !== undefined && (
                <span className="badge badge-blue text-[10px]">Quiz: {mod.quizScore}%</span>
              )}
              {mod.requiresSignature && mod.signatureUrl && (
                <span className="badge badge-purple text-[10px]">Firmado</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Evaluations ─────────────────────────────────────────────────────────

function EvaluationsTab({ employee }: { employee: Employee }) {
  const evaluations = [...employee.evaluations].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  if (evaluations.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <TrendingUp size={40} className="mx-auto text-surface-600 mb-3" />
        <p className="text-surface-400">No hay evaluaciones registradas</p>
      </div>
    );
  }

  const RATING_LABELS: Record<string, string> = {
    punctuality: 'Puntualidad',
    instructions: 'Sigue instrucciones',
    quality: 'Calidad de trabajo',
    attitude: 'Actitud',
    relationships: 'Relaciones laborales',
    bpmCompliance: 'Cumplimiento BPM',
  };

  return (
    <div className="space-y-4">
      {evaluations.map((evalItem) => (
        <div key={evalItem.id} className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-surface-100">
                {evalItem.type || 'Evaluacion'}
              </span>
              <span className="text-xs text-surface-500">{formatDate(evalItem.date)}</span>
            </div>
            <span className={`badge ${getPerformanceColor(evalItem.averageScore)}`}>
              Promedio: {evalItem.averageScore.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(evalItem.ratings).map(([key, val]) => (
              <div key={key} className="glass-light p-2.5 rounded-lg">
                <p className="text-xs text-surface-500 mb-1">
                  {RATING_LABELS[key] ?? key}
                </p>
                <StarRating value={val} readOnly size={16} />
              </div>
            ))}
          </div>

          {evalItem.observations && (
            <div className="glass-light p-3 rounded-lg">
              <p className="text-xs text-surface-500 mb-1">Observaciones</p>
              <p className="text-sm text-surface-300">{evalItem.observations}</p>
            </div>
          )}

          {evalItem.decision && (
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-primary-400" />
              <p className="text-sm text-surface-300">
                Decision: <strong className="text-surface-100">{evalItem.decision}</strong>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab: Incidents ───────────────────────────────────────────────────────────

function IncidentsTab({ employee }: { employee: Employee }) {
  const incidents = [...employee.incidents].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  if (incidents.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <ShieldAlert size={40} className="mx-auto text-surface-600 mb-3" />
        <p className="text-surface-400">No hay incidencias registradas</p>
        <p className="text-xs text-surface-500 mt-1">Historial limpio</p>
      </div>
    );
  }

  const typeColorMap: Record<string, string> = {
    falta_justificada: 'badge-blue',
    falta_injustificada: 'badge-red',
    retardo: 'badge-yellow',
    amonestacion_verbal: 'badge-yellow',
    amonestacion_escrita: 'badge-red',
    acta_administrativa: 'badge-red',
  };

  return (
    <div className="glass-card p-6 space-y-3">
      <h3 className="text-base font-semibold text-surface-100 flex items-center gap-2 mb-2">
        <ShieldAlert size={16} className="text-amber-400" />
        Incidencias ({incidents.length})
      </h3>
      <div className="space-y-2">
        {incidents.map((inc) => (
          <div key={inc.id} className="glass-light p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className={`badge ${typeColorMap[inc.type] ?? 'badge-yellow'} text-xs`}>
                {INCIDENT_LABELS[inc.type] ?? inc.type}
              </span>
              <span className="text-xs text-surface-500">{formatDate(inc.date)}</span>
            </div>
            <p className="text-sm text-surface-300">{inc.description}</p>
            {inc.signatureUrl && (
              <p className="text-xs text-primary-400 mt-2 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Firmada
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Bonuses ─────────────────────────────────────────────────────────────

function BonusesTab({ employee }: { employee: Employee }) {
  const bonuses = [...employee.bonuses].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  const totalAmount = bonuses.reduce((s, b) => s + b.amount, 0);

  if (bonuses.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Award size={40} className="mx-auto text-surface-600 mb-3" />
        <p className="text-surface-400">No hay bonos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="glass-card p-5 flex items-center gap-6">
        <div>
          <p className="text-xs text-surface-500">Total bonos</p>
          <p className="text-2xl font-bold text-emerald-400">${totalAmount.toLocaleString()}</p>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div>
          <p className="text-xs text-surface-500">Cantidad</p>
          <p className="text-2xl font-bold text-surface-100">{bonuses.length}</p>
        </div>
      </div>

      {/* List */}
      <div className="glass-card p-6 space-y-3">
        {bonuses.map((bonus) => (
          <div key={bonus.id} className="glass-light p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-200">{bonus.period}</p>
              <p className="text-xs text-surface-500">{bonus.criteria}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-400">${bonus.amount.toLocaleString()}</p>
              <p className="text-xs text-surface-500">{formatDate(bonus.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
