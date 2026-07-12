// Escenas de video para las narraciones TTS.
// Cada bloque del guion (caption) tiene su propio clip: el reproductor cambia
// de escena al avanzar la narracion, de modo que la imagen SIGUE lo que dice
// la letra. Los clips (mudos, en bucle) viven en public/media/clips y se
// generaron con IA por tema:
//
//   recepcion      planta de jabones con trabajadores uniformados (linea)
//   onboarding-1   planta por la manana, colaboradores llegando
//   onboarding-2   checador de asistencia (reloj/dispositivo)
//   onboarding-3   colocarse cofia, cubrebocas y uniforme (EPP)
//   onboarding-4   lavado de manos en tarja de acero
//   onboarding-5   estacion ordenada, herramientas en su lugar, barrido
//   onboarding-6   senal de piso mojado, ruta de evacuacion, extintor
//   onboarding-7   comedor y lockers
//   onboarding-8   celular guardado en locker
//   onboarding-9   camara de videovigilancia sobre la planta
//   onboarding-10  botiquin, extintor y colaborador ayudando a otro
//   onboarding-11  linea de empaque con producto terminado (jabones y amenidades)

const CLIP_BASE = `${import.meta.env.BASE_URL}media/clips/`;

const clip = (name: string) => `${CLIP_BASE}${name}.mp4`;

// ─── Recepcion: 8 bloques (mismo orden que VIDEO_CAPTIONS) ───────────────────
// Bienvenido / Horario / Dia de pago / BPM / Reglas basicas / Prestaciones /
// Vacaciones / Tu decides
export const receptionSceneClips: string[] = [
  clip('recepcion'),      // Bienvenido — la planta trabajando
  clip('onboarding-2'),   // Horario — checador de asistencia
  clip('onboarding-2'),   // Dia de pago — checado/nomina
  clip('onboarding-4'),   // BPM — lavado de manos
  clip('onboarding-3'),   // Reglas basicas — uniforme y EPP
  clip('onboarding-7'),   // Prestaciones — comedor/instalaciones
  clip('onboarding-1'),   // Vacaciones — la planta por la manana
  clip('recepcion'),      // Tu decides — cierre con la planta
];

// ─── Onboarding: escenas por bloque del guion (getOnboardingVideoScript) ─────
const ONBOARDING_SCENES: Record<number, string[]> = {
  1: [clip('recepcion'), clip('onboarding-1'), clip('onboarding-4'), clip('onboarding-7')],
  2: [clip('onboarding-1'), clip('onboarding-2'), clip('recepcion')],
  3: [clip('recepcion'), clip('onboarding-3'), clip('onboarding-6'), clip('onboarding-3')],
  4: [clip('onboarding-1'), clip('onboarding-4'), clip('onboarding-3'), clip('recepcion')],
  5: [clip('onboarding-5'), clip('recepcion'), clip('onboarding-1')],
  6: [clip('onboarding-6'), clip('onboarding-1'), clip('recepcion'), clip('onboarding-2')],
  7: [clip('onboarding-7'), clip('onboarding-8'), clip('onboarding-7')],
  8: [clip('onboarding-8'), clip('recepcion'), clip('onboarding-9')],
  9: [clip('onboarding-9'), clip('onboarding-1'), clip('onboarding-9')],
  10: [clip('onboarding-10'), clip('onboarding-10'), clip('onboarding-1'), clip('onboarding-6')],
  11: [clip('recepcion'), clip('onboarding-11'), clip('onboarding-5'), clip('onboarding-1'), clip('recepcion')],
};

export function getOnboardingSceneClips(moduleId: number): string[] {
  return ONBOARDING_SCENES[moduleId] ?? [clip(`onboarding-${moduleId}`)];
}

// ─── Guion del video informativo de RECEPCION ───────────────────────────────
// Mismo texto que se muestra en el flujo de reclutamiento (8 bloques). Se
// centraliza aqui para reutilizarlo en la Videoteca (v2.8), donde cualquier
// video del sistema se puede volver a ver en cualquier momento.
export function getReceptionVideoScript(): { titulo: string; texto: string }[] {
  return [
    { titulo: 'Bienvenido', texto: 'Gracias por tu interes en trabajar en Jabones y Amenidades de Calidad. Este video corto te explica como trabajamos aqui.' },
    { titulo: 'Horario', texto: 'Trabajamos de lunes a sabado en jornada completa. La puntualidad es indispensable todos los dias.' },
    { titulo: 'Dia de pago', texto: 'El pago es semanal: recibes tu pago cada sabado.' },
    { titulo: 'BPM — Buenas Practicas de Manufactura', texto: 'Fabricamos productos de higiene. Por eso la cofia, el cubrebocas y el lavado de manos son OBLIGATORIOS. Las BPM protegen el producto y a las personas.' },
    { titulo: 'Reglas basicas', texto: 'Uniforme completo durante toda la jornada. El celular se guarda mientras trabajas. Cada quien mantiene su area limpia y ordenada.' },
    { titulo: 'Prestaciones', texto: 'Tienes todas las prestaciones de ley desde tu contratacion.' },
    { titulo: 'Vacaciones', texto: 'Las vacaciones se generan al cumplir tu primer ano. La empresa cierra la ultima semana del ano para mantenimiento.' },
    { titulo: 'Tu decides', texto: 'Si todo esto te interesa, avisale a recepcion para agendar tu entrevista.' },
  ];
}
