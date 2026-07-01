export type JobPosition = 'AG' | 'AM' | 'AO' | 'EC';

export const JOB_POSITIONS: Record<JobPosition, { name: string; area: string; minAge: number; reportsTo: string }> = {
  AG: { name: 'Ayudante General', area: 'Produccion / Acondicionamiento', minAge: 18, reportsTo: 'Encargado de Produccion / Direccion' },
  AM: { name: 'Auxiliar de Mantenimiento', area: 'Mantenimiento', minAge: 22, reportsTo: 'Direccion General / Asistente' },
  AO: { name: 'Auxiliar de Oficina (Recepcion)', area: 'Administracion', minAge: 20, reportsTo: 'Direccion General / Asistente' },
  EC: { name: 'Encargado de Calidad Integral', area: 'Control de Calidad', minAge: 22, reportsTo: 'Direccion General' },
};

export type Verdict = 'recommended' | 'reservations' | 'not_recommended';
export type EmployeeStatus = 'trial' | 'active' | 'inactive';
export type ContractType = 'eventual' | 'indefinido';
export type ExitType = 'renuncia' | 'fin_contrato' | 'rescision' | 'mutuo_acuerdo' | 'abandono' | 'incapacidad';
export type LetterType = 'A' | 'B' | 'C';
export type IncidentType = 'falta_justificada' | 'falta_injustificada' | 'retardo' | 'amonestacion_verbal' | 'amonestacion_escrita' | 'acta_administrativa';

export interface Candidate {
  id: string;
  fullName: string;
  applicationDate: string;
  position: JobPosition;
  age?: number;
  phone: string;
  neighborhood?: string;
  source: string;
  photoUrl?: string;
  applicationPhotoUrl?: string;
  cvPhotoUrl?: string;
  mathScore?: number;
  mathCompleted: boolean;
  interviewCompleted: boolean;
  interviewData?: InterviewData;
  interviewScore?: number;
  verdict?: Verdict;
  hired: boolean;
  createdAt: string;
  // ─── v2.0 (BRD Junio 2026) ───
  reception?: ReceptionData;
  interviewV2?: InterviewV2Data;
  admissionExam?: AdmissionExamResult;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — ETAPA 0: RECEPCION Y FILTRO PREVIO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ESCOLARIDAD_OPTIONS = ['Primaria', 'Secundaria', 'Preparatoria', 'Tecnico', 'Licenciatura'] as const;
export const TIEMPO_EMPLEO_OPTIONS = ['Menos de 6 meses', '6 meses a 1 ano', '1 a 2 anos', 'Mas de 2 anos'] as const;
export const DISPONIBILIDAD_OPTIONS = ['Lunes a sabado completo', 'Solo lunes a viernes', 'Otro'] as const;
export const FUENTE_OPTIONS = ['Recomendado', 'Bolsa de trabajo', 'Cartel en puerta', 'Otro'] as const;

export type VideoDecision = 'interesado' | 'lo_pensara';

export interface ReceptionData {
  escolaridad: string;
  ultimoTrabajo: string;
  tiempoUltimoEmpleo: string;
  motivoSalida: string;
  disponibilidad: string;
  disponibilidadOtro?: string;
  videoCompleto: boolean;
  videoDecision?: VideoDecision;
  videoTimestamp?: string;
  cita?: {
    fecha: string;
    hora: string;
    agendadaPor: string;
    agendadaEn: string;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — GUIA DE ENTREVISTA INTERACTIVA (5 secciones, 13 rubros, max 39 pts)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type RubricScore = 0 | 1 | 2 | 3;

export interface InterviewV2Data {
  entrevistador: string;
  fecha: string;
  puntualidadEntrevista: string;
  comoLlego: string;
  scores: Record<string, RubricScore>;
  observacionesSeccion: Record<string, string>;
  observacionesFinales: string;
  total: number;
  porcentaje: number;
  diagnostico: Verdict;
  alertas: string[];
  decision?: 'agendar_inicio' | 'no_continuar';
  decisionRegistro?: {
    fecha: string;
    usuario: string;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — EXAMEN DE ADMISION POR PUESTO (10 comunes + 15 especificas = 25)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type OptionKey = 'a' | 'b' | 'c' | 'd';
export type ExamOutcome = 'aprobado' | 'con_reserva' | 'no_aprobado';
export type QuestionType = 'comun' | 'especifica';

export interface BankQuestion {
  id: string;
  tipo: QuestionType;
  puesto: JobPosition | null;
  categoria: string;
  texto: string;
  imagenUrl?: string;
  opciones: Record<OptionKey, string>;
  correcta: OptionKey;
  explicacion?: string;
  activa: boolean;
  ordenSugerido: number;
  creadaPor: string;
  creadaEn: string;
  modificadaPor?: string;
  modificadaEn?: string;
  historial: { fecha: string; usuario: string; accion: string }[];
}

export interface ExamQuestionSnapshot {
  idPregunta: string;
  tipo: QuestionType;
  categoria: string;
  texto: string;
  opciones: Record<OptionKey, string>;
  correcta: OptionKey;
  respuesta?: OptionKey;
}

export interface AdmissionExamResult {
  fecha: string;
  puesto: JobPosition;
  aciertosComunes: number;
  aciertosEspecificas: number;
  aciertosTotales: number;
  totalPreguntas: number;
  resultado: ExamOutcome;
  duracionSegundos: number;
  preguntas: ExamQuestionSnapshot[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — DOCUMENTOS OBLIGATORIOS (5 documentos fisicos con firma)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SignedDocKey = 'contrato' | 'acuseGeneral' | 'avisoISR' | 'convenioVacaciones' | 'cartaUniforme';

export interface SignedDocStatus {
  generado: boolean;
  fechaGenerado?: string;
  firmadoUrl?: string;
  fechaFirmado?: string;
}

export type SignedDocsV2 = Record<SignedDocKey, SignedDocStatus>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — RECORRIDO POR INSTALACIONES (checklist estandarizado)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TourRecord {
  items: { id: string; label: string; done: boolean }[];
  guia: string;
  completadoEn?: string;
  firmaUrl?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.0 — ALERTAS DEL SISTEMA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AlertType = 'video_reprobado_3' | 'tengo_dudas' | 'contrato_por_vencer' | 'banco_preguntas' | 'seguimiento_especial';

export interface SystemAlert {
  id: string;
  tipo: AlertType;
  mensaje: string;
  fecha: string;
  empleadoId?: string;
  destinatarios: string[];
  atendida: boolean;
}

export interface MathQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface InterviewData {
  interviewer: string;
  date: string;
  step3: {
    positives: string[];
    negatives: string[];
    comment: string;
  };
  step4: {
    lastCompany: string;
    lastPosition: string;
    activities: string;
    exitReason: string;
    hasSimilarExperience: boolean;
    previousEmploymentTime: string;
    seeksStability: boolean;
  };
  step5: {
    standingWork: boolean;
    heavyLifting: boolean;
    gettingDirty: boolean;
    repetitiveWork: boolean;
    rulesAndUniform: boolean;
    frequentAbsences: boolean;
    transportation: string;
    availableSchedule: string;
  };
  step6: {
    answers: { question: string; answer: string }[];
    ratings: {
      attitude: number;
      responsibility: number;
      willingness: number;
      stability: number;
      communication: number;
      presentation: number;
    };
    observations: string;
  };
  step7: {
    offeredSalary: string;
    offeredSchedule: string;
    startDate: string;
    notes: string;
  };
}

export interface Employee {
  id: string;
  candidateId: string;
  expedientNumber: number;
  fullName: string;
  position: JobPosition;
  hireDate: string;
  salary: number;
  schedule: string;
  contractType: ContractType;
  area: string;
  supervisor: string;
  imssNumber: string;
  bankDetails: string;
  status: EmployeeStatus;
  documents: DocumentChecklist;
  onboardingProgress: OnboardingProgress;
  evaluations: Evaluation[];
  incidents: Incident[];
  bonuses: Bonus[];
  trainings: Training[];
  trialEndDate: string;
  trialExtended: boolean;
  exitData?: ExitData;
  photoUrl?: string;
  createdAt: string;
  // ─── v2.0 (BRD Junio 2026) ───
  signedDocsV2?: SignedDocsV2;
  seguimientoEspecial?: boolean;
  contratacionAutorizada?: { por: string; fecha: string; motivo: string };
  recorrido?: TourRecord;
  welcomeVideoSeen?: { fecha: string };
}

export interface DocumentChecklist {
  solicitud: { done: boolean; photoUrl?: string };
  ine: { done: boolean; photoUrl?: string };
  actaNacimiento: { done: boolean; photoUrl?: string };
  curp: { done: boolean; photoUrl?: string };
  imss: { done: boolean; photoUrl?: string };
  comprobanteDomicilio: { done: boolean; photoUrl?: string };
  comprobanteEstudios: { done: boolean; photoUrl?: string };
  cartasRecomendacion: { done: boolean; photoUrl?: string };
  antecedentesNoPenales: { done: boolean; photoUrl?: string; onlyMale?: boolean };
  rfc: { done: boolean; photoUrl?: string };
}

export interface OnboardingModule {
  id: number;
  name: string;
  deliveredBy: string;
  duration: string;
  requiresSignature: boolean;
  completed: boolean;
  completedDate?: string;
  quizScore?: number;
  signatureUrl?: string;
  // ─── v2.0: videos de capacitacion semana 1 ───
  isVideo?: boolean;
  durationMin?: number;
  critical?: boolean;
  questionsCount?: number;
  attempts?: number;
  blocked?: boolean;
  dudas?: boolean;
  viewedAt?: string;
}

export interface OnboardingProgress {
  modules: OnboardingModule[];
  finalQuizScore?: number;
  certificateGenerated: boolean;
  completedDate?: string;
}

export interface Evaluation {
  id: string;
  date: string;
  type: string;
  ratings: {
    punctuality: number;
    instructions: number;
    quality: number;
    attitude: number;
    relationships: number;
    bpmCompliance: number;
    // v2.0: 10 rubros escala 1-5 (opcionales para evaluaciones v1)
    initiative?: number;
    cleanliness?: number;
    productivity?: number;
    safety?: number;
  };
  observations: string;
  decision?: string;
  averageScore: number;
}

export interface Incident {
  id: string;
  date: string;
  type: IncidentType;
  description: string;
  signatureUrl?: string;
}

export interface Bonus {
  id: string;
  period: string;
  amount: number;
  criteria: string;
  date: string;
}

export interface Training {
  id: string;
  topic: string;
  date: string;
  duration: string;
  result: string;
}

export interface ExitData {
  exitDate: string;
  exitType: ExitType;
  reason: string;
  observations: string;
  exitInterview: {
    mainReason: string;
    liked: string;
    disliked: string;
    supervisorRating: number;
    environmentRating: number;
    wouldRecommend: string;
    suggestions: string;
  };
  letterType: LetterType;
  letterGenerated: boolean;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyRfc: string;
  directorName: string;
  recommendedThreshold: number;
  reservationsThreshold: number;
  mathPassScore: number;
  supervisorPin: string;
  directionPin: string;
  // ─── v2.1: URLs de videos reales (si vacio, se usa el reproductor de demostracion) ───
  // Recepcion: 1 video informativo. Onboarding: 10 videos de la semana 1 por id de modulo.
  receptionVideoUrl?: string;
  onboardingVideoUrls?: Record<number, string>;
  // ─── v2.1: URLs de narracion (audio TTS). Modo "narrado": audio + laminas y
  // subtitulos sincronizados. Se usa cuando no hay video real. ───
  receptionNarrationUrl?: string;
  onboardingNarrationUrls?: Record<number, string>;
}
