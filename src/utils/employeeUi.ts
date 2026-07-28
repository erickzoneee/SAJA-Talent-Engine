// v2.18 — Helpers de presentacion del expediente.
// Viven fuera de los modulos para que Contratacion y Colaboradores (fichas)
// muestren EXACTAMENTE los mismos avatares, contadores y etiquetas de puesto.
// (Un archivo de componentes no puede exportar funciones sueltas sin romper el
// fast refresh de Vite, por eso estan aqui.)

import type { DocumentChecklist, JobPosition } from '../types';
import { JOB_POSITIONS } from '../types';

export const AVATAR_GRADIENTS = [
  'from-blue-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-600',
  'from-indigo-500 to-cyan-500',
  'from-pink-500 to-violet-600',
  'from-amber-500 to-red-500',
];

/** Gradiente estable por nombre: la misma persona siempre tiene el mismo color. */
export function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/**
 * Documentos obligatorios del expediente. 'antecedentesNoPenales' no cuenta
 * porque solo aplica a algunos casos.
 */
export function countMandatoryDocs(docs: DocumentChecklist): { completed: number; total: number } {
  const mandatoryKeys: (keyof DocumentChecklist)[] = [
    'solicitud', 'ine', 'actaNacimiento', 'curp', 'imss',
    'comprobanteDomicilio', 'comprobanteEstudios', 'cartasRecomendacion', 'rfc',
  ];
  const total = mandatoryKeys.length;
  const completed = mandatoryKeys.filter((k) => docs[k]?.done).length;
  return { completed, total };
}

/** Dias que faltan para una fecha (negativo si ya paso). */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Nombre del puesto: los 4 base salen del catalogo, los personalizados tal cual. */
export function positionLabel(position: string): string {
  return JOB_POSITIONS[position as JobPosition]?.name ?? position;
}
