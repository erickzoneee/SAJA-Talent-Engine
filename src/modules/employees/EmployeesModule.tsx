// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODULO COLABORADORES (v2.18)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Aqui se CONSULTAN los expedientes: una ficha por colaborador con su foto,
// puesto, area, estatus y avance de documentos/onboarding. Esta seccion es de
// solo consulta a proposito — las altas (contratacion y registro de
// colaboradores existentes) viven en el modulo de Contratacion.
//
// El expediente completo (DossierView) se reutiliza del modulo de Contratacion:
// es exactamente la misma pantalla de siempre, no una copia.

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserX,
  Search,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  GraduationCap,
  Calendar,
  ChevronRight,
  IdCard,
} from 'lucide-react';
import type { Employee } from '../../types';
import { useStore } from '../../store/useStore';
import { getInitials, formatDate } from '../../utils/helpers';
import MediaImage from '../../components/MediaImage';
import {
  getAvatarGradient,
  countMandatoryDocs,
  daysUntil,
  positionLabel,
} from '../../utils/employeeUi';
import { DossierView } from '../hiring/HiringModule';

// ── Animaciones (mismas del resto del sistema) ──────────────────────────────

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

const cardItem = {
  initial: { opacity: 0, y: 18 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    // El retardo se topa a 12 fichas: con 100 colaboradores la ultima tardaba
    // varios segundos en aparecer.
    transition: { delay: Math.min(i, 12) * 0.04, duration: 0.3, ease: 'easeOut' as const },
  }),
};

const statusConfig: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  trial: { label: 'Periodo de Prueba', badge: 'badge-yellow', icon: Clock },
  active: { label: 'Activo', badge: 'badge-green', icon: CheckCircle },
  inactive: { label: 'Inactivo', badge: 'badge-red', icon: XCircle },
};

/** Antiguedad legible ("3 anos 2 meses" / "5 meses" / "12 dias"). */
function antiguedad(hireDate: string, until?: string): string {
  const start = new Date(hireDate).getTime();
  const end = until ? new Date(until).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—';
  const dias = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  if (dias < 31) return `${dias} dia${dias === 1 ? '' : 's'}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} mes${meses === 1 ? '' : 'es'}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return `${anos} ano${anos === 1 ? '' : 's'}${resto > 0 ? ` ${resto} mes${resto === 1 ? '' : 'es'}` : ''}`;
}

// ── Vista principal ─────────────────────────────────────────────────────────

type ViewState = { view: 'fichas' } | { view: 'dossier'; employeeId: string };

export default function EmployeesModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'fichas' });

  // Sin AnimatePresence mode="wait": el cambio de vista es inmediato y solo se
  // anima la entrada (una salida atorada dejaba la pantalla vacia).
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {viewState.view === 'fichas' && (
        <motion.div key="fichas" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <EmployeeCardsView onViewDossier={(id) => setViewState({ view: 'dossier', employeeId: id })} />
        </motion.div>
      )}
      {viewState.view === 'dossier' && (
        <motion.div key="dossier" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <DossierView employeeId={viewState.employeeId} onBack={() => setViewState({ view: 'fichas' })} />
        </motion.div>
      )}
    </div>
  );
}

// ── Vista de fichas ─────────────────────────────────────────────────────────

function EmployeeCardsView({ onViewDossier }: { onViewDossier: (employeeId: string) => void }) {
  const { employees } = useStore();
  const [search, setSearch] = useState('');
  // Los colaboradores dados de baja (inactivos / egreso) viven en su propia
  // pestana, para no mezclarlos con los colaboradores en activo.
  const [tab, setTab] = useState<'activos' | 'bajas'>('activos');
  const [filterStatus, setFilterStatus] = useState<'all' | 'trial' | 'active'>('all');

  const activosCount = useMemo(
    () => employees.filter((e) => e.status !== 'inactive').length,
    [employees],
  );
  const bajasCount = useMemo(
    () => employees.filter((e) => e.status === 'inactive').length,
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      // Se busca por nombre, puesto, area y numero de expediente.
      const matchSearch =
        q === '' ||
        e.fullName.toLowerCase().includes(q) ||
        positionLabel(e.position).toLowerCase().includes(q) ||
        (e.area ?? '').toLowerCase().includes(q) ||
        String(e.expedientNumber).padStart(3, '0').includes(q);
      if (tab === 'bajas') return matchSearch && e.status === 'inactive';
      // Pestana de activos: los dados de baja nunca aparecen aqui.
      if (e.status === 'inactive') return false;
      const matchStatus = filterStatus === 'all' || e.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [employees, search, filterStatus, tab]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center shrink-0">
              <Building size={22} className="text-accent-400" />
            </div>
            Expedientes de Empleados
          </h2>
          <p className="text-surface-400 text-sm mt-1">
            {tab === 'bajas'
              ? `${bajasCount} ex-colaborador${bajasCount !== 1 ? 'es' : ''} dado${bajasCount !== 1 ? 's' : ''} de baja`
              : `${activosCount} colaborador${activosCount !== 1 ? 'es' : ''} registrado${activosCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Pestanas — colaboradores activos vs. bajas (ex-colaboradores) */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab('activos')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            tab === 'activos'
              ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/40'
              : 'glass-card text-surface-400 hover:text-surface-200'
          }`}
        >
          <Users size={15} /> Colaboradores
          <span className="text-xs font-bold">{activosCount}</span>
        </button>
        <button
          onClick={() => setTab('bajas')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            tab === 'bajas'
              ? 'bg-danger-500/20 text-danger-400 ring-1 ring-danger-500/40'
              : 'glass-card text-surface-400 hover:text-surface-200'
          }`}
        >
          <UserX size={15} /> Ex-colaboradores
          <span className="text-xs font-bold">{bajasCount}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder={tab === 'bajas' ? 'Buscar ex-colaborador...' : 'Buscar empleado...'}
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab === 'activos' && (
          <select
            className="input-field w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          >
            <option value="all">Todos los estados</option>
            <option value="trial">Periodo de prueba</option>
            <option value="active">Activos</option>
          </select>
        )}
      </div>

      {/* Resumen (solo en la pestana de activos) */}
      {tab === 'activos' && (
        <div className="flex gap-3 mb-4">
          {(['trial', 'active'] as const).map((status) => {
            const count = employees.filter((e) => e.status === status).length;
            const cfg = statusConfig[status];
            return (
              <div key={status} className="glass-card px-4 py-2 flex items-center gap-2">
                <cfg.icon size={14} className={status === 'trial' ? 'text-warning-500' : 'text-success-500'} />
                <span className="text-xs text-surface-400">{cfg.label}:</span>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Fichas */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredEmployees.length === 0 ? (
          <motion.div {...fadeUp} className="glass-card p-12 text-center">
            {tab === 'bajas' ? (
              <>
                <UserX size={48} className="mx-auto text-surface-600 mb-4" />
                <p className="text-surface-400 text-lg font-medium">No hay ex-colaboradores</p>
                <p className="text-surface-500 text-sm mt-1">
                  Los colaboradores a los que se les da egreso apareceran aqui
                </p>
              </>
            ) : (
              <>
                <Building size={48} className="mx-auto text-surface-600 mb-4" />
                <p className="text-surface-400 text-lg font-medium">
                  {search.trim() ? 'Ningun colaborador coincide con la busqueda' : 'No hay empleados registrados'}
                </p>
                <p className="text-surface-500 text-sm mt-1">
                  {search.trim()
                    ? 'Prueba con otro nombre, puesto, area o numero de expediente'
                    : 'Las altas se hacen en Contratacion; aqui se consultan los expedientes'}
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-2">
            {filteredEmployees.map((employee, i) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                index={i}
                onClick={() => onViewDossier(employee.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ficha individual ────────────────────────────────────────────────────────

function EmployeeCard({
  employee,
  index,
  onClick,
}: {
  employee: Employee;
  index: number;
  onClick: () => void;
}) {
  const cfg = statusConfig[employee.status] ?? statusConfig.active;
  const StatusIcon = cfg.icon;
  const trialDays = employee.status === 'trial' ? daysUntil(employee.trialEndDate) : null;
  const { completed: docsDone, total: docsTotal } = countMandatoryDocs(employee.documents);
  const onbTotal = employee.onboardingProgress?.modules.length ?? 0;
  const onbDone = employee.onboardingProgress?.modules.filter((m) => m.completed).length ?? 0;
  const docsPct = docsTotal > 0 ? Math.round((docsDone / docsTotal) * 100) : 0;
  const onbPct = onbTotal > 0 ? Math.round((onbDone / onbTotal) * 100) : 0;
  const esBaja = employee.status === 'inactive';
  const hasta = esBaja ? employee.exitData?.exitDate : undefined;

  return (
    <motion.button
      type="button"
      custom={index}
      variants={cardItem}
      initial="initial"
      animate="animate"
      onClick={onClick}
      className="glass-card p-5 text-left flex flex-col gap-4 cursor-pointer group w-full"
    >
      {/* Encabezado: foto + nombre + puesto */}
      <div className="flex items-start gap-3">
        {employee.photoUrl ? (
          <MediaImage
            value={employee.photoUrl}
            alt={employee.fullName}
            className="w-16 h-16 rounded-2xl object-cover border border-surface-600/30 shrink-0"
          />
        ) : (
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(employee.fullName)} flex items-center justify-center text-white font-bold text-lg shrink-0`}
          >
            {getInitials(employee.fullName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold leading-snug break-words">{employee.fullName}</p>
          <p className="text-surface-400 text-xs mt-1 truncate" title={positionLabel(employee.position)}>
            {positionLabel(employee.position)}
          </p>
          {employee.area && (
            <p className="text-surface-500 text-[11px] mt-0.5 truncate" title={employee.area}>
              {employee.area}
            </p>
          )}
        </div>
        <ChevronRight
          size={18}
          className="text-surface-600 group-hover:text-surface-300 transition-colors shrink-0 mt-1"
        />
      </div>

      {/* Expediente + estatus */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-surface-400 bg-surface-800/50 rounded-lg px-2 py-1">
          <IdCard size={13} className="text-surface-500" />
          Expediente <span className="font-bold text-surface-200">#{String(employee.expedientNumber).padStart(3, '0')}</span>
        </span>
        <span className={`badge ${cfg.badge}`}>
          <StatusIcon size={12} />
          {cfg.label}
        </span>
      </div>

      {/* Periodo de prueba */}
      {trialDays !== null && (
        <div
          className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
            trialDays <= 5
              ? 'bg-danger-500/10 text-danger-500'
              : trialDays <= 10
                ? 'bg-warning-500/10 text-warning-500'
                : 'bg-primary-500/10 text-primary-400'
          }`}
        >
          <Clock size={13} className="shrink-0" />
          {trialDays > 0 ? (
            <span>
              Prueba: <span className="font-bold">{trialDays} dia{trialDays === 1 ? '' : 's'}</span> restantes
            </span>
          ) : (
            <span className="font-bold">Periodo de prueba vencido</span>
          )}
        </div>
      )}

      {/* Avance: documentos y onboarding */}
      <div className="space-y-2.5">
        <ProgressLine
          icon={FileText}
          label="Documentos"
          value={`${docsDone}/${docsTotal}`}
          percent={docsPct}
          color="bg-primary-500"
        />
        <ProgressLine
          icon={GraduationCap}
          label="Onboarding"
          value={onbTotal > 0 ? `${onbDone}/${onbTotal}` : 'Sin iniciar'}
          percent={onbPct}
          color="bg-accent-500"
        />
      </div>

      {/* Pie: ingreso y antiguedad */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06] text-[11px] text-surface-500">
        <span className="inline-flex items-center gap-1.5 truncate">
          <Calendar size={12} className="shrink-0" />
          {employee.hireDate ? formatDate(employee.hireDate) : '—'}
        </span>
        <span className="truncate">
          {esBaja ? 'Duro' : 'Antiguedad'}: {antiguedad(employee.hireDate, hasta)}
        </span>
      </div>
    </motion.button>
  );
}

function ProgressLine({
  icon: Icon,
  label,
  value,
  percent,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="inline-flex items-center gap-1.5 text-surface-400">
          <Icon size={12} />
          {label}
        </span>
        <span className="font-semibold text-surface-300">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-800/70 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
