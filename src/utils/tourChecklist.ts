import type { TourRecord } from '../types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RECORRIDO POR INSTALACIONES v2.0 — BRD Junio 2026 (etapa 9)
// Checklist ESTANDARIZADO: mismos puntos para todos, en el mismo orden.
// Carmen (Produccion) guia el recorrido y firma al terminar.
// El sistema registra el recorrido como completado.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TOUR_ITEMS: { id: string; label: string }[] = [
  { id: 'entrada', label: 'Entrada, checador y registro de asistencia' },
  { id: 'vestidores', label: 'Vestidores, lockers y sanitarios' },
  { id: 'comedor', label: 'Comedor y area de descanso' },
  { id: 'produccion', label: 'Area de produccion — presentacion con el equipo' },
  { id: 'empaque', label: 'Area de acondicionamiento y empaque' },
  { id: 'almacen', label: 'Almacen de materia prima y producto terminado' },
  { id: 'calidad', label: 'Area de calidad y muestras de retencion' },
  { id: 'bpm', label: 'Estacion de lavado de manos y reglas BPM' },
  { id: 'emergencia', label: 'Salidas de emergencia, extintores y punto de reunion' },
  { id: 'oficinas', label: 'Oficinas administrativas y Recursos Humanos' },
];

export function createEmptyTour(guia = 'Carmen — Encargada de Produccion'): TourRecord {
  return {
    items: TOUR_ITEMS.map((i) => ({ ...i, done: false })),
    guia,
  };
}
