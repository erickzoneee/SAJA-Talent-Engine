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
  /** v2.5: ultima modificacion — en el sync multi-dispositivo gana el mas reciente */
  syncStamp?: string;
  fullName: string;
  applicationDate: string;
  position: JobPosition;
  age?: number;
  phone: string;
  /** v2.13: correo del candidato, capturado en recepcion despues del video. */
  email?: string;
  neighborhood?: string;
  source: string;
  // ─── v2.4: RFC del candidato (validado al dar de alta) y reingreso ───
  rfc?: string;
  reingreso?: boolean;
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

// v2.13: la ficha de recepcion se reduce al minimo. El video se ve PRIMERO;
// si el candidato dice que le interesa se capturan nombre/telefono/puesto/correo
// y se responde el filtro de lectura y suma. La escolaridad, ultimo empleo,
// tiempo, motivo de salida, disponibilidad y fuente se capturan AHORA en la
// entrevista (Seccion 1), no aqui. Los campos viejos quedan OPCIONALES para no
// romper candidatos ya guardados.
export interface ReceptionData {
  escolaridad?: string;
  ultimoTrabajo?: string;
  tiempoUltimoEmpleo?: string;
  motivoSalida?: string;
  disponibilidad?: string;
  disponibilidadOtro?: string;
  // v2.13: filtro previo de lectura y suma (auto-declarado, si/no)
  sabeLeer?: boolean;
  sabeSumar?: boolean;
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

// v2.13: resultado de los juegos-quiz de la 2a mitad de la entrevista
// (conocimientos generales + matematicas).
export interface InterviewQuizResult {
  general: number;
  generalTotal: number;
  mate: number;
  mateTotal: number;
  aciertos: number;
  totalPreguntas: number;
}

export interface InterviewV2Data {
  entrevistador: string;
  fecha: string;
  puntualidadEntrevista: string;
  // v2.13: transporte/traslado eliminado — queda opcional solo por compat.
  comoLlego?: string;
  // ─── v2.13: datos que antes se capturaban en recepcion y ahora en la
  // entrevista (Seccion 1). Todos opcionales para no romper entrevistas viejas. ───
  escolaridad?: string;
  ultimoTrabajo?: string;
  tiempoUltimoEmpleo?: string;
  motivoSalida?: string;
  /** Disponibilidad de horario, ahora si/no. */
  disponibilidadHorario?: boolean;
  /** ¿Como se entero de la vacante? (fuente). */
  fuente?: string;
  scores: Record<string, RubricScore>;
  observacionesSeccion: Record<string, string>;
  observacionesFinales: string;
  total: number;
  porcentaje: number;
  diagnostico: Verdict;
  alertas: string[];
  // v2.13: 2a mitad de la entrevista (juegos-quiz)
  quiz?: InterviewQuizResult;
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
// v2.5 — se agrega la renuncia voluntaria como documento de baja
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SignedDocKey =
  | 'contrato'
  | 'acuseGeneral'
  | 'avisoISR'
  | 'convenioVacaciones'
  | 'cartaUniforme'
  | 'renunciaVoluntaria';

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
  /** v2.5: ultima modificacion — en el sync multi-dispositivo gana el mas reciente */
  syncStamp?: string;
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
  /** v2.5: ultima modificacion — en el sync multi-dispositivo gana el mas reciente */
  syncStamp?: string;
  candidateId: string;
  expedientNumber: number;
  fullName: string;
  position: JobPosition;
  hireDate: string;
  /** Sueldo SEMANAL (= sueldo diario x 7, con septimo dia). */
  salary: number;
  /** v2.4: sueldo diario capturado; el semanal se calcula automatico. */
  dailySalary?: number;
  schedule: string;
  contractType: ContractType;
  area: string;
  supervisor: string;
  imssNumber: string;
  // ─── v2.4 ───
  rfc?: string;
  reingreso?: boolean;
  /** Texto del contrato individual (autollenado y editable por RH). */
  contractText?: string;
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
  // ─── v2.8 (Julio 2026): expediente completo del colaborador ───
  // Datos adicionales de las "pantallas completas" (datos personales,
  // direccion, formacion, laboral, economicos y beneficiarios). Es un objeto
  // opcional para no romper los expedientes ya guardados; se captura/edita en
  // la pestana Informacion del expediente.
  expediente?: EmployeeExpediente;
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
  /** v2.5: ultima modificacion — en el sync multi-dispositivo gana la mas reciente */
  syncStamp?: string;
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
  // Recepcion: 1 video informativo. Onboarding: 11 videos de la semana 1 por id de modulo.
  receptionVideoUrl?: string;
  onboardingVideoUrls?: Record<number, string>;
  // ─── v2.1: URLs de narracion (audio TTS). Modo "narrado": audio + laminas y
  // subtitulos sincronizados. Se usa cuando no hay video real. ───
  receptionNarrationUrl?: string;
  onboardingNarrationUrls?: Record<number, string>;
  // ─── v2.4: catalogos editables de contratacion ───
  /** Tipos de horario asignables (3 turnos por defecto; editables). */
  schedules?: string[];
  /** Areas asignables (editables; se pueden agregar nuevas). */
  areas?: string[];
  /** v2.14: supervisores directos asignables (lista desplegable editable). */
  supervisors?: string[];
}

// ─── v2.4: valores por defecto de los catalogos de contratacion ─────────────

export const DEFAULT_SCHEDULES: string[] = [
  'TURNO MATUTINO · LUNES A SABADO 7:00 - 15:30',
  'TURNO VESPERTINO · LUNES A SABADO 14:00 - 22:30',
  'TURNO MIXTO · LUNES A VIERNES 9:00 - 19:00',
];

export const DEFAULT_AREAS: string[] = [
  'PRODUCCION',
  'ACONDICIONAMIENTO',
  'ALMACEN',
  'MANTENIMIENTO',
  'ADMINISTRACION',
  'CONTROL DE CALIDAD',
];

// v2.14: supervisores directos que aparecen en la lista desplegable. Salen de
// los puestos a los que reporta cada vacante (JOB_POSITIONS.reportsTo); RH
// puede agregar o quitar los que necesite desde la misma lista.
export const DEFAULT_SUPERVISORS: string[] = [
  'DIRECCION GENERAL',
  'ENCARGADO DE PRODUCCION',
  'ASISTENTE DE DIRECCION',
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.8 — EXPEDIENTE COMPLETO DEL COLABORADOR
// Campos adicionales de las "pantallas completas" que deben tener todos los
// colaboradores. Todos opcionales: el nombre, puesto, sueldo diario, horario,
// area, RFC, NSS (imssNumber), fecha de ingreso, tipo de contrato y estatus
// siguen viviendo en los campos de primer nivel de Employee; aqui solo van los
// datos que no existian antes.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Beneficiary {
  nombreCompleto?: string;
  parentesco?: string;
  porcentaje?: number;
}

export interface EmployeeExpediente {
  // Datos personales
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  iniciales?: string;
  fechaNacimiento?: string;
  estadoCivil?: string;
  curp?: string;
  tipoSangre?: string;
  // Direccion y contacto
  estado?: string;
  ciudad?: string;
  municipio?: string;
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  codigoPostal?: string;
  emailPersonal?: string;
  telefonoMovil?: string;
  telefonoCasa?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaParentesco?: string;
  contactoEmergenciaTelefono?: string;
  // Formacion academica
  nivelEstudios?: string;
  profesion?: string;
  // Informacion laboral (complementa hireDate/contractType/area/schedule/status)
  finContrato?: string;
  /** v2.14: siempre igual a la fecha de ingreso (ya no se captura aparte). */
  inicioContrato?: string;
  /** @deprecated v2.14: ya no se captura; se conserva por los expedientes viejos. */
  fechaReingreso?: string;
  altaImss?: string;
  /** @deprecated v2.14: ya no se captura; la baja se maneja en Egreso. */
  bajaImss?: string;
  /** @deprecated v2.14: se quitaron los marcadores de la ficha. */
  esJefe?: boolean;
  /** @deprecated v2.14: se quitaron los marcadores de la ficha. */
  esEventual?: boolean;
  /** @deprecated v2.14: ya no se captura la clase de riesgo IMSS. */
  clase?: string;
  /** v2.14: "Creditos vigentes" — FONACOT / INFONAVIT / NINGUNO. */
  creditoFonacot?: string;
  motivoBaja?: string;
  observaciones?: string;
  // Datos economicos (complementa dailySalary/salary)
  salarioAnterior?: number;
  bono?: number;
  factorSdi?: number;
  banco?: string;
  numeroCuenta?: string;
  clabe?: string;
  // Beneficiarios
  beneficiarioPrimario?: Beneficiary;
  beneficiarioSecundario?: Beneficiary;
  observacionesBeneficiarios?: string;
}

// Factor de integracion del Salario Diario Integrado (SDI) por defecto.
export const DEFAULT_SDI_FACTOR = 1.0452;

// ─── Catalogos de opciones para el expediente ───────────────────────────────
export const ESTADO_CIVIL_OPTIONS = ['Soltero', 'Casado', 'Union libre', 'Divorciado', 'Viudo', 'Separado'] as const;
export const TIPO_SANGRE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const NIVEL_ESTUDIOS_OPTIONS = ['Ninguno', 'Primaria', 'Secundaria', 'Preparatoria', 'Tecnico', 'Licenciatura', 'Posgrado'] as const;
export const CLASE_RIESGO_OPTIONS = ['I', 'II', 'III', 'IV', 'V'] as const;
// v2.14: creditos vigentes del colaborador (antes era el texto libre "Credito FONACOT").
export const CREDITO_VIGENTE_OPTIONS = ['FONACOT', 'INFONAVIT', 'NINGUNO'] as const;
export const PARENTESCO_OPTIONS = ['Conyuge', 'Concubino(a)', 'Hijo(a)', 'Padre', 'Madre', 'Hermano(a)', 'Abuelo(a)', 'Otro'] as const;
export const BANCO_OPTIONS = [
  'BBVA', 'Banamex', 'Santander', 'Banorte', 'HSBC', 'Scotiabank',
  'Inbursa', 'Banco Azteca', 'BanCoppel', 'Afirme', 'Banregio', 'STP', 'Otro',
] as const;
export const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima', 'Durango', 'Estado de Mexico',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacan', 'Morelos', 'Nayarit',
  'Nuevo Leon', 'Oaxaca', 'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatan', 'Zacatecas',
] as const;
