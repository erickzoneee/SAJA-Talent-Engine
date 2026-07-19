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
  UserX,
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
  Loader2,
  Plus,
  Trash2,
  MapPin,
  GraduationCap,
  Users,
  Heart,
  Save,
  FileType,
} from 'lucide-react';
import type {
  Candidate,
  Employee,
  DocumentChecklist,
  ContractType,
  SignedDocKey,
  EmployeeStatus,
  EmployeeExpediente,
  Beneficiary,
} from '../../types';
import type { JobPosition } from '../../types';
import {
  JOB_POSITIONS,
  DEFAULT_SCHEDULES,
  DEFAULT_AREAS,
  DEFAULT_SUPERVISORS,
  DEFAULT_SDI_FACTOR,
  ESTADO_CIVIL_OPTIONS,
  TIPO_SANGRE_OPTIONS,
  NIVEL_ESTUDIOS_OPTIONS,
  CREDITO_VIGENTE_OPTIONS,
  PARENTESCO_OPTIONS,
  BANCO_OPTIONS,
} from '../../types';
import { useStore } from '../../store/useStore';
import {
  generateId,
  formatDate,
  formatDateInput,
  calcAge,
  getInitials,
  toUpper,
  isValidRfc,
  splitFullName,
  joinFullName,
} from '../../utils/helpers';
import { storeMediaFile, isImageMedia, openMedia } from '../../utils/mediaStore';
import MediaImage, { MediaFrame } from '../../components/MediaImage';
import { getVerdictLabel, getVerdictColor } from '../../utils/scoring';
import { getDefaultOnboardingModules } from '../../utils/onboardingModules';
import { buildDocuments, createEmptySignedDocs, ONBOARDING_DOC_KEYS } from '../../utils/documentsV2';
import { printSignedDocument } from '../../utils/printDoc';
import type { DocTemplate } from '../../utils/documentsV2';
import { buildContractText, printContractText } from '../../utils/contractTemplate';
import { EXAM_OUTCOME_LABELS } from '../../utils/examBank';
import { pullNow } from '../../utils/cloudSync';
import { getMunicipios } from '../../utils/mxLocations';

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

// v2.8: los documentos aceptan foto (imagen) o PDF/otros archivos. El boton de
// CAMARA sigue restringido a imagen (capture); el de SUBIR ARCHIVO acepta ambos.
const DOC_UPLOAD_ACCEPT = 'image/*,application/pdf';

// Miniatura de un documento subido: <img> si es imagen, o un icono de archivo
// (PDF/otros) que igual se puede ampliar/abrir.
function DocThumb({ url, onClick, size = 40 }: { url: string; onClick?: () => void; size?: number }) {
  const isImg = isImageMedia(url);
  const style = { width: size, height: size };
  const inner = isImg ? (
    <MediaImage value={url} alt="" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center bg-danger-500/15 text-danger-300 gap-0.5">
      <FileType size={size <= 40 ? 16 : 22} />
      <span className="text-[7px] font-bold tracking-wide">PDF</span>
    </div>
  );
  return onClick ? (
    <button
      type="button"
      style={style}
      className="rounded-lg overflow-hidden border border-surface-600/30 hover:border-primary-500/40 transition-colors cursor-pointer shrink-0"
      onClick={onClick}
      title="Ver documento"
    >
      {inner}
    </button>
  ) : (
    <div style={style} className="rounded-lg overflow-hidden border border-surface-600/30 shrink-0">
      {inner}
    </div>
  );
}

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

// v2.14: el expediente nace con lo que YA se capturo antes — el nombre partido
// en nombre(s)/apellidos y el telefono y correo de recepcion — para que RH no
// tenga que volver a escribirlos. El inicio del contrato es siempre la fecha de
// ingreso capturada aqui.
function buildInitialExpediente(
  fullName: string,
  hireDate: string,
  contacto?: { phone?: string; email?: string },
): EmployeeExpediente {
  const partes = splitFullName(fullName);
  const email = contacto?.email?.trim().toLowerCase();
  return {
    nombres: partes.nombres || undefined,
    apellidoPaterno: partes.apellidoPaterno || undefined,
    apellidoMaterno: partes.apellidoMaterno || undefined,
    inicioContrato: hireDate || undefined,
    telefonoMovil: contacto?.phone?.trim() || undefined,
    emailPersonal: email || undefined,
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

// ── Catalog Select (v2.8) ───────────────────────────────────────────────────
// Selector de catalogo editable: se puede elegir una opcion, AGREGAR nuevas y
// QUITAR las que no se usan (antes solo se podia agregar). Se usa para el
// horario y el area tanto en contratacion como en el alta directa. Los cambios
// escriben en el catalogo global (settings) via onAdd/onRemove.

interface CatalogSelectProps {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  addPlaceholder: string;
}

function CatalogSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options,
  onAdd,
  onRemove,
  placeholder,
  addPlaceholder,
}: CatalogSelectProps) {
  const [manage, setManage] = useState(false);
  const [newVal, setNewVal] = useState('');

  const handleAdd = () => {
    const v = toUpper(newVal);
    if (!v) return;
    onAdd(v);
    setNewVal('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1.5">
        <Icon size={14} className="inline mr-1.5 -mt-0.5" />
        {label}
      </label>
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <button
        type="button"
        className="text-xs text-primary-400 hover:text-primary-300 mt-1.5 cursor-pointer flex items-center gap-1"
        onClick={() => setManage((m) => !m)}
      >
        <Plus size={12} /> Agregar o quitar opciones
      </button>
      {manage && (
        <div className="mt-2 p-3 rounded-xl bg-surface-900/50 border border-surface-700/40 space-y-2">
          {options.length === 0 ? (
            <p className="text-xs text-surface-500">No hay opciones. Agrega la primera abajo.</p>
          ) : (
            options.map((o) => (
              <div key={o} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-surface-200 truncate">{o}</span>
                <button
                  type="button"
                  className="p-1 rounded-lg hover:bg-danger-500/20 text-surface-500 hover:text-danger-400 transition-colors cursor-pointer shrink-0"
                  onClick={() => onRemove(o)}
                  title="Quitar esta opcion"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              className="input-field text-xs"
              placeholder={addPlaceholder}
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <button type="button" className="btn-primary text-xs px-3 py-1.5 shrink-0" onClick={handleAdd}>
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Puesto (v2.15) ──────────────────────────────────────────────────────────
// Etiqueta de un puesto: nombre del catalogo base si es uno de los 4 codigos,
// o el valor tal cual si es un puesto personalizado que RH agrego.
function positionLabel(position: string): string {
  return JOB_POSITIONS[position as JobPosition]?.name ?? position;
}

// Los 4 puestos base SIEMPRE disponibles (se guardan por codigo AG/AM/AO/EC).
const BUILTIN_POSITION_OPTIONS = Object.entries(JOB_POSITIONS).map(([value, v]) => ({
  value,
  label: v.name,
}));

// Selector de PUESTO editable: muestra los 4 puestos base + los personalizados
// del catalogo (settings.positions) y permite AGREGAR y QUITAR los
// personalizados (como los demas catalogos). Los base no se pueden quitar
// porque los usan reclutamiento, el examen y la analitica.
interface PositionSelectProps {
  value: string;
  onChange: (value: string) => void;
  customOptions: string[];
  onAddCustom: (value: string) => void;
  onRemoveCustom: (value: string) => void;
  label?: string;
  icon?: React.ElementType;
  placeholder?: string;
}

function PositionSelect({
  value,
  onChange,
  customOptions,
  onAddCustom,
  onRemoveCustom,
  label,
  icon: Icon,
  placeholder = 'Seleccionar puesto',
}: PositionSelectProps) {
  const [manage, setManage] = useState(false);
  const [newVal, setNewVal] = useState('');

  const handleAdd = () => {
    const v = toUpper(newVal);
    if (!v) return;
    onAddCustom(v);
    onChange(v);
    setNewVal('');
  };

  const known = new Set([...BUILTIN_POSITION_OPTIONS.map((o) => o.value), ...customOptions]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-surface-300 mb-1.5">
          {Icon && <Icon size={14} className="inline mr-1.5 -mt-0.5" />}
          {label}
        </label>
      )}
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {BUILTIN_POSITION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {customOptions.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        {/* Lo ya guardado que no este en el catalogo se sigue viendo */}
        {value && !known.has(value) && <option value={value}>{positionLabel(value)}</option>}
      </select>
      <button
        type="button"
        className="text-xs text-primary-400 hover:text-primary-300 mt-1.5 cursor-pointer flex items-center gap-1"
        onClick={() => setManage((m) => !m)}
      >
        <Plus size={12} /> Agregar o quitar puestos
      </button>
      {manage && (
        <div className="mt-2 p-3 rounded-xl bg-surface-900/50 border border-surface-700/40 space-y-2">
          <p className="text-[11px] text-surface-500">
            Los 4 puestos base del sistema siempre estan disponibles. Aqui agregas o quitas los
            personalizados.
          </p>
          {customOptions.length === 0 ? (
            <p className="text-xs text-surface-500">Aun no hay puestos personalizados. Agrega el primero abajo.</p>
          ) : (
            customOptions.map((o) => (
              <div key={o} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-surface-200 truncate">{o}</span>
                <button
                  type="button"
                  className="p-1 rounded-lg hover:bg-danger-500/20 text-surface-500 hover:text-danger-400 transition-colors cursor-pointer shrink-0"
                  onClick={() => onRemoveCustom(o)}
                  title="Quitar este puesto"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              className="input-field text-xs"
              placeholder="Nombre del nuevo puesto"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <button type="button" className="btn-primary text-xs px-3 py-1.5 shrink-0" onClick={handleAdd}>
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Foto de perfil (v2.15) ──────────────────────────────────────────────────
// Sube la foto del colaborador (camara o archivo) para mostrarla en lugar de
// sus iniciales. Se guarda con storeMediaFile (igual que los escaneos de
// documentos): con sesion en la nube sube a Supabase Storage y guarda la RUTA
// "sb:..." (viaja en la sincronizacion y NO llena el navegador); sin sesion cae
// a base64 local. Se muestra con <MediaImage> para resolver la ruta firmada. Si
// no hay foto se muestran las iniciales.
interface ProfilePhotoPickerProps {
  photoUrl?: string;
  name: string;
  folder: string;
  onChange: (value: string) => void;
  size?: number;
}

function ProfilePhotoPicker({ photoUrl, name, folder, onChange, size = 72 }: ProfilePhotoPickerProps) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const ref = await storeMediaFile(file, folder || 'perfil', 'foto-perfil');
      onChange(ref);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo procesar la imagen. Intenta con otra foto.');
    } finally {
      setBusy(false);
    }
  };

  const dim = { width: size, height: size };
  return (
    <div className="flex items-center gap-4">
      <div style={dim} className="rounded-xl overflow-hidden border border-surface-600/30 shrink-0">
        {busy ? (
          <div className="w-full h-full flex items-center justify-center bg-surface-800/60">
            <Loader2 className="animate-spin text-primary-400" size={20} />
          </div>
        ) : photoUrl ? (
          <MediaImage value={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getAvatarGradient(name || 'NN')} flex items-center justify-center text-white font-bold`}>
            {getInitials(name || 'NN')}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            onClick={() => camRef.current?.click()}
          >
            <Camera size={14} /> Tomar foto
          </button>
          <button
            type="button"
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={14} /> Subir foto
          </button>
          {photoUrl && !busy && (
            <button
              type="button"
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
              onClick={() => onChange('')}
              title="Quitar foto"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <p className="text-[11px] text-surface-500">
          Foto del colaborador (opcional). Si no subes una, se muestran sus iniciales.
        </p>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="user" onChange={handle} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={handle} className="hidden" />
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
  // v2.5: traer lo mas reciente de la nube al abrir, para trabajar contra las
  // contrataciones hechas en otros dispositivos
  useEffect(() => {
    void pullNow();
  }, []);

  const { candidates, addEmployee, updateCandidate, getNextExpedientNumber, settings, updateSettings, authRole, addAlert } = useStore();
  const candidate = candidates.find((c) => c.id === candidateId);

  const scheduleOptions = settings.schedules?.length ? settings.schedules : DEFAULT_SCHEDULES;
  const areaOptions = settings.areas?.length ? settings.areas : DEFAULT_AREAS;
  // Si RH deja el catalogo vacio a proposito se respeta vacio: con ?.length los
  // supervisores por defecto reaparecian solos despues de quitarlos.
  const supervisorOptions = settings.supervisors ?? DEFAULT_SUPERVISORS;

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
  // v2.14: el supervisor directo se elige de un catalogo editable. Se sugiere el
  // del puesto ("Encargado de Produccion / Direccion") buscando cual opcion del
  // catalogo aparece en esa sugerencia.
  const [supervisor, setSupervisor] = useState(() => {
    const sugerido = candidate ? JOB_POSITIONS[candidate.position]?.reportsTo ?? '' : '';
    const catalogo = useStore.getState().settings.supervisors ?? DEFAULT_SUPERVISORS;
    return catalogo.find((s) => sugerido.toUpperCase().includes(s)) ?? '';
  });
  const [imssNumber, setImssNumber] = useState('');
  const [reingreso, setReingreso] = useState(!!candidate?.reingreso);
  const [supervisorOverride, setSupervisorOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<keyof DocumentChecklist | null>(null);
  // v2.17: el contrato individual se GENERA aqui, al completar la contratacion, y
  // queda registrado en Documentos para subir el firmado.
  const [contractOpen, setContractOpen] = useState(false);
  const [contractText, setContractText] = useState('');
  const [contractSaved, setContractSaved] = useState(false);
  // v2.17: true SOLO si RH escribio a mano en el textarea del contrato. Si no,
  // el contrato SIEMPRE se rearma con los datos actuales (evita imprimir/guardar
  // un contrato viejo cuando RH cambia sueldo/fecha/tipo despues de generarlo).
  const [contractEdited, setContractEdited] = useState(false);

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

  const allMandatoryDone = mandatoryCompleted === mandatoryTotal;
  const authOk = !isNotRecommended || (authConfirmed && authMotivo.trim() !== '');
  const canSubmit = (allMandatoryDone || supervisorOverride) && dailyNum > 0 && schedule && hireDate && authOk;

  // v2.8: catalogos de horario/area — agregar Y quitar opciones
  const addScheduleOption = (s: string) => {
    if (!scheduleOptions.includes(s)) updateSettings({ schedules: [...scheduleOptions, s] });
    setSchedule(s);
  };
  const removeScheduleOption = (s: string) => {
    updateSettings({ schedules: scheduleOptions.filter((x) => x !== s) });
    if (schedule === s) setSchedule('');
  };
  const addAreaOption = (a: string) => {
    if (!areaOptions.includes(a)) updateSettings({ areas: [...areaOptions, a] });
    setArea(a);
  };
  const removeAreaOption = (a: string) => {
    updateSettings({ areas: areaOptions.filter((x) => x !== a) });
    if (area === a) setArea('');
  };
  const addSupervisorOption = (s: string) => {
    if (!supervisorOptions.includes(s)) updateSettings({ supervisors: [...supervisorOptions, s] });
    setSupervisor(s);
  };
  const removeSupervisorOption = (s: string) => {
    updateSettings({ supervisors: supervisorOptions.filter((x) => x !== s) });
    if (supervisor === s) setSupervisor('');
  };

  const handleDocToggle = useCallback((key: keyof DocumentChecklist) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: { ...prev[key], done: !prev[key].done },
    }));
  }, []);

  const handleDocPhoto = useCallback(async (key: keyof DocumentChecklist, file: File) => {
    // v2.9: la media se sube a Supabase Storage y se guarda la RUTA (no llena el
    // navegador y viaja a los demas dispositivos). Sin sesion cae a base64 local.
    // v2.10: con indicador de progreso y timeout (antes parecia trabado).
    setUploadingDoc((cur) => cur ?? key);
    try {
      const ref = await storeMediaFile(file, candidateId || 'nuevo', key);
      setDocuments((prev) => ({
        ...prev,
        [key]: { ...prev[key], photoUrl: ref, done: true },
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo procesar el archivo.');
    } finally {
      setUploadingDoc(null);
    }
  }, [candidateId]);

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
      reingreso: reingreso || undefined,
      bankDetails: '',
      status: 'trial',
      documents,
      // v2.14: el nombre partido y el contacto capturado en recepcion pasan solos
      // al expediente (el RFC se captura alla, ya no aqui).
      expediente: buildInitialExpediente(candidate.fullName, hireDate, {
        phone: candidate.phone,
        email: candidate.email,
      }),
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
      // v2.0 — v2.17: el contrato queda MARCADO como generado desde la contratacion;
      // en Documentos solo se lleva el registro y se sube el firmado.
      signedDocsV2: {
        ...createEmptySignedDocs(),
        contrato: { generado: true, fechaGenerado: new Date().toISOString() },
      },
      seguimientoEspecial: isReservations ? true : undefined,
      contratacionAutorizada: isNotRecommended
        ? { por: `${settings.directorName} (Direccion)`, fecha: new Date().toISOString(), motivo: authMotivo.trim() }
        : undefined,
    };

    // v2.17: el contrato se genera al completar la contratacion. Se respeta el
    // texto SOLO si RH lo edito a mano Y es del tipo correcto; en cualquier otro
    // caso se rearma ahora con los datos actuales (evita guardar un contrato con
    // sueldo/fecha/tipo viejos cuando RH previsualizo y luego cambio un campo).
    const tituloEsperado =
      contractType === 'indefinido' ? 'POR TIEMPO INDETERMINADO' : 'POR PERIODO DE PRUEBA';
    const editadoYMismoTipo =
      contractEdited && contractText.trim() !== '' && contractText.split('\n', 1)[0].includes(tituloEsperado);
    newEmployee.contractText = editadoYMismoTipo ? contractText : buildContractText(newEmployee, settings);

    // v2.8: el guardado persiste en localStorage de forma SINCRONA. Si el
    // almacenamiento esta lleno (muchas fotos/PDF) lanza QuotaExceededError; sin
    // este try/catch el estado 'saving' quedaba en true para siempre y el boton
    // se congelaba en "Guardando..." sin explicacion (bug reportado).
    try {
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
    } catch {
      setSaving(false);
      alert('No se pudo guardar la contratacion: el almacenamiento del dispositivo esta lleno. Libera espacio (o reduce fotos/PDF de documentos) e intenta de nuevo.');
      return;
    }

    setTimeout(() => {
      setSaving(false);
      onComplete();
    }, 500);
  }, [candidate, canSubmit, saving, hireDate, weeklySalary, dailyNum, schedule, contractType, area, supervisor, imssNumber, reingreso, documents, contractText, contractEdited, addEmployee, updateCandidate, getNextExpedientNumber, onComplete, isReservations, isNotRecommended, authMotivo, settings, addAlert]);

  // v2.17: arma un Employee "borrador" con lo capturado en la contratacion para
  // generar/ver el contrato ANTES de guardar (mismo texto que se guardara al
  // completar). Los datos personales que aun no se capturan (CURP, estado civil,
  // domicilio...) quedan con lineas ____ hasta llenarse en el expediente.
  const makeDraftEmployee = (): Employee => ({
    id: 'draft',
    candidateId: candidate?.id ?? '',
    expedientNumber: 0,
    fullName: toUpper(candidate?.fullName ?? ''),
    position: candidate?.position ?? 'AG',
    hireDate,
    salary: weeklySalary,
    dailySalary: dailyNum,
    schedule: toUpper(schedule),
    contractType,
    area: toUpper(area),
    supervisor: toUpper(supervisor),
    imssNumber: imssNumber.trim(),
    reingreso: reingreso || undefined,
    bankDetails: '',
    status: 'trial',
    documents,
    expediente: buildInitialExpediente(candidate?.fullName ?? '', hireDate, {
      phone: candidate?.phone,
      email: candidate?.email,
    }),
    onboardingProgress: { modules: [], certificateGenerated: false },
    evaluations: [],
    incidents: [],
    bonuses: [],
    trainings: [],
    trialEndDate: '',
    trialExtended: false,
    createdAt: new Date().toISOString(),
  });

  // Al abrir se rearma con los datos ACTUALES salvo que RH haya editado a mano y
  // el tipo siga coincidiendo — asi el preview nunca muestra sueldo/fecha/tipo viejos.
  const openContract = () => {
    const tituloEsperado =
      contractType === 'indefinido' ? 'POR TIEMPO INDETERMINADO' : 'POR PERIODO DE PRUEBA';
    const mismoTipo = contractText.split('\n', 1)[0].includes(tituloEsperado);
    if (!contractEdited || !contractText.trim() || !mismoTipo) {
      setContractText(buildContractText(makeDraftEmployee(), settings));
      setContractEdited(false);
    }
    setContractSaved(false);
    setContractOpen(true);
  };
  const regenContract = () => {
    setContractText(buildContractText(makeDraftEmployee(), settings));
    setContractEdited(false);
  };
  const editContract = (t: string) => {
    setContractText(t);
    setContractEdited(true);
  };
  const saveContractLocal = () => {
    setContractSaved(true);
    setTimeout(() => setContractSaved(false), 2000);
  };

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
                uploading={uploadingDoc === doc.key}
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

            {/* v2.8: horario asignado — catalogo editable (agregar y quitar) */}
            <CatalogSelect
              icon={Clock}
              label="Horario asignado *"
              value={schedule}
              onChange={setSchedule}
              options={scheduleOptions}
              onAdd={addScheduleOption}
              onRemove={removeScheduleOption}
              placeholder="Seleccionar horario"
              addPlaceholder="Ej: TURNO NOCTURNO · LUN-SAB 22:00 - 6:00"
            />

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

            {/* v2.8: area asignada — catalogo editable (agregar y quitar) */}
            <CatalogSelect
              icon={Building}
              label="Area asignada"
              value={area}
              onChange={setArea}
              options={areaOptions}
              onAdd={addAreaOption}
              onRemove={removeAreaOption}
              placeholder="Seleccionar area"
              addPlaceholder="Nombre de la nueva area"
            />

            {/* v2.14: supervisor directo — catalogo editable (agregar y quitar) */}
            <CatalogSelect
              icon={User}
              label="Supervisor directo"
              value={supervisor}
              onChange={setSupervisor}
              options={supervisorOptions}
              onAdd={addSupervisorOption}
              onRemove={removeSupervisorOption}
              placeholder="Seleccionar supervisor"
              addPlaceholder="Nombre o puesto del supervisor"
            />

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

            {/* v2.4 Req 2: reingreso */}
            <div className="md:col-span-2">
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
                      reingreso === opt.v
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

        {/* v2.17: Contrato individual — se genera aqui, al completar la contratacion */}
        <motion.section {...fadeUp} className="glass-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText size={18} className="text-accent-400" />
                Contrato individual de trabajo
              </h3>
              <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                Se genera con los datos de esta contratacion (
                {contractType === 'indefinido' ? 'tiempo indeterminado' : 'periodo de prueba 15 dias'}) y al
                completar la contratacion queda registrado en el expediente &rarr; Documentos, listo para
                subir el firmado. Es editable antes de imprimir.
              </p>
              {contractText.trim() && (
                <p className="text-[11px] text-success-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} /> Contrato generado &mdash; se guardara al completar la contratacion.
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-2 shrink-0"
              onClick={openContract}
              disabled={!candidate}
            >
              <FileCheck size={16} />
              {contractText.trim() ? 'Ver / editar contrato' : 'Generar contrato'}
            </button>
          </div>
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
              {dailyNum <= 0 ? 'Ingrese el sueldo diario. ' : ''}
              {!schedule ? 'Seleccione el horario asignado. ' : ''}
              {!hireDate ? 'Seleccione la fecha de ingreso. ' : ''}
              {!allMandatoryDone && !supervisorOverride ? 'Complete los documentos obligatorios o active la omision de supervisor. ' : ''}
              {!authOk ? 'Se requiere autorizacion expresa de Direccion (motivo + confirmacion).' : ''}
            </p>
          )}
        </motion.section>

        <ContractModal
          open={contractOpen}
          text={contractText}
          subtitle="Autollenado con los datos de la contratacion · editable antes de imprimir. Se guarda al completar la contratacion."
          regenerateLabel="Regenerar con datos de la contratacion"
          hint="El formato depende del tipo de contrato (prueba 15 dias o indeterminado). Los espacios ____________________ son datos que aun no se capturan (se completan en el expediente o a mano). Al completar la contratacion queda registrado en Documentos para subir el firmado."
          companyName={settings.companyName}
          saved={contractSaved}
          onChange={editContract}
          onRegenerate={regenContract}
          onSave={saveContractLocal}
          onClose={() => setContractOpen(false)}
        />
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
  uploading?: boolean;
}

function DocumentRow({ doc, checked, photoUrl, onToggle, onPhotoUpload, index, fileInputRef, uploading }: DocumentRowProps) {
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

      {/* Document thumbnail (imagen o PDF) */}
      {photoUrl && !uploading && <DocThumb url={photoUrl} />}

      {uploading ? (
        <span className="flex items-center gap-1.5 text-xs text-primary-300 shrink-0 pr-1">
          <Loader2 size={14} className="animate-spin" /> Subiendo...
        </span>
      ) : (
        <>
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
            title="Subir archivo (foto o PDF)"
          >
            <Upload size={15} />
          </button>
        </>
      )}

      {/* Hidden inputs */}
      <input
        ref={(el) => {
          localFileRef.current = el;
          fileInputRef(el);
        }}
        type="file"
        accept={DOC_UPLOAD_ACCEPT}
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
  const { settings, addEmployee, getNextExpedientNumber, updateSettings } = useStore();
  const [saving, setSaving] = useState(false);

  // Datos frescos de la nube antes de registrar
  useEffect(() => {
    void pullNow();
  }, []);

  // v2.15: id estable para agrupar la foto de perfil antes de guardar y para el
  // expediente al registrar (asi el submit no genera un id distinto).
  const [empId] = useState(() => generateId());
  const [fullName, setFullName] = useState('');
  // v2.15: el puesto es un catalogo editable (string), no un enum fijo.
  const [position, setPosition] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [hireDate, setHireDate] = useState('');
  const [dailySalary, setDailySalary] = useState('');
  const [schedule, setSchedule] = useState('');
  const [contractType, setContractType] = useState<ContractType>('indefinido');
  const [area, setArea] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [imssNumber, setImssNumber] = useState('');

  const scheduleOptions = settings.schedules?.length ? settings.schedules : DEFAULT_SCHEDULES;
  const areaOptions = settings.areas?.length ? settings.areas : DEFAULT_AREAS;
  // Si RH deja el catalogo vacio a proposito se respeta vacio: con ?.length los
  // supervisores por defecto reaparecian solos despues de quitarlos.
  const supervisorOptions = settings.supervisors ?? DEFAULT_SUPERVISORS;
  // v2.15: puestos personalizados editables (los 4 base siempre disponibles).
  const positionOptions = settings.positions ?? [];

  const dailyNum = parseFloat(dailySalary) || 0;
  const weeklySalary = Math.round(dailyNum * 7 * 100) / 100;

  // Colaborador existente: si su ingreso real fue hace mas de 30 dias, entra
  // directo como ACTIVO (ya paso el periodo de prueba en la vida real)
  const [today] = useState(() => Date.now());
  const hireDateObj = hireDate ? new Date(`${hireDate}T12:00:00`) : null;
  const daysSinceHire = hireDateObj ? Math.floor((today - hireDateObj.getTime()) / 86400000) : 0;
  const willBeActive = daysSinceHire > 30;

  const canSubmit =
    fullName.trim() !== '' && position !== '' && hireDate !== '' && dailyNum > 0 && schedule !== '';

  // v2.8: catalogos de horario/area — agregar Y quitar opciones
  const addScheduleOption = (s: string) => {
    if (!scheduleOptions.includes(s)) updateSettings({ schedules: [...scheduleOptions, s] });
    setSchedule(s);
  };
  const removeScheduleOption = (s: string) => {
    updateSettings({ schedules: scheduleOptions.filter((x) => x !== s) });
    if (schedule === s) setSchedule('');
  };
  const addAreaOption = (a: string) => {
    if (!areaOptions.includes(a)) updateSettings({ areas: [...areaOptions, a] });
    setArea(a);
  };
  const removeAreaOption = (a: string) => {
    updateSettings({ areas: areaOptions.filter((x) => x !== a) });
    if (area === a) setArea('');
  };
  const addSupervisorOption = (s: string) => {
    if (!supervisorOptions.includes(s)) updateSettings({ supervisors: [...supervisorOptions, s] });
    setSupervisor(s);
  };
  const removeSupervisorOption = (s: string) => {
    updateSettings({ supervisors: supervisorOptions.filter((x) => x !== s) });
    if (supervisor === s) setSupervisor('');
  };
  // v2.15: alta/baja de puestos personalizados en el catalogo global
  const addPositionOption = (p: string) => {
    if (!positionOptions.includes(p)) updateSettings({ positions: [...positionOptions, p] });
  };
  const removePositionOption = (p: string) => {
    updateSettings({ positions: positionOptions.filter((x) => x !== p) });
    if (position === p) setPosition('');
  };

  const handleSubmit = () => {
    if (!canSubmit || saving || !hireDateObj) return;
    setSaving(true);

    const trialEnd = new Date(hireDateObj);
    trialEnd.setDate(trialEnd.getDate() + 30);

    const newEmployee: Employee = {
      id: empId,
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
      // v2.15: foto del colaborador (opcional) — se muestra en vez de iniciales
      photoUrl,
      bankDetails: '',
      status: willBeActive ? 'active' : 'trial',
      documents: createEmptyDocuments(),
      // v2.14: el nombre queda partido en nombre(s)/apellidos desde el arranque.
      expediente: buildInitialExpediente(fullName, hireDate),
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

    // v2.8: guardar puede lanzar QuotaExceededError (localStorage lleno) de
    // forma sincrona. Sin este try/catch el boton se quedaba en "Guardando..."
    // para siempre — el bug de "se queda bugueado al registrar un colaborador".
    try {
      addEmployee(newEmployee);
    } catch {
      setSaving(false);
      alert('No se pudo registrar al colaborador: el almacenamiento del dispositivo esta lleno. Libera espacio (o reduce fotos/PDF de documentos) e intenta de nuevo.');
      return;
    }
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

            {/* v2.15: foto del colaborador (en vez de iniciales) */}
            <ProfilePhotoPicker
              photoUrl={photoUrl}
              name={fullName}
              folder={empId}
              onChange={(v) => setPhotoUrl(v || undefined)}
            />

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
              {/* v2.15: puesto como catalogo editable (agregar/quitar puestos) */}
              <PositionSelect
                label="Puesto *"
                value={position}
                onChange={setPosition}
                customOptions={positionOptions}
                onAddCustom={addPositionOption}
                onRemoveCustom={removePositionOption}
              />
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

            <CatalogSelect
              icon={Clock}
              label="Horario asignado *"
              value={schedule}
              onChange={setSchedule}
              options={scheduleOptions}
              onAdd={addScheduleOption}
              onRemove={removeScheduleOption}
              placeholder="Seleccionar horario"
              addPlaceholder="Ej: TURNO NOCTURNO · LUN-SAB 22:00 - 6:00"
            />

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
              <CatalogSelect
                icon={Building}
                label="Area asignada"
                value={area}
                onChange={setArea}
                options={areaOptions}
                onAdd={addAreaOption}
                onRemove={removeAreaOption}
                placeholder="Seleccionar area"
                addPlaceholder="Nombre de la nueva area"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CatalogSelect
                icon={User}
                label="Supervisor directo"
                value={supervisor}
                onChange={setSupervisor}
                options={supervisorOptions}
                onAdd={addSupervisorOption}
                onRemove={removeSupervisorOption}
                placeholder="Seleccionar supervisor"
                addPlaceholder="Nombre o puesto del supervisor"
              />
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
  // v2.12: los colaboradores dados de baja (inactivos / egreso) se muestran en
  // una pestana aparte, para no mezclarlos con los colaboradores normales.
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
    return employees.filter((e) => {
      const matchSearch = e.fullName.toLowerCase().includes(search.toLowerCase());
      if (tab === 'bajas') return matchSearch && e.status === 'inactive';
      // Pestana de activos: los dados de baja nunca aparecen aqui.
      if (e.status === 'inactive') return false;
      const matchStatus = filterStatus === 'all' || e.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [employees, search, filterStatus, tab]);

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
            {tab === 'bajas'
              ? `${bajasCount} ex-colaborador${bajasCount !== 1 ? 'es' : ''} dado${bajasCount !== 1 ? 's' : ''} de baja`
              : `${activosCount} colaborador${activosCount !== 1 ? 'es' : ''} registrado${activosCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {/* v2.5: alta directa de colaboradores que ya trabajan aqui */}
        <button className="btn-primary flex items-center gap-2" onClick={onDirectRegister}>
          <UserPlus size={16} />
          Registrar colaborador existente
        </button>
      </div>

      {/* v2.12: pestanas — colaboradores activos vs. bajas (ex-colaboradores) */}
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

      {/* Filters */}
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

      {/* Summary Badges (solo en la pestana de activos) */}
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

      {/* Employee List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
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
                <p className="text-surface-400 text-lg font-medium">No hay empleados registrados</p>
                <p className="text-surface-500 text-sm mt-1">
                  Contrate candidatos para verlos aqui
                </p>
              </>
            )}
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
                  <MediaImage
                    value={employee.photoUrl}
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
            <MediaImage
              value={employee.photoUrl}
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

// ── Expediente: helpers de UI (seccion y campo) ─────────────────────────────

function ExpSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-wide">
        <Icon size={16} className="text-primary-400" />
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function Fld({ label, children, wide, hint }: { label: string; children: React.ReactNode; wide?: boolean; hint?: string }) {
  return (
    <div className={wide ? 'md:col-span-2 xl:col-span-3' : ''}>
      <label className="block text-xs font-medium text-surface-400 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-surface-500 mt-1">{hint}</p>}
    </div>
  );
}

// v2.14: selector de catalogo para el expediente: mismo comportamiento que
// CatalogSelect (elegir, agregar y quitar opciones) pero sin encabezado propio,
// porque la etiqueta la pone <Fld>.
interface ExpCatalogSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  addPlaceholder: string;
}

function ExpCatalogSelect({
  value,
  onChange,
  options,
  onAdd,
  onRemove,
  placeholder,
  addPlaceholder,
}: ExpCatalogSelectProps) {
  const [manage, setManage] = useState(false);
  const [newVal, setNewVal] = useState('');

  const handleAdd = () => {
    const v = toUpper(newVal);
    if (!v) return;
    onAdd(v);
    setNewVal('');
  };

  return (
    <>
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        {/* Lo que ya estaba guardado y no esta en el catalogo se sigue viendo */}
        {value && !options.includes(value) && <option value={value}>{value}</option>}
      </select>
      <button
        type="button"
        className="text-[10px] text-primary-400 hover:text-primary-300 mt-1 cursor-pointer flex items-center gap-1"
        onClick={() => setManage((m) => !m)}
      >
        <Plus size={11} /> Agregar o quitar opciones
      </button>
      {manage && (
        <div className="mt-2 p-3 rounded-xl bg-surface-900/50 border border-surface-700/40 space-y-2">
          {options.length === 0 ? (
            <p className="text-xs text-surface-500">No hay opciones. Agrega la primera abajo.</p>
          ) : (
            options.map((o) => (
              <div key={o} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-surface-200 truncate">{o}</span>
                <button
                  type="button"
                  className="p-1 rounded-lg hover:bg-danger-500/20 text-surface-500 hover:text-danger-400 transition-colors cursor-pointer shrink-0"
                  onClick={() => onRemove(o)}
                  title="Quitar esta opcion"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              className="input-field text-xs"
              placeholder={addPlaceholder}
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <button type="button" className="btn-primary text-xs px-3 py-1.5 shrink-0" onClick={handleAdd}>
              Agregar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Draft plano del expediente completo (todo string/boolean para editar comodo).
interface ExpDraft {
  fullName: string;
  position: JobPosition;
  // v2.15: foto de perfil (data URL) — se muestra en vez de las iniciales
  photoUrl: string;
  hireDate: string;
  dailySalary: string;
  schedule: string;
  area: string;
  supervisor: string;
  contractType: ContractType;
  status: EmployeeStatus;
  imssNumber: string;
  rfc: string;
  reingreso: boolean;
  nombres: string; apellidoPaterno: string; apellidoMaterno: string; iniciales: string;
  fechaNacimiento: string; estadoCivil: string; nacionalidad: string; curp: string; tipoSangre: string;
  estado: string; ciudad: string; municipio: string; calle: string; numeroExterior: string; numeroInterior: string; colonia: string; codigoPostal: string;
  emailPersonal: string; telefonoMovil: string; telefonoCasa: string;
  contactoEmergenciaNombre: string; contactoEmergenciaParentesco: string; contactoEmergenciaTelefono: string;
  nivelEstudios: string; profesion: string;
  // v2.14: el inicio del contrato ya no se captura — es siempre la fecha de
  // ingreso. Reingreso, baja IMSS, clase de riesgo y marcadores salieron de la
  // ficha; se conservan aqui solo para no borrar lo que ya estaba guardado.
  finContrato: string; fechaReingreso: string; altaImss: string; bajaImss: string;
  esJefe: boolean; esEventual: boolean; clase: string; creditoFonacot: string; motivoBaja: string; observaciones: string;
  salarioAnterior: string; bono: string; factorSdi: string; banco: string; numeroCuenta: string; clabe: string;
  benefPrimNombre: string; benefPrimParentesco: string; benefPrimPct: string;
  benefSecNombre: string; benefSecParentesco: string; benefSecPct: string;
  observacionesBeneficiarios: string;
}

function buildExpDraft(e: Employee, candidate?: Candidate): ExpDraft {
  const x = e.expediente ?? {};
  const bp = x.beneficiarioPrimario ?? {};
  const bs = x.beneficiarioSecundario ?? {};
  const s = (v?: string) => v ?? '';
  const n = (v?: number) => (v === undefined || v === null ? '' : String(v));
  // v2.14: el nombre completo se arma con las partes, pero de v2.8 a v2.13 el
  // nombre completo era el bueno y las partes eran campos sueltos y opcionales,
  // asi que muchos expedientes quedaron a medias (solo el nombre de pila, o sin
  // apellido materno). Si lo capturado NO reconstruye el nombre completo
  // guardado, manda el nombre completo y se vuelve a partir entero — si no, al
  // guardar se perderian los apellidos. Si SI lo reconstruye (incluida la ficha
  // de quien de verdad no tiene apellido materno) se respeta tal cual y no se
  // inventa nada.
  const norm = (v: string) => toUpper(v).split(/\s+/).filter(Boolean).join(' ');
  const partesCapturadas = joinFullName(x.nombres, x.apellidoPaterno, x.apellidoMaterno);
  const partes = norm(partesCapturadas) === norm(e.fullName ?? '')
    ? { nombres: s(x.nombres), apellidoPaterno: s(x.apellidoPaterno), apellidoMaterno: s(x.apellidoMaterno) }
    : splitFullName(e.fullName ?? '');
  // El telefono y el correo de recepcion solo se jalan la PRIMERA vez (mientras
  // la ficha no tenga expediente guardado). Si se jalaran en cada lectura,
  // borrar un telefono mal capturado seria imposible: volveria a aparecer.
  const nuncaGuardado = !e.expediente;
  return {
    fullName: e.fullName ?? '',
    position: e.position,
    photoUrl: e.photoUrl ?? '',
    hireDate: e.hireDate ?? '',
    dailySalary: e.dailySalary ? String(e.dailySalary) : '',
    schedule: e.schedule ?? '',
    area: e.area ?? '',
    supervisor: e.supervisor ?? '',
    contractType: e.contractType ?? 'eventual',
    status: e.status ?? 'trial',
    imssNumber: e.imssNumber ?? '',
    rfc: e.rfc ?? '',
    reingreso: !!e.reingreso,
    nombres: partes.nombres,
    apellidoPaterno: partes.apellidoPaterno,
    apellidoMaterno: partes.apellidoMaterno,
    iniciales: s(x.iniciales),
    fechaNacimiento: s(x.fechaNacimiento), estadoCivil: s(x.estadoCivil), nacionalidad: s(x.nacionalidad) || 'Mexicana', curp: s(x.curp), tipoSangre: s(x.tipoSangre),
    estado: s(x.estado), ciudad: s(x.ciudad), municipio: s(x.municipio), calle: s(x.calle), numeroExterior: s(x.numeroExterior), numeroInterior: s(x.numeroInterior), colonia: s(x.colonia), codigoPostal: s(x.codigoPostal),
    emailPersonal: s(x.emailPersonal) || (nuncaGuardado ? (candidate?.email ?? '') : ''),
    telefonoMovil: s(x.telefonoMovil) || (nuncaGuardado ? (candidate?.phone ?? '') : ''),
    telefonoCasa: s(x.telefonoCasa),
    contactoEmergenciaNombre: s(x.contactoEmergenciaNombre), contactoEmergenciaParentesco: s(x.contactoEmergenciaParentesco), contactoEmergenciaTelefono: s(x.contactoEmergenciaTelefono),
    nivelEstudios: s(x.nivelEstudios), profesion: s(x.profesion),
    finContrato: s(x.finContrato), fechaReingreso: s(x.fechaReingreso), altaImss: s(x.altaImss), bajaImss: s(x.bajaImss),
    esJefe: !!x.esJefe, esEventual: !!x.esEventual, clase: s(x.clase), creditoFonacot: s(x.creditoFonacot), motivoBaja: s(x.motivoBaja), observaciones: s(x.observaciones),
    salarioAnterior: n(x.salarioAnterior), bono: n(x.bono), factorSdi: x.factorSdi ? String(x.factorSdi) : '', banco: s(x.banco), numeroCuenta: s(x.numeroCuenta), clabe: s(x.clabe),
    benefPrimNombre: s(bp.nombreCompleto), benefPrimParentesco: s(bp.parentesco), benefPrimPct: bp.porcentaje !== undefined ? String(bp.porcentaje) : '',
    benefSecNombre: s(bs.nombreCompleto), benefSecParentesco: s(bs.parentesco), benefSecPct: bs.porcentaje !== undefined ? String(bs.porcentaje) : '',
    observacionesBeneficiarios: s(x.observacionesBeneficiarios),
  };
}

function DossierInfoTab({ employee }: { employee: Employee }) {
  const { updateEmployee, updateSettings, settings, candidates } = useStore();
  const scheduleOptions = settings.schedules?.length ? settings.schedules : DEFAULT_SCHEDULES;
  const areaOptions = settings.areas?.length ? settings.areas : DEFAULT_AREAS;
  // Si RH deja el catalogo vacio a proposito se respeta vacio: con ?.length los
  // supervisores por defecto reaparecian solos despues de quitarlos.
  const supervisorOptions = settings.supervisors ?? DEFAULT_SUPERVISORS;
  // v2.14: candidato de origen — de ahi salen el telefono y el correo que ya se
  // capturaron en recepcion.
  const candidate = employee.candidateId
    ? candidates.find((c) => c.id === employee.candidateId)
    : undefined;

  const [d, setD] = useState<ExpDraft>(() => buildExpDraft(employee, candidate));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Si el expediente cambia por fuera (sync / recarga) y no hay cambios sin
  // guardar, se refresca el borrador para no mostrar datos viejos.
  useEffect(() => {
    if (!dirty) setD(buildExpDraft(employee, candidate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, employee.syncStamp]);

  const up = (patch: Partial<ExpDraft>) => {
    setD((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setSaved(false);
  };

  // v2.14: catalogo de supervisores directos — agregar y quitar opciones
  const addSupervisorOption = (s: string) => {
    if (!supervisorOptions.includes(s)) updateSettings({ supervisors: [...supervisorOptions, s] });
    up({ supervisor: s });
  };
  const removeSupervisorOption = (s: string) => {
    updateSettings({ supervisors: supervisorOptions.filter((x) => x !== s) });
    if (d.supervisor === s) up({ supervisor: '' });
  };
  // v2.15: catalogo de puestos personalizados — agregar y quitar
  const positionOptions = settings.positions ?? [];
  const addPositionOption = (p: string) => {
    if (!positionOptions.includes(p)) updateSettings({ positions: [...positionOptions, p] });
  };
  const removePositionOption = (p: string) => {
    updateSettings({ positions: positionOptions.filter((x) => x !== p) });
    if (d.position === p) up({ position: '' });
  };

  const dailyNum = parseFloat(d.dailySalary) || 0;
  const weeklySalary = Math.round(dailyNum * 7 * 100) / 100;
  const factor = parseFloat(d.factorSdi) || DEFAULT_SDI_FACTOR;
  const sdi = Math.round(dailyNum * factor * 100) / 100;
  const edad = calcAge(d.fechaNacimiento);
  // v2.14: el nombre completo se ARMA con nombre(s) + apellidos — es el que usan
  // el contrato y todo el sistema. Si aun no hay partes capturadas se respeta el
  // nombre guardado.
  const fullNameCompuesto = joinFullName(d.nombres, d.apellidoPaterno, d.apellidoMaterno) || toUpper(d.fullName);
  // Sin nombre y apellido paterno no se puede armar un nombre completo decente:
  // se bloquea el guardado antes de que un nombre a medias llegue al contrato.
  const nombreOk = d.nombres.trim() !== '' && d.apellidoPaterno.trim() !== '';
  // v2.15: la direccion se limita a Ciudad de Mexico y Estado de Mexico. Con
  // CDMX se habilita la ALCALDIA; con Estado de Mexico se habilita el MUNICIPIO.
  const CDMX = 'Ciudad de Mexico';
  const EDOMEX = 'Estado de Mexico';
  const ESTADO_OPTIONS = [CDMX, EDOMEX];
  const alcaldias = getMunicipios(CDMX);
  const municipiosEdoMex = getMunicipios(EDOMEX);
  const esCdmx = d.estado === CDMX;
  const esEdoMex = d.estado === EDOMEX;
  // Al cambiar de estado se limpia el campo que deja de aplicar (para no
  // arrastrar una alcaldia con Estado de Mexico ni un municipio con CDMX).
  const onEstadoChange = (nuevo: string) => {
    if (nuevo === CDMX) up({ estado: nuevo, municipio: '' });
    else if (nuevo === EDOMEX) up({ estado: nuevo, ciudad: '' });
    else up({ estado: nuevo });
  };
  const rfcUpper = d.rfc.trim().toUpperCase();
  const rfcFormatOk = rfcUpper === '' || isValidRfc(rfcUpper);
  const pctPrim = parseFloat(d.benefPrimPct) || 0;
  const pctSec = parseFloat(d.benefSecPct) || 0;
  const totalPct = pctPrim + pctSec;

  const handleSave = () => {
    if (!nombreOk) return;
    const str = (v: string) => (v.trim() === '' ? undefined : v.trim());
    const num = (v: string) => {
      const p = parseFloat(v);
      return Number.isFinite(p) ? p : undefined;
    };
    const benef = (nombre: string, parentesco: string, pct: string): Beneficiary | undefined => {
      if (!nombre.trim() && !parentesco.trim() && !pct.trim()) return undefined;
      return {
        nombreCompleto: str(toUpper(nombre)),
        parentesco: str(parentesco),
        porcentaje: num(pct),
      };
    };

    const expediente: EmployeeExpediente = {
      nombres: str(toUpper(d.nombres)), apellidoPaterno: str(toUpper(d.apellidoPaterno)), apellidoMaterno: str(toUpper(d.apellidoMaterno)), iniciales: str(toUpper(d.iniciales)),
      fechaNacimiento: str(d.fechaNacimiento), estadoCivil: str(d.estadoCivil), nacionalidad: str(d.nacionalidad), curp: str(toUpper(d.curp)), tipoSangre: str(d.tipoSangre),
      // v2.15: alcaldia (ciudad) y municipio salen de una lista Titulo-Case; NO
      // se pasan a MAYUSCULAS al guardar para que sigan coincidiendo con la
      // opcion del catalogo (si se pasaban, la opcion se duplicaba en MAYUSCULAS).
      // Se ven en mayusculas igual por el text-transform del CSS.
      estado: str(d.estado), ciudad: str(d.ciudad), municipio: str(d.municipio), calle: str(toUpper(d.calle)), numeroExterior: str(toUpper(d.numeroExterior)), numeroInterior: str(toUpper(d.numeroInterior)), colonia: str(toUpper(d.colonia)), codigoPostal: str(d.codigoPostal),
      emailPersonal: str(d.emailPersonal.toLowerCase()), telefonoMovil: str(d.telefonoMovil), telefonoCasa: str(d.telefonoCasa),
      contactoEmergenciaNombre: str(toUpper(d.contactoEmergenciaNombre)), contactoEmergenciaParentesco: str(d.contactoEmergenciaParentesco), contactoEmergenciaTelefono: str(d.contactoEmergenciaTelefono),
      nivelEstudios: str(d.nivelEstudios), profesion: str(toUpper(d.profesion)),
      // v2.14: el inicio del contrato es la misma fecha de ingreso (ya no se captura aparte)
      finContrato: str(d.finContrato), inicioContrato: str(d.hireDate), fechaReingreso: str(d.fechaReingreso), altaImss: str(d.altaImss), bajaImss: str(d.bajaImss),
      esJefe: d.esJefe || undefined, esEventual: d.esEventual || undefined, clase: str(d.clase), creditoFonacot: str(toUpper(d.creditoFonacot)), motivoBaja: str(toUpper(d.motivoBaja)), observaciones: str(toUpper(d.observaciones)),
      salarioAnterior: num(d.salarioAnterior), bono: num(d.bono), factorSdi: num(d.factorSdi), banco: str(d.banco), numeroCuenta: str(d.numeroCuenta), clabe: str(d.clabe),
      beneficiarioPrimario: benef(d.benefPrimNombre, d.benefPrimParentesco, d.benefPrimPct),
      beneficiarioSecundario: benef(d.benefSecNombre, d.benefSecParentesco, d.benefSecPct),
      observacionesBeneficiarios: str(toUpper(d.observacionesBeneficiarios)),
    };

    try {
      updateEmployee(employee.id, {
        fullName: fullNameCompuesto || employee.fullName,
        position: d.position,
        // v2.15: foto de perfil (vacio => sin foto, se muestran iniciales)
        photoUrl: d.photoUrl || undefined,
        hireDate: d.hireDate || employee.hireDate,
        dailySalary: dailyNum || undefined,
        salary: dailyNum > 0 ? weeklySalary : employee.salary,
        schedule: toUpper(d.schedule),
        area: toUpper(d.area),
        supervisor: toUpper(d.supervisor),
        contractType: d.contractType,
        status: d.status,
        imssNumber: d.imssNumber.trim(),
        rfc: rfcUpper || undefined,
        reingreso: d.reingreso || undefined,
        expediente,
      });
    } catch {
      alert('No se pudieron guardar los cambios: el almacenamiento del dispositivo esta lleno. Libera espacio e intenta de nuevo.');
      return;
    }
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setD(buildExpDraft(employee, candidate));
    setDirty(false);
    setSaved(false);
  };

  const SaveBar = (
    <div className="flex items-center gap-3">
      <button className="btn-success flex items-center gap-2" onClick={handleSave} disabled={!dirty || !nombreOk}>
        <Save size={16} />
        Guardar cambios
      </button>
      {!nombreOk && (
        <span className="text-warning-500 text-xs">
          Captura Nombre(s) y Apellido paterno: con ellos se arma el nombre completo.
        </span>
      )}
      {dirty && (
        <button className="btn-secondary text-sm" onClick={handleReset}>
          Descartar
        </button>
      )}
      {saved && (
        <span className="text-success-500 text-sm flex items-center gap-1.5">
          <CheckCircle size={15} /> Guardado
        </span>
      )}
      {dirty && !saved && <span className="text-warning-500 text-xs">Hay cambios sin guardar</span>}
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
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

      {/* Barra de guardado (arriba) */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-surface-400 flex items-center gap-1.5">
          <Info size={13} className="text-primary-400 shrink-0" />
          Expediente completo del colaborador. Edita cualquier campo y presiona <b className="text-surface-200">Guardar cambios</b>.
        </p>
        {SaveBar}
      </div>

      {/* ─── DATOS PERSONALES ─── */}
      <ExpSection icon={User} title="Datos personales">
        {/* v2.15: foto del colaborador — se muestra en vez de las iniciales */}
        <div className="md:col-span-2 xl:col-span-3">
          <ProfilePhotoPicker
            photoUrl={d.photoUrl || undefined}
            name={fullNameCompuesto}
            folder={employee.id}
            onChange={(v) => up({ photoUrl: v })}
          />
        </div>
        {/* v2.14: el nombre completo ya no se escribe — se arma con las tres
            partes de abajo, que es lo que sale en el contrato y en el sistema. */}
        <Fld label="Nombre completo" wide hint="Se arma solo con Nombre(s) + Apellido paterno + Apellido materno. Es el que se usa en contratos, listados y todo el sistema.">
          <input className="input-field opacity-70" value={fullNameCompuesto} readOnly tabIndex={-1} />
        </Fld>
        <Fld label="Nombre(s) *">
          <input className="input-field" value={d.nombres} onChange={(e) => up({ nombres: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="Apellido paterno *">
          <input className="input-field" value={d.apellidoPaterno} onChange={(e) => up({ apellidoPaterno: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="Apellido materno">
          <input className="input-field" value={d.apellidoMaterno} onChange={(e) => up({ apellidoMaterno: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="Iniciales">
          <input className="input-field" placeholder="Ej: JAG" value={d.iniciales} onChange={(e) => up({ iniciales: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="Fecha de nacimiento">
          <input type="date" className="input-field" value={d.fechaNacimiento} onChange={(e) => up({ fechaNacimiento: e.target.value })} />
        </Fld>
        <Fld label="Edad">
          <input className="input-field opacity-70" value={edad !== null ? `${edad} anos` : ''} readOnly tabIndex={-1} placeholder="Se calcula" />
        </Fld>
        <Fld label="Estado civil">
          <select className="input-field" value={d.estadoCivil} onChange={(e) => up({ estadoCivil: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {ESTADO_CIVIL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Fld>
        <Fld label="Nacionalidad" hint="Se usa en el contrato individual de trabajo.">
          <input className="input-field" value={d.nacionalidad} onChange={(e) => up({ nacionalidad: e.target.value })} placeholder="Mexicana" />
        </Fld>
        <Fld label="Tipo de sangre">
          <select className="input-field" value={d.tipoSangre} onChange={(e) => up({ tipoSangre: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {TIPO_SANGRE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Fld>
        <Fld label="CURP">
          <input className="input-field" maxLength={18} value={d.curp} onChange={(e) => up({ curp: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="RFC (con homoclave)" hint={!rfcFormatOk ? 'Formato de RFC invalido (12-13 caracteres).' : undefined}>
          <input className="input-field" maxLength={13} value={d.rfc} onChange={(e) => up({ rfc: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="NSS (IMSS)">
          <input className="input-field" value={d.imssNumber} onChange={(e) => up({ imssNumber: e.target.value })} />
        </Fld>
      </ExpSection>

      {/* ─── DIRECCION Y CONTACTO ─── */}
      <ExpSection icon={MapPin} title="Direccion y contacto">
        <Fld label="Estado">
          <select className="input-field" value={d.estado} onChange={(e) => onEstadoChange(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {ESTADO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            {/* Un estado distinto ya guardado se conserva hasta que RH elija otro */}
            {d.estado && !ESTADO_OPTIONS.includes(d.estado) && <option value={d.estado}>{d.estado}</option>}
          </select>
        </Fld>
        <Fld
          label="Alcaldia"
          hint={esCdmx ? 'Elige la alcaldia de la Ciudad de Mexico.' : 'Selecciona "Ciudad de Mexico" como estado para habilitar la alcaldia.'}
        >
          <select
            className={`input-field ${esCdmx ? '' : 'opacity-50'}`}
            value={d.ciudad}
            disabled={!esCdmx}
            onChange={(e) => up({ ciudad: e.target.value })}
          >
            <option value="">-- Seleccionar --</option>
            {alcaldias.map((o) => <option key={o} value={o}>{o}</option>)}
            {d.ciudad && !alcaldias.includes(d.ciudad) && <option value={d.ciudad}>{d.ciudad}</option>}
          </select>
        </Fld>
        <Fld
          label="Municipio"
          hint={esEdoMex ? 'Elige el municipio del Estado de Mexico.' : 'Selecciona "Estado de Mexico" como estado para habilitar el municipio.'}
        >
          <select
            className={`input-field ${esEdoMex ? '' : 'opacity-50'}`}
            value={d.municipio}
            disabled={!esEdoMex}
            onChange={(e) => up({ municipio: e.target.value })}
          >
            <option value="">-- Seleccionar --</option>
            {municipiosEdoMex.map((o) => <option key={o} value={o}>{o}</option>)}
            {d.municipio && !municipiosEdoMex.includes(d.municipio) && <option value={d.municipio}>{d.municipio}</option>}
          </select>
        </Fld>
        <Fld label="Calle">
          <input className="input-field" value={d.calle} onChange={(e) => up({ calle: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="No. Exterior">
          <input className="input-field" value={d.numeroExterior} onChange={(e) => up({ numeroExterior: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="No. Interior">
          <input className="input-field" value={d.numeroInterior} onChange={(e) => up({ numeroInterior: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="Colonia">
          <input className="input-field" value={d.colonia} onChange={(e) => up({ colonia: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="Codigo Postal">
          <input className="input-field" maxLength={5} value={d.codigoPostal} onChange={(e) => up({ codigoPostal: e.target.value.replace(/\D/g, '') })} />
        </Fld>
        <Fld label="Email personal">
          <input type="email" className="input-field no-uppercase" value={d.emailPersonal} onChange={(e) => up({ emailPersonal: e.target.value })} />
        </Fld>
        <Fld label="Telefono movil">
          <input className="input-field" value={d.telefonoMovil} onChange={(e) => up({ telefonoMovil: e.target.value })} />
        </Fld>
        <Fld label="Telefono casa / recados">
          <input className="input-field" value={d.telefonoCasa} onChange={(e) => up({ telefonoCasa: e.target.value })} />
        </Fld>
        <Fld label="Contacto de emergencia — nombre">
          <input className="input-field" value={d.contactoEmergenciaNombre} onChange={(e) => up({ contactoEmergenciaNombre: e.target.value.toUpperCase() })} />
        </Fld>
        <Fld label="Contacto de emergencia — parentesco">
          <select className="input-field" value={d.contactoEmergenciaParentesco} onChange={(e) => up({ contactoEmergenciaParentesco: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {PARENTESCO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Fld>
        <Fld label="Contacto de emergencia — telefono">
          <input className="input-field" value={d.contactoEmergenciaTelefono} onChange={(e) => up({ contactoEmergenciaTelefono: e.target.value })} />
        </Fld>
      </ExpSection>

      {/* ─── FORMACION ACADEMICA ─── */}
      <ExpSection icon={GraduationCap} title="Formacion academica">
        <Fld label="Nivel de estudios">
          <select className="input-field" value={d.nivelEstudios} onChange={(e) => up({ nivelEstudios: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {NIVEL_ESTUDIOS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Fld>
        <Fld label="Profesion / Titulo" wide>
          <input className="input-field" value={d.profesion} onChange={(e) => up({ profesion: e.target.value.toUpperCase() })} />
        </Fld>
      </ExpSection>

      {/* ─── INFORMACION LABORAL ─── */}
      {/* v2.14: de aqui sale la informacion del contrato, por eso se captura una
          sola vez. Salieron de la ficha: fecha de reingreso, baja IMSS, clase de
          riesgo IMSS y los marcadores. El inicio del contrato es la fecha de
          ingreso, no un dato aparte. */}
      <ExpSection icon={Briefcase} title="Informacion laboral">
        <Fld label="Fecha de ingreso *" hint="Es tambien el inicio del contrato.">
          <input type="date" className="input-field" value={d.hireDate} onChange={(e) => up({ hireDate: e.target.value })} />
        </Fld>
        <Fld label="Fin de contrato">
          <input type="date" className="input-field" value={d.finContrato} onChange={(e) => up({ finContrato: e.target.value })} />
        </Fld>
        <Fld label="Alta IMSS">
          <input type="date" className="input-field" value={d.altaImss} onChange={(e) => up({ altaImss: e.target.value })} />
        </Fld>
        <Fld label="Puesto">
          {/* v2.15: puesto como catalogo editable (agregar/quitar puestos) */}
          <PositionSelect
            value={d.position}
            onChange={(v) => up({ position: v })}
            customOptions={positionOptions}
            onAddCustom={addPositionOption}
            onRemoveCustom={removePositionOption}
          />
        </Fld>
        <Fld label="Area / Depto">
          <select className="input-field" value={d.area} onChange={(e) => up({ area: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {areaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            {d.area && !areaOptions.includes(d.area) && <option value={d.area}>{d.area}</option>}
          </select>
        </Fld>
        <Fld label="Turno / Horario" wide>
          <select className="input-field" value={d.schedule} onChange={(e) => up({ schedule: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {scheduleOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            {d.schedule && !scheduleOptions.includes(d.schedule) && <option value={d.schedule}>{d.schedule}</option>}
          </select>
        </Fld>
        <Fld label="Tipo de contrato">
          <select className="input-field" value={d.contractType} onChange={(e) => up({ contractType: e.target.value as ContractType })}>
            <option value="eventual">Contrato de prueba / eventual</option>
            <option value="indefinido">Indefinido</option>
          </select>
        </Fld>
        <Fld label="Creditos vigentes">
          <select className="input-field" value={d.creditoFonacot} onChange={(e) => up({ creditoFonacot: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {CREDITO_VIGENTE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            {/* Antes era texto libre ("Credito FONACOT"): lo ya capturado se sigue
                viendo hasta que RH elija una de las opciones nuevas. */}
            {d.creditoFonacot && !(CREDITO_VIGENTE_OPTIONS as readonly string[]).includes(d.creditoFonacot) && (
              <option value={d.creditoFonacot}>{d.creditoFonacot} (capturado antes)</option>
            )}
          </select>
        </Fld>
        <Fld label="Supervisor directo">
          <ExpCatalogSelect
            value={d.supervisor}
            onChange={(v) => up({ supervisor: v })}
            options={supervisorOptions}
            onAdd={addSupervisorOption}
            onRemove={removeSupervisorOption}
            placeholder="-- Seleccionar --"
            addPlaceholder="Nombre o puesto del supervisor"
          />
        </Fld>
        <Fld label="Estatus">
          <select className="input-field" value={d.status} onChange={(e) => up({ status: e.target.value as EmployeeStatus })}>
            <option value="trial">Periodo de prueba</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </Fld>
        {/* v2.15: "Motivo de baja" se quito del expediente — la baja y su motivo
            se manejan en el modulo de Egreso. El dato guardado (si existe) se
            conserva y no se borra al guardar el expediente. */}
        <Fld label="Observaciones" wide>
          <textarea className="input-field min-h-[70px] resize-y" value={d.observaciones} onChange={(e) => up({ observaciones: e.target.value.toUpperCase() })} />
        </Fld>
      </ExpSection>

      {/* ─── DATOS ECONOMICOS ─── */}
      <ExpSection icon={DollarSign} title="Datos economicos">
        <Fld label="Salario diario bruto ($) *" hint="Base para calculo IMSS.">
          <input type="number" className="input-field" min="0" step="10" value={d.dailySalary} onChange={(e) => up({ dailySalary: e.target.value })} />
        </Fld>
        <Fld label="SDI — Salario Diario Integrado" hint={`Calculado: diario x factor ${factor}`}>
          <input className="input-field opacity-70" value={dailyNum > 0 ? sdi.toFixed(2) : ''} readOnly tabIndex={-1} placeholder="Se calcula" />
        </Fld>
        <Fld label="Sueldo semanal (diario x 7)">
          <input className="input-field opacity-70" value={dailyNum > 0 ? `$${weeklySalary.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''} readOnly tabIndex={-1} placeholder="Se calcula" />
        </Fld>
        <Fld label="Salario anterior ($)">
          <input type="number" className="input-field" min="0" value={d.salarioAnterior} onChange={(e) => up({ salarioAnterior: e.target.value })} />
        </Fld>
        <Fld label="Bono ($)">
          <input type="number" className="input-field" min="0" value={d.bono} onChange={(e) => up({ bono: e.target.value })} />
        </Fld>
        <Fld label="Factor (integracion SDI)" hint={`Por defecto ${DEFAULT_SDI_FACTOR}`}>
          <input type="number" className="input-field" step="0.0001" min="1" placeholder={String(DEFAULT_SDI_FACTOR)} value={d.factorSdi} onChange={(e) => up({ factorSdi: e.target.value })} />
        </Fld>
        <Fld label="Banco">
          <select className="input-field" value={d.banco} onChange={(e) => up({ banco: e.target.value })}>
            <option value="">-- Seleccionar --</option>
            {BANCO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Fld>
        <Fld label="Numero de cuenta">
          <input className="input-field no-uppercase" value={d.numeroCuenta} onChange={(e) => up({ numeroCuenta: e.target.value })} />
        </Fld>
        <Fld label="CLABE (18 digitos)">
          <input className="input-field no-uppercase" maxLength={18} value={d.clabe} onChange={(e) => up({ clabe: e.target.value.replace(/\D/g, '') })} />
        </Fld>
      </ExpSection>

      {/* ─── BENEFICIARIOS ─── */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-wide">
          <Users size={16} className="text-primary-400" />
          Beneficiarios
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-surface-800/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-surface-200 flex items-center gap-1.5">
              <Heart size={13} className="text-primary-400" /> Beneficiario primario
            </p>
            <input className="input-field" placeholder="Nombre completo" value={d.benefPrimNombre} onChange={(e) => up({ benefPrimNombre: e.target.value.toUpperCase() })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="input-field" value={d.benefPrimParentesco} onChange={(e) => up({ benefPrimParentesco: e.target.value })}>
                <option value="">Parentesco</option>
                {PARENTESCO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input type="number" className="input-field" min="0" max="100" placeholder="% asignado" value={d.benefPrimPct} onChange={(e) => up({ benefPrimPct: e.target.value })} />
            </div>
          </div>
          <div className="rounded-xl bg-surface-800/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-surface-200 flex items-center gap-1.5">
              <Heart size={13} className="text-accent-400" /> Beneficiario secundario (opcional)
            </p>
            <input className="input-field" placeholder="Nombre completo" value={d.benefSecNombre} onChange={(e) => up({ benefSecNombre: e.target.value.toUpperCase() })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="input-field" value={d.benefSecParentesco} onChange={(e) => up({ benefSecParentesco: e.target.value })}>
                <option value="">Parentesco</option>
                {PARENTESCO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <input type="number" className="input-field" min="0" max="100" placeholder="% asignado" value={d.benefSecPct} onChange={(e) => up({ benefSecPct: e.target.value })} />
            </div>
          </div>
        </div>
        <div
          className={`mt-3 p-2.5 rounded-xl text-sm font-semibold text-right ${
            totalPct === 100 ? 'bg-success-500/15 text-success-400' : totalPct > 0 ? 'bg-warning-500/10 text-warning-500' : 'bg-surface-800/40 text-surface-500'
          }`}
        >
          Total asignado: {totalPct}%{totalPct !== 100 && totalPct > 0 ? ' (debe sumar 100%)' : ''}
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-surface-400 mb-1">Observaciones beneficiarios</label>
          <textarea className="input-field min-h-[60px] resize-y" value={d.observacionesBeneficiarios} onChange={(e) => up({ observacionesBeneficiarios: e.target.value.toUpperCase() })} />
        </div>
      </div>

      {/* Barra de guardado (abajo) */}
      <div className="glass-card p-4 flex items-center justify-end">{SaveBar}</div>
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
  uploading?: boolean;
}

function DossierDocRow({ doc, index, data, onToggle, onPhoto, onExpand, uploading }: DossierDocRowProps) {
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

      {/* Document thumbnail (ampliable — imagen o PDF) */}
      {data.photoUrl && !uploading && <DocThumb url={data.photoUrl} onClick={() => onExpand(data.photoUrl!)} />}

      {uploading ? (
        <span className="flex items-center gap-1.5 text-xs text-primary-300 shrink-0 pr-1">
          <Loader2 size={14} className="animate-spin" /> Subiendo...
        </span>
      ) : (
        <>
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
            title="Subir archivo (foto o PDF)"
          >
            <Upload size={15} />
          </button>
        </>
      )}

      {/* Hidden inputs */}
      <input ref={uploadRef} type="file" accept={DOC_UPLOAD_ACCEPT} onChange={handleFile} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
    </div>
  );
}

// ── Dossier Documents Tab ───────────────────────────────────────────────────

function DossierDocumentsTab({ employee, docsCompleted, docsTotal }: { employee: Employee; docsCompleted: number; docsTotal: number }) {
  const { updateEmployeeDocument } = useStore();
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<keyof DocumentChecklist | null>(null);
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
    // v2.9: sube a Storage (viaja entre dispositivos); sin sesion cae a base64.
    // v2.10: con indicador de progreso y timeout — antes parecia "trabado".
    if (uploadingKey) return; // evita subidas simultaneas que saturan
    setUploadingKey(key);
    try {
      const ref = await storeMediaFile(file, employee.id, key);
      updateEmployeeDocument(employee.id, key, { photoUrl: ref, done: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo procesar el archivo.');
    } finally {
      setUploadingKey(null);
    }
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
            uploading={uploadingKey === doc.key}
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
            {isImageMedia(expandedPhoto) ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full"
              >
                <MediaImage
                  value={expandedPhoto}
                  alt="Documento"
                  className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl h-[85vh] bg-surface-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                  <span className="text-sm text-surface-300 flex items-center gap-2">
                    <FileType size={16} className="text-danger-400" /> Documento PDF
                  </span>
                  <button
                    type="button"
                    onClick={() => void openMedia(expandedPhoto)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Abrir en pestana nueva
                  </button>
                </div>
                <MediaFrame value={expandedPhoto} title="Documento PDF" className="flex-1 w-full bg-white" />
              </motion.div>
            )}
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
// v2.17 — MODAL DEL CONTRATO INDIVIDUAL (reutilizable)
// Lo usan DOS lugares: al COMPLETAR la contratacion (se genera el contrato) y
// el expediente → Documentos (para reimprimir / dejar el registro). Es el mismo
// textarea editable + Regenerar / Guardar / Imprimir.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ContractModalProps {
  open: boolean;
  text: string;
  subtitle: string;
  hint: string;
  regenerateLabel: string;
  companyName: string;
  saved: boolean;
  onChange: (t: string) => void;
  onRegenerate: () => void;
  onSave: () => void;
  onClose: () => void;
}

function ContractModal({
  open, text, subtitle, hint, regenerateLabel, companyName, saved,
  onChange, onRegenerate, onSave, onClose,
}: ContractModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
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
                <p className="text-xs text-surface-500">{subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                  onClick={onRegenerate}
                  title="Vuelve a llenar el contrato con los datos actuales (descarta ediciones)"
                >
                  <FileText size={14} />
                  {regenerateLabel}
                </button>
                <button
                  className="btn-success text-xs px-3 py-2 flex items-center gap-1.5"
                  onClick={onSave}
                >
                  <CheckCircle size={14} />
                  {saved ? 'Guardado!' : 'Guardar cambios'}
                </button>
                <button
                  className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
                  onClick={() => {
                    onSave();
                    printContractText(text, companyName);
                  }}
                >
                  <FileCheck size={14} />
                  Imprimir
                </button>
                <button className="btn-secondary text-xs px-3 py-2" onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <textarea
                className="w-full h-full bg-surface-50 text-surface-900 rounded-xl p-6 font-serif text-[13px] leading-relaxed resize-none outline-none border-2 border-transparent focus:border-primary-500/50"
                value={text}
                onChange={(e) => onChange(e.target.value)}
                spellCheck={false}
              />
            </div>
            <p className="px-5 pb-4 text-[11px] text-surface-500">{hint}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — 5 DOCUMENTOS FISICOS CON FIRMA (BRD seccion 6)
// Generar con variables → imprimir → RH explica en voz alta → firma →
// RH sube el escaneado al expediente digital.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SignedDocsSection({ employee }: { employee: Employee }) {
  const { settings, updateEmployee } = useStore();
  const [previewDoc, setPreviewDoc] = useState<DocTemplate | null>(null);
  // v2.4 Req 6: contrato individual autollenado con los datos capturados y EDITABLE
  const [contractOpen, setContractOpen] = useState(false);
  const [contractDraft, setContractDraft] = useState('');
  const [contractSaved, setContractSaved] = useState(false);
  const [scanUploading, setScanUploading] = useState<SignedDocKey | null>(null);
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
      // Autollenado con la informacion capturada; si RH ya lo edito, se respeta su
      // version. PERO si el contrato guardado es de OTRO tipo (RH cambio el tipo de
      // contrato despues de generarlo), se regenera: imprimir el contrato del tipo
      // equivocado (prueba vs indeterminado) seria un error legal grave.
      const tituloEsperado =
        employee.contractType === 'indefinido' ? 'POR TIEMPO INDETERMINADO' : 'POR PERIODO DE PRUEBA';
      const guardado = employee.contractText;
      const primeraLinea = guardado ? guardado.split('\n', 1)[0] : '';
      const draft =
        guardado && primeraLinea.includes(tituloEsperado)
          ? guardado
          : buildContractText(employee, settings);
      setContractDraft(draft);
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
    // v2.9: el escaneo firmado se sube a Storage y viaja entre dispositivos.
    // v2.10: indicador de progreso + timeout (antes se veia trabado).
    if (scanUploading) return;
    setScanUploading(key);
    try {
      const ref = await storeMediaFile(file, employee.id, `firmado_${key}`);
      setDocStatus(key, { firmadoUrl: ref, fechaFirmado: new Date().toISOString() });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo procesar el archivo.');
    } finally {
      setScanUploading(null);
    }
  };

  const signedCount = ONBOARDING_DOC_KEYS.filter((k) => status[k].firmadoUrl).length;
  // v2.14: la renuncia voluntaria NO aparece aqui — es tema del egreso y se
  // genera desde el modulo de Egreso, al momento de la baja.
  const onboardingDocs = docs.filter((d) => ONBOARDING_DOC_KEYS.includes(d.key));

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
              className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 disabled:opacity-60"
              onClick={() => scanRefs.current[doc.key]?.click()}
              title="Subir documento firmado escaneado"
              disabled={scanUploading === doc.key}
            >
              {scanUploading === doc.key ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Subiendo...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  {st.firmadoUrl ? 'Reemplazar' : 'Subir firmado'}
                </>
              )}
            </button>
            <input
              ref={(el) => {
                scanRefs.current[doc.key] = el;
              }}
              type="file"
              accept={DOC_UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleScanUpload(doc.key, f);
              }}
            />
          </div>
        </div>
        {st.firmadoUrl && (
          isImageMedia(st.firmadoUrl) ? (
            <MediaImage
              value={st.firmadoUrl}
              alt={`${doc.titulo} firmado`}
              className="h-16 rounded-lg border border-surface-600/30 object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={() => void openMedia(st.firmadoUrl)}
              className="inline-flex items-center gap-2 text-xs text-danger-300 bg-danger-500/10 border border-danger-500/20 rounded-lg px-3 py-2 hover:bg-danger-500/20 transition-colors"
            >
              <FileType size={14} /> Documento PDF firmado — abrir
            </button>
          )
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
        recaba la firma y sube el escaneado. La renuncia voluntaria no va aqui: es tema del egreso y se
        genera desde ese modulo al momento de la baja.
      </p>

      <div className="space-y-3">
        {onboardingDocs.map((doc, i) => renderDocRow(doc, `${i + 1}. `))}
      </div>

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
                    onClick={() => printSignedDocument(previewDoc, settings.companyName)}
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
                  {!previewDoc.plain && (
                    <p className="text-center text-[10px] uppercase tracking-widest text-surface-500 mb-1">
                      {settings.companyName}
                    </p>
                  )}
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

      {/* v2.17: el contrato usa el modal reutilizable. Ya se genero al completar
          la contratacion; aqui RH lo puede reimprimir/regenerar y subir el firmado. */}
      <ContractModal
        open={contractOpen}
        text={contractDraft}
        subtitle="Autollenado con la informacion capturada del expediente · el texto es editable — escribe directamente sobre el para modificarlo antes de imprimir."
        regenerateLabel="Regenerar con datos del expediente"
        hint="El formato depende del tipo de contrato (prueba 15 dias o indeterminado) y se llena con la pestana Informacion del expediente. Los espacios ____________________ son lo que el sistema aun no captura: puedes escribirlos aqui mismo o llenarlos a mano ya impreso."
        companyName={settings.companyName}
        saved={contractSaved}
        onChange={setContractDraft}
        onRegenerate={handleContractRegenerate}
        onSave={handleContractSave}
        onClose={() => setContractOpen(false)}
      />
    </div>
  );
}
