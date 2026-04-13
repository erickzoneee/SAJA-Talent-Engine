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
  age: number;
  phone: string;
  neighborhood: string;
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
}
