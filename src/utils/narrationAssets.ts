// Clips de video (mudos, en bucle) que acompañan a las narraciones TTS.
// Se alojan en el repo (public/media/clips) para que funcionen sin depender de
// una conexion estable. Se generan con IA (Higgsfield) por tema.

const CLIP_BASE = `${import.meta.env.BASE_URL}media/clips/`;

export const receptionNarrationBg = `${CLIP_BASE}recepcion.mp4`;

export function getOnboardingNarrationBg(moduleId: number): string {
  return `${CLIP_BASE}onboarding-${moduleId}.mp4`;
}
