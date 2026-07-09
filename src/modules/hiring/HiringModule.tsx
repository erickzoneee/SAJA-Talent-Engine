import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  UserPlus,
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
  DocumentChecklist,
  ContractType,
  SignedDocKey,
} from '../../types';
import type { JobPosition } from '../../types';
import { JOB_POSITIONS, DEFAULT_SCHEDULES, DEFAULT_AREAS } from '../../types';
import { useStore } from '../../store/useStore';
import {
  generateId,
  formatDate,
  formatDateInput,
  compressImageFile,
  getInitials,
  toUpper,
  isValidRfc,
} from '../../utils/helpers';
import { getVerdictLabel, getVerdictColor } from '../../utils/scoring';
import { getDefaultOnboardingModules } from '../../utils/onboardingModules';
import { buildDocuments, createEmptySignedDocs, ONBOARDING_DOC_KEYS } from '../../utils/documentsV2';
import { escapeHtml, printHtmlDocument } from '../../utils/printDoc';
import type { DocTemplate } from '../../utils/documentsV2';
import { buildContractText, printContractText } from '../../utils/contractTemplate';
import { EXAM_OUTCOME_LABELS } from '../../utils/examBank';
import { pullNow } from '../../utils/cloudSync';

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
  | { view: 'dossier'; employeeId: string }
  // v2.5: alta directa de colaboradores que YA trabajan en la empresa
  // (informacion real, sin pasar por recepcion/examen/entrevista)
  | { view: 'direct-registration' };

// ── Main Component ──────────────────────────────────────────────────────────

export default function HiringModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'candidates' });

  // v2.4: sin AnimatePresence mode="wait" — el cambio de vista es inmediato y
  // solo se anima la entrada (una salida atorada dejaba la pantalla vacia).
  return (
    <div className="h-full flex flex-col overflow-hidden">
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
            onDirectRegister={() => setViewState({ view: 'direct-registration' })}
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
      {viewState.view === 'direct-registration' && (
        <motion.div key="direct-registration" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          <DirectRegistrationView
            onBack={() => setViewState({ view: 'employee-list' })}
            onComplete={() => setViewState({ view: 'employee-list' })}
          />
        </motion.div>
      )}
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
  const [filterVerdict, setFilterVerdict] = useState<'all' | 'recommended' | 'reservations' | 'not_recommended'>('all');

  const hirableCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (c.hired) return false;
      // v2.0: pasan los candidatos cuya entrevista termino en 'Agendar inicio de labores'.
      // 'No recomendable' tambien aparece, pero requiere autorizacion expresa de Direccion.
      const v2Pass = c.interviewV2?.decision === 'agendar_inicio';
      const v1Pass = !c.interviewV2 && (c.verdict === 'recommended' || c.verdict === 'reservations');
      if (!v2Pass && !v1Pass) return false;
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
          <option value="not_recommended">No recomendables (requieren autorizacion)</option>
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

              {/* Examen de admision (orientativo) */}
              {candidate.admissionExam && (
                <span
                  className={`badge ${EXAM_OUTCOME_LABELS[candidate.admissionExam.resultado].badge}`}
                  title="Examen de admision — orientativo, Direccion decide"
                >
                  Examen {candidate.admissionExam.aciertosTotales}/{candidate.admissionExam.totalPreguntas}
                </span>
              )}

              {/* Interview score */}
              {candidate.interviewScore !== undefined && (
                <div className="text-right">
                  <p className="text-xs text-surface-500">Entrevista</p>
                  <p className="text-lg font-bold text-primary-400">{candidate.interviewScore}<span className="text-xs text-surface-500">%</span></p>
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
  // v2.5: traer lo mas reciente de la nube al abrir, para que la validacion
  // de RFC duplicado vea contrataciones hechas en otros dispositivos
  useEffect(() => {
    void pullNow();
  }, []);

  const { candidates, employees, addEmployee, updateCandidate, getNextExpedientNumber, settings, updateSettings, authRole, addAlert } = useStore();
  const candidate = candidates.find((c) => c.id === candidateId);

  const scheduleOptions = settings.schedules?.length ? settings.schedules : DEFAULT_SCHEDULES;
  const areaOptions = settings.areas?.length ? settings.areas : DEFAULT_AREAS;

  const [documents, setDocuments] = useState<DocumentChecklist>(createEmptyDocuments);
  const [hireDate, setHireDate] = useState(formatDateInput(new Date()));
  // v2.4 Req 2: se captura el sueldo DIARIO y el semanal se calcula automatico
  const [dailySalary, setDailySalary] = useState('');
  const [schedule, setSchedule] = useState('');
  const [contractType, setContractType] = useState<ContractType>('eventual');
  const [area, setArea] = useState(() => {
    const sugerida = candidate ? JOB_POSITIONS[candidate.position]?.area ?? '' : '';
    // La sugerencia del puesto puede traer 2 areas ("Produccion / Acondicionamiento") —
    // se toma la primera que exista en el catalogo.
    const catalogo = (useStore.getState().settings.areas?.length ? useStore.getState().settings.areas! : DEFAULT_AREAS);
    return catalogo.find((a) => sugerida.toUpperCase().includes(a)) ?? '';
  });
  const [supervisor, setSupervisor] = useState(candidate ? JOB_POSITIONS[candidate.position]?.reportsTo ?? '' : '');
  const [imssNumber, setImssNumber] = useState('');
  const [rfc, setRfc] = useState(candidate?.rfc ?? '');
  const [reingreso, setReingreso] = useState(!!candidate?.reingreso);
  const [newArea, setNewArea] = useState('');
  const [showNewArea, setShowNewArea] = useState(false);
  const [newSchedule, setNewSchedule] = useState('');
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [supervisorOverride, setSupervisorOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  // v2.0: 'No recomendable' requiere autorizacion expresa de Direccion
  const isNotRecommended = candidate?.verdict === 'not_recommended';
  const isReservations = candidate?.verdict === 'reservations';
  const [authMotivo, setAuthMotivo] = useState('');
  const [authConfirmed, setAuthConfirmed] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { completed: mandatoryCompleted, total: mandatoryTotal } = useMemo(
    () => countMandatoryDocs(documents),
    [documents],
  );

  const allDocsCount = useMemo(() => {
    return DOCUMENT_ITEMS.filter((d) => documents[d.key].done).length;
  }, [documents]);

  // v2.4 Req 2: sueldo semanal = diario x 7 (incluye septimo dia pagado)
  const dailyNum = parseFloat(dailySalary) || 0;
  const weeklySalary = Math.round(dailyNum * 7 * 100) / 100;

  // v2.4 Req 8: RFC no puede estar ACTIVO ya en el sistema
  const rfcUpper = rfc.trim().toUpperCase();
  const rfcFormatOk = rfcUpper === '' || isValidRfc(rfcUpper);
  const rfcActiveEmployee = rfcUpper
    ? employees.find((e) => (e.rfc ?? '') === rfcUpper && e.status !== 'inactive')
    : undefined;
  const rfcExEmployee = !rfcActiveEmployee && rfcUpper
    ? employees.find((e) => (e.rfc ?? '') === rfcUpper && e.status === 'inactive')
    : undefined;
  const rfcOk = rfcFormatOk && !rfcActiveEmployee;
  const reingresoEfectivo = reingreso || !!rfcExEmployee;

  const allMandatoryDone = mandatoryCompleted === mandatoryTotal;
  const authOk = !isNotRecommended || (authConfirmed && authMotivo.trim() !== '');
  const canSubmit = (allMandatoryDone || supervisorOverride) && dailyNum > 0 && schedule && hireDate && rfcOk && authOk;

  const handleAddArea = () => {
    const a = toUpper(newArea);
    if (!a) return;
    if (!areaOptions.includes(a)) {
      updateSettings({ areas: [...areaOptions, a] });
    }
    setArea(a);
    setNewArea('');
    setShowNewArea(false);
  };

  const handleAddSchedule = () => {
    const s = toUpper(newSchedule);
    if (!s) return;
    if (!scheduleOptions.includes(s)) {
      updateSettings({ schedules: [...scheduleOptions, s] });
    }
    setSchedule(s);
    setNewSchedule('');
    setShowNewSchedule(false);
  };

  const handleDocToggle = useCallback((key: keyof DocumentChecklist) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], done: !prev[key].done },
    }));
  }, []);

  const handleDocPhoto = useCallback(async (key: keyof DocumentChecklist, file: File) => {
    // v2.5: comprimida — una foto cruda de camara congelaba la UI y podia
    // desbordar el almacenamiento local
    const base64 = await compressImageFile(file);
    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], photoUrl: base64, done: true },
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!candidate || !canSubmit || saving) return;
    setSaving(true);

    // v2.0: contrato de prueba de 15 dias (evaluaciones dia 15 y dia 30)
    const hireDateObj = new Date(hireDate);
    const trialEnd = new Date(hireDateObj);
    trialEnd.setDate(trialEnd.getDate() + (contractType === 'eventual' ? 15 : 30));
    const expedientNumber = getNextExpedientNumber();
    const employeeId = generateId();

    const newEmployee: Employee = {
      id: employeeId,
      candidateId: candidate.id,
      expedientNumber,
      fullName: toUpper(candidate.fullName),
      position: candidate.position,
      hireDate,
      salary: weeklySalary,
      dailySalary: dailyNum,
      schedule: toUpper(schedule),
      contractType,
      area: toUpper(area),
      supervisor: toUpper(supervisor),
      imssNumber: imssNumber.trim(),
      rfc: rfcUpper || undefined,
      reingreso: reingresoEfectivo || undefined,
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
      // v2.0
      signedDocsV2: createEmptySignedDocs(),
      seguimientoEspecial: isReservations ? true : undefined,
      contratacionAutorizada: isNotRecommended
        ? { por: `${settings.directorName} (Direccion)`, fecha: new Date().toISOString(), motivo: authMotivo.trim() }
        : undefined,
    };

    addEmployee(newEmployee);
    updateCandidate(candidate.id, { hired: true });

    // Candidato 'con reserva' contratado → seguimiento especial automatico (BRD regla 14)
    if (isReservations) {
      addAlert({
        tipo: 'seguimiento_especial',
        mensaje: `${candidate.fullName} fue contratado 'con reserva' — seguimiento especial activado automaticamente.`,
        empleadoId: employeeId,
        destinatarios: ['RH', 'Jefe directo', 'Direccion'],
      });
    }

    setTimeout(() => {
      setSaving(false);
      onComplete();
    }, 500);
  }, [candidate, canSubmit, saving, hireDate, weeklySalary, dailyNum, schedule, contractType, area, supervisor, imssNumber, rfcUpper, reingresoEfectivo, documents, addEmployee, updateCandidate, getNextExpedientNumber, onComplete, isReservations, isNotRecommended, authMotivo, settings.directorName, addAlert]);

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

            {/* v2.4 Req 2: sueldo diario capturado; semanal calculado automatico */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <DollarSign size={14} className="inline mr-1.5 -mt-0.5" />
                Sueldo diario *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="Ej: 315"
                value={dailySalary}
                onChange={(e) => setDailySalary(e.target.value)}
                min="0"
                step="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <DollarSign size={14} className="inline mr-1.5 -mt-0.5" />
                Sueldo semanal (calculado automatico: diario x 7)
              </label>
              <input
                type="text"
                className="input-field opacity-70 cursor-not-allowed"
                value={
                  dailyNum > 0
                    ? `$${weeklySalary.toLocaleString('es-MX', { minimumFractionDigits: 2 })} SEMANALES`
                    : 'CAPTURA EL SUELDO DIARIO'
                }
                readOnly
                tabIndex={-1}
              />
            </div>

            {/* v2.4 Req 3: horario asignado — 3 tipos de horario (catalogo editable) */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <Clock size={14} className="inline mr-1.5 -mt-0.5" />
                Horario asignado *
              </label>
              <select
                className="input-field"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              >
                <option value="">Seleccionar horario</option>
                {scheduleOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {!showNewSchedule ? (
                <button
                  type="button"
                  className="text-xs text-primary-400 hover:text-primary-300 mt-1.5 cursor-pointer"
                  onClick={() => setShowNewSchedule(true)}
                >
                  + Agregar otro tipo de horario
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="Ej: TURNO NOCTURNO · LUN-SAB 22:00 - 6:00"
                    value={newSchedule}
                    onChange={(e) => setNewSchedule(e.target.value)}
                  />
                  <button type="button" className="btn-primary text-xs px-3 py-1.5" onClick={handleAddSchedule}>
                    Agregar
                  </button>
                  <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => setShowNewSchedule(false)}>
                    X
                  </button>
                </div>
              )}
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
                <option value="eventual">Contrato de prueba — 15 dias</option>
                <option value="indefinido">Indefinido</option>
              </select>
            </div>

            {/* v2.4 Req 3: area asignada con opciones + agregar nuevas */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <Building size={14} className="inline mr-1.5 -mt-0.5" />
                Area asignada
              </label>
              <select
                className="input-field"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="">Seleccionar area</option>
                {areaOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              {!showNewArea ? (
                <button
                  type="button"
                  className="text-xs text-primary-400 hover:text-primary-300 mt-1.5 cursor-pointer"
                  onClick={() => setShowNewArea(true)}
                >
                  + Agregar nueva area
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="Nombre de la nueva area"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                  />
                  <button type="button" className="btn-primary text-xs px-3 py-1.5" onClick={handleAddArea}>
                    Agregar
                  </button>
                  <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => setShowNewArea(false)}>
                    X
                  </button>
                </div>
              )}
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
              <p className="text-xs text-surface-500 mt-1.5 flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0 text-primary-400" />
                Alta en IMSS: al terminar el dia 30 si el colaborador pasa el periodo de prueba.
                Excepcion: si el puesto implica operar maquinaria
                {candidate.position === 'AM' ? ' (como este puesto de Mantenimiento)' : ''}, el alta es
                desde el primer dia.
              </p>
            </div>

            {/* v2.4 Req 8: RFC validado contra el sistema */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <Hash size={14} className="inline mr-1.5 -mt-0.5" />
                RFC (con homoclave)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. BUMD830914JK0"
                maxLength={13}
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
              />
              {!rfcFormatOk && (
                <p className="text-xs text-danger-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Formato de RFC invalido (12-13 caracteres del SAT).
                </p>
              )}
              {rfcActiveEmployee && (
                <p className="text-xs text-danger-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Este RFC ya esta ACTIVO en el sistema: {rfcActiveEmployee.fullName} (expediente #
                  {String(rfcActiveEmployee.expedientNumber).padStart(3, '0')}). No se puede contratar dos veces.
                </p>
              )}
              {rfcExEmployee && (
                <p className="text-xs text-warning-500 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} />
                  RFC de ex-colaborador ({rfcExEmployee.fullName}) — se marcara como REINGRESO.
                </p>
              )}
            </div>

            {/* v2.4 Req 2: reingreso */}
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                <User size={14} className="inline mr-1.5 -mt-0.5" />
                ¿Es reingreso?
              </label>
              <div className="flex gap-2">
                {[{ v: false, t: 'NO' }, { v: true, t: 'SI, ES REINGRESO' }].map((opt) => (
                  <button
                    key={opt.t}
                    type="button"
                    onClick={() => setReingreso(opt.v)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                      reingresoEfectivo === opt.v
                        ? opt.v
                          ? 'bg-warning-500/20 border-warning-500/60 text-warning-500'
                          : 'bg-primary-500/20 border-primary-500/60 text-primary-300'
                        : 'bg-surface-900/40 border-surface-700 text-surface-400 hover:border-surface-500'
                    }`}
                  >
                    {opt.t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calculated trial info */}
          {hireDate && contractType === 'eventual' && (
            <div className="mt-4 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3">
              <Info size={16} className="text-primary-400 shrink-0" />
              <p className="text-primary-300 text-sm">
                Contrato de prueba: {formatDate(hireDate)} al{' '}
                {formatDate(new Date(new Date(hireDate).getTime() + 15 * 24 * 60 * 60 * 1000))} (15
                dias). Evaluaciones obligatorias en dia 15 y dia 30. Alerta automatica 5 dias antes de
                vencer.
              </p>
            </div>
          )}
        </motion.section>

        {/* v2.0: Avisos por veredicto de entrevista */}
        {isReservations && (
          <motion.section {...fadeUp} className="glass-card p-5 border border-warning-500/40 bg-warning-500/5">
            <div className="flex items-start gap-3">
              <Eye size={20} className="text-warning-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-warning-500 font-semibold text-sm">Candidato 'Con reserva'</p>
                <p className="text-surface-400 text-xs mt-1">
                  Al completar la contratacion, el sistema activara el seguimiento especial automatico
                  y notificara a RH, jefe directo y Direccion.
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {isNotRecommended && (
          <motion.section {...fadeUp} className="glass-card p-5 border-2 border-danger-500/50 bg-danger-500/5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-danger-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-danger-400 font-semibold text-sm">
                  Candidato 'No recomendable' — requiere autorizacion expresa de Direccion
                </p>
                <p className="text-surface-400 text-xs mt-1">
                  El diagnostico de la entrevista fue NO RECOMENDABLE
                  {candidate.interviewV2 && candidate.interviewV2.alertas.length > 0
                    ? ` (alertas: ${candidate.interviewV2.alertas.join(', ')})`
                    : ''}
                  . No puede contratarse sin autorizacion expresa. La autorizacion queda registrada con
                  usuario, fecha, hora y motivo.
                </p>
              </div>
            </div>
            {authRole === 'direction' ? (
              <>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Motivo de la autorizacion *</label>
                  <textarea
                    className="input-field min-h-[60px] resize-y"
                    placeholder="Por que Direccion autoriza esta contratacion a pesar del diagnostico"
                    value={authMotivo}
                    onChange={(e) => setAuthMotivo(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={authConfirmed}
                    onChange={(e) => setAuthConfirmed(e.target.checked)}
                    className="w-5 h-5 rounded border-surface-600 bg-surface-800 text-danger-500 focus:ring-danger-500/30 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm text-surface-300 group-hover:text-white transition-colors">
                    Yo, {settings.directorName} (Direccion), autorizo expresamente esta contratacion.
                  </span>
                </label>
              </>
            ) : (
              <p className="text-xs text-danger-400 font-medium">
                Inicia sesion con el PIN de Direccion para autorizar esta contratacion.
              </p>
            )}
          </motion.section>
        )}

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
              {dailyNum <= 0 ? 'Ingrese el sueldo diario. ' : ''}
              {!schedule ? 'Seleccione el horario asignado. ' : ''}
              {!hireDate ? 'Seleccione la fecha de ingreso. ' : ''}
              {!rfcFormatOk ? 'El RFC no tiene formato valido. ' : ''}
              {rfcActiveEmployee ? 'El RFC ya esta activo en el sistema. ' : ''}
              {!allMandatoryDone && !supervisorOverride ? 'Complete los documentos obligatorios o active la omision de supervisor. ' : ''}
              {!authOk ? 'Se requiere autorizacion expresa de Direccion (motivo + confirmacion).' : ''}
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
// v2.5 — REGISTRO DIRECTO DE COLABORADORES EXISTENTES
// Para capturar con informacion real a quienes YA trabajan en la empresa:
// no pasan por recepcion/examen/entrevista y la fecha de ingreso es la real
// (puede ser de hace meses o anos). Si ya paso el periodo de prueba de 30
// dias, el expediente se crea directamente como ACTIVO.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DirectRegistrationViewProps {
  onBack: () => void;
  onComplete: () => void;
}

function DirectRegistrationView({ onBack, onComplete }: DirectRegistrationViewProps) {
  const { employees, settings, addEmployee, getNextExpedientNumber, updateSettings } = useStore();
  const [saving, setSaving] = useState(false);

  // Datos frescos de la nube antes de validar RFC duplicado
  useEffect(() => {
    void pullNow();
  }, []);

  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState<JobPosition | ''>('');
  const [hireDate, setHireDate] = useState('');
  const [dailySalary, setDailySalary] = useState('');
  const [schedule, setSchedule] = useState('');
  const [contractType, setContractType] = useState<ContractType>('indefinido');
  const [area, setArea] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [imssNumber, setImssNumber] = useState('');
  const [rfc, setRfc] = useState('');
  const [newArea, setNewArea] = useState('');
  const [showNewArea, setShowNewArea] = useState(false);
  const [newSchedule, setNewSchedule] = useState('');
  const [showNewSchedule, setShowNewSchedule] = useState(false);

  const scheduleOptions = settings.schedules?.length ? settings.schedules : DEFAULT_SCHEDULES;
  const areaOptions = settings.areas?.length ? settings.areas : DEFAULT_AREAS;

  const dailyNum = parseFloat(dailySalary) || 0;
  const weeklySalary = Math.round(dailyNum * 7 * 100) / 100;

  // Mismas validaciones de RFC que la contratacion normal
  const rfcUpper = rfc.trim().toUpperCase();
  const rfcFormatOk = rfcUpper === '' || isValidRfc(rfcUpper);
  const rfcActiveEmployee = rfcUpper
    ? employees.find((e) => (e.rfc ?? '') === rfcUpper && e.status !== 'inactive')
    : undefined;
  const rfcOk = rfcFormatOk && !rfcActiveEmployee;

  // Colaborador existente: si su ingreso real fue hace mas de 30 dias, entra
  // directo como ACTIVO (ya paso el periodo de prueba en la vida real)
  const [today] = useState(() => Date.now());
  const hireDateObj = hireDate ? new Date(`${hireDate}T12:00:00`) : null;
  const daysSinceHire = hireDateObj ? Math.floor((today - hireDateObj.getTime()) / 86400000) : 0;
  const willBeActive = daysSinceHire > 30;

  const canSubmit =
    fullName.trim() !== '' && position !== '' && hireDate !== '' && dailyNum > 0 && schedule !== '' && rfcOk;

  const handleAddArea = () => {
    const a = toUpper(newArea);
    if (!a) return;
    if (!areaOptions.includes(a)) updateSettings({ areas: [...areaOptions, a] });
    setArea(a);
    setNewArea('');
    setShowNewArea(false);
  };

  const handleAddSchedule = () => {
    const s = toUpper(newSchedule);
    if (!s) return;
    if (!scheduleOptions.includes(s)) updateSettings({ schedules: [...scheduleOptions, s] });
    setSchedule(s);
    setNewSchedule('');
    setShowNewSchedule(false);
  };

  const handleSubmit = () => {
    if (!canSubmit || saving || !hireDateObj) return;
    setSaving(true);

    const trialEnd = new Date(hireDateObj);
    trialEnd.setDate(trialEnd.getDate() + 30);

    const newEmployee: Employee = {
      id: generateId(),
      candidateId: '', // sin proceso de reclutamiento: es un colaborador existente
      expedientNumber: getNextExpedientNumber(),
      fullName: toUpper(fullName),
      position: position as JobPosition,
      hireDate,
      salary: weeklySalary,
      dailySalary: dailyNum,
      schedule: toUpper(schedule),
      contractType,
      area: toUpper(area),
      supervisor: toUpper(supervisor || (position ? JOB_POSITIONS[position as JobPosition]?.reportsTo ?? '' : '')),
      imssNumber: imssNumber.trim(),
      rfc: rfcUpper || undefined,
      bankDetails: '',
      status: willBeActive ? 'active' : 'trial',
      documents: createEmptyDocuments(),
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
      createdAt: new Date().toISOString(),
      signedDocsV2: createEmptySignedDocs(),
    };

    addEmployee(newEmployee);
    setTimeout(() => {
      setSaving(false);
      onComplete();
    }, 400);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <button
          className="w-10 h-10 rounded-xl glass flex items-center justify-center text-surface-400 hover:text-white transition-colors cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-primary-500/20 flex items-center justify-center">
              <UserPlus size={22} className="text-accent-400" />
            </div>
            Registrar Colaborador Existente
          </h2>
          <p className="text-surface-400 text-sm mt-1">
            Personal que YA trabaja en la empresa: entra directo al expediente con su fecha de ingreso
            real, sin pasar por recepcion, examen ni entrevista.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-2xl space-y-5">
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-base font-semibold text-white">Datos del colaborador</h3>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Nombre completo *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Nombre y apellidos"
                value={fullName}
                onChange={(e) => setFullName(e.target.value.toUpperCase())}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Puesto *</label>
                <select
                  className="input-field"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as JobPosition | '')}
                >
                  <option value="">Seleccionar puesto</option>
                  {Object.entries(JOB_POSITIONS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Fecha de ingreso REAL *</label>
                <input
                  type="date"
                  className="input-field"
                  value={hireDate}
                  max={formatDateInput(new Date())}
                  onChange={(e) => setHireDate(e.target.value)}
                />
                {hireDate && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${willBeActive ? 'text-success-500' : 'text-warning-500'}`}>
                    <Info size={12} />
                    {willBeActive
                      ? `Ingreso hace ${daysSinceHire} dias — se registrara como ACTIVO (ya paso el periodo de prueba).`
                      : 'Ingreso reciente — se registrara en periodo de prueba.'}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Sueldo diario *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Ej: 315"
                  min="0"
                  value={dailySalary}
                  onChange={(e) => setDailySalary(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">
                  Sueldo semanal (diario x 7)
                </label>
                <input
                  type="text"
                  className="input-field opacity-70"
                  disabled
                  value={dailyNum > 0 ? `$${weeklySalary.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'CAPTURA EL SUELDO DIARIO'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Horario asignado *</label>
              <select className="input-field" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
                <option value="">Seleccionar horario</option>
                {scheduleOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {!showNewSchedule ? (
                <button className="text-xs text-primary-400 mt-1" onClick={() => setShowNewSchedule(true)}>
                  + Agregar otro tipo de horario
                </button>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    placeholder="Nuevo horario"
                    value={newSchedule}
                    onChange={(e) => setNewSchedule(e.target.value)}
                  />
                  <button className="btn-secondary text-xs px-3" onClick={handleAddSchedule}>
                    Agregar
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Tipo de contrato</label>
                <select
                  className="input-field"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as ContractType)}
                >
                  <option value="indefinido">Indefinido</option>
                  <option value="eventual">Contrato de prueba — 15 dias</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Area asignada</label>
                <select className="input-field" value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">Seleccionar area</option>
                  {areaOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                {!showNewArea ? (
                  <button className="text-xs text-primary-400 mt-1" onClick={() => setShowNewArea(true)}>
                    + Agregar nueva area
                  </button>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="Nueva area"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                    />
                    <button className="btn-secondary text-xs px-3" onClick={handleAddArea}>
                      Agregar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Supervisor directo</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nombre del supervisor"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Numero IMSS</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Numero de seguro social"
                  value={imssNumber}
                  onChange={(e) => setImssNumber(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">RFC (con homoclave)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. BUMD830914JK0"
                maxLength={13}
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
              />
              {!rfcFormatOk && (
                <p className="text-xs text-danger-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Formato de RFC invalido (12-13 caracteres del SAT).
                </p>
              )}
              {rfcActiveEmployee && (
                <p className="text-xs text-danger-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Este RFC ya esta ACTIVO en el sistema: {rfcActiveEmployee.fullName} (expediente #
                  {String(rfcActiveEmployee.expedientNumber).padStart(3, '0')}). No se puede registrar dos veces.
                </p>
              )}
            </div>
          </div>

          <div className="glass-card p-4 border-l-4 border-l-primary-500">
            <p className="text-xs text-surface-400 leading-relaxed">
              El expediente se crea con el checklist de documentos y los documentos para firma vacios:
              RH puede irlos completando despues (subir INE, contrato firmado, etc.). El onboarding queda
              disponible por si se desea aplicar, pero no bloquea nada para colaboradores existentes.
            </p>
          </div>

          <button
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
          >
            <BadgeCheck size={18} />
            {saving ? 'Guardando...' : 'Registrar Colaborador'}
          </button>
          {!canSubmit && !saving && (
            <p className="text-surface-500 text-xs text-center">
              {fullName.trim() === '' ? 'Escribe el nombre completo. ' : ''}
              {position === '' ? 'Selecciona el puesto. ' : ''}
              {!hireDate ? 'Selecciona la fecha de ingreso real. ' : ''}
              {dailyNum <= 0 ? 'Captura el sueldo diario. ' : ''}
              {schedule === '' ? 'Selecciona el horario. ' : ''}
              {!rfcFormatOk ? 'El RFC no tiene formato valido. ' : ''}
              {rfcActiveEmployee ? 'El RFC ya esta activo en el sistema. ' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmployeeListViewProps {
  onBack: () => void;
  onViewDossier: (employeeId: string) => void;
  onDirectRegister: () => void;
}

function EmployeeListView({ onBack, onViewDossier, onDirectRegister }: EmployeeListViewProps) {
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
        {/* v2.5: alta directa de colaboradores que ya trabajan aqui */}
        <button className="btn-primary flex items-center gap-2" onClick={onDirectRegister}>
          <UserPlus size={16} />
          Registrar colaborador existente
        </button>
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

      {/* Tab Content — v2.4: cambio inmediato, solo animacion de entrada */}
      <div className="flex-1 overflow-y-auto pr-1">
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
      </div>
    </div>
  );
}

// ── Dossier Info Tab ────────────────────────────────────────────────────────

function DossierInfoTab({ employee }: { employee: Employee }) {
  const contractLabel = employee.contractType === 'eventual' ? 'Contrato de prueba 15 dias' : 'Indefinido';

  const fields = [
    { label: 'Fecha de ingreso', value: formatDate(employee.hireDate), icon: Calendar },
    {
      label: 'Sueldo diario',
      value: employee.dailySalary
        ? `$${employee.dailySalary.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        : 'No registrado',
      icon: DollarSign,
    },
    { label: 'Sueldo semanal (diario x 7)', value: `$${employee.salary.toLocaleString('es-MX')}`, icon: DollarSign },
    { label: 'Horario', value: employee.schedule, icon: Clock },
    { label: 'Tipo de contrato', value: contractLabel, icon: FileCheck },
    { label: 'Area asignada', value: employee.area, icon: Building },
    { label: 'Supervisor directo', value: employee.supervisor, icon: User },
    { label: 'Numero IMSS', value: employee.imssNumber || 'No registrado', icon: Hash },
    { label: 'RFC', value: employee.rfc || 'No registrado', icon: Hash },
    { label: 'Reingreso', value: employee.reingreso ? 'SI — YA TRABAJO AQUI ANTES' : 'NO', icon: User },
    { label: 'Fin periodo de prueba', value: employee.trialEndDate ? formatDate(employee.trialEndDate) : 'N/A', icon: Clock },
  ];

  return (
    <div className="space-y-4">
      {/* v2.0: avisos del expediente */}
      {employee.seguimientoEspecial && (
        <div className="glass-card p-4 border border-warning-500/40 bg-warning-500/5 flex items-start gap-3">
          <Eye size={18} className="text-warning-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-warning-500 text-sm font-semibold">Seguimiento especial activo</p>
            <p className="text-surface-400 text-xs mt-0.5">
              Contratado 'con reserva' — el sistema activo seguimiento especial automatico.
            </p>
          </div>
        </div>
      )}
      {employee.contratacionAutorizada && (
        <div className="glass-card p-4 border border-danger-500/40 bg-danger-500/5 flex items-start gap-3">
          <Shield size={18} className="text-danger-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-danger-400 text-sm font-semibold">Contratacion con autorizacion expresa</p>
            <p className="text-surface-400 text-xs mt-0.5">
              Autorizada por {employee.contratacionAutorizada.por} el{' '}
              {formatDate(employee.contratacionAutorizada.fecha)}. Motivo:{' '}
              {employee.contratacionAutorizada.motivo}
            </p>
          </div>
        </div>
      )}

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
    </div>
  );
}

// ── Dossier editable document row (v2.7) ────────────────────────────────────
// Fila del checklist de documentos obligatorios dentro del expediente: permite
// marcar/desmarcar, tomar foto o subir archivo, y ampliar la miniatura. Cada
// fila necesita sus propios refs de input, por eso es un sub-componente.

interface DossierDocRowProps {
  doc: DocumentItem;
  index: number;
  data: { done: boolean; photoUrl?: string };
  onToggle: () => void;
  onPhoto: (file: File) => void;
  onExpand: (url: string) => void;
}

function DossierDocRow({ doc, index, data, onToggle, onPhoto, onExpand }: DossierDocRowProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPhoto(file);
    e.target.value = '';
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
        data.done
          ? 'bg-success-500/8 border border-success-500/15'
          : 'bg-surface-800/30 border border-transparent hover:border-surface-700/30'
      }`}
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 cursor-pointer"
        title={data.done ? 'Marcar como pendiente' : 'Marcar como entregado'}
      >
        {data.done ? (
          <CheckCircle size={20} className="text-success-500" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-surface-600 hover:border-primary-400 transition-colors" />
        )}
      </button>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${data.done ? 'text-surface-300' : 'text-surface-400'}`}>
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

      {/* Photo thumbnail (ampliable) */}
      {data.photoUrl && (
        <button
          type="button"
          className="w-10 h-10 rounded-lg overflow-hidden border border-surface-600/30 hover:border-primary-500/40 transition-colors cursor-pointer shrink-0"
          onClick={() => onExpand(data.photoUrl!)}
          title="Ver documento"
        >
          <img src={data.photoUrl} alt="" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Camera */}
      <button
        type="button"
        className="w-8 h-8 rounded-lg bg-surface-700/40 hover:bg-primary-500/20 flex items-center justify-center text-surface-400 hover:text-primary-400 transition-all cursor-pointer shrink-0"
        onClick={() => cameraRef.current?.click()}
        title="Tomar foto"
      >
        <Camera size={15} />
      </button>

      {/* Upload */}
      <button
        type="button"
        className="w-8 h-8 rounded-lg bg-surface-700/40 hover:bg-accent-500/20 flex items-center justify-center text-surface-400 hover:text-accent-400 transition-all cursor-pointer shrink-0"
        onClick={() => uploadRef.current?.click()}
        title="Subir archivo"
      >
        <Upload size={15} />
      </button>

      {/* Hidden inputs */}
      <input ref={uploadRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
    </div>
  );
}

// ── Dossier Documents Tab ───────────────────────────────────────────────────

function DossierDocumentsTab({ employee, docsCompleted, docsTotal }: { employee: Employee; docsCompleted: number; docsTotal: number }) {
  const { updateEmployeeDocument } = useStore();
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const progressPercent = docsTotal > 0 ? Math.round((docsCompleted / docsTotal) * 100) : 0;

  // v2.7: el checklist de documentos obligatorios ahora es EDITABLE desde el
  // expediente. Antes era solo-lectura y a los colaboradores registrados de
  // forma directa (que nacen con el checklist vacio) no habia forma de
  // completarles los documentos. RH puede marcar/desmarcar y subir/tomar foto.
  // El merge por-documento se hace en el store (updateEmployeeDocument) para no
  // pisar otras ediciones hechas mientras una foto se comprime (async).
  const handleToggle = (key: keyof DocumentChecklist) => {
    // se lee el estado fresco (no el snapshot del render) por si hubo un cambio
    // reciente aun no reflejado en la prop employee
    const cur = useStore.getState().employees.find((e) => e.id === employee.id) ?? employee;
    updateEmployeeDocument(employee.id, key, { done: !cur.documents[key].done });
  };

  const handlePhoto = async (key: keyof DocumentChecklist, file: File) => {
    // comprimida (mismo criterio que la contratacion) para no congelar la UI
    // ni desbordar el almacenamiento local con una foto cruda de camara
    const base64 = await compressImageFile(file);
    updateEmployeeDocument(employee.id, key, { photoUrl: base64, done: true });
  };

  return (
    <div className="space-y-4">
      {/* v2.0: 5 documentos fisicos para firma */}
      <SignedDocsSection employee={employee} />

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

      {/* Document List — v2.7: editable (marcar / subir foto de cada documento) */}
      <div className="glass-card p-4 space-y-2">
        <p className="text-xs text-surface-500 mb-1 flex items-start gap-1.5">
          <Info size={13} className="mt-0.5 shrink-0 text-primary-400" />
          Marca cada documento entregado y sube o toma una foto del original. RH puede completar estos
          documentos en cualquier momento, incluso para colaboradores registrados directamente.
        </p>
        {DOCUMENT_ITEMS.map((doc, i) => (
          <DossierDocRow
            key={doc.key}
            doc={doc}
            index={i}
            data={employee.documents[doc.key]}
            onToggle={() => handleToggle(doc.key)}
            onPhoto={(file) => handlePhoto(doc.key, file)}
            onExpand={(url) => setExpandedPhoto(url)}
          />
        ))}
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — 5 DOCUMENTOS FISICOS CON FIRMA (BRD seccion 6)
// Generar con variables → imprimir → RH explica en voz alta → firma →
// RH sube el escaneado al expediente digital.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function printDocumentV2(doc: DocTemplate, companyName: string) {
  // Impresion via iframe oculto: funciona aunque el navegador bloquee popups.
  // Todo el texto libre (nombres, domicilios, horarios) va escapado para que
  // un "<" o "&" capturado no corte el texto del documento impreso.
  const parrafosHtml = doc.parrafos
    .map((p) =>
      p === 'A T E N T A M E N T E'
        ? `<p class="centrado">${escapeHtml(p)}</p>`
        : `<p>${escapeHtml(p)}</p>`,
    )
    .join('');
  printHtmlDocument(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.titulo)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; margin: 56px; color: #111; }
    .empresa { text-align: center; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #444; }
    h1 { font-size: 19px; text-align: center; text-transform: uppercase; margin: 8px 0 4px; }
    .meta { text-align: center; font-size: 11px; color: #666; margin-bottom: 28px; }
    p { font-size: 13px; line-height: 1.75; text-align: justify; margin: 10px 0; }
    .centrado { text-align: center; letter-spacing: 2px; margin: 28px 0; }
    .firmas { display: flex; justify-content: space-between; gap: 60px; margin-top: 100px; }
    .firma { flex: 1; text-align: center; font-size: 12px; border-top: 1px solid #111; padding-top: 8px; }
  </style></head><body>
    <div class="empresa">${escapeHtml(companyName)}</div>
    <h1>${escapeHtml(doc.titulo)}</h1>
    <div class="meta">${escapeHtml(doc.cuando)} · ${escapeHtml(doc.tantos)}</div>
    ${parrafosHtml}
    <div class="firmas">
      <div class="firma">${escapeHtml(doc.firmaIzquierda)}<br/>Nombre y firma</div>
      <div class="firma">${escapeHtml(doc.firmaDerecha)}<br/>Nombre y firma</div>
    </div>
  </body></html>`);
}

function SignedDocsSection({ employee }: { employee: Employee }) {
  const { settings, updateEmployee } = useStore();
  const [previewDoc, setPreviewDoc] = useState<DocTemplate | null>(null);
  // v2.4 Req 6: contrato individual autollenado con los datos capturados y EDITABLE
  const [contractOpen, setContractOpen] = useState(false);
  const [contractDraft, setContractDraft] = useState('');
  const [contractSaved, setContractSaved] = useState(false);
  const scanRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const docs = useMemo(() => buildDocuments(employee, settings), [employee, settings]);
  // Se mezcla con el vacio para que expedientes guardados antes de agregar la
  // renuncia voluntaria (solo 5 llaves) no truenen al leer la nueva llave
  const status = { ...createEmptySignedDocs(), ...(employee.signedDocsV2 ?? {}) };

  const setDocStatus = (key: SignedDocKey, partial: Partial<(typeof status)[SignedDocKey]>) => {
    updateEmployee(employee.id, {
      signedDocsV2: {
        ...status,
        [key]: { ...status[key], ...partial },
      },
    });
  };

  const handleGenerate = (doc: DocTemplate) => {
    if (!status[doc.key].generado) {
      setDocStatus(doc.key, { generado: true, fechaGenerado: new Date().toISOString() });
    }
    if (doc.key === 'contrato') {
      // Autollenado con la informacion capturada; si RH ya lo edito, se respeta su version
      setContractDraft(employee.contractText ?? buildContractText(employee, settings));
      setContractSaved(false);
      setContractOpen(true);
      return;
    }
    setPreviewDoc(doc);
  };

  const handleContractSave = () => {
    updateEmployee(employee.id, { contractText: contractDraft });
    setContractSaved(true);
    setTimeout(() => setContractSaved(false), 2000);
  };

  const handleContractRegenerate = () => {
    const fresh = buildContractText(employee, settings);
    setContractDraft(fresh);
    updateEmployee(employee.id, { contractText: fresh });
  };

  const handleScanUpload = async (key: SignedDocKey, file: File) => {
    // v2.5: comprimido — los escaneos crudos de camara congelaban la UI y
    // podian desbordar el almacenamiento local
    const base64 = await compressImageFile(file);
    setDocStatus(key, { firmadoUrl: base64, fechaFirmado: new Date().toISOString() });
  };

  const signedCount = ONBOARDING_DOC_KEYS.filter((k) => status[k].firmadoUrl).length;
  const onboardingDocs = docs.filter((d) => d.key !== 'renunciaVoluntaria');
  const exitDocs = docs.filter((d) => d.key === 'renunciaVoluntaria');

  const renderDocRow = (doc: DocTemplate, prefijo: string) => {
    const st = status[doc.key];
    return (
      <div
        key={doc.key}
        className="p-4 rounded-xl bg-surface-800/30 border border-white/[0.04] space-y-3"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {st.firmadoUrl ? (
            <CheckCircle size={20} className="text-success-500 shrink-0" />
          ) : st.generado ? (
            <Clock size={20} className="text-warning-500 shrink-0" />
          ) : (
            <XCircle size={20} className="text-surface-600 shrink-0" />
          )}
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm font-semibold text-surface-100 leading-snug">
              {prefijo}
              {doc.titulo}
            </p>
            <p className="text-xs text-surface-400 mt-1 leading-relaxed">{doc.descripcion}</p>
            <p className="text-[11px] text-surface-500 mt-1.5">
              {doc.cuando} · {doc.tantos}
              {st.fechaGenerado && ` · generado ${formatDate(st.fechaGenerado)}`}
              {st.fechaFirmado && ` · firmado subido ${formatDate(st.fechaFirmado)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              onClick={() => handleGenerate(doc)}
            >
              <Eye size={14} />
              {st.generado ? 'Ver / Imprimir' : 'Generar'}
            </button>
            <button
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
              onClick={() => scanRefs.current[doc.key]?.click()}
              title="Subir documento firmado escaneado"
            >
              <Upload size={14} />
              {st.firmadoUrl ? 'Reemplazar' : 'Subir firmado'}
            </button>
            <input
              ref={(el) => {
                scanRefs.current[doc.key] = el;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleScanUpload(doc.key, f);
              }}
            />
          </div>
        </div>
        {st.firmadoUrl && (
          <img
            src={st.firmadoUrl}
            alt={`${doc.titulo} firmado`}
            className="h-16 rounded-lg border border-surface-600/30 object-cover"
          />
        )}
      </div>
    );
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <FileText size={18} className="text-accent-400" />
          Documentos para Firma (v2.0)
        </h3>
        <span className={`badge ${signedCount === ONBOARDING_DOC_KEYS.length ? 'badge-green' : 'badge-blue'}`}>
          {signedCount}/{ONBOARDING_DOC_KEYS.length} firmados
        </span>
      </div>
      <p className="text-xs text-surface-500 mb-4 leading-relaxed">
        Regla de oro: el colaborador firma SOLO estos 5 documentos fisicos durante su ingreso. Todo lo
        demas se cubre con video + confirmacion digital. RH imprime, explica cada documento en voz alta,
        recaba la firma y sube el escaneado. La renuncia voluntaria se imprime unicamente al momento de
        la baja.
      </p>

      <div className="space-y-3">
        {onboardingDocs.map((doc, i) => renderDocRow(doc, `${i + 1}. `))}
      </div>

      {exitDocs.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-2">
            Documento de baja (no cuenta para el onboarding)
          </p>
          <div className="space-y-3">{exitDocs.map((doc) => renderDocRow(doc, ''))}</div>
        </div>
      )}

      {/* Modal de vista del documento */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{previewDoc.titulo}</h3>
                  <p className="text-xs text-surface-500">
                    {previewDoc.cuando} · {previewDoc.tantos} · autollenado con variables del expediente
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-primary text-sm flex items-center gap-2"
                    onClick={() => printDocumentV2(previewDoc, settings.companyName)}
                  >
                    <FileCheck size={15} />
                    Imprimir
                  </button>
                  <button className="btn-secondary text-sm" onClick={() => setPreviewDoc(null)}>
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-white/[0.02]">
                <div className="bg-surface-50 text-surface-900 rounded-xl p-8 font-serif">
                  <p className="text-center text-[10px] uppercase tracking-widest text-surface-500 mb-1">
                    {settings.companyName}
                  </p>
                  <h4 className="text-center font-bold uppercase text-base mb-6">{previewDoc.titulo}</h4>
                  {previewDoc.parrafos.map((p, idx) => (
                    <p
                      key={idx}
                      className={`text-[13px] leading-relaxed mb-3 ${
                        p === 'A T E N T A M E N T E' ? 'text-center tracking-widest my-6' : 'text-justify'
                      }`}
                    >
                      {p}
                    </p>
                  ))}
                  <div className="flex gap-10 mt-16">
                    <div className="flex-1 text-center border-t border-surface-900 pt-2 text-xs">
                      {previewDoc.firmaIzquierda}
                      <br />
                      Nombre y firma
                    </div>
                    <div className="flex-1 text-center border-t border-surface-900 pt-2 text-xs">
                      {previewDoc.firmaDerecha}
                      <br />
                      Nombre y firma
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v2.4 Req 6: contrato individual — autollenado con los datos capturados y editable */}
      <AnimatePresence>
        {contractOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setContractOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-4xl h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/[0.06] flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <h3 className="text-lg font-bold text-white">Contrato Individual de Trabajo</h3>
                  <p className="text-xs text-surface-500">
                    Autollenado con la informacion capturada del expediente · el texto es editable —
                    escribe directamente sobre el para modificarlo antes de imprimir.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                    onClick={handleContractRegenerate}
                    title="Vuelve a llenar el contrato con los datos actuales del expediente (descarta ediciones)"
                  >
                    <FileText size={14} />
                    Regenerar con datos del expediente
                  </button>
                  <button
                    className="btn-success text-xs px-3 py-2 flex items-center gap-1.5"
                    onClick={handleContractSave}
                  >
                    <CheckCircle size={14} />
                    {contractSaved ? 'Guardado!' : 'Guardar cambios'}
                  </button>
                  <button
                    className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
                    onClick={() => {
                      updateEmployee(employee.id, { contractText: contractDraft });
                      printContractText(contractDraft, settings.companyName);
                    }}
                  >
                    <FileCheck size={14} />
                    Imprimir
                  </button>
                  <button className="btn-secondary text-xs px-3 py-2" onClick={() => setContractOpen(false)}>
                    Cerrar
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <textarea
                  className="w-full h-full bg-surface-50 text-surface-900 rounded-xl p-6 font-serif text-[13px] leading-relaxed resize-none outline-none border-2 border-transparent focus:border-primary-500/50"
                  value={contractDraft}
                  onChange={(e) => setContractDraft(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <p className="px-5 pb-4 text-[11px] text-surface-500">
                Los espacios ____________________ son datos que el sistema no captura (domicilio, CURP,
                estado civil, testigos): puedes escribirlos aqui mismo o llenarlos a mano ya impreso.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
