import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { getSupaStatus } from './supabaseSync';
import { compressImageFile, fileToBase64 } from './helpers';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.9 — ALMACENAMIENTO DE MEDIA (fotos, escaneos, PDF) EN SUPABASE STORAGE
// Antes cada foto/PDF se guardaba como base64 dentro del navegador
// (localStorage, ~5 MB): un PDF de 4 MB lo desbordaba y el guardado tronaba.
// Ahora la media se sube al bucket privado `media` de Supabase y en el
// expediente se guarda solo la RUTA ("sb:col/<id>/<archivo>"). Asi:
//   · el navegador ya no se llena (solo guarda una cadena corta), y
//   · la ruta SI viaja en la sincronizacion → las fotos/escaneos se ven en
//     todos los dispositivos (se resuelven a una URL firmada al mostrarlas).
//
// Si no hay sesion / Storage falla, se cae al modo anterior (base64 local con
// limite de tamano) para no bloquear la captura sin conexion.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BUCKET = 'media';
const PREFIX = 'sb:'; // marca de "esto es una ruta en Storage"
const MAX_STORAGE_BYTES = 25 * 1024 * 1024; // 25 MB por archivo hacia Storage
const SIGNED_TTL = 3600; // 1 hora
const UPLOAD_TIMEOUT_MS = 45000; // la subida no puede colgar el sistema para siempre
const SIGN_TIMEOUT_MS = 12000;

// Corre una promesa con tope de tiempo: si tarda mas, rechaza (asi la UI nunca
// se queda "trabada" esperando una subida/red que no responde).
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function isStoragePath(v?: string): boolean {
  return !!v && v.startsWith(PREFIX);
}

// Detecta si el valor (data URL o ruta "sb:...") es imagen o PDF, para decidir
// entre mostrar <img> o el visor/insignia de PDF.
export function isImageMedia(v?: string): boolean {
  if (!v) return false;
  if (v.startsWith('data:')) return v.startsWith('data:image/');
  return !/\.pdf(\?|$)/i.test(v); // rutas/URLs: PDF por extension, lo demas imagen
}

export function isPdfMedia(v?: string): boolean {
  if (!v) return false;
  if (v.startsWith('data:')) return v.startsWith('data:application/pdf');
  return /\.pdf(\?|$)/i.test(v);
}

function canUseStorage(): boolean {
  return SUPABASE_ENABLED && getSupaStatus().signedIn;
}

function extFor(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return mime.slice(6).split('+')[0] || 'jpg';
  return 'bin';
}

// Comprime una imagen a un Blob JPEG (canvas.toBlob) SIN pasar por una cadena
// base64 gigante — la conversion base64 de archivos grandes bloqueaba el hilo
// principal y "trababa" la app. Si falla, se sube el archivo original.
function compressImageToBlob(file: File, maxDim = 1280, quality = 0.72): Promise<Blob | null> {
  return new Promise((resolve) => {
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
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// Sanea un fragmento de ruta para Storage (sin espacios ni acentos raros).
function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
}

/**
 * Procesa y almacena un archivo de foto/documento.
 *  · imagenes → se comprimen; PDF/otros → se leen tal cual
 *  · con sesion + Storage → se sube y se devuelve la RUTA "sb:..."
 *  · sin sesion → se devuelve el base64 (modo local), con limite de 4 MB para
 *    no reventar el almacenamiento del navegador
 * `folder` agrupa por colaborador/candidato; `key` identifica el documento.
 */
export async function storeMediaFile(file: File, folder: string, key: string): Promise<string> {
  const isImage = file.type.startsWith('image/');

  if (canUseStorage()) {
    if (file.size > MAX_STORAGE_BYTES) {
      throw new Error(
        `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El maximo es de 25 MB.`,
      );
    }
    // Se sube el archivo DIRECTO (las imagenes se comprimen a un Blob). No se
    // pasa por base64 gigante — eso bloqueaba el hilo y trababa la app.
    let body: Blob = file;
    let mime = file.type || 'application/octet-stream';
    if (isImage) {
      const compressed = await compressImageToBlob(file);
      if (compressed) {
        body = compressed;
        mime = 'image/jpeg';
      }
    }
    const path = `${slug(folder) || 'general'}/${slug(key)}-${Date.now()}.${extFor(mime)}`;

    let result: { error: { message: string } | null };
    try {
      result = await withTimeout(
        supabase.storage.from(BUCKET).upload(path, body, { contentType: mime, upsert: true }),
        UPLOAD_TIMEOUT_MS,
        'upload',
      );
    } catch (e) {
      // Timeout o error de red: NO se cuelga la UI. Para archivos chicos se
      // guarda local como respaldo; para grandes se avisa claro.
      if (String(e).includes('timeout') && !isImage && file.size > 4 * 1024 * 1024) {
        throw new Error('La subida tardo demasiado (revisa tu conexion) y se cancelo. Intenta de nuevo.');
      }
      return storeLocalFallback(file, isImage);
    }
    if (result.error) {
      // Storage respondio error (p. ej. falta el bucket). Chicos → base64 local;
      // grandes → aviso claro para crear el bucket "media".
      if (isImage || file.size <= 4 * 1024 * 1024) return storeLocalFallback(file, isImage);
      throw new Error(
        `No se pudo subir el archivo a la nube. Revisa que exista el bucket "media" en Supabase con sus permisos. Detalle: ${result.error.message}`,
      );
    }
    return `${PREFIX}${path}`;
  }

  return storeLocalFallback(file, isImage);
}

async function storeLocalFallback(file: File, isImage: boolean): Promise<string> {
  if (!isImage && file.size > 4 * 1024 * 1024) {
    throw new Error(
      `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Sin sincronizacion en la nube, el maximo para documentos que no son imagen es de 4 MB. Inicia sesion en la nube para subir archivos grandes, o comprime el PDF.`,
    );
  }
  return isImage ? compressImageFile(file) : fileToBase64(file);
}

// ─── Resolucion para mostrar ─────────────────────────────────────────────────
// Las rutas "sb:..." se convierten a una URL firmada (temporal) que si puede
// mostrarse en <img>/<iframe>. Se cachean para no pedir una firma en cada
// render. Los valores base64 (data:) y las URLs http se devuelven tal cual.

const signedCache = new Map<string, { url: string; exp: number }>();

export async function resolveMediaSrc(value?: string): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('blob:')) return value;
  if (!value.startsWith(PREFIX)) return value; // valor desconocido: se usa tal cual

  const path = value.slice(PREFIX.length);
  const now = Date.now();
  const cached = signedCache.get(path);
  if (cached && cached.exp > now) return cached.url;
  if (!SUPABASE_ENABLED) return null;

  try {
    const { data, error } = await withTimeout(
      supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL),
      SIGN_TIMEOUT_MS,
      'sign',
    );
    if (error || !data?.signedUrl) return null;
    signedCache.set(path, { url: data.signedUrl, exp: now + (SIGNED_TTL - 120) * 1000 });
    return data.signedUrl;
  } catch {
    return null; // timeout o red: se muestra placeholder en lugar de colgar
  }
}

/** Abre la media (foto o PDF) en una pestana nueva, resolviendo la URL firmada. */
export async function openMedia(value?: string): Promise<void> {
  const src = await resolveMediaSrc(value);
  if (src) window.open(src, '_blank', 'noopener,noreferrer');
}
