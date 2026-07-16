export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ─── v2.4: estandarizacion a MAYUSCULAS en todo el sistema ───────────────────

/** Normaliza texto capturado: recorta espacios y lo pasa a MAYUSCULAS. */
export function toUpper(value: string): string {
  return value.trim().toLocaleUpperCase('es-MX');
}

// ─── v2.4: validacion de RFC (SAT — persona fisica 13 / moral 12) ────────────

export const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

export function isValidRfc(rfc: string): boolean {
  return RFC_REGEX.test(rfc.trim().toUpperCase());
}

// ─── v2.4: cantidad en letra para el contrato (pesos mexicanos) ──────────────

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIECIS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function tresDigitos(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = c > 0 ? CENTENAS[c] : '';
  if (resto > 0) {
    let dec: string;
    if (resto < 10) dec = UNIDADES[resto];
    else if (resto < 20) dec = DIECIS[resto - 10];
    else if (resto < 30) dec = resto === 20 ? 'VEINTE' : `VEINTI${UNIDADES[resto - 20]}`;
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      dec = u > 0 ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d];
    }
    texto = texto ? `${texto} ${dec}` : dec;
  }
  return texto;
}

/** Convierte una cantidad a letra, ej. 2450.5 → "DOS MIL CUATROCIENTOS CINCUENTA PESOS 50/100 M.N." */
export function cantidadEnLetra(cantidad: number): string {
  // Redondear a centavos primero y luego separar, para que un fraccionario
  // >= .995 acarree al entero (ej. 1.999 → "DOS PESOS 00/100", no "100/100").
  const totalCentavos = Math.round(cantidad * 100);
  const entero = Math.floor(totalCentavos / 100);
  const centavos = totalCentavos % 100;
  let letras: string;
  if (entero === 0) letras = 'CERO';
  else if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    const resto = entero % 1000000;
    const millonesTxt = millones === 1 ? 'UN MILLON' : `${cantidadEnteroTexto(millones)} MILLONES`;
    letras = resto > 0 ? `${millonesTxt} ${cantidadEnteroTexto(resto)}` : millonesTxt;
  } else letras = cantidadEnteroTexto(entero);
  return `${letras} PESOS ${String(centavos).padStart(2, '0')}/100 M.N.`;
}

function cantidadEnteroTexto(n: number): string {
  if (n === 0) return 'CERO';
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  let texto = '';
  if (miles > 0) texto = miles === 1 ? 'MIL' : `${tresDigitos(miles)} MIL`;
  if (resto > 0) texto = texto ? `${texto} ${tresDigitos(resto)}` : tresDigitos(resto);
  return texto;
}

// Las fechas sin hora ("2026-07-02") se interpretan a MEDIODIA LOCAL: si se
// dejan al parser nativo se toman como medianoche UTC y en Mexico se muestran
// UN DIA ANTES (ej. ingreso 01 jun aparecia como 31 may).
function parseLocalDate(date: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysUntil(dateStr: string): number {
  const target = parseLocalDate(dateStr);
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

// ─── v2.14: nombre completo = nombre(s) + apellido paterno + apellido materno ─
// El expediente captura las partes por separado y el nombre completo se ARMA
// con ellas (antes el sistema tomaba como nombre completo solo lo escrito en
// recepcion, que muchas veces era nada mas el nombre de pila y asi salia en el
// contrato). Para las fichas que ya existen se parte el nombre guardado.

const PARTICULAS_APELLIDO = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'SAN', 'SANTA', 'MC', 'VAN', 'VON']);

export interface NombrePartes {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

/** Une las partes en el nombre completo, ignorando las que esten vacias. */
export function joinFullName(nombres?: string, apellidoPaterno?: string, apellidoMaterno?: string): string {
  return [nombres, apellidoPaterno, apellidoMaterno]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Parte un nombre completo al estilo mexicano: los dos ultimos bloques son los
 * apellidos y lo demas es el nombre. Respeta las particulas pegadas al
 * apellido ("DE LA CRUZ", "SAN MARTIN").
 */
export function splitFullName(fullName: string): NombrePartes {
  const tokens = toUpper(fullName).split(/\s+/).filter(Boolean);
  const vacio: NombrePartes = { nombres: '', apellidoPaterno: '', apellidoMaterno: '' };
  if (tokens.length === 0) return vacio;
  if (tokens.length === 1) return { ...vacio, nombres: tokens[0] };
  if (tokens.length === 2) return { nombres: tokens[0], apellidoPaterno: tokens[1], apellidoMaterno: '' };

  // Retrocede sobre las particulas que forman parte del apellido que termina en `fin`.
  const inicioApellido = (fin: number): number => {
    let start = fin;
    while (start - 1 > 0 && PARTICULAS_APELLIDO.has(tokens[start - 1])) start--;
    return start;
  };

  const inicioMaterno = inicioApellido(tokens.length - 1);
  const finPaterno = inicioMaterno - 1;
  // Sin espacio para nombre + dos apellidos: el ultimo bloque es el paterno.
  if (finPaterno < 1) {
    return {
      nombres: tokens.slice(0, tokens.length - 1).join(' '),
      apellidoPaterno: tokens[tokens.length - 1],
      apellidoMaterno: '',
    };
  }
  const inicioPaterno = Math.max(1, inicioApellido(finPaterno));
  return {
    nombres: tokens.slice(0, inicioPaterno).join(' '),
    apellidoPaterno: tokens.slice(inicioPaterno, inicioMaterno).join(' '),
    apellidoMaterno: tokens.slice(inicioMaterno).join(' '),
  };
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

/**
 * v2.5: comprime una imagen antes de guardarla en el expediente.
 * Las fotos de camara de tablet pesan 5-12 MB; guardarlas crudas en base64
 * congelaba la interfaz al subirlas y podia REVENTAR el limite de
 * localStorage (~5 MB), con lo que el guardado dejaba de funcionar en
 * silencio. Reducidas a max 1280px JPEG quedan en ~100-250 KB y siguen
 * siendo perfectamente legibles como evidencia.
 */
export function compressImageFile(file: File, maxDim = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          void fileToBase64(file).then(resolve, reject);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        void fileToBase64(file).then(resolve, reject);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // No es una imagen decodificable: se guarda tal cual
      void fileToBase64(file).then(resolve, reject);
    };
    img.src = url;
  });
}

/**
 * v2.8: procesa un archivo de documento del expediente. Las IMAGENES se
 * comprimen (canvas, como antes); cualquier OTRO formato (PDF, etc.) se guarda
 * tal cual en base64 para poder subir constancias, actas o comprobantes que no
 * son foto. Se limita el tamano de los no-imagen porque el almacenamiento local
 * es de ~5 MB y un PDF grande podria reventarlo y romper el guardado en
 * silencio; en ese caso se rechaza con un mensaje claro.
 */
export const MAX_DOC_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

export function processDocumentFile(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return compressImageFile(file);
  }
  if (file.size > MAX_DOC_FILE_BYTES) {
    return Promise.reject(
      new Error(
        `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El maximo para documentos que no son imagen es de 4 MB. Comprime el PDF o sube una foto.`,
      ),
    );
  }
  return fileToBase64(file);
}

/** true si el data URL guardado es una imagen (para decidir si se muestra <img> o un icono de archivo). */
export function isImageDataUrl(url?: string): boolean {
  return !!url && url.startsWith('data:image/');
}

/** true si el data URL guardado es un PDF. */
export function isPdfDataUrl(url?: string): boolean {
  return !!url && url.startsWith('data:application/pdf');
}

/** Edad en anos cumplidos a partir de una fecha "YYYY-MM-DD" (o vacio si no hay fecha valida). */
export function calcAge(fechaNacimiento?: string): number | null {
  if (!fechaNacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) return null;
  const birth = new Date(`${fechaNacimiento}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
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
