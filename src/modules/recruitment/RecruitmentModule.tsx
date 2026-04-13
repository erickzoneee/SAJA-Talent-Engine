import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Search,
  Filter,
  Camera,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Brain,
  User,
  Phone,
  MapPin,
  CalendarDays,
  Briefcase,
  FileText,
  ShieldCheck,
  Award,
  ArrowLeft,
  Trash2,
  Play,
} from 'lucide-react';
import type { Candidate, JobPosition } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import { MATH_QUESTIONS } from '../../utils/mathExam';
import { generateId, formatDate, fileToBase64, getInitials } from '../../utils/helpers';

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_OPTIONS = ['Referido', 'Volante', 'Internet', 'Otro'] as const;

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

// ─── Sub-views ───────────────────────────────────────────────────────────────

type ViewState =
  | { view: 'list' }
  | { view: 'new' }
  | { view: 'detail'; candidateId: string }
  | { view: 'exam'; candidateId: string };

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RecruitmentModule() {
  const [viewState, setViewState] = useState<ViewState>({ view: 'list' });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState.view === 'list' && (
          <motion.div key="list" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <CandidateListView
              onNewCandidate={() => setViewState({ view: 'new' })}
              onSelectCandidate={(id) => setViewState({ view: 'detail', candidateId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'new' && (
          <motion.div key="new" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <NewCandidateForm
              onBack={() => setViewState({ view: 'list' })}
              onCreated={(id) => setViewState({ view: 'detail', candidateId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'detail' && (
          <motion.div key="detail" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <CandidateDetail
              candidateId={viewState.candidateId}
              onBack={() => setViewState({ view: 'list' })}
              onStartExam={(id) => setViewState({ view: 'exam', candidateId: id })}
            />
          </motion.div>
        )}
        {viewState.view === 'exam' && (
          <motion.div key="exam" {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
            <MathExamView
              candidateId={viewState.candidateId}
              onBack={(id) => setViewState({ view: 'detail', candidateId: id })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 1 : Candidate List
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CandidateListViewProps {
  onNewCandidate: () => void;
  onSelectCandidate: (id: string) => void;
}

function CandidateListView({ onNewCandidate, onSelectCandidate }: CandidateListViewProps) {
  const candidates = useStore((s) => s.candidates);
  const settings = useStore((s) => s.settings);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState<JobPosition | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pendiente' | 'examen' | 'entrevista' | 'contratado'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        searchTerm === '' ||
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = filterPosition === '' || c.position === filterPosition;
      let matchesStatus = true;
      if (filterStatus === 'pendiente') matchesStatus = !c.mathCompleted;
      else if (filterStatus === 'examen') matchesStatus = c.mathCompleted && !c.interviewCompleted;
      else if (filterStatus === 'entrevista') matchesStatus = c.interviewCompleted && !c.hired;
      else if (filterStatus === 'contratado') matchesStatus = c.hired;
      return matchesSearch && matchesPosition && matchesStatus;
    });
  }, [candidates, searchTerm, filterPosition, filterStatus]);

  function getCandidateStatus(c: Candidate): { label: string; className: string } {
    if (c.hired) return { label: 'Contratado', className: 'badge-green' };
    if (c.verdict === 'recommended') return { label: 'Recomendado', className: 'badge-green' };
    if (c.verdict === 'reservations') return { label: 'Con Reservas', className: 'badge-yellow' };
    if (c.verdict === 'not_recommended') return { label: 'No Recomendado', className: 'badge-red' };
    if (c.interviewCompleted) return { label: 'Entrevistado', className: 'badge-purple' };
    if (c.mathCompleted) {
      const passed = (c.mathScore ?? 0) >= settings.mathPassScore;
      return passed
        ? { label: 'Examen Aprobado', className: 'badge-blue' }
        : { label: 'Examen Reprobado', className: 'badge-red' };
    }
    return { label: 'Pendiente', className: 'badge-yellow' };
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Reclutamiento</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {candidates.length} candidato{candidates.length !== 1 ? 's' : ''} registrado{candidates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={onNewCandidate}>
          <UserPlus size={18} />
          Nuevo Candidato
        </button>
      </div>

      {/* Search & Filters */}
      <div className="px-6 pb-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'border-primary-500' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, transition: { duration: 0.25 } }}
              exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 pt-1">
                <select
                  className="input-field"
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value as JobPosition | '')}
                >
                  <option value="">Todos los puestos</option>
                  {(Object.entries(JOB_POSITIONS) as [JobPosition, (typeof JOB_POSITIONS)[JobPosition]][]).map(
                    ([key, val]) => (
                      <option key={key} value={key}>
                        {key} - {val.name}
                      </option>
                    ),
                  )}
                </select>
                <select
                  className="input-field"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="examen">Examen completado</option>
                  <option value="entrevista">Entrevistado</option>
                  <option value="contratado">Contratado</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div {...fadeUp} className="flex flex-col items-center justify-center py-20 text-surface-500">
              <User size={48} className="mb-3 opacity-40" />
              <p className="text-lg font-medium">Sin candidatos</p>
              <p className="text-sm mt-1">
                {candidates.length === 0 ? 'Registra un nuevo candidato para comenzar' : 'No hay resultados con estos filtros'}
              </p>
            </motion.div>
          ) : (
            filtered.map((c, idx) => {
              const status = getCandidateStatus(c);
              return (
                <motion.div
                  key={c.id}
                  custom={idx}
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
                  onClick={() => onSelectCandidate(c.id)}
                >
                  {/* Avatar */}
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt={c.fullName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-surface-700 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(c.fullName)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                    >
                      {getInitials(c.fullName)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-surface-100 truncate">{c.fullName}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <Briefcase size={12} />
                        {JOB_POSITIONS[c.position].name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {formatDate(c.applicationDate)}
                      </span>
                      <span>{c.age} anios</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.mathCompleted && (
                      <span
                        className={`badge ${(c.mathScore ?? 0) >= settings.mathPassScore ? 'badge-green' : 'badge-red'}`}
                      >
                        <Brain size={12} />
                        {c.mathScore}/18
                      </span>
                    )}
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </div>

                  <ChevronRight size={18} className="text-surface-600 group-hover:text-surface-300 transition-colors flex-shrink-0" />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 2 : New Candidate Registration Form
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface NewCandidateFormProps {
  onBack: () => void;
  onCreated: (id: string) => void;
}

interface CandidateFormData {
  fullName: string;
  position: JobPosition | '';
  age: string;
  phone: string;
  neighborhood: string;
  source: string;
  photoFile: File | null;
  applicationPhotoFile: File | null;
  cvPhotoFile: File | null;
  privacyAccepted: boolean;
}

function NewCandidateForm({ onBack, onCreated }: NewCandidateFormProps) {
  const addCandidate = useStore((s) => s.addCandidate);

  const [form, setForm] = useState<CandidateFormData>({
    fullName: '',
    position: '',
    age: '',
    phone: '',
    neighborhood: '',
    source: '',
    photoFile: null,
    applicationPhotoFile: null,
    cvPhotoFile: null,
    privacyAccepted: false,
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [appPhotoPreview, setAppPhotoPreview] = useState<string | null>(null);
  const [cvPhotoPreview, setCvPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof CandidateFormData>(key: K, value: CandidateFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // File handlers
  const handleFileSelect = useCallback(
    async (
      file: File | undefined,
      field: 'photoFile' | 'applicationPhotoFile' | 'cvPhotoFile',
      setPreview: (v: string | null) => void,
    ) => {
      if (!file) return;
      setField(field, file);
      const base64 = await fileToBase64(file);
      setPreview(base64);
    },
    [],
  );

  // Semaphore checks
  const ageValid = useMemo(() => {
    if (!form.position || !form.age) return null;
    const minAge = JOB_POSITIONS[form.position as JobPosition].minAge;
    return Number(form.age) >= minAge;
  }, [form.position, form.age]);

  const docsComplete = useMemo(() => {
    return form.applicationPhotoFile !== null || form.cvPhotoFile !== null;
  }, [form.applicationPhotoFile, form.cvPhotoFile]);

  const formValid = useMemo(() => {
    return (
      form.fullName.trim() !== '' &&
      form.position !== '' &&
      form.age !== '' &&
      Number(form.age) > 0 &&
      form.phone.trim() !== '' &&
      form.neighborhood.trim() !== '' &&
      form.source !== '' &&
      form.privacyAccepted
    );
  }, [form]);

  const handleSave = async () => {
    if (!formValid || saving) return;
    setSaving(true);

    let photoUrl: string | undefined;
    let applicationPhotoUrl: string | undefined;
    let cvPhotoUrl: string | undefined;

    if (form.photoFile) photoUrl = await fileToBase64(form.photoFile);
    if (form.applicationPhotoFile) applicationPhotoUrl = await fileToBase64(form.applicationPhotoFile);
    if (form.cvPhotoFile) cvPhotoUrl = await fileToBase64(form.cvPhotoFile);

    const id = generateId();
    const now = new Date().toISOString();

    const candidate: Candidate = {
      id,
      fullName: form.fullName.trim(),
      applicationDate: now.split('T')[0],
      position: form.position as JobPosition,
      age: Number(form.age),
      phone: form.phone.trim(),
      neighborhood: form.neighborhood.trim(),
      source: form.source,
      photoUrl,
      applicationPhotoUrl,
      cvPhotoUrl,
      mathCompleted: false,
      interviewCompleted: false,
      hired: false,
      createdAt: now,
    };

    addCandidate(candidate);
    setSaving(false);
    onCreated(id);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <button
          className="p-2 rounded-xl hover:bg-surface-800 transition-colors"
          onClick={onBack}
        >
          <ArrowLeft size={20} className="text-surface-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Nuevo Candidato</h1>
          <p className="text-sm text-surface-400 mt-0.5">Registro de candidato</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <motion.div {...fadeUp} className="space-y-5 max-w-2xl mx-auto">
          {/* Section: Personal Info */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-surface-200 flex items-center gap-2">
              <User size={18} className="text-primary-400" />
              Informacion Personal
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nombre completo del candidato"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Puesto al que aplica *</label>
                  <select
                    className="input-field"
                    value={form.position}
                    onChange={(e) => setField('position', e.target.value as JobPosition | '')}
                  >
                    <option value="">Seleccionar puesto</option>
                    {(Object.entries(JOB_POSITIONS) as [JobPosition, (typeof JOB_POSITIONS)[JobPosition]][]).map(
                      ([key, val]) => (
                        <option key={key} value={key}>
                          {key} - {val.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Edad *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Edad"
                    min={16}
                    max={70}
                    value={form.age}
                    onChange={(e) => setField('age', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">
                    <span className="flex items-center gap-1"><Phone size={14} /> Telefono *</span>
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Numero de telefono"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">
                    <span className="flex items-center gap-1"><MapPin size={14} /> Colonia / Zona *</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Colonia o zona"
                    value={form.neighborhood}
                    onChange={(e) => setField('neighborhood', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-surface-400 mb-1">Como se entero? *</label>
                <select
                  className="input-field"
                  value={form.source}
                  onChange={(e) => setField('source', e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Documents / Photos */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-surface-200 flex items-center gap-2">
              <FileText size={18} className="text-primary-400" />
              Documentos y Fotografia
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <PhotoUploadBox
                label="Foto del candidato"
                icon={<Camera size={24} />}
                preview={photoPreview}
                onFileSelect={(f) => handleFileSelect(f, 'photoFile', setPhotoPreview)}
              />
              <PhotoUploadBox
                label="Solicitud de empleo"
                icon={<FileText size={24} />}
                preview={appPhotoPreview}
                onFileSelect={(f) => handleFileSelect(f, 'applicationPhotoFile', setAppPhotoPreview)}
              />
              <PhotoUploadBox
                label="Foto de CV"
                icon={<Upload size={24} />}
                preview={cvPhotoPreview}
                onFileSelect={(f) => handleFileSelect(f, 'cvPhotoFile', setCvPhotoPreview)}
              />
            </div>
          </div>

          {/* Filter Semaphore */}
          <div className="glass-card p-5 space-y-3">
            <h2 className="text-base font-semibold text-surface-200 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-400" />
              Filtro Automatico
            </h2>

            <div className="space-y-2">
              <SemaphoreRow
                label={
                  form.position
                    ? `Edad minima para ${form.position}: ${JOB_POSITIONS[form.position as JobPosition].minAge} anios`
                    : 'Selecciona un puesto para verificar edad'
                }
                status={ageValid === null ? 'neutral' : ageValid ? 'pass' : 'fail'}
              />
              <SemaphoreRow
                label="Documentacion basica (solicitud o CV)"
                status={docsComplete ? 'pass' : 'neutral'}
              />
              <SemaphoreRow
                label={form.neighborhood ? `Zona: ${form.neighborhood}` : 'Zona geografica (informativo)'}
                status="info"
              />
            </div>
          </div>

          {/* Privacy & Submit */}
          <div className="glass-card p-5 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={form.privacyAccepted}
                  onChange={(e) => setField('privacyAccepted', e.target.checked)}
                  className="w-5 h-5 rounded border-surface-600 bg-surface-900 text-primary-500 focus:ring-primary-500 cursor-pointer accent-primary-500"
                />
              </div>
              <span className="text-sm text-surface-300 group-hover:text-surface-200 transition-colors">
                El candidato acepta el aviso de privacidad y autoriza el uso de sus datos personales
                para fines del proceso de reclutamiento y seleccion.
              </span>
            </label>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={onBack}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={!formValid || saving}
                onClick={handleSave}
              >
                {saving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' as const }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Guardar Candidato
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// Photo Upload Box
function PhotoUploadBox({
  label,
  icon,
  preview,
  onFileSelect,
}: {
  label: string;
  icon: React.ReactNode;
  preview: string | null;
  onFileSelect: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="relative group cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0])}
      />
      <div
        className={`aspect-square rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-2 overflow-hidden ${
          preview
            ? 'border-success-500/40 bg-success-500/5'
            : 'border-surface-600 bg-surface-900/40 hover:border-primary-500/50 hover:bg-primary-500/5'
        }`}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="text-surface-500 group-hover:text-primary-400 transition-colors">
              {icon}
            </div>
            <span className="text-xs text-surface-500 text-center px-2 leading-tight">{label}</span>
          </>
        )}
      </div>
      {preview && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
          <Camera size={20} className="text-white" />
        </div>
      )}
    </div>
  );
}

// Semaphore Row
function SemaphoreRow({
  label,
  status,
}: {
  label: string;
  status: 'pass' | 'fail' | 'neutral' | 'info';
}) {
  const color = {
    pass: 'text-success-500',
    fail: 'text-danger-500',
    neutral: 'text-surface-500',
    info: 'text-primary-400',
  }[status];

  const Icon = {
    pass: CheckCircle,
    fail: XCircle,
    neutral: Clock,
    info: MapPin,
  }[status];

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon size={18} className={color} />
      <span className="text-sm text-surface-300">{label}</span>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW : Candidate Detail
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CandidateDetailProps {
  candidateId: string;
  onBack: () => void;
  onStartExam: (candidateId: string) => void;
}

function CandidateDetail({ candidateId, onBack, onStartExam }: CandidateDetailProps) {
  const candidate = useStore((s) => s.candidates.find((c) => c.id === candidateId));
  const settings = useStore((s) => s.settings);
  const deleteCandidate = useStore((s) => s.deleteCandidate);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400">
        <XCircle size={48} className="mb-3" />
        <p>Candidato no encontrado</p>
        <button className="btn-secondary mt-4" onClick={onBack}>
          Volver
        </button>
      </div>
    );
  }

  const mathPassed = candidate.mathCompleted && (candidate.mathScore ?? 0) >= settings.mathPassScore;

  const handleDelete = () => {
    deleteCandidate(candidateId);
    onBack();
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <button
          className="p-2 rounded-xl hover:bg-surface-800 transition-colors"
          onClick={onBack}
        >
          <ArrowLeft size={20} className="text-surface-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold gradient-text">Detalle del Candidato</h1>
        </div>
        <button
          className="p-2 rounded-xl hover:bg-danger-500/20 transition-colors text-surface-500 hover:text-danger-400"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <motion.div {...fadeUp} className="space-y-4 max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              {candidate.photoUrl ? (
                <img
                  src={candidate.photoUrl}
                  alt={candidate.fullName}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-surface-700 cursor-pointer hover:ring-primary-500 transition-all"
                  onClick={() => setImageViewerSrc(candidate.photoUrl!)}
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(candidate.fullName)} flex items-center justify-center text-white font-bold text-xl`}
                >
                  {getInitials(candidate.fullName)}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-surface-100">{candidate.fullName}</h2>
                <p className="text-sm text-primary-400 font-medium mt-0.5">
                  {JOB_POSITIONS[candidate.position].name} ({candidate.position})
                </p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-surface-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} /> {formatDate(candidate.applicationDate)}
                  </span>
                  <span>{candidate.age} anios</span>
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {candidate.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {candidate.neighborhood}
                  </span>
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  Fuente: {candidate.source}
                </p>
              </div>
            </div>
          </div>

          {/* Documents */}
          {(candidate.applicationPhotoUrl || candidate.cvPhotoUrl) && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary-400" />
                Documentos
              </h3>
              <div className="flex gap-3">
                {candidate.applicationPhotoUrl && (
                  <div
                    className="w-24 h-24 rounded-xl overflow-hidden cursor-pointer ring-1 ring-surface-700 hover:ring-primary-500 transition-all"
                    onClick={() => setImageViewerSrc(candidate.applicationPhotoUrl!)}
                  >
                    <img
                      src={candidate.applicationPhotoUrl}
                      alt="Solicitud"
                      className="w-full h-full object-cover"
                    />
                    <p className="text-[10px] text-surface-400 mt-1 text-center">Solicitud</p>
                  </div>
                )}
                {candidate.cvPhotoUrl && (
                  <div
                    className="w-24 h-24 rounded-xl overflow-hidden cursor-pointer ring-1 ring-surface-700 hover:ring-primary-500 transition-all"
                    onClick={() => setImageViewerSrc(candidate.cvPhotoUrl!)}
                  >
                    <img
                      src={candidate.cvPhotoUrl}
                      alt="CV"
                      className="w-full h-full object-cover"
                    />
                    <p className="text-[10px] text-surface-400 mt-1 text-center">CV</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Math Exam Section */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <Brain size={16} className="text-primary-400" />
              Examen de Matematicas
            </h3>
            {candidate.mathCompleted ? (
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${
                    mathPassed
                      ? 'bg-success-500/15 text-success-500 ring-1 ring-success-500/30'
                      : 'bg-danger-500/15 text-danger-500 ring-1 ring-danger-500/30'
                  }`}
                >
                  {candidate.mathScore}
                </div>
                <div>
                  <p className="text-surface-200 font-medium">
                    {candidate.mathScore} / 18 respuestas correctas
                  </p>
                  <span className={`badge mt-1 ${mathPassed ? 'badge-green' : 'badge-red'}`}>
                    {mathPassed ? (
                      <>
                        <CheckCircle size={12} /> Aprobado
                      </>
                    ) : (
                      <>
                        <XCircle size={12} /> Reprobado
                      </>
                    )}
                  </span>
                  <p className="text-xs text-surface-500 mt-1">
                    Puntaje minimo para aprobar: {settings.mathPassScore}/18
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-400">El candidato no ha realizado el examen.</p>
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => onStartExam(candidateId)}
                >
                  <Play size={16} />
                  Iniciar Examen
                </button>
              </div>
            )}
          </div>

          {/* Interview Section */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <Award size={16} className="text-primary-400" />
              Entrevista
            </h3>
            {candidate.interviewCompleted ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-surface-300">Estado:</span>
                  <span className="badge badge-green">
                    <CheckCircle size={12} /> Completada
                  </span>
                </div>
                {candidate.verdict && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-surface-300">Veredicto:</span>
                    <span
                      className={`badge ${
                        candidate.verdict === 'recommended'
                          ? 'badge-green'
                          : candidate.verdict === 'reservations'
                            ? 'badge-yellow'
                            : 'badge-red'
                      }`}
                    >
                      {candidate.verdict === 'recommended'
                        ? 'Recomendado'
                        : candidate.verdict === 'reservations'
                          ? 'Con Reservas'
                          : 'No Recomendado'}
                    </span>
                  </div>
                )}
                {candidate.interviewScore !== undefined && (
                  <p className="text-sm text-surface-400">
                    Puntaje de entrevista: <span className="text-surface-200 font-medium">{candidate.interviewScore}%</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-400">
                {candidate.mathCompleted
                  ? 'Pendiente de entrevista.'
                  : 'Debe completar el examen de matematicas primero.'}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-surface-100 mb-2">Eliminar Candidato</h3>
              <p className="text-sm text-surface-400 mb-5">
                Se eliminara permanentemente a <span className="text-surface-200 font-medium">{candidate.fullName}</span>. Esta accion no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </button>
                <button className="btn-danger flex-1" onClick={handleDelete}>
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {imageViewerSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
            onClick={() => setImageViewerSrc(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={imageViewerSrc}
              alt="Vista previa"
              className="max-w-full max-h-full object-contain rounded-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW 3 : Math Exam
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface MathExamViewProps {
  candidateId: string;
  onBack: (candidateId: string) => void;
}

function MathExamView({ candidateId, onBack }: MathExamViewProps) {
  const candidate = useStore((s) => s.candidates.find((c) => c.id === candidateId));
  const updateCandidate = useStore((s) => s.updateCandidate);
  const settings = useStore((s) => s.settings);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(MATH_QUESTIONS.length).fill(null));
  const [examFinished, setExamFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  // Timer
  useEffect(() => {
    if (examFinished) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, examFinished]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectAnswer = (optionIndex: number) => {
    if (examFinished) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = optionIndex;
      return next;
    });
  };

  const goNext = () => {
    if (currentQuestion < MATH_QUESTIONS.length - 1) {
      setCurrentQuestion((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((p) => p - 1);
    }
  };

  const finishExam = () => {
    const correct = answers.reduce<number>((acc, ans, idx) => {
      return acc + (ans === MATH_QUESTIONS[idx].correctAnswer ? 1 : 0);
    }, 0);
    setScore(correct);
    setExamFinished(true);

    updateCandidate(candidateId, {
      mathScore: correct,
      mathCompleted: true,
    });
  };

  const answeredCount = answers.filter((a) => a !== null).length;
  const progress = ((currentQuestion + 1) / MATH_QUESTIONS.length) * 100;
  const passed = score >= settings.mathPassScore;

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-full text-surface-400">
        Candidato no encontrado
      </div>
    );
  }

  // Results Screen
  if (examFinished) {
    return (
      <>
        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
          <button
            className="p-2 rounded-xl hover:bg-surface-800 transition-colors"
            onClick={() => onBack(candidateId)}
          >
            <ArrowLeft size={20} className="text-surface-300" />
          </button>
          <h1 className="text-2xl font-bold gradient-text">Resultado del Examen</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <motion.div {...fadeUp} className="max-w-lg mx-auto space-y-5">
            {/* Score Card */}
            <div className="glass-card p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-5xl font-bold ring-4 ${
                  passed
                    ? 'bg-success-500/15 text-success-500 ring-success-500/30'
                    : 'bg-danger-500/15 text-danger-500 ring-danger-500/30'
                }`}
              >
                {score}
              </motion.div>
              <p className="text-surface-300 mt-4 text-lg">
                de <span className="text-surface-100 font-bold">{MATH_QUESTIONS.length}</span> preguntas correctas
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4"
              >
                <span className={`badge text-base px-5 py-2 ${passed ? 'badge-green' : 'badge-red'}`}>
                  {passed ? (
                    <>
                      <CheckCircle size={18} /> APROBADO
                    </>
                  ) : (
                    <>
                      <XCircle size={18} /> REPROBADO
                    </>
                  )}
                </span>
              </motion.div>

              <p className="text-xs text-surface-500 mt-3">
                Tiempo: {formatTime(elapsedSeconds)} | Minimo requerido: {settings.mathPassScore}/18
              </p>
            </div>

            {/* Candidate Info */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                {candidate.photoUrl ? (
                  <img
                    src={candidate.photoUrl}
                    alt={candidate.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(candidate.fullName)} flex items-center justify-center text-white font-bold text-xs`}
                  >
                    {getInitials(candidate.fullName)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-surface-200">{candidate.fullName}</p>
                  <p className="text-xs text-surface-400">
                    {JOB_POSITIONS[candidate.position].name}
                  </p>
                </div>
              </div>
            </div>

            {/* Answer Summary */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-300 mb-3">Resumen de Respuestas</h3>
              <div className="grid grid-cols-6 gap-2">
                {MATH_QUESTIONS.map((q, idx) => {
                  const isCorrect = answers[idx] === q.correctAnswer;
                  return (
                    <div
                      key={q.id}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                        isCorrect
                          ? 'bg-success-500/20 text-success-400 ring-1 ring-success-500/30'
                          : 'bg-danger-500/20 text-danger-400 ring-1 ring-danger-500/30'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={() => onBack(candidateId)}
            >
              <ChevronLeft size={18} />
              Volver al Perfil
            </button>
          </motion.div>
        </div>
      </>
    );
  }

  // Exam In Progress
  const question = MATH_QUESTIONS[currentQuestion];
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <>
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-xl hover:bg-surface-800 transition-colors"
              onClick={() => onBack(candidateId)}
            >
              <ArrowLeft size={20} className="text-surface-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold gradient-text">Examen de Matematicas</h1>
              <p className="text-xs text-surface-400">{candidate.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm font-mono">
              <Clock size={16} className="text-primary-400" />
              <span className="text-surface-200">{formatTime(elapsedSeconds)}</span>
            </div>
            <span className="text-sm text-surface-400">
              {answeredCount}/{MATH_QUESTIONS.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' as const }}
          />
        </div>

        {/* Question Dots */}
        <div className="flex gap-1 mt-3 justify-center flex-wrap">
          {MATH_QUESTIONS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestion(idx)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                idx === currentQuestion
                  ? 'bg-primary-500 text-white scale-110'
                  : answers[idx] !== null
                    ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                    : 'bg-surface-800 text-surface-500 hover:bg-surface-700'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl mx-auto"
          >
            <div className="glass-card p-6 mt-4">
              <div className="flex items-start gap-3 mb-5">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">
                  {currentQuestion + 1}
                </span>
                <p className="text-surface-100 font-medium leading-relaxed pt-1">
                  {question.question}
                </p>
              </div>

              <div className="space-y-2">
                {question.options.map((option, optIdx) => {
                  const isSelected = answers[currentQuestion] === optIdx;
                  return (
                    <motion.button
                      key={optIdx}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectAnswer(optIdx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                        isSelected
                          ? 'bg-primary-500/15 border-primary-500/50 text-surface-100'
                          : 'bg-surface-900/40 border-surface-700 text-surface-300 hover:border-surface-500 hover:bg-surface-800/60'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-800 text-surface-400'
                        }`}
                      >
                        {optionLabels[optIdx]}
                      </span>
                      <span className="text-sm">{option}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4">
              <button
                className="btn-secondary flex items-center gap-2"
                disabled={currentQuestion === 0}
                onClick={goPrev}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              {currentQuestion === MATH_QUESTIONS.length - 1 ? (
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => {
                    if (answeredCount < MATH_QUESTIONS.length) {
                      setShowConfirmFinish(true);
                    } else {
                      finishExam();
                    }
                  }}
                >
                  <CheckCircle size={16} />
                  Finalizar Examen
                </button>
              ) : (
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={goNext}
                >
                  Siguiente
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Confirm Finish Modal */}
      <AnimatePresence>
        {showConfirmFinish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmFinish(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-surface-100 mb-2">Finalizar Examen</h3>
              <p className="text-sm text-surface-400 mb-1">
                Has respondido <span className="text-surface-200 font-bold">{answeredCount}</span> de{' '}
                <span className="text-surface-200 font-bold">{MATH_QUESTIONS.length}</span> preguntas.
              </p>
              {answeredCount < MATH_QUESTIONS.length && (
                <p className="text-sm text-warning-500 mb-4">
                  Las preguntas sin responder se contaran como incorrectas.
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button className="btn-secondary flex-1" onClick={() => setShowConfirmFinish(false)}>
                  Continuar
                </button>
                <button className="btn-primary flex-1" onClick={finishExam}>
                  Finalizar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
