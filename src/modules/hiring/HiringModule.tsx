import { useState, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileCheck,
  Upload,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Building,
  Calendar,
  ArrowLeft,
  Search,
  ChevronRight,
  Shield,
  Eye,
  Briefcase,
  Hash,
  DollarSign,
  BadgeCheck,
  FileText,
  Info,
} from 'lucide-react';
import type {
  Employee,
  Candidate,
  DocumentChecklist,
  ContractType,
  JobPosition,
} from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import {
  generateId,
  formatDate,
  formatDateInput,
  addBusinessDays,
  fileToBase64,
  getInitials,
} from '../../utils/helpers';
import { getVerdictLabel, getVerdictColor } from '../../utils/scoring';
import { getDefaultOnboardingModules } from '../../utils/onboardingModules';

// ── Animation Variants ──────────────────────────────────────────────────────

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

// ── Constants ───────────────────────────────────────────────────────────────

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

interface DocumentItem {
  key: keyof DocumentChecklist;
  label: string;
  mandatory: boolean;
  maleOnly?: boolean;
  note?: string;
}

const DOCUMENT_ITEMS: DocumentItem[] = [
  { key: 'solicitud', label: 'Solicitud elaborada', mandatory: true },
  { key: 'ine', label: 'INE', mandatory: true },
  { key: 'actaNacimiento', label: 'Acta de nacimiento', mandatory: true },
  { key: 'curp', label: 'CURP', mandatory: true },
  { key: 'imss', label: 'Numero IMSS', mandatory: true },
  { key: 'comprobanteDomicilio', label: 'Comprobante de domicilio < 3 meses', mandatory: true },
  { key: 'comprobanteEstudios', label: 'Comprobante de estudios', mandatory: true },
  { key: 'cartasRecomendacion', label: '2 cartas de recomendacion + copia INE', mandatory: true },
  { key: 'antecedentesNoPenales', label: 'Antecedentes no penales', mandatory: false, maleOnly: true, note: 'Solo aplica para hombres' },
  { key: 'rfc', label: 'RFC constancia con homoclave', mandatory: true },
];

function createEmptyDocuments(): DocumentChecklist {
  return {
    solicitud: { done: false },
    ine: { done: false },
    actaNacimiento: { done: false },
    curp: { done: false },
    imss: { done: false },
    comprobanteDomicilio: { done: false },
    comprobanteEstudios: { done: false },
    cartasRecomendacion: { done: false },
    antecedentesNoPenales: { done: false, onlyMale: true },
    rfc: { done: false },
  };
}

function countMandatoryDocs(docs: DocumentChecklist): { completed: number; total: number } {
  const mandatoryKeys: (keyof DocumentChecklist)[] = [
    'solicitud', 'ine', 'actaNacimiento', 'curp', 'imss',
    'comprobanteDomicilio', 'comprobanteEstudios', 'cartasRecomendacion', 'rfc',
  ];
  const total = mandatoryKeys.length;
  const completed = mandatoryKeys.filter((k) => docs[k].done).length;
  return { completed, total };
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── View State ──────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'candidates' }
  | { view: 'hiring-form'; candidateId: string }
  | { view: 'employee-list' }
  | { view: 'dossier'; employeeId: string };

// ── Main Component ──────────────────────────────────────────────────────────

export default function HiringModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'candidates' });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState.view === 'candidates' && (
          <motion.div key="candidates" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <CandidatesReadyView
              onHire={(id) => setViewState({ view: 'hiring-form', candidateId: id })}
              onViewEmployees={() => setViewState({ view: 'employee-list' })}
            />
          </motion.div>
        )}
        {viewState.view === 'hiring-form' && (
          <motion.div key="hiring-form" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <HiringFormView
              candidateId={viewState.candidateId}
              onBack={() => setViewState({ view: 'candidates' })}
              onComplete={() => setViewState({ view: 'employee-list' })}
            />
          </motion.div>
        )}
        {viewState.view === 'employee-list' && (
          <motion.div key="employee-list" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <EmployeeListView
              onBack={() => setViewState({ view: 'candidates' })}
              onViewDossier={(id) => setViewState({ view: 'dossier', employeeId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'dossier' && (
          <motion.div key="dossier" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <DossierView
              employeeId={viewState.employeeId}
              onBack={() => setViewState({ view: 'employee-list' })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 1 : Candidates Ready to Hire
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CandidatesReadyViewProps {
  onHire: (candidateId: string) => void;
  onViewEmployees: () => void;
}

function CandidatesReadyView({ onHire, onViewEmployees }: CandidatesReadyViewProps) {
  const { candidates, employees } = useStore();
  const [search, setSearch] = useState('');
  const [filterVerdict, setFilterVerdict] = useState<'all' | 'recommended' | 'reservations'>('all');

  const hirableCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (c.hired) return false;
      if (c.verdict !== 'recommended' && c.verdict !== 'reservations') return false;
      const matchSearch = c.fullName.toLowerCase().includes(search.toLowerCase());
      const matchVerdict = filterVerdict === 'all' || c.verdict === filterVerdict;
      return matchSearch && matchVerdict;
    });
  }, [candidates, search, filterVerdict]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
              <FileCheck size={22} className="text-primary-400" />
            </div>
            Candidatos para Contratar
          </h2>
          <p className="text-surface-400 text-sm mt-1">
            Candidatos con veredicto favorable listos para contratacion
          </p>
        </div>
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={onViewEmployees}
        >
          <Building size={16} />
          Ver Empleados ({employees.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar candidato..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto"
          value={filterVerdict}
          onChange={(e) => setFilterVerdict(e.target.value as typeof filterVerdict)}
        >
          <option value="all">Todos los veredictos</option>
          <option value="recommended">Recomendados</option>
          <option value="reservations">Con reservas</option>
        </select>
      </div>

      {/* Candidate List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {hirableCandidates.length === 0 ? (
          <motion.div {...fadeUp} className="glass-card p-12 text-center">
            <User size={48} className="mx-auto text-surface-600 mb-4" />
            <p className="text-surface-400 text-lg font-medium">No hay candidatos listos para contratar</p>
            <p className="text-surface-500 text-sm mt-1">
              Los candidatos apareceran aqui cuando tengan veredicto &quot;Recomendado&quot; o &quot;Con reservas&quot;
            </p>
          </motion.div>
        ) : (
          hirableCandidates.map((candidate, i) => (
            <motion.div
              key={candidate.id}
              custom={i}
              variants={listItem}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
              onClick={() => onHire(candidate.id)}
            >
              {/* Avatar */}
              {candidate.photoUrl ? (
                <img
                  src={candidate.photoUrl}
                  alt={candidate.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-surface-600/30"
                />
              ) : (
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(candidate.fullName)} flex items-center justify-center text-white font-bold text-sm`}>
                  {getInitials(candidate.fullName)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{candidate.fullName}</p>
                <p className="text-surface-400 text-sm">
                  {JOB_POSITIONS[candidate.position]?.name ?? candidate.position}
                </p>
              </div>

              {/* Verdict badge */}
              {candidate.verdict && (
                <span className={`badge ${getVerdictColor(candidate.verdict)}`}>
                  {getVerdictLabel(candidate.verdict)}
                </span>
              )}

              {/* Interview score */}
              {candidate.interviewScore !== undefined && (
                <div className="text-right">
                  <p className="text-xs text-surface-500">Entrevista</p>
                  <p className="text-lg font-bold text-primary-400">{candidate.interviewScore}<span className="text-xs text-surface-500">/100</span></p>
                </div>
              )}

              {/* Action */}
              <button
                className="btn-success flex items-center gap-2 text-sm shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onHire(candidate.id);
                }}
              >
                <FileCheck size={16} />
                Contratar
              </button>

              <ChevronRight size={18} className="text-surface-600 group-hover:text-surface-400 transition-colors shrink-0" />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 2 : Hiring Form
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface HiringFormViewProps {
  candidateId: string;
  onBack: () => void;
  onComplete: () => void;
}

function HiringFormView({ candidateId, onBack, onComplete }: HiringFormViewProps) {
  const { candidates, addEmployee, updateCandidate, getNextExpedientNumber, settings } = useStore();
  const candidate = candidates.find((c) => c.id === candidateId);

  const [documents, setDocuments] = useState<DocumentChecklist>(createEmptyDocuments);
  const [hireDate, setHireDate] = useState(formatDateInput(new Date()));
  const [salary, setSalary] = useState('');
  const [schedule, setSchedule] = useState('');
  const [contractType, setContractType] = useState<ContractType>('eventual');
  const [area, setArea] = useState(candidate ? JOB_POSITIONS[candidate.position]?.area ?? '' : '');
  const [supervisor, setSupervisor] = useState(candidate ? JOB_POSITIONS[candidate.position]?.reportsTo ?? '' : '');
  const [imssNumber, setImssNumber] = useState('');
  const [supervisorOverride, setSupervisorOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { completed: mandatoryCompleted, total: mandatoryTotal } = useMemo(
    () => countMandatoryDocs(documents),
    [documents],
  );

  const allDocsCount = useMemo(() => {
    return DOCUMENT_ITEMS.filter((d) => documents[d.key].done).length;
  }, [documents]);

  const allMandatoryDone = mandatoryCompleted === mandatoryTotal;
  const canSubmit = (allMandatoryDone || supervisorOverride) && salary && schedule && hireDate;

  const handleDocToggle = useCallback((key: keyof DocumentChecklist) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], done: !prev[key].done },
    }));
  }, []);

  const handleDocPhoto = useCallback(async (key: keyof DocumentChecklist, file: File) => {
    const base64 = await fileToBase64(file);
    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], photoUrl: base64, done: true },
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!candidate || !canSubmit || saving) return;
    setSaving(true);

    const hireDateObj = new Date(hireDate);
    const trialEnd = addBusinessDays(hireDateObj, 21);
    const expedientNumber = getNextExpedientNumber();

    const newEmployee: Employee = {
      id: generateId(),
      candidateId: candidate.id,
      expedientNumber,
      fullName: candidate.fullName,
      position: candidate.position,
      hireDate,
      salary: parseFloat(salary),
      schedule,
      contractType,
      area,
      supervisor,
      imssNumber,
      bankDetails: '',
      status: 'trial',
      documents,
      onboardingProgress: {
        modules: getDefaultOnboardingModules(),
        certificateGenerated: false,
      },
      evaluations: [],
      incidents: [],
      bonuses: [],
      trainings: [],
      trialEndDate: formatDateInput(trialEnd),
      trialExtended: false,
      photoUrl: candidate.photoUrl,
      createdAt: new Date().toISOString(),
    };

    addEmployee(newEmployee);
    updateCandidate(candidate.id, { hired: true });

    setTimeout(() => {
      setSaving(false);
      onComplete();
    }, 500);
  }, [candidate, canSubmit, saving, hireDate, salary, schedule, contractType, area, supervisor, imssNumber, documents, addEmployee, updateCandidate, getNextExpedientNumber, onComplete]);

  if (!candidate) {
    return (
      <div className="glass-card p-12 text-center">
        <XCircle size={48} className="mx-auto text-danger-500 mb-4" />
        <p className="text-surface-300 text-lg">Candidato no encontrado</p>
        <button className="btn-secondary mt-4" onClick={onBack}>Volver</button>
      </div>
    );
  }

  const progressPercent = mandatoryTotal > 0 ? Math.round((mandatoryCompleted / mandatoryTotal) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-surface-400 hover:text-white transition-colors cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">Contratacion</h2>
          <p className="text-surface-400 text-sm">
            {candidate.fullName} &mdash; {JOB_POSITIONS[candidate.position]?.name ?? candidate.position}
          </p>
        </div>
        {candidate.verdict && (
          <span className={`badge ${getVerdictColor(candidate.verdict)}`}>
            {getVerdictLabel(candidate.verdict)}
          </span>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* Document Checklist Section */}
        <motion.section {...fadeUp} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText size={20} className="text-primary-400" />
              Checklist de Documentos
            </h3>
            <span className="badge badge-blue">
              {allDocsCount}/{DOCUMENT_ITEMS.length} documentos
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-surface-400">Documentos obligatorios</span>
              <span className="text-xs font-semibold text-primary-400">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-800/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: progressPercent === 100
                    ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                    : 'linear-gradient(90deg, #1b6cf5, #338dff)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' as const }}
              />
            </div>
          </div>

          {/* Document items */}
          <div className="space-y-2">
            {DOCUMENT_ITEMS.map((doc, i) => (
              <DocumentRow
                key={doc.key}
                doc={doc}
                checked={documents[doc.key].done}
                photoUrl={documents[doc.key].photoUrl}
                onToggle={() => handleDocToggle(doc.key)}
                onPhotoUpload={(file) => handleDocPhoto(doc.key, file)}
                index={i}
                fileInputRef={(el) => { fileInputRefs.current[doc.key] = el; }}
              />
            ))}
          </div>

          {/* Warning if mandatory docs missing */}
          {!allMandatoryDone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-start gap-3"
            >
              <AlertTriangle size={18} className="text-warning-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-warning-500 text-sm font-medium">
                  Faltan {mandatoryTotal - mandatoryCompleted} documento(s) obligatorio(s)
                </p>
                <p className="text-surface-400 text-xs mt-1">
                  Se requiere completar todos los documentos obligatorios para proceder, o activar la omision de supervisor.
                </p>
              </div>
            </motion.div>
          )}
        </motion.section>

        {/* Employee Data Form */}
        <motion.section {...fadeUp} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-5">
            <Briefcase size={20} className="text-accent-400" />
            Datos del Empleado
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de ingreso */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <Calendar size={14} className="inline mr-1.5 -mt-0.5" />
                Fecha de ingreso *
              </label>
              <input
                type="date"
                className="input-field"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>

            {/* Sueldo acordado */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <DollarSign size={14} className="inline mr-1.5 -mt-0.5" />
                Sueldo acordado (semanal) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="Ej: 2,200"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                min="0"
                step="100"
              />
            </div>

            {/* Horario asignado */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <Clock size={14} className="inline mr-1.5 -mt-0.5" />
                Horario asignado *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: Lun-Vie 7:00 - 15:30"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </div>

            {/* Tipo de contrato */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <FileCheck size={14} className="inline mr-1.5 -mt-0.5" />
                Tipo de contrato
              </label>
              <select
                className="input-field"
                value={contractType}
                onChange={(e) => setContractType(e.target.value as ContractType)}
              >
                <option value="eventual">Eventual 21 dias prueba</option>
                <option value="indefinido">Indefinido</option>
              </select>
            </div>

            {/* Area asignada */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <Building size={14} className="inline mr-1.5 -mt-0.5" />
                Area asignada
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>

            {/* Supervisor directo */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <User size={14} className="inline mr-1.5 -mt-0.5" />
                Supervisor directo
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Nombre del supervisor"
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
              />
            </div>

            {/* Numero IMSS */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <Hash size={14} className="inline mr-1.5 -mt-0.5" />
                Numero IMSS
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Numero de seguro social"
                value={imssNumber}
                onChange={(e) => setImssNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Calculated trial info */}
          {hireDate && contractType === 'eventual' && (
            <div className="mt-4 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3">
              <Info size={16} className="text-primary-400 shrink-0" />
              <p className="text-primary-300 text-sm">
                Periodo de prueba: {formatDate(hireDate)} al{' '}
                {formatDate(addBusinessDays(new Date(hireDate), 21))} (21 dias habiles)
              </p>
            </div>
          )}
        </motion.section>

        {/* Supervisor Override + Submit */}
        <motion.section {...fadeUp} className="glass-card p-6">
          {!allMandatoryDone && (
            <label className="flex items-center gap-3 mb-5 cursor-pointer group">
              <input
                type="checkbox"
                checked={supervisorOverride}
                onChange={(e) => setSupervisorOverride(e.target.checked)}
                className="w-5 h-5 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30 focus:ring-2 cursor-pointer"
              />
              <div>
                <p className="text-surface-300 text-sm font-medium group-hover:text-white transition-colors">
                  <Shield size={14} className="inline mr-1.5 -mt-0.5 text-warning-500" />
                  Omision de supervisor: permitir contratacion sin todos los documentos
                </p>
                <p className="text-surface-500 text-xs mt-0.5">
                  El supervisor se responsabiliza de completar la documentacion posteriormente
                </p>
              </div>
            </label>
          )}

          <div className="flex items-center gap-3">
            <button
              className="btn-success flex items-center gap-2 flex-1 justify-center py-3 text-base"
              disabled={!canSubmit || saving}
              onClick={handleSubmit}
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' as const }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Guardando...
                </>
              ) : (
                <>
                  <BadgeCheck size={20} />
                  Completar Contratacion
                </>
              )}
            </button>
            <button className="btn-secondary" onClick={onBack}>
              Cancelar
            </button>
          </div>

          {!canSubmit && !saving && (
            <p className="text-surface-500 text-xs mt-3 text-center">
              {!salary ? 'Ingrese el sueldo acordado. ' : ''}
              {!schedule ? 'Ingrese el horario. ' : ''}
              {!hireDate ? 'Seleccione la fecha de ingreso. ' : ''}
              {!allMandatoryDone && !supervisorOverride ? 'Complete los documentos obligatorios o active la omision de supervisor.' : ''}
            </p>
          )}
        </motion.section>
      </div>
    </div>
  );
}

// ── Document Row Sub-component ──────────────────────────────────────────────

interface DocumentRowProps {
  doc: DocumentItem;
  checked: boolean;
  photoUrl?: string;
  onToggle: () => void;
  onPhotoUpload: (file: File) => void;
  index: number;
  fileInputRef: (el: HTMLInputElement | null) => void;
}

function DocumentRow({ doc, checked, photoUrl, onToggle, onPhotoUpload, index, fileInputRef }: DocumentRowProps) {
  const localFileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoUpload(file);
    }
    e.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
        checked
          ? 'bg-success-500/8 border border-success-500/15'
          : 'bg-surface-800/30 border border-transparent hover:border-surface-700/30'
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 cursor-pointer"
      >
        {checked ? (
          <CheckCircle size={22} className="text-success-500" />
        ) : (
          <div className="w-[22px] h-[22px] rounded-full border-2 border-surface-600 hover:border-primary-400 transition-colors" />
        )}
      </button>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${checked ? 'text-surface-200 line-through opacity-70' : 'text-surface-200'}`}>
          {index + 1}. {doc.label}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.mandatory && (
            <span className="text-[10px] text-danger-500 font-semibold uppercase tracking-wide">Obligatorio</span>
          )}
          {doc.maleOnly && doc.note && (
            <span className="text-[10px] text-warning-500 font-medium flex items-center gap-1">
              <AlertTriangle size={10} />
              {doc.note}
            </span>
          )}
        </div>
      </div>

      {/* Photo thumbnail */}
      {photoUrl && (
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-surface-600/30 shrink-0">
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Camera button */}
      <button
        type="button"
        className="w-8 h-8 rounded-lg bg-surface-700/40 hover:bg-primary-500/20 flex items-center justify-center text-surface-400 hover:text-primary-400 transition-all cursor-pointer shrink-0"
        onClick={() => cameraRef.current?.click()}
        title="Tomar foto"
      >
        <Camera size={15} />
      </button>

      {/* Upload button */}
      <button
        type="button"
        className="w-8 h-8 rounded-lg bg-surface-700/40 hover:bg-accent-500/20 flex items-center justify-center text-surface-400 hover:text-accent-400 transition-all cursor-pointer shrink-0"
        onClick={() => localFileRef.current?.click()}
        title="Subir archivo"
      >
        <Upload size={15} />
      </button>

      {/* Hidden inputs */}
      <input
        ref={(el) => {
          localFileRef.current = el;
          fileInputRef(el);
        }}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 3 : Employee List
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface EmployeeListViewProps {
  onBack: () => void;
  onViewDossier: (employeeId: string) => void;
}

function EmployeeListView({ onBack, onViewDossier }: EmployeeListViewProps) {
  const { employees } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'trial' | 'active' | 'inactive'>('all');

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch = e.fullName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || e.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [employees, search, filterStatus]);

  const statusConfig: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
    trial: { label: 'Periodo de Prueba', badge: 'badge-yellow', icon: Clock },
    active: { label: 'Activo', badge: 'badge-green', icon: CheckCircle },
    inactive: { label: 'Inactivo', badge: 'badge-red', icon: XCircle },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-surface-400 hover:text-white transition-colors cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center">
              <Building size={22} className="text-accent-400" />
            </div>
            Expedientes de Empleados
          </h2>
          <p className="text-surface-400 text-sm mt-1">
            {employees.length} empleado{employees.length !== 1 ? 's' : ''} registrado{employees.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar empleado..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
        >
          <option value="all">Todos los estados</option>
          <option value="trial">Periodo de prueba</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Summary Badges */}
      <div className="flex gap-3 mb-4">
        {(['trial', 'active', 'inactive'] as const).map((status) => {
          const count = employees.filter((e) => e.status === status).length;
          const cfg = statusConfig[status];
          return (
            <div key={status} className="glass-card px-4 py-2 flex items-center gap-2">
              <cfg.icon size={14} className={status === 'trial' ? 'text-warning-500' : status === 'active' ? 'text-success-500' : 'text-danger-500'} />
              <span className="text-xs text-surface-400">{cfg.label}:</span>
              <span className="text-sm font-bold text-white">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Employee List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredEmployees.length === 0 ? (
          <motion.div {...fadeUp} className="glass-card p-12 text-center">
            <Building size={48} className="mx-auto text-surface-600 mb-4" />
            <p className="text-surface-400 text-lg font-medium">No hay empleados registrados</p>
            <p className="text-surface-500 text-sm mt-1">
              Contrate candidatos para verlos aqui
            </p>
          </motion.div>
        ) : (
          filteredEmployees.map((employee, i) => {
            const cfg = statusConfig[employee.status];
            const StatusIcon = cfg.icon;
            const trialDays = employee.status === 'trial' ? daysUntil(employee.trialEndDate) : null;

            return (
              <motion.div
                key={employee.id}
                custom={i}
                variants={listItem}
                initial="initial"
                animate="animate"
                exit="exit"
                className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
                onClick={() => onViewDossier(employee.id)}
              >
                {/* Avatar */}
                {employee.photoUrl ? (
                  <img
                    src={employee.photoUrl}
                    alt={employee.fullName}
                    className="w-12 h-12 rounded-xl object-cover border border-surface-600/30"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(employee.fullName)} flex items-center justify-center text-white font-bold text-sm`}>
                    {getInitials(employee.fullName)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{employee.fullName}</p>
                  <p className="text-surface-400 text-sm">
                    {JOB_POSITIONS[employee.position]?.name ?? employee.position} &mdash; {employee.area}
                  </p>
                </div>

                {/* Expedient number */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wide">Expediente</p>
                  <p className="text-sm font-bold text-surface-300">#{String(employee.expedientNumber).padStart(3, '0')}</p>
                </div>

                {/* Status badge */}
                <span className={`badge ${cfg.badge} shrink-0`}>
                  <StatusIcon size={12} />
                  {cfg.label}
                </span>

                {/* Trial countdown */}
                {trialDays !== null && (
                  <div className={`shrink-0 text-right ${trialDays <= 5 ? 'text-danger-500' : trialDays <= 10 ? 'text-warning-500' : 'text-primary-400'}`}>
                    <p className="text-[10px] uppercase tracking-wide opacity-70">Prueba</p>
                    <p className="text-sm font-bold">
                      {trialDays > 0 ? `${trialDays}d` : 'Vencido'}
                    </p>
                  </div>
                )}

                <ChevronRight size={18} className="text-surface-600 group-hover:text-surface-400 transition-colors shrink-0" />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 4 : Employee Dossier
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DossierViewProps {
  employeeId: string;
  onBack: () => void;
}

function DossierView({ employeeId, onBack }: DossierViewProps) {
  const { employees } = useStore();
  const employee = employees.find((e) => e.id === employeeId);
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'onboarding'>('info');

  if (!employee) {
    return (
      <div className="glass-card p-12 text-center">
        <XCircle size={48} className="mx-auto text-danger-500 mb-4" />
        <p className="text-surface-300 text-lg">Empleado no encontrado</p>
        <button className="btn-secondary mt-4" onClick={onBack}>Volver</button>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; badge: string }> = {
    trial: { label: 'Periodo de Prueba', badge: 'badge-yellow' },
    active: { label: 'Activo', badge: 'badge-green' },
    inactive: { label: 'Inactivo', badge: 'badge-red' },
  };

  const cfg = statusConfig[employee.status];
  const trialDays = employee.status === 'trial' ? daysUntil(employee.trialEndDate) : null;
  const { completed: docsCompleted, total: docsTotal } = countMandatoryDocs(employee.documents);
  const onboardingCompleted = employee.onboardingProgress.modules.filter((m) => m.completed).length;
  const onboardingTotal = employee.onboardingProgress.modules.length;

  const tabs = [
    { id: 'info' as const, label: 'Informacion', icon: User },
    { id: 'documents' as const, label: 'Documentos', icon: FileText },
    { id: 'onboarding' as const, label: 'Onboarding', icon: BadgeCheck },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5 shrink-0">
        <button
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-surface-400 hover:text-white transition-colors cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4 flex-1">
          {employee.photoUrl ? (
            <img
              src={employee.photoUrl}
              alt={employee.fullName}
              className="w-14 h-14 rounded-xl object-cover border border-surface-600/30"
            />
          ) : (
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarGradient(employee.fullName)} flex items-center justify-center text-white font-bold text-lg`}>
              {getInitials(employee.fullName)}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{employee.fullName}</h2>
            <p className="text-surface-400 text-sm">
              Expediente #{String(employee.expedientNumber).padStart(3, '0')} &mdash; {JOB_POSITIONS[employee.position]?.name ?? employee.position}
            </p>
          </div>
        </div>
        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
        {trialDays !== null && (
          <div className={`text-right ${trialDays <= 5 ? 'text-danger-500' : trialDays <= 10 ? 'text-warning-500' : 'text-primary-400'}`}>
            <p className="text-[10px] uppercase tracking-wide opacity-70">Dias restantes</p>
            <p className="text-xl font-bold">{trialDays > 0 ? trialDays : 'Vencido'}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-800/40 mb-5 shrink-0">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary-500/20 text-primary-400 shadow-sm'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/30'
              }`}
            >
              <TabIcon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          {activeTab === 'info' && (
            <motion.div key="info" {...fadeUp}>
              <DossierInfoTab employee={employee} />
            </motion.div>
          )}
          {activeTab === 'documents' && (
            <motion.div key="documents" {...fadeUp}>
              <DossierDocumentsTab employee={employee} docsCompleted={docsCompleted} docsTotal={docsTotal} />
            </motion.div>
          )}
          {activeTab === 'onboarding' && (
            <motion.div key="onboarding" {...fadeUp}>
              <DossierOnboardingTab employee={employee} completed={onboardingCompleted} total={onboardingTotal} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Dossier Info Tab ────────────────────────────────────────────────────────

function DossierInfoTab({ employee }: { employee: Employee }) {
  const contractLabel = employee.contractType === 'eventual' ? 'Eventual 21 dias prueba' : 'Indefinido';

  const fields = [
    { label: 'Fecha de ingreso', value: formatDate(employee.hireDate), icon: Calendar },
    { label: 'Sueldo semanal', value: `$${employee.salary.toLocaleString('es-MX')}`, icon: DollarSign },
    { label: 'Horario', value: employee.schedule, icon: Clock },
    { label: 'Tipo de contrato', value: contractLabel, icon: FileCheck },
    { label: 'Area asignada', value: employee.area, icon: Building },
    { label: 'Supervisor directo', value: employee.supervisor, icon: User },
    { label: 'Numero IMSS', value: employee.imssNumber || 'No registrado', icon: Hash },
    { label: 'Fin periodo de prueba', value: employee.trialEndDate ? formatDate(employee.trialEndDate) : 'N/A', icon: Clock },
  ];

  return (
    <div className="glass-card p-6 space-y-1">
      {fields.map((field, i) => {
        const FieldIcon = field.icon;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 py-3 ${
              i < fields.length - 1 ? 'border-b border-surface-700/20' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-surface-700/30 flex items-center justify-center shrink-0">
              <FieldIcon size={15} className="text-surface-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-surface-500 uppercase tracking-wide">{field.label}</p>
              <p className="text-sm text-surface-200 font-medium truncate">{field.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dossier Documents Tab ───────────────────────────────────────────────────

function DossierDocumentsTab({ employee, docsCompleted, docsTotal }: { employee: Employee; docsCompleted: number; docsTotal: number }) {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const progressPercent = docsTotal > 0 ? Math.round((docsCompleted / docsTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-surface-300 font-medium">Documentos obligatorios</span>
          <span className="text-sm font-bold text-primary-400">{docsCompleted}/{docsTotal}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-800/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent === 100
                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                : 'linear-gradient(90deg, #1b6cf5, #338dff)',
            }}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="glass-card p-4 space-y-2">
        {DOCUMENT_ITEMS.map((doc, i) => {
          const docData = employee.documents[doc.key];
          return (
            <div
              key={doc.key}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                docData.done ? 'bg-success-500/8' : 'bg-surface-800/30'
              }`}
            >
              {docData.done ? (
                <CheckCircle size={18} className="text-success-500 shrink-0" />
              ) : (
                <XCircle size={18} className="text-surface-600 shrink-0" />
              )}
              <span className={`flex-1 text-sm ${docData.done ? 'text-surface-300' : 'text-surface-500'}`}>
                {i + 1}. {doc.label}
              </span>
              {doc.mandatory && (
                <span className="text-[10px] text-danger-500 font-semibold uppercase">Req</span>
              )}
              {docData.photoUrl && (
                <button
                  className="w-9 h-9 rounded-lg overflow-hidden border border-surface-600/30 hover:border-primary-500/40 transition-colors cursor-pointer shrink-0"
                  onClick={() => setExpandedPhoto(docData.photoUrl!)}
                >
                  <img src={docData.photoUrl} alt="" className="w-full h-full object-cover" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded Photo Modal */}
      <AnimatePresence>
        {expandedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setExpandedPhoto(null)}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={expandedPhoto}
              alt="Documento"
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Dossier Onboarding Tab ──────────────────────────────────────────────────

function DossierOnboardingTab({ employee, completed, total }: { employee: Employee; completed: number; total: number }) {
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-surface-300 font-medium">Progreso de Onboarding</span>
          <span className="text-sm font-bold text-accent-400">{completed}/{total} modulos</span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-800/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent === 100
                ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                : 'linear-gradient(90deg, #b916d0, #d946ef)',
            }}
          />
        </div>
        {employee.onboardingProgress.completedDate && (
          <p className="text-xs text-success-500 mt-2 flex items-center gap-1.5">
            <CheckCircle size={12} />
            Completado el {formatDate(employee.onboardingProgress.completedDate)}
          </p>
        )}
      </div>

      {/* Module List */}
      <div className="glass-card p-4 space-y-2">
        {employee.onboardingProgress.modules.map((mod) => (
          <div
            key={mod.id}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              mod.completed ? 'bg-accent-500/8' : 'bg-surface-800/30'
            }`}
          >
            {mod.completed ? (
              <CheckCircle size={16} className="text-accent-400 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-surface-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${mod.completed ? 'text-surface-300' : 'text-surface-500'}`}>
                {mod.name}
              </p>
              <p className="text-[10px] text-surface-600">
                {mod.deliveredBy} &mdash; {mod.duration}
              </p>
            </div>
            {mod.requiresSignature && (
              <span className="text-[10px] text-surface-500 flex items-center gap-1">
                <FileCheck size={10} />
                Firma
              </span>
            )}
            {mod.quizScore !== undefined && (
              <span className="badge badge-blue text-[10px]">
                Quiz: {mod.quizScore}%
              </span>
            )}
            {mod.completedDate && (
              <span className="text-[10px] text-surface-500">
                {formatDate(mod.completedDate)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Final quiz score */}
      {employee.onboardingProgress.finalQuizScore !== undefined && (
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center">
            <BadgeCheck size={20} className="text-accent-400" />
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide">Quiz Final</p>
            <p className="text-lg font-bold text-white">{employee.onboardingProgress.finalQuizScore}%</p>
          </div>
          {employee.onboardingProgress.certificateGenerated && (
            <span className="badge badge-green ml-auto">Certificado Generado</span>
          )}
        </div>
      )}
    </div>
  );
}
