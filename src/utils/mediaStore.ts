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

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const comma = dataUrl.indexOf(',');
  const head = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes as BlobPart], { type: mime }), mime };
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
    const dataUrl = isImage ? await compressImageFile(file) : await fileToBase64(file);
    const { blob, mime } = dataUrlToBlob(dataUrl);
    const path = `${slug(folder) || 'general'}/${slug(key)}-${Date.now()}.${extFor(mime)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: mime,
      upsert: true,
    });
    if (error) {
      // Storage fallo. Para archivos chicos se cae al modo local (base64) sin
      // molestar; para archivos grandes (que no caben en localStorage) se avisa
      // claro — normalmente falta crear el bucket "media" o sus permisos.
      if (isImage || file.size <= 4 * 1024 * 1024) return storeLocalFallback(file, isImage);
      throw new Error(
        `No se pudo subir el archivo a la nube. Revisa que exista el bucket "media" en Supabase con sus permisos. Detalle: ${error.message}`,
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

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  signedCache.set(path, { url: data.signedUrl, exp: now + (SIGNED_TTL - 120) * 1000 });
  return data.signedUrl;
}

/** Abre la media (foto o PDF) en una pestana nueva, resolviendo la URL firmada. */
export async function openMedia(value?: string): Promise<void> {
  const src = await resolveMediaSrc(value);
  if (src) window.open(src, '_blank', 'noopener,noreferrer');
}
