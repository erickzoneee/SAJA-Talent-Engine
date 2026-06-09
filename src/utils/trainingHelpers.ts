// ─────────────────────────────────────────────────────────────────────────────
//  JAC Capacita — Utilidades del módulo de Capacitación
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Calificacion,
  Pregunta,
  Proceso,
  ProcesoPaso,
  RegistroCapacitacion,
} from '../types/training';

// ── Calificaciones (spec 4.8.2) ──────────────────────────────────────────────

export interface CalMeta {
  key: Calificacion;
  min: number;
  label: string;
  emoji: string;
  /** clase de badge del tema oscuro */
  badge: string;
  /** color hex para acentos/gradientes */
  color: string;
  pasa: boolean;
  msg: string;
}

export const CALIFICACIONES: CalMeta[] = [
  {
    key: 'excelente',
    min: 90,
    label: 'Excelente',
    emoji: '🌟',
    badge: 'badge-green',
    color: '#22c55e',
    pasa: true,
    msg: '¡Felicidades! Demostraste que conoces muy bien este proceso. ¡Eres parte fundamental del equipo JAC!',
  },
  {
    key: 'bien',
    min: 75,
    label: 'Bien',
    emoji: '✅',
    badge: 'badge-blue',
    color: '#338dff',
    pasa: true,
    msg: '¡Muy bien hecho! Entendiste el proceso correctamente. Siempre puedes consultar el manual si tienes alguna duda.',
  },
  {
    key: 'regular',
    min: 60,
    label: 'Regular',
    emoji: '📚',
    badge: 'badge-yellow',
    color: '#f59e0b',
    pasa: true,
    msg: 'Vas por buen camino. Te recomendamos repasar los pasos que se te complicaron. ¡La próxima lo vas a hacer perfecto!',
  },
  {
    key: 'repetir',
    min: 0,
    label: 'Repetir capacitación',
    emoji: '🔄',
    badge: 'badge-red',
    color: '#ef4444',
    pasa: false,
    msg: '¡No te desanimes! Todos aprendemos a nuestro ritmo. Vamos a ver el proceso de nuevo juntos. Pon mucha atención y lo vas a lograr.',
  },
];

export function calificar(pct: number): CalMeta {
  return CALIFICACIONES.find((c) => pct >= c.min) ?? CALIFICACIONES[CALIFICACIONES.length - 1];
}

/** Número de preguntas según complejidad del proceso (spec 4.2.5). */
export function numPreguntasPorComplejidad(numPasos: number): number {
  if (numPasos <= 5) return 10;
  if (numPasos <= 9) return 12;
  return 15;
}

/** Umbral de "evaluación sospechosamente rápida" en segundos (spec 4.8.4). */
export const UMBRAL_RAPIDO_SEG = 90;

/** Texto a mostrar al trabajador: usa la versión mejorada si existe (spec 4.3). */
export function narrativaVisible(paso: ProcesoPaso): string {
  return paso.narrativaMejorada?.trim() ? paso.narrativaMejorada : paso.narrativa;
}

// ── Compresión y edición de fotos (spec 4.4.5) ───────────────────────────────

/** Comprime una imagen a máx 900px de ancho, JPEG calidad 72%. */
export function comprimirFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 900 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo crear el contexto de canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/** Rota una imagen base64 90° en sentido horario (spec 4.4.3). */
export function rotarFoto90(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo crear el contexto de canvas'));
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = dataUrl;
  });
}

// ── Narración por voz — Web Speech API (spec 4.5) ────────────────────────────

export function vozDisponible(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Devuelve true si hay alguna voz en español instalada en el dispositivo. */
export function hayVozEspanol(): boolean {
  if (!vozDisponible()) return false;
  return window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith('es'));
}

function elegirVozEspanol(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices();
  return (
    voces.find((v) => v.lang.toLowerCase() === 'es-mx') ??
    voces.find((v) => v.lang.toLowerCase().startsWith('es-mx')) ??
    voces.find((v) => v.lang.toLowerCase().startsWith('es'))
  );
}

export interface SpeakHandlers {
  onEnd?: () => void;
  onError?: () => void;
}

/** Lee un texto en voz alta. Detiene cualquier lectura previa. */
export function hablar(texto: string, rate = 1, handlers: SpeakHandlers = {}): boolean {
  if (!vozDisponible() || !texto.trim()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'es-MX';
  u.rate = rate;
  const voz = elegirVozEspanol();
  if (voz) u.voice = voz;
  if (handlers.onEnd) u.onend = handlers.onEnd;
  if (handlers.onError) u.onerror = handlers.onError;
  window.speechSynthesis.speak(u);
  return true;
}

export function detenerVoz(): void {
  if (vozDisponible()) window.speechSynthesis.cancel();
}

// ── Generación local de evaluación (spec 4.2.5) ──────────────────────────────
//
// Genera un borrador de preguntas a partir de los pasos del proceso, sin requerir
// conexión a internet ni clave de API. El supervisor puede revisar, editar,
// agregar o regenerar las preguntas antes de publicar.

function genId(prefijo: string): string {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function resumir(texto: string, maxPalabras = 9): string {
  const palabras = texto.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (palabras.length <= maxPalabras) return texto.trim();
  return palabras.slice(0, maxPalabras).join(' ') + '…';
}

function barajar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Construye una pregunta de opción múltiple con su respuesta correcta y distractores. */
function armarPregunta(
  texto: string,
  correctaTxt: string,
  distractores: string[],
  paso?: number,
): Pregunta {
  const opcionesUnicas = [correctaTxt, ...distractores.filter((d) => d && d !== correctaTxt)];
  // Garantiza 3 opciones rellenando con genéricas si faltan.
  const genericas = ['Ninguna de las anteriores', 'No es necesario', 'En cualquier orden'];
  let gi = 0;
  while (opcionesUnicas.length < 3) {
    const g = genericas[gi++ % genericas.length];
    if (!opcionesUnicas.includes(g)) opcionesUnicas.push(g);
    else opcionesUnicas.push(`${g} (${opcionesUnicas.length})`);
  }
  const opciones = opcionesUnicas.slice(0, 3);
  const desordenadas = barajar(opciones);
  return {
    id: genId('q'),
    texto,
    opciones: desordenadas,
    correcta: desordenadas.indexOf(correctaTxt),
    paso,
    generadaPorIA: true,
  };
}

export function generarEvaluacionLocal(proc: Proceso): Pregunta[] {
  const pasos = proc.pasos;
  if (pasos.length === 0) return [];
  const objetivo = numPreguntasPorComplejidad(pasos.length);
  const preguntas: Pregunta[] = [];
  const nombres = pasos.map((p) => p.nombre);

  // 1) Objetivo del proceso
  if (proc.objetivo.trim()) {
    preguntas.push(
      armarPregunta(
        `¿Cuál es el objetivo principal de "${proc.nombre}"?`,
        resumir(proc.objetivo, 12),
        ['Limpiar el área de trabajo', 'Registrar la asistencia del turno'],
      ),
    );
  }

  // 2) Primer y último paso
  if (nombres.length >= 2) {
    preguntas.push(
      armarPregunta(
        '¿Con cuál paso se comienza este proceso?',
        nombres[0],
        barajar(nombres.slice(1)).slice(0, 2),
        1,
      ),
    );
    preguntas.push(
      armarPregunta(
        '¿Cuál es el último paso del proceso?',
        nombres[nombres.length - 1],
        barajar(nombres.slice(0, -1)).slice(0, 2),
        nombres.length,
      ),
    );
  }

  // 3) Una pregunta de contenido por paso (qué se hace en el paso N)
  for (let i = 0; i < pasos.length; i++) {
    const paso = pasos[i];
    const correcta = resumir(narrativaVisible(paso), 10) || paso.nombre;
    const otros = barajar(
      pasos.filter((_, j) => j !== i).map((p) => resumir(narrativaVisible(p), 10) || p.nombre),
    ).slice(0, 2);
    preguntas.push(
      armarPregunta(`¿Qué se hace en el paso ${i + 1}: "${paso.nombre}"?`, correcta, otros, i + 1),
    );
  }

  // 4) Orden entre pasos consecutivos
  for (let i = 0; i < pasos.length - 1 && preguntas.length < objetivo + 4; i++) {
    preguntas.push(
      armarPregunta(
        `¿Qué paso sigue después de "${nombres[i]}"?`,
        nombres[i + 1],
        barajar(nombres.filter((_, j) => j !== i && j !== i + 1)).slice(0, 2),
        i + 2,
      ),
    );
  }

  // 5) EPP / seguridad si aplica
  if (proc.epp.length > 0) {
    preguntas.push(
      armarPregunta(
        '¿Qué equipo de protección personal (EPP) se debe usar en este proceso?',
        proc.epp.join(', '),
        ['No se requiere ninguno', 'Solo audífonos de música'],
      ),
    );
  }

  // Ajusta al número objetivo y reasigna textos de opción A/B/C limpios.
  return barajar(preguntas).slice(0, objetivo);
}

// ── Mejora de texto (heurística local, spec 4.3) ─────────────────────────────
//
// Limpia y normaliza la redacción de una narrativa sin cambiar su significado:
// capitaliza oraciones, corrige espacios y puntuación. No requiere internet.

export function mejorarTextoLocal(texto: string): string {
  let t = texto.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  // Espacio después de signos de puntuación.
  t = t.replace(/\s*([,.;:])\s*/g, '$1 ').replace(/\s+/g, ' ').trim();
  // Capitaliza la primera letra de cada oración.
  t = t.replace(/(^|[.!?¡¿]\s+)([a-záéíóúñ])/g, (_m, p1: string, p2: string) => p1 + p2.toUpperCase());
  // Capitaliza la primera letra global.
  t = t.charAt(0).toUpperCase() + t.slice(1);
  // Asegura punto final.
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

// ── Exportación de registros a CSV (spec 4.9.3) ──────────────────────────────

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportarRegistrosCSV(registros: RegistroCapacitacion[]): void {
  const headers = [
    'Nombre',
    'No. Empleado',
    'Proceso',
    'Versión',
    'Intento',
    'Fecha',
    'Calificación',
    'Porcentaje',
    'Correctas',
    'Total preguntas',
    'Aprobó',
    'Tiempo total (seg)',
    'Tiempo evaluación (seg)',
    'Alerta rápido',
  ];
  const rows = registros.map((r) => [
    r.empleadoNombre,
    r.empleadoNumero,
    r.procesoNombre,
    r.procesoVersion,
    r.intentoNum,
    new Date(r.finAt).toLocaleString('es-MX'),
    r.calificacion,
    `${r.porcentaje}%`,
    r.correctas,
    r.totalPreguntas,
    r.pasa ? 'Sí' : 'No',
    r.tiempoTotalSeg,
    r.tiempoEvaluacionSeg,
    r.alertaMuyRapido ? 'Sí' : 'No',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `capacitaciones_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Formato de duración ──────────────────────────────────────────────────────

export function formatDuracion(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return seg === 0 ? `${min}m` : `${min}m ${seg}s`;
}
