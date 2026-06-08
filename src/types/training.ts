// ─────────────────────────────────────────────────────────────────────────────
//  JAC Capacita — Modelo de datos del módulo de Capacitación Interna
//  Incorporado a SAJA Talent Engine (especificación técnica v2.0)
// ─────────────────────────────────────────────────────────────────────────────

/** Estados del ciclo de vida de un proceso (spec 2.3). */
export type ProcesoEstado = 'borrador' | 'publicado' | 'autorizado' | 'archivado';

/** Calificación de una evaluación (spec 4.8.2). */
export type Calificacion = 'excelente' | 'bien' | 'regular' | 'repetir';

/** Item genérico de un catálogo administrable (spec 3.9). */
export interface CatalogItem {
  id: string;
  nombre: string;
  activo: boolean;
  /** Para EPP: emoji o ícono visual. */
  icono?: string;
  /** Para materiales: unidad de medida. */
  unidad?: string;
}

/** Catálogos dinámicos que alimentan las listas desplegables del wizard. */
export interface TrainingCatalogs {
  areas: CatalogItem[];
  lineas: CatalogItem[];
  tipos: CatalogItem[];
  epp: CatalogItem[];
  materiales: CatalogItem[];
}

export type CatalogKey = keyof TrainingCatalogs;

/** Foto asociada a un paso del proceso (spec 3.3). */
export interface ProcesoFoto {
  id: string;
  /** Imagen comprimida en base64 (JPEG 72%, máx 900px). */
  url: string;
  desc: string;
}

/** Micro-proceso / paso individual (spec 3.2). */
export interface ProcesoPaso {
  id: string;
  nombre: string;
  /** Texto original del supervisor. */
  narrativa: string;
  /** Versión mejorada por IA, si fue aceptada. Se prefiere al mostrar al trabajador. */
  narrativaMejorada?: string;
  fotos: ProcesoFoto[];
  duracionEstimada?: number;
}

/** Pregunta de opción múltiple de la evaluación (spec 3.5). */
export interface Pregunta {
  id: string;
  texto: string;
  /** Exactamente 3 opciones: A, B, C. */
  opciones: string[];
  /** Índice (0=A, 1=B, 2=C) de la respuesta correcta. */
  correcta: number;
  /** Número del paso al que hace referencia. */
  paso?: number;
  generadaPorIA?: boolean;
}

/** Proceso de capacitación completo (spec 3.1). */
export interface Proceso {
  id: string;
  nombre: string;
  area: string;
  linea: string;
  tipo: string;
  objetivo: string;
  version: string;
  estado: ProcesoEstado;

  // Portada visual (spec 4.2.2)
  portadaInicio?: string;
  portadaResultado?: string;
  portadaNarracion?: string;

  // Recursos necesarios (spec 4.2.3)
  materiales: string[];
  equipo: string[];
  epp: string[];

  // Contenido
  pasos: ProcesoPaso[];
  preguntas: Pregunta[];

  // Metadatos administrativos
  notasInternas?: string;
  tiempoEstimado?: number;
  personasRequeridas?: number;

  creadoPor: string;
  creadoAt: string;
  publicadoAt?: string;
  autorizadoPor?: string;
  autorizadoAt?: string;

  // Versionado (spec 2.3)
  procesoPadreId?: string;
  motivoCambio?: string;
  /** Marca de "listo para autorizar" puesta por el supervisor (spec 4.7.1). */
  listoParaAutorizar?: boolean;
}

/** Respuesta individual dentro de un registro (spec 3.8). */
export interface RespuestaRegistro {
  preguntaId: string;
  respuestaDada: number;
  esCorrecta: boolean;
  tiempoSeg: number;
}

/** Registro de un intento de capacitación (spec 3.7). */
export interface RegistroCapacitacion {
  id: string;
  empleadoNombre: string;
  empleadoNumero: string;
  procesoId: string;
  procesoNombre: string;
  procesoVersion: string;
  intentoNum: number;

  inicioAt: string;
  finAt: string;
  tiempoTotalSeg: number;
  tiempoPresentacionSeg: number;
  tiempoEvaluacionSeg: number;

  correctas: number;
  totalPreguntas: number;
  porcentaje: number;
  calificacion: Calificacion;
  pasa: boolean;
  alertaMuyRapido: boolean;

  respuestas: RespuestaRegistro[];
}

/** Preferencias de narración por voz (spec 4.5.3). */
export interface VozPref {
  /** Velocidad de lectura. */
  rate: number;
}

/** Etiquetas y estilo visual de cada estado, para badges en el tema oscuro. */
export const ESTADO_META: Record<
  ProcesoEstado,
  { label: string; icon: string; badge: string }
> = {
  borrador: { label: 'Borrador', icon: '📝', badge: 'badge-yellow' },
  publicado: { label: 'Publicado', icon: '✅', badge: 'badge-green' },
  autorizado: { label: 'Autorizado', icon: '🔒', badge: 'badge-blue' },
  archivado: { label: 'Archivado', icon: '📦', badge: 'badge-purple' },
};
