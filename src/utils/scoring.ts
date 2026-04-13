import type { InterviewData, Verdict, Employee, LetterType } from '../types';

const POSITIVE_TRAITS = ['Puntual', 'Limpio', 'Ordenado', 'Respetuoso', 'Actitud positiva'];
const NEGATIVE_TRAITS = ['Nervioso', 'Desinteresado', 'Mala presentacion', 'Impuntual'];

export { POSITIVE_TRAITS, NEGATIVE_TRAITS };

export function calculateInterviewScore(data: InterviewData): number {
  // Section 1: Attitude & Presentation (35%)
  let attitudeRaw = 0;
  const posCount = data.step3.positives.length;
  const negCount = data.step3.negatives.filter(n => n !== 'Nervioso').length;
  const nervousCount = data.step3.negatives.filter(n => n === 'Nervioso').length;
  attitudeRaw += posCount * 20;
  attitudeRaw -= negCount * 15;
  attitudeRaw -= nervousCount * 5; // Reduced weight for nervous
  const starAvg1 = (data.step6.ratings.attitude + data.step6.ratings.presentation + data.step6.ratings.willingness) / 3;
  const attitudeScore = Math.max(0, Math.min(35, (attitudeRaw / 100) * 0.4 * 35 + (starAvg1 / 5) * 0.6 * 35));

  // Section 2: Experience & Stability (30%)
  let expRaw = 0;
  const timeMap: Record<string, number> = { '<3m': 0, '3-6m': 33, '6m-1a': 66, '+1a': 99 };
  expRaw += (timeMap[data.step4.previousEmploymentTime] || 0) * 0.4;
  expRaw += data.step4.seeksStability ? 20 : 0;
  expRaw += data.step4.hasSimilarExperience ? 20 : 0;
  const starAvg2 = (data.step6.ratings.responsibility + data.step6.ratings.stability) / 2;
  const expScore = Math.max(0, Math.min(30, (expRaw / 100) * 0.7 * 30 + (starAvg2 / 5) * 0.3 * 30));

  // Section 3: Availability (20%)
  let availRaw = 0;
  if (data.step5.standingWork) availRaw += 16;
  if (data.step5.heavyLifting) availRaw += 16;
  if (data.step5.gettingDirty) availRaw += 16;
  if (data.step5.repetitiveWork) availRaw += 16;
  if (data.step5.rulesAndUniform) availRaw += 16;
  if (!data.step5.frequentAbsences) availRaw += 20;
  const availScore = Math.max(0, Math.min(20, (availRaw / 100) * 20));

  // Section 4: Interviewer Rating (15%)
  const ratings = data.step6.ratings;
  const avgRating = (ratings.attitude + ratings.responsibility + ratings.willingness + ratings.stability + ratings.communication + ratings.presentation) / 6;
  const interviewerScore = Math.max(0, Math.min(15, (avgRating / 5) * 15));

  return Math.round(attitudeScore + expScore + availScore + interviewerScore);
}

export function getVerdict(score: number, recommendedThreshold: number, reservationsThreshold: number): Verdict {
  if (score >= recommendedThreshold) return 'recommended';
  if (score >= reservationsThreshold) return 'reservations';
  return 'not_recommended';
}

export function getVerdictLabel(verdict: Verdict): string {
  const labels: Record<Verdict, string> = {
    recommended: 'RECOMENDADO',
    reservations: 'RECOMENDADO CON RESERVAS',
    not_recommended: 'NO RECOMENDADO',
  };
  return labels[verdict];
}

export function getVerdictColor(verdict: Verdict): string {
  const colors: Record<Verdict, string> = {
    recommended: 'badge-green',
    reservations: 'badge-yellow',
    not_recommended: 'badge-red',
  };
  return colors[verdict];
}

export function suggestLetterType(employee: Employee): LetterType {
  if (!employee.exitData) return 'B';

  const avgEval = employee.evaluations.length > 0
    ? employee.evaluations.reduce((sum, e) => sum + e.averageScore, 0) / employee.evaluations.length
    : 3;

  const graveIncidents = employee.incidents.filter(i => i.type === 'acta_administrativa').length;
  const exitType = employee.exitData.exitType;

  let score = 0;
  score += (avgEval / 5) * 40;
  score += Math.max(0, (3 - graveIncidents) / 3) * 30;

  const exitScores: Record<string, number> = {
    renuncia: 15, fin_contrato: 12, mutuo_acuerdo: 10,
    rescision: 3, abandono: 0, incapacidad: 15,
  };
  score += exitScores[exitType] || 10;

  const monthsWorked = Math.floor(
    (new Date(employee.exitData.exitDate).getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  score += Math.min(10, monthsWorked);

  if (score >= 65) return 'A';
  if (score >= 35) return 'B';
  return 'C';
}

export function calculateEvaluationAverage(ratings: Record<string, number>): number {
  const values = Object.values(ratings);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function getPerformanceColor(avg: number): string {
  if (avg >= 4) return 'badge-green';
  if (avg >= 3) return 'badge-yellow';
  return 'badge-red';
}
