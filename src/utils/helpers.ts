export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

export const INCIDENT_LABELS: Record<string, string> = {
  falta_justificada: 'Falta Justificada',
  falta_injustificada: 'Falta Injustificada',
  retardo: 'Retardo',
  amonestacion_verbal: 'Amonestacion Verbal',
  amonestacion_escrita: 'Amonestacion Escrita',
  acta_administrativa: 'Acta Administrativa',
};

export const EXIT_TYPE_LABELS: Record<string, string> = {
  renuncia: 'Renuncia Voluntaria',
  fin_contrato: 'Fin de Contrato Eventual',
  rescision: 'Rescision por la Empresa',
  mutuo_acuerdo: 'Mutuo Acuerdo',
  abandono: 'Abandono de Empleo',
  incapacidad: 'Incapacidad / Medica',
};

export const LETTER_TYPE_LABELS: Record<string, { name: string; desc: string }> = {
  A: { name: 'BUENA RECOMENDACION', desc: 'Carta calida y positiva' },
  B: { name: 'RECOMENDACION REGULAR', desc: 'Carta neutra y profesional' },
  C: { name: 'MINIMA', desc: 'Solo confirma datos laborales' },
};
