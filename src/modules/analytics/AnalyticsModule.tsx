import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  Clock,
  Award,
  Target,
  Activity,
} from 'lucide-react';
import type { Candidate, Employee, JobPosition } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import { formatDate } from '../../utils/helpers';
import { getVerdictLabel } from '../../utils/scoring';
import { QUIZ_MODULES } from '../../utils/onboardingModules';

// ─── Register Chart.js Components ───────────────────────────────────────────

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale
);

// ─── Theme Colors ───────────────────────────────────────────────────────────

const COLORS = {
  blue: '#338dff',
  purple: '#d946ef',
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
  cyan: '#06b6d4',
} as const;

const LABEL_COLOR = '#94a3b8';
const GRID_COLOR = 'rgba(148, 163, 184, 0.1)';

// ─── Chart Default Options ──────────────────────────────────────────────────

const basePlugins = {
  legend: {
    labels: {
      color: LABEL_COLOR,
      font: { family: 'Inter' },
    },
  },
  tooltip: {
    backgroundColor: '#1e293b',
    titleColor: '#e2e8f0',
    bodyColor: LABEL_COLOR,
    borderColor: 'rgba(148,163,184,0.2)',
    borderWidth: 1,
  },
};

const baseScales = {
  x: {
    ticks: { color: LABEL_COLOR },
    grid: { color: GRID_COLOR },
  },
  y: {
    ticks: { color: LABEL_COLOR },
    grid: { color: GRID_COLOR },
  },
};

const barLineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePlugins,
  scales: baseScales,
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePlugins,
  cutout: '65%',
};

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePlugins,
  scales: {
    r: {
      angleLines: { color: GRID_COLOR },
      grid: { color: GRID_COLOR },
      pointLabels: { color: LABEL_COLOR, font: { family: 'Inter', size: 11 } },
      ticks: { color: LABEL_COLOR, backdropColor: 'transparent' },
      min: 0,
      max: 5,
    },
  },
};

// ─── Animation Variants ─────────────────────────────────────────────────────

const tabContent = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

const cardEntrance = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const },
  }),
};

// ─── Tabs ───────────────────────────────────────────────────────────────────

type TabKey = 'reclutamiento' | 'retencion' | 'desempeno' | 'onboarding';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: 'reclutamiento', label: 'Reclutamiento', icon: <UserPlus className="w-4 h-4" /> },
  { key: 'retencion', label: 'Retencion', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'desempeno', label: 'Desempeno', icon: <Target className="w-4 h-4" /> },
  { key: 'onboarding', label: 'Onboarding', icon: <Award className="w-4 h-4" /> },
];

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <BarChart3 className="w-16 h-16 mb-4 opacity-30" />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
  index: number;
}

function StatCard({ label, value, icon, color = 'text-blue-400', subtitle, index }: StatCardProps) {
  return (
    <motion.div
      className="glass-card p-5 flex items-start gap-4"
      variants={cardEntrance}
      initial="initial"
      animate="animate"
      custom={index}
    >
      <div className={`p-3 rounded-xl bg-slate-800/60 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-white truncate">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

// ─── Chart Wrapper ──────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  index: number;
  className?: string;
}

function ChartCard({ title, children, index, className = '' }: ChartCardProps) {
  return (
    <motion.div
      className={`glass-card p-5 ${className}`}
      variants={cardEntrance}
      initial="initial"
      animate="animate"
      custom={index}
    >
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-blue-400" />
        {title}
      </h3>
      <div className="relative h-64">{children}</div>
    </motion.div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
}

function monthDiff(d1: Date, d2: Date): number {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

function getLast12Months(): { label: string; start: Date; end: Date }[] {
  const months: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({ label: getMonthLabel(d), start: d, end });
  }
  return months;
}

function safeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Tab: Reclutamiento ─────────────────────────────────────────────────────

function ReclutamientoTab({ candidates }: { candidates: Candidate[] }) {
  const interviewed = candidates.filter((c) => c.interviewCompleted && c.verdict);
  const hired = candidates.filter((c) => c.hired);

  if (candidates.length === 0) {
    return <EmptyState message="No hay datos suficientes para mostrar este analisis. Agrega candidatos para ver estadisticas de reclutamiento." />;
  }

  // Verdict distribution
  const verdictCounts = { recommended: 0, reservations: 0, not_recommended: 0 };
  interviewed.forEach((c) => {
    if (c.verdict) verdictCounts[c.verdict]++;
  });

  const verdictData = {
    labels: ['Recomendado', 'Con Reservas', 'No Recomendado'],
    datasets: [
      {
        data: [verdictCounts.recommended, verdictCounts.reservations, verdictCounts.not_recommended],
        backgroundColor: [COLORS.green, COLORS.yellow, COLORS.red],
        borderColor: ['rgba(34,197,94,0.3)', 'rgba(245,158,11,0.3)', 'rgba(239,68,68,0.3)'],
        borderWidth: 2,
      },
    ],
  };

  // Average score by section
  const sectionScores = { attitude: [] as number[], experience: [] as number[], availability: [] as number[], rating: [] as number[] };
  interviewed.forEach((c) => {
    if (c.interviewData) {
      const r = c.interviewData.step6.ratings;
      sectionScores.attitude.push((r.attitude + r.presentation + r.willingness) / 3);
      sectionScores.experience.push((r.responsibility + r.stability) / 2);
      const avail = [
        c.interviewData.step5.standingWork,
        c.interviewData.step5.heavyLifting,
        c.interviewData.step5.gettingDirty,
        c.interviewData.step5.repetitiveWork,
        c.interviewData.step5.rulesAndUniform,
      ].filter(Boolean).length;
      sectionScores.availability.push(avail);
      sectionScores.rating.push(r.communication);
    }
  });

  const sectionData = {
    labels: ['Actitud', 'Experiencia', 'Disponibilidad', 'Calificacion'],
    datasets: [
      {
        label: 'Promedio',
        data: [
          safeAvg(sectionScores.attitude),
          safeAvg(sectionScores.experience),
          safeAvg(sectionScores.availability),
          safeAvg(sectionScores.rating),
        ].map((v) => Math.round(v * 100) / 100),
        backgroundColor: [
          'rgba(51,141,255,0.7)',
          'rgba(217,70,239,0.7)',
          'rgba(34,197,94,0.7)',
          'rgba(6,182,212,0.7)',
        ],
        borderColor: [COLORS.blue, COLORS.purple, COLORS.green, COLORS.cyan],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  // Candidates by position
  const posCounts: Record<string, number> = {};
  (Object.keys(JOB_POSITIONS) as JobPosition[]).forEach((p) => {
    posCounts[p] = candidates.filter((c) => c.position === p).length;
  });

  const posData = {
    labels: Object.keys(posCounts),
    datasets: [
      {
        label: 'Candidatos',
        data: Object.values(posCounts),
        backgroundColor: 'rgba(51,141,255,0.7)',
        borderColor: COLORS.blue,
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const totalCandidates = candidates.length;
  const conversionRate = totalCandidates > 0 ? Math.round((hired.length / totalCandidates) * 100) : 0;
  const avgScore = safeAvg(interviewed.filter((c) => c.interviewScore != null).map((c) => c.interviewScore!));

  return (
    <motion.div variants={tabContent} initial="initial" animate="animate" exit="exit" key="reclutamiento">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Candidatos" value={totalCandidates} icon={<Users className="w-5 h-5" />} color="text-blue-400" index={0} />
        <StatCard
          label="Tasa de Conversion"
          value={`${conversionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-green-400"
          subtitle={`${hired.length} contratados de ${totalCandidates}`}
          index={1}
        />
        <StatCard
          label="Score Promedio"
          value={interviewed.length > 0 ? Math.round(avgScore) : '--'}
          icon={<Target className="w-5 h-5" />}
          color="text-purple-400"
          subtitle="Puntuacion de entrevista"
          index={2}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Distribucion de Veredictos" index={3}>
          {interviewed.length > 0 ? (
            <Doughnut data={verdictData} options={doughnutOptions} />
          ) : (
            <EmptyState message="No hay entrevistas completadas para mostrar distribucion de veredictos." />
          )}
        </ChartCard>
        <ChartCard title="Puntuacion Promedio por Seccion" index={4}>
          {interviewed.length > 0 ? (
            <Bar data={sectionData} options={barLineOptions} />
          ) : (
            <EmptyState message="No hay datos suficientes para mostrar este analisis." />
          )}
        </ChartCard>
        <ChartCard title="Candidatos por Puesto" index={5} className="lg:col-span-2">
          <Bar data={posData} options={barLineOptions} />
        </ChartCard>
      </div>
    </motion.div>
  );
}

// ─── Tab: Retencion ─────────────────────────────────────────────────────────

const EXIT_LABELS: Record<string, string> = {
  renuncia: 'Renuncia',
  fin_contrato: 'Fin de Contrato',
  rescision: 'Rescision',
  mutuo_acuerdo: 'Mutuo Acuerdo',
  abandono: 'Abandono',
  incapacidad: 'Incapacidad',
};

function RetencionTab({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) {
    return <EmptyState message="No hay datos suficientes para mostrar este analisis. Agrega empleados para ver estadisticas de retencion." />;
  }

  const now = new Date();
  const months12 = getLast12Months();

  const active = employees.filter((e) => e.status !== 'inactive');
  const exited = employees.filter((e) => e.status === 'inactive' && e.exitData);

  // Monthly hire/exit trends
  const hiresPerMonth = months12.map(({ start, end }) =>
    employees.filter((e) => {
      const d = new Date(e.hireDate);
      return d >= start && d <= end;
    }).length
  );

  const exitsPerMonth = months12.map(({ start, end }) =>
    exited.filter((e) => {
      if (!e.exitData) return false;
      const d = new Date(e.exitData.exitDate);
      return d >= start && d <= end;
    }).length
  );

  const trendData = {
    labels: months12.map((m) => m.label),
    datasets: [
      {
        label: 'Altas',
        data: hiresPerMonth,
        borderColor: COLORS.green,
        backgroundColor: 'rgba(34,197,94,0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.green,
        pointRadius: 4,
      },
      {
        label: 'Bajas',
        data: exitsPerMonth,
        borderColor: COLORS.red,
        backgroundColor: 'rgba(239,68,68,0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.red,
        pointRadius: 4,
      },
    ],
  };

  // Exit reasons
  const exitReasonCounts: Record<string, number> = {};
  exited.forEach((e) => {
    if (e.exitData) {
      const t = e.exitData.exitType;
      exitReasonCounts[t] = (exitReasonCounts[t] || 0) + 1;
    }
  });

  const exitReasonLabels = Object.keys(exitReasonCounts).map((k) => EXIT_LABELS[k] || k);
  const exitReasonColors = [COLORS.red, COLORS.yellow, COLORS.purple, COLORS.cyan, COLORS.blue, COLORS.green];

  const exitReasonsData = {
    labels: exitReasonLabels,
    datasets: [
      {
        data: Object.values(exitReasonCounts),
        backgroundColor: exitReasonColors.slice(0, exitReasonLabels.length),
        borderColor: exitReasonColors.slice(0, exitReasonLabels.length).map((c) => c + '4d'),
        borderWidth: 2,
      },
    ],
  };

  // Tenure calculations
  const tenures = employees.map((e) => {
    const end = e.status === 'inactive' && e.exitData ? new Date(e.exitData.exitDate) : now;
    return monthDiff(new Date(e.hireDate), end);
  });
  const avgTenure = safeAvg(tenures);

  const totalActive = active.length;
  const totalExited = exited.length;
  const total = employees.length;
  const turnoverRate = total > 0 ? Math.round((totalExited / total) * 100) : 0;
  const retentionRate = 100 - turnoverRate;

  // Average tenure by position
  const tenureByPos: Record<string, number[]> = {};
  (Object.keys(JOB_POSITIONS) as JobPosition[]).forEach((p) => {
    tenureByPos[p] = employees
      .filter((e) => e.position === p)
      .map((e) => {
        const end = e.status === 'inactive' && e.exitData ? new Date(e.exitData.exitDate) : now;
        return monthDiff(new Date(e.hireDate), end);
      });
  });

  const tenurePosData = {
    labels: Object.keys(tenureByPos),
    datasets: [
      {
        label: 'Meses promedio',
        data: Object.values(tenureByPos).map((arr) => Math.round(safeAvg(arr) * 10) / 10),
        backgroundColor: 'rgba(6,182,212,0.7)',
        borderColor: COLORS.cyan,
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  return (
    <motion.div variants={tabContent} initial="initial" animate="animate" exit="exit" key="retencion">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Antiguedad Promedio"
          value={`${Math.round(avgTenure)} meses`}
          icon={<Clock className="w-5 h-5" />}
          color="text-cyan-400"
          subtitle={`${totalActive} activos actualmente`}
          index={0}
        />
        <StatCard
          label="Tasa de Rotacion"
          value={`${turnoverRate}%`}
          icon={<TrendingDown className="w-5 h-5" />}
          color="text-red-400"
          subtitle={`${totalExited} bajas totales`}
          index={1}
        />
        <StatCard
          label="Tasa de Retencion"
          value={`${retentionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-green-400"
          subtitle="Empleados que permanecen"
          index={2}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tendencia Altas / Bajas (12 meses)" index={3} className="lg:col-span-2">
          <Line data={trendData} options={barLineOptions} />
        </ChartCard>
        <ChartCard title="Motivos de Baja" index={4}>
          {exited.length > 0 ? (
            <Doughnut data={exitReasonsData} options={doughnutOptions} />
          ) : (
            <EmptyState message="No hay bajas registradas para mostrar distribucion de motivos." />
          )}
        </ChartCard>
        <ChartCard title="Antiguedad Promedio por Puesto" index={5}>
          <Bar data={tenurePosData} options={barLineOptions} />
        </ChartCard>
      </div>
    </motion.div>
  );
}

// ─── Tab: Desempeno ─────────────────────────────────────────────────────────

function DesempenoTab({ employees }: { employees: Employee[] }) {
  const allEvaluations = employees.flatMap((e) => e.evaluations);
  const allIncidents = employees.flatMap((e) => e.incidents);

  if (employees.length === 0 || allEvaluations.length === 0) {
    return <EmptyState message="No hay datos suficientes para mostrar este analisis. Se necesitan evaluaciones de desempeno registradas." />;
  }

  // Radar: Average ratings across 6 criteria
  const criteriaKeys = ['punctuality', 'instructions', 'quality', 'attitude', 'relationships', 'bpmCompliance'] as const;
  const criteriaLabels = ['Puntualidad', 'Instrucciones', 'Calidad', 'Actitud', 'Relaciones', 'BPM'];
  const criteriaAvgs = criteriaKeys.map((key) => {
    const vals = allEvaluations.map((ev) => ev.ratings[key]).filter((v) => v != null);
    return safeAvg(vals);
  });

  const radarData = {
    labels: criteriaLabels,
    datasets: [
      {
        label: 'Promedio General',
        data: criteriaAvgs.map((v) => Math.round(v * 100) / 100),
        backgroundColor: 'rgba(51,141,255,0.2)',
        borderColor: COLORS.blue,
        borderWidth: 2,
        pointBackgroundColor: COLORS.blue,
        pointRadius: 5,
      },
    ],
  };

  // Performance distribution (semaphore)
  const greenCount = allEvaluations.filter((e) => e.averageScore >= 4).length;
  const yellowCount = allEvaluations.filter((e) => e.averageScore >= 3 && e.averageScore < 4).length;
  const redCount = allEvaluations.filter((e) => e.averageScore < 3).length;

  const semaphoreData = {
    labels: ['Verde (>= 4)', 'Amarillo (3-3.9)', 'Rojo (< 3)'],
    datasets: [
      {
        label: 'Evaluaciones',
        data: [greenCount, yellowCount, redCount],
        backgroundColor: [
          'rgba(34,197,94,0.7)',
          'rgba(245,158,11,0.7)',
          'rgba(239,68,68,0.7)',
        ],
        borderColor: [COLORS.green, COLORS.yellow, COLORS.red],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  // Stats
  const avgPerf = safeAvg(allEvaluations.map((e) => e.averageScore));
  const totalIncidents = allIncidents.length;

  // Top performer
  const perfByEmployee = employees
    .filter((e) => e.evaluations.length > 0)
    .map((e) => ({
      name: e.fullName,
      avg: safeAvg(e.evaluations.map((ev) => ev.averageScore)),
    }))
    .sort((a, b) => b.avg - a.avg);
  const topPerformer = perfByEmployee.length > 0 ? perfByEmployee[0].name : '--';

  // Performance over time
  const evalsByPeriod: Record<string, number[]> = {};
  allEvaluations.forEach((ev) => {
    const d = new Date(ev.date);
    const key = getMonthLabel(d);
    if (!evalsByPeriod[key]) evalsByPeriod[key] = [];
    evalsByPeriod[key].push(ev.averageScore);
  });

  const sortedPeriods = Object.entries(evalsByPeriod)
    .sort(([, aVals], [, bVals]) => {
      // Rough sort by first evaluation date in each group
      return 0; // Already chronological from iteration
    });

  // Collect unique periods in chronological order
  const periodLabels: string[] = [];
  const periodAvgs: number[] = [];
  const evalsSorted = [...allEvaluations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const seenPeriods = new Set<string>();
  evalsSorted.forEach((ev) => {
    const d = new Date(ev.date);
    const key = getMonthLabel(d);
    if (!seenPeriods.has(key)) {
      seenPeriods.add(key);
      periodLabels.push(key);
      periodAvgs.push(safeAvg(evalsByPeriod[key]));
    }
  });

  const perfOverTimeData = {
    labels: periodLabels,
    datasets: [
      {
        label: 'Promedio de Desempeno',
        data: periodAvgs.map((v) => Math.round(v * 100) / 100),
        borderColor: COLORS.purple,
        backgroundColor: 'rgba(217,70,239,0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.purple,
        pointRadius: 5,
      },
    ],
  };

  return (
    <motion.div variants={tabContent} initial="initial" animate="animate" exit="exit" key="desempeno">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Score Promedio"
          value={Math.round(avgPerf * 100) / 100}
          icon={<Activity className="w-5 h-5" />}
          color="text-blue-400"
          subtitle={`De ${allEvaluations.length} evaluaciones`}
          index={0}
        />
        <StatCard
          label="Total Incidencias"
          value={totalIncidents}
          icon={<BarChart3 className="w-5 h-5" />}
          color="text-yellow-400"
          subtitle="Acumulado general"
          index={1}
        />
        <StatCard
          label="Top Performer"
          value={topPerformer}
          icon={<Award className="w-5 h-5" />}
          color="text-green-400"
          subtitle={perfByEmployee.length > 0 ? `Score: ${Math.round(perfByEmployee[0].avg * 100) / 100}` : undefined}
          index={2}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Perfil de Competencias (Promedio)" index={3}>
          <Radar data={radarData} options={radarOptions} />
        </ChartCard>
        <ChartCard title="Distribucion de Desempeno (Semaforo)" index={4}>
          <Bar data={semaphoreData} options={barLineOptions} />
        </ChartCard>
        <ChartCard title="Tendencia de Desempeno" index={5} className="lg:col-span-2">
          {periodLabels.length > 1 ? (
            <Line data={perfOverTimeData} options={barLineOptions} />
          ) : (
            <EmptyState message="Se necesitan evaluaciones en multiples periodos para mostrar la tendencia." />
          )}
        </ChartCard>
      </div>
    </motion.div>
  );
}

// ─── Tab: Onboarding ────────────────────────────────────────────────────────

function OnboardingTab({ employees }: { employees: Employee[] }) {
  const withOnboarding = employees.filter((e) => e.onboardingProgress && e.onboardingProgress.modules.length > 0);

  if (employees.length === 0 || withOnboarding.length === 0) {
    return <EmptyState message="No hay datos suficientes para mostrar este analisis. Se necesitan registros de onboarding de empleados." />;
  }

  // Quiz scores by module
  const quizModuleLabels: string[] = [];
  const quizModuleAvgs: number[] = [];
  QUIZ_MODULES.forEach((modId) => {
    const scores: number[] = [];
    withOnboarding.forEach((e) => {
      const mod = e.onboardingProgress.modules.find((m) => m.id === modId);
      if (mod && mod.quizScore != null) scores.push(mod.quizScore);
    });
    quizModuleLabels.push(`Modulo ${modId}`);
    quizModuleAvgs.push(scores.length > 0 ? safeAvg(scores) : 0);
  });

  const quizScoresData = {
    labels: quizModuleLabels,
    datasets: [
      {
        label: 'Score Promedio (%)',
        data: quizModuleAvgs.map((v) => Math.round(v)),
        backgroundColor: [
          'rgba(51,141,255,0.7)',
          'rgba(217,70,239,0.7)',
          'rgba(34,197,94,0.7)',
          'rgba(6,182,212,0.7)',
          'rgba(245,158,11,0.7)',
        ],
        borderColor: [COLORS.blue, COLORS.purple, COLORS.green, COLORS.cyan, COLORS.yellow],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  // Completion status
  let complete = 0;
  let inProgress = 0;
  let notStarted = 0;

  withOnboarding.forEach((e) => {
    const modules = e.onboardingProgress.modules;
    const completedModules = modules.filter((m) => m.completed).length;
    if (completedModules === modules.length && modules.length > 0) {
      complete++;
    } else if (completedModules > 0) {
      inProgress++;
    } else {
      notStarted++;
    }
  });

  // Also count employees who have onboarding but nothing started from employees without modules
  const withoutOnboarding = employees.filter((e) => !e.onboardingProgress || e.onboardingProgress.modules.length === 0);
  notStarted += withoutOnboarding.length;

  const completionData = {
    labels: ['Completado', 'En Progreso', 'Sin Iniciar'],
    datasets: [
      {
        data: [complete, inProgress, notStarted],
        backgroundColor: [COLORS.green, COLORS.yellow, COLORS.red],
        borderColor: ['rgba(34,197,94,0.3)', 'rgba(245,158,11,0.3)', 'rgba(239,68,68,0.3)'],
        borderWidth: 2,
      },
    ],
  };

  // Stats
  const completionRates = withOnboarding.map((e) => {
    const modules = e.onboardingProgress.modules;
    if (modules.length === 0) return 0;
    return (modules.filter((m) => m.completed).length / modules.length) * 100;
  });
  const avgCompletionRate = safeAvg(completionRates);

  const allQuizScores: number[] = [];
  withOnboarding.forEach((e) => {
    e.onboardingProgress.modules.forEach((m) => {
      if (m.quizScore != null) allQuizScores.push(m.quizScore);
    });
  });
  const avgQuizScore = safeAvg(allQuizScores);

  // Average completion time (days between hire and onboarding completion)
  const completionTimes: number[] = [];
  withOnboarding.forEach((e) => {
    if (e.onboardingProgress.completedDate) {
      const hire = new Date(e.hireDate);
      const completed = new Date(e.onboardingProgress.completedDate);
      const days = Math.ceil((completed.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0) completionTimes.push(days);
    }
  });
  const avgCompletionTime = completionTimes.length > 0 ? Math.round(safeAvg(completionTimes)) : null;

  return (
    <motion.div variants={tabContent} initial="initial" animate="animate" exit="exit" key="onboarding">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Tasa de Completado"
          value={`${Math.round(avgCompletionRate)}%`}
          icon={<Target className="w-5 h-5" />}
          color="text-green-400"
          subtitle={`${complete} completados de ${employees.length}`}
          index={0}
        />
        <StatCard
          label="Score Promedio Quiz"
          value={allQuizScores.length > 0 ? `${Math.round(avgQuizScore)}%` : '--'}
          icon={<Award className="w-5 h-5" />}
          color="text-purple-400"
          subtitle={`${allQuizScores.length} quizzes realizados`}
          index={1}
        />
        <StatCard
          label="Tiempo de Completado"
          value={avgCompletionTime != null ? `${avgCompletionTime} dias` : '--'}
          icon={<Clock className="w-5 h-5" />}
          color="text-cyan-400"
          subtitle="Promedio alta a certificacion"
          index={2}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Scores de Quiz por Modulo" index={3}>
          {allQuizScores.length > 0 ? (
            <Bar data={quizScoresData} options={barLineOptions} />
          ) : (
            <EmptyState message="No hay quizzes completados para mostrar puntuaciones." />
          )}
        </ChartCard>
        <ChartCard title="Estado de Onboarding" index={4}>
          <Doughnut data={completionData} options={doughnutOptions} />
        </ChartCard>
      </div>
    </motion.div>
  );
}

// ─── Main Module ────────────────────────────────────────────────────────────

export default function AnalyticsModule() {
  const { candidates, employees } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>('reclutamiento');

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-400" />
          Analitica e Inteligencia de Datos
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Metricas clave, tendencias y visualizaciones del ciclo de talento
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        className="glass flex gap-1 p-1 rounded-xl overflow-x-auto"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-blue-600/20 text-blue-300 shadow-lg shadow-blue-500/10 glow-primary'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'reclutamiento' && <ReclutamientoTab candidates={candidates} />}
        {activeTab === 'retencion' && <RetencionTab employees={employees} />}
        {activeTab === 'desempeno' && <DesempenoTab employees={employees} />}
        {activeTab === 'onboarding' && <OnboardingTab employees={employees} />}
      </AnimatePresence>
    </div>
  );
}
