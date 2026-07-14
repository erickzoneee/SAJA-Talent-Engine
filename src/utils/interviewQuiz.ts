import type { InterviewQuizResult } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.13 — JUEGOS-QUIZ DE LA 2a MITAD DE LA ENTREVISTA
// "El otro 50%": conocimientos generales + matematicas, en formato de
// pequenos juegos (una pregunta a la vez, opcion multiple, con retro
// inmediata). Orientativos — la decision final siempre es de Direccion.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface QuizItem {
  id: string;
  emoji: string;
  pregunta: string;
  opciones: string[];
  /** indice de la opcion correcta dentro de `opciones` */
  correcta: number;
}

// ─── Conocimientos generales (lectura, logica, cultura basica) ──────────────
export const QUIZ_GENERAL: QuizItem[] = [
  { id: 'g1', emoji: '📖', pregunta: "Lee: \"Guarda el producto en el estante\". ¿Que debes guardar?", opciones: ['El estante', 'El producto', 'La caja', 'Nada'], correcta: 1 },
  { id: 'g2', emoji: '📅', pregunta: '¿Cuantos dias tiene una semana?', opciones: ['5', '6', '7', '8'], correcta: 2 },
  { id: 'g3', emoji: '🕒', pregunta: 'Si son las 3 de la tarde, en formato de 24 horas son las:', opciones: ['13:00', '14:00', '15:00', '16:00'], correcta: 2 },
  { id: 'g4', emoji: '🇲🇽', pregunta: '¿Cual es la capital de Mexico?', opciones: ['Guadalajara', 'Monterrey', 'Ciudad de Mexico', 'Puebla'], correcta: 2 },
  { id: 'g5', emoji: '🎨', pregunta: 'Si mezclas azul con amarillo, ¿que color obtienes?', opciones: ['Rojo', 'Verde', 'Morado', 'Naranja'], correcta: 1 },
  { id: 'g6', emoji: '🔢', pregunta: 'Ordena de menor a mayor: 3, 1, 2. ¿Cual va primero?', opciones: ['3', '2', '1', 'Da igual'], correcta: 2 },
  { id: 'g7', emoji: '⚖️', pregunta: '¿Que pesa mas, 1 kilo de algodon o 1 kilo de fierro?', opciones: ['El algodon', 'El fierro', 'Pesan igual', 'Ninguno'], correcta: 2 },
  { id: 'g8', emoji: '🗓️', pregunta: '¿Que mes viene despues de marzo?', opciones: ['Febrero', 'Mayo', 'Abril', 'Junio'], correcta: 2 },
  { id: 'g9', emoji: '🔤', pregunta: "¿Cuantas vocales distintas tiene la palabra \"JABON\"?", opciones: ['1', '2', '3', '4'], correcta: 1 },
  { id: 'g10', emoji: '🧼', pregunta: 'Antes de tocar el producto en una fabrica de jabon, ¿que debes hacer primero?', opciones: ['Comer', 'Lavarte las manos', 'Hablar por telefono', 'Nada'], correcta: 1 },
  { id: 'g11', emoji: '🚦', pregunta: '¿Que significa el color rojo en un semaforo?', opciones: ['Avanzar', 'Precaucion', 'Alto', 'Vuelta'], correcta: 2 },
  { id: 'g12', emoji: '📏', pregunta: '¿Cuantos centimetros tiene un metro?', opciones: ['10', '50', '100', '1000'], correcta: 2 },
  { id: 'g13', emoji: '💧', pregunta: 'El agua, al hervir, se convierte en:', opciones: ['Hielo', 'Vapor', 'Sal', 'Aceite'], correcta: 1 },
  { id: 'g14', emoji: '⏰', pregunta: 'Si entras a las 7:00 y trabajas 8 horas sin descanso, ¿a que hora sales?', opciones: ['2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'], correcta: 1 },
  { id: 'g15', emoji: '🧭', pregunta: 'Si el numero 8 va antes que el 9, ¿que numero va justo despues del 9?', opciones: ['7', '8', '10', '11'], correcta: 2 },
];

// ─── Matematicas basicas ────────────────────────────────────────────────────
export const QUIZ_MATE: QuizItem[] = [
  { id: 'm1', emoji: '➕', pregunta: '12 + 8 = ?', opciones: ['18', '20', '22', '24'], correcta: 1 },
  { id: 'm2', emoji: '➖', pregunta: '25 − 9 = ?', opciones: ['14', '15', '16', '17'], correcta: 2 },
  { id: 'm3', emoji: '✖️', pregunta: '6 × 7 = ?', opciones: ['36', '42', '48', '54'], correcta: 1 },
  { id: 'm4', emoji: '➗', pregunta: '20 ÷ 4 = ?', opciones: ['4', '5', '6', '8'], correcta: 1 },
  { id: 'm5', emoji: '📦', pregunta: 'Tienes 3 cajas con 10 jabones cada una. ¿Cuantos jabones son?', opciones: ['13', '20', '30', '33'], correcta: 2 },
  { id: 'm6', emoji: '💰', pregunta: 'Un producto cuesta $15 y pagas con $20. ¿Cuanto te dan de cambio?', opciones: ['$3', '$5', '$10', '$15'], correcta: 1 },
  { id: 'm7', emoji: '🧮', pregunta: 'Necesitas 40 piezas y ya tienes 25. ¿Cuantas te faltan?', opciones: ['10', '15', '20', '25'], correcta: 1 },
  { id: 'm8', emoji: '🧴', pregunta: 'Si empacas 5 jabones por minuto, ¿cuantos empacas en 10 minutos?', opciones: ['15', '25', '50', '55'], correcta: 2 },
  { id: 'm9', emoji: '🔟', pregunta: 'La mitad de 100 es:', opciones: ['25', '40', '50', '60'], correcta: 2 },
  { id: 'm10', emoji: '🔢', pregunta: '100 − 45 = ?', opciones: ['45', '55', '65', '75'], correcta: 1 },
  { id: 'm11', emoji: '⏫', pregunta: 'El doble de 8 es:', opciones: ['10', '14', '16', '18'], correcta: 2 },
  { id: 'm12', emoji: '🍬', pregunta: 'Repartes 24 dulces entre 6 personas en partes iguales. ¿Cuantos toca a cada una?', opciones: ['3', '4', '5', '6'], correcta: 1 },
];

// Cuantas preguntas de cada bloque se juegan por entrevista.
export const QUIZ_GENERAL_COUNT = 5;
export const QUIZ_MATE_COUNT = 5;

/** Baraja una copia del arreglo (Fisher–Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface QuizGame {
  general: QuizItem[];
  mate: QuizItem[];
}

/** Arma un set de juego: N generales + N matematicas, elegidas al azar. */
export function buildInterviewQuiz(): QuizGame {
  return {
    general: shuffle(QUIZ_GENERAL).slice(0, QUIZ_GENERAL_COUNT),
    mate: shuffle(QUIZ_MATE).slice(0, QUIZ_MATE_COUNT),
  };
}

export type QuizBlock = 'general' | 'mate';
export interface QuizFlatItem extends QuizItem {
  block: QuizBlock;
}

/** Aplana el juego a una sola lista (primero generales, luego matematicas). */
export function flattenQuiz(game: QuizGame): QuizFlatItem[] {
  return [
    ...game.general.map((i) => ({ ...i, block: 'general' as const })),
    ...game.mate.map((i) => ({ ...i, block: 'mate' as const })),
  ];
}

/** Cuenta aciertos por bloque a partir de las respuestas (idPregunta → indice elegido). */
export function computeQuizResult(game: QuizGame, answers: Record<string, number>): InterviewQuizResult {
  const general = game.general.filter((q) => answers[q.id] === q.correcta).length;
  const mate = game.mate.filter((q) => answers[q.id] === q.correcta).length;
  return {
    general,
    generalTotal: game.general.length,
    mate,
    mateTotal: game.mate.length,
    aciertos: general + mate,
    totalPreguntas: game.general.length + game.mate.length,
  };
}
