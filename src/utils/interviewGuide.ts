import type { RubricScore, Verdict } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GUIA DE ENTREVISTA INTERACTIVA v2.0 — BRD Junio 2026
// 5 secciones. La seccion 1 confirma datos (no califica).
// 13 rubros calificables (escala 0-3) → puntaje maximo 39.
// Diagnostico: 33-39 (85%+) Recomendable | 24-32 (62-84%) Con reserva |
//              0-23 o cualquier rubro en 0 → No recomendable.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RubricDef {
  id: string;
  label: string;
  preguntaSugerida: string;
  queBuscar: string;
}

export interface SectionDef {
  id: string;
  numero: number;
  titulo: string;
  notaEntrevistador: string;
  rubros: RubricDef[];
}

export const INTERVIEW_SECTIONS: SectionDef[] = [
  {
    id: 's2',
    numero: 2,
    titulo: 'Actitud y primera impresion',
    notaEntrevistador:
      'Se evalua observando — no preguntando. La guia te dice que buscar en cada rubro.',
    rubros: [
      {
        id: 'puntualidad',
        label: 'Puntualidad',
        preguntaSugerida: 'No se pregunta — observa si llego a tiempo a la entrevista.',
        queBuscar:
          'Llego puntual o antes = buena senal. Retraso sin aviso ni disculpa = alerta. Un retraso avisado con causa razonable es aceptable.',
      },
      {
        id: 'presentacion',
        label: 'Presentacion personal',
        preguntaSugerida: 'No se pregunta — observa su arreglo personal.',
        queBuscar:
          'Limpieza y arreglo razonable para el contexto. No se busca ropa cara: se busca aseo, ropa cuidada y postura. Descuido evidente = alerta.',
      },
      {
        id: 'actitud',
        label: 'Actitud general',
        preguntaSugerida: 'No se pregunta — observa como se conduce durante la conversacion.',
        queBuscar:
          'Saluda, mira de frente, contesta con disposicion. Nervios normales no son alerta. Apatia, molestia o respuestas cortantes si lo son.',
      },
      {
        id: 'habla_jefes',
        label: 'Como habla de jefes anteriores',
        preguntaSugerida: '¿Como era tu relacion con tu ultimo jefe?',
        queBuscar:
          'Respeto al hablar de jefes y companeros anteriores, aunque haya tenido problemas. Quejas constantes, insultos o culpar a todos = alerta.',
      },
    ],
  },
  {
    id: 's3',
    numero: 3,
    titulo: 'Experiencia laboral',
    notaEntrevistador:
      "Buscar estabilidad. Muchos empleos en poco tiempo = alerta. La guia explica que es 'normal' y que es 'alerta'.",
    rubros: [
      {
        id: 'ultimo_empleo',
        label: 'Ultimo empleo',
        preguntaSugerida: '¿En que trabajabas y que actividades hacias en tu ultimo empleo?',
        queBuscar:
          'Puede describir con claridad que hacia. Respuestas vagas o contradicciones con la ficha de recepcion = alerta.',
      },
      {
        id: 'motivo_salida',
        label: 'Motivo de salida',
        preguntaSugerida: '¿Por que saliste de ese trabajo?',
        queBuscar:
          'Motivos claros y consistentes (cierre, distancia, mejor oferta) son normales. Despidos por conflicto, abandono o versiones que cambian = alerta.',
      },
      {
        id: 'experiencia_relevante',
        label: 'Experiencia relevante',
        preguntaSugerida: '¿Has hecho trabajo parecido al del puesto que buscas aqui?',
        queBuscar:
          'Experiencia similar suma pero no es obligatoria. Evalua si lo que sabe hacer le sirve al puesto. Sin experiencia pero con disposicion = aceptable.',
      },
      {
        id: 'estabilidad',
        label: 'Estabilidad laboral',
        preguntaSugerida: '¿Cuanto tiempo duraste en tus ultimos trabajos?',
        queBuscar:
          'Normal: empleos de 1 ano o mas, o razones claras de cambio. Alerta: muchos empleos de pocos meses sin explicacion solida.',
      },
    ],
  },
  {
    id: 's4',
    numero: 4,
    titulo: 'Disposicion para aprender',
    notaEntrevistador:
      'Preguntas abiertas. La guia da el ejemplo de pregunta y que respuesta buscar.',
    rubros: [
      {
        id: 'capacitacion_previa',
        label: 'Capacitacion previa',
        preguntaSugerida: '¿Te han capacitado en algun trabajo? ¿Como te fue aprendiendo cosas nuevas?',
        queBuscar:
          'Apertura a aprender y ejemplos concretos de cosas que aprendio. Rechazo a ser ensenado o "yo ya se todo" = alerta.',
      },
      {
        id: 'seguimiento_instrucciones',
        label: 'Seguimiento de instrucciones',
        preguntaSugerida: 'Si tu jefe te pide hacer algo de una forma distinta a como tu lo haces, ¿que haces?',
        queBuscar:
          'Buena respuesta: lo hago como me indican y si tengo duda pregunto. Alerta: "yo lo hago a mi manera" o molestia ante la supervision.',
      },
      {
        id: 'trabajo_equipo',
        label: 'Trabajo en equipo',
        preguntaSugerida: 'Cuentame de alguna vez que te toco trabajar en equipo. ¿Como te fue?',
        queBuscar:
          'Habla bien de companeros y reconoce el trabajo de otros. Conflictos constantes con companeros = alerta.',
      },
      {
        id: 'honestidad',
        label: 'Honestidad',
        preguntaSugerida: '¿Alguna vez cometiste un error en el trabajo? ¿Que hiciste?',
        queBuscar:
          'Reconoce errores propios y dice como los corrigio. Negar haber cometido errores jamas, o detectar mentiras en la entrevista = alerta grave.',
      },
    ],
  },
  {
    id: 's5',
    numero: 5,
    titulo: 'Disponibilidad',
    notaEntrevistador:
      'Si no puede con el horario, es un no desde el inicio — no negociar aqui.',
    rubros: [
      {
        id: 'disponibilidad',
        label: 'Disponibilidad (horario, inicio y traslado)',
        preguntaSugerida:
          '¿Puedes trabajar el horario completo de lunes a sabado? ¿Cuando podrias empezar? ¿Como llegarias al trabajo cada dia?',
        queBuscar:
          'Confirma sin dudar que puede con el horario, tiene fecha de inicio clara y un traslado realista. Si no puede con el horario, califica 0 — es un no desde el inicio.',
      },
    ],
  },
];

export const SCORED_RUBRIC_COUNT = INTERVIEW_SECTIONS.reduce((acc, s) => acc + s.rubros.length, 0); // 13
export const INTERVIEW_MAX_SCORE = SCORED_RUBRIC_COUNT * 3; // 39

// ─── Escala de calificacion — 4 niveles (BRD seccion 4) ─────────────────────

export const SCORE_SCALE: { value: RubricScore; label: string; descripcion: string; color: string; activeClass: string }[] = [
  {
    value: 3,
    label: 'Buena respuesta',
    descripcion: 'Respuesta clara, sin contradicciones, actitud positiva, demuestra lo que se busca.',
    color: 'text-success-500',
    activeClass: 'bg-success-500 text-white ring-success-500',
  },
  {
    value: 2,
    label: 'Aceptable',
    descripcion: 'Respuesta incompleta pero sin alertas. Actitud normal. No destaca pero tampoco preocupa.',
    color: 'text-primary-400',
    activeClass: 'bg-primary-500 text-white ring-primary-500',
  },
  {
    value: 1,
    label: 'Debil',
    descripcion: 'Dudas, contradicciones menores, poca claridad. Hay reservas pero no es definitivo.',
    color: 'text-warning-500',
    activeClass: 'bg-warning-500 text-white ring-warning-500',
  },
  {
    value: 0,
    label: 'Alerta',
    descripcion: 'Respuesta negativa, actitud problematica, mentira detectada, inconsistencia grave. Queda registrada como alerta en el expediente.',
    color: 'text-danger-500',
    activeClass: 'bg-danger-500 text-white ring-danger-500',
  },
];

// ─── Diagnostico automatico ──────────────────────────────────────────────────

export interface InterviewDiagnostic {
  total: number;
  max: number;
  porcentaje: number;
  verdict: Verdict;
  alertas: string[]; // labels de rubros con calificacion 0
}

export function computeInterviewDiagnostic(scores: Record<string, RubricScore>): InterviewDiagnostic {
  const allRubros = INTERVIEW_SECTIONS.flatMap((s) => s.rubros);
  let total = 0;
  const alertas: string[] = [];
  for (const r of allRubros) {
    const score = scores[r.id] ?? 0;
    total += score;
    if (scores[r.id] === 0) alertas.push(r.label);
  }
  const porcentaje = Math.round((total / INTERVIEW_MAX_SCORE) * 100);

  // 33-39 → Recomendable | 24-32 → Con reserva | 0-23 o cualquier rubro en 0 → No recomendable
  let verdict: Verdict;
  if (alertas.length > 0) verdict = 'not_recommended';
  else if (total >= 33) verdict = 'recommended';
  else if (total >= 24) verdict = 'reservations';
  else verdict = 'not_recommended';

  return { total, max: INTERVIEW_MAX_SCORE, porcentaje, verdict, alertas };
}

export const DIAGNOSTIC_LABELS: Record<Verdict, { label: string; detail: string; badge: string }> = {
  recommended: {
    label: 'RECOMENDABLE CONTRATAR',
    detail: 'Perfil solido (85% o mas).',
    badge: 'badge-green',
  },
  reservations: {
    label: 'CONTRATAR CON RESERVA',
    detail: 'Seguimiento especial automatico si se contrata (62 a 84%).',
    badge: 'badge-yellow',
  },
  not_recommended: {
    label: 'NO RECOMENDABLE',
    detail: 'Requiere autorizacion expresa de Direccion para contratar.',
    badge: 'badge-red',
  },
};

export const PUNTUALIDAD_OPTIONS = ['Llego puntual', 'Retraso leve (aviso)', 'Llego tarde sin avisar'] as const;
