import { useStore } from '../store/useStore';
import { useQuestionBank } from '../store/useQuestionBank';
import { useTrainingStore } from '../store/useTrainingStore';
import type { BankQuestion, Candidate, Employee, AppSettings, SystemAlert } from '../types';
import type { Proceso, RegistroCapacitacion, TrainingCatalogs } from '../types/training';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SINCRONIZACION EN LA NUBE — v2.4 (Requerimiento 7)
// La base de datos vive en el dispositivo (localStorage). Este modulo la
// respalda cifrada en la nube (Pantry — getpantry.cloud, gratuito) para que
// los MISMOS datos se vean en otros dispositivos con solo pegar un codigo.
//
//  · Cifrado AES-GCM en el navegador: la nube nunca ve datos legibles.
//  · Comprimido con gzip para caber de sobra en el limite del servicio.
//  · Las FOTOS, FIRMAS y ESCANEOS no viajan (pesan demasiado): se quedan en
//    el dispositivo donde se capturaron; el resto del expediente si viaja.
//  · Estrategia simple de conflicto: el ultimo cambio guardado gana.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PANTRY_API = 'https://getpantry.cloud/apiv1/pantry';
const BASKET = 'sajaTalentEngine';
const CFG_KEY = 'saja-sync-config-v1';
const DEVICE_KEY = 'saja-sync-device-id';
const TOMB_KEY = 'saja-sync-tombstones-v1';
const MEDIA_MARKER = '__LOCAL_MEDIA__';
const PUSH_DEBOUNCE_MS = 4000;
const PULL_INTERVAL_MS = 60000;
const PUSH_RETRY_MS = 20000;
// v2.5: sin timeout, una conexion que se "muere" a media peticion dejaba el
// boton Conectar / el badge Sincronizando trabados durante minutos.
const FETCH_TIMEOUT_MS = 15000;

function fetchTimeout(url: string, init?: RequestInit): Promise<Response> {
  const signal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(FETCH_TIMEOUT_MS)
      : undefined;
  return fetch(url, { ...init, signal });
}

interface SyncConfig {
  pantryId: string;
  keyB64: string;
}

interface SyncEnvelope {
  v: 1;
  updatedAt: string;
  deviceId: string;
  gz: boolean;
  payload: string; // base64(iv + ciphertext AES-GCM)
  /** Ids de registros ELIMINADOS en algun dispositivo (para que el borrado
   *  se propague en lugar de que el registro "reviva" con el merge). */
  tombstones?: string[];
  /** v2.5: huella de la clave de cifrado (NO la clave). Permite detectar un
   *  codigo equivocado con un mensaje claro en lugar de un error criptico,
   *  y evita que dos flotas con claves distintas se pisen el respaldo. */
  keyFp?: string;
}

export interface SyncData {
  candidates: Candidate[];
  employees: Employee[];
  alerts: SystemAlert[];
  settings: AppSettings;
  // v2.5: el banco de preguntas y JAC Capacita tambien viajan — antes solo
  // useStore se respaldaba y cada dispositivo tenia SU banco/capacitacion.
  questionBank?: BankQuestion[];
  training?: {
    procesos: Proceso[];
    registros: RegistroCapacitacion[];
    catalogs: TrainingCatalogs;
  };
}

export interface SyncStatus {
  state: 'off' | 'ok' | 'syncing' | 'error';
  code: string | null;
  lastPush: string | null;
  lastPull: string | null;
  error: string | null;
}

// ─── Estado del modulo ───────────────────────────────────────────────────────

let config: SyncConfig | null = loadConfig();
let status: SyncStatus = {
  state: config ? 'ok' : 'off',
  code: config ? formatCode(config) : null,
  lastPush: null,
  lastPull: null,
  error: null,
};
const listeners = new Set<() => void>();
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushRetryTimer: ReturnType<typeof setTimeout> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let lastPushedJson = '';
let lastRemoteStamp = '';
let initialized = false;

// Registros eliminados localmente: se recuerdan para que el merge de union no
// los "reviva" con los datos de otro dispositivo, y viajan en el envelope.
const tombstones = new Set<string>(loadTombstones());
let prevIds: Set<string> | null = null;

function loadTombstones(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TOMB_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveTombstones() {
  localStorage.setItem(TOMB_KEY, JSON.stringify([...tombstones]));
}

/** v2.9: lista de ids eliminados, para que el sync de Supabase propague los
 *  borrados igual que Pantry (comparten el mismo conjunto de tombstones). */
export function getTombstones(): string[] {
  return [...tombstones];
}

function collectIds(): Set<string> {
  const s = useStore.getState();
  const ids = new Set<string>();
  s.candidates.forEach((c) => ids.add(c.id));
  s.employees.forEach((e) => ids.add(e.id));
  s.alerts.forEach((a) => ids.add(a.id));
  return ids;
}

function setStatus(partial: Partial<SyncStatus>) {
  status = { ...status, ...partial };
  listeners.forEach((l) => l());
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SyncConfig;
    return parsed.pantryId && parsed.keyB64 ? parsed : null;
  } catch {
    return null;
  }
}

function saveConfig(cfg: SyncConfig | null) {
  config = cfg;
  if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(CFG_KEY);
}

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function formatCode(cfg: SyncConfig): string {
  return `${cfg.pantryId}#${cfg.keyB64}`;
}

export function parseSyncCode(code: string): SyncConfig | null {
  const trimmed = code.trim();
  const hash = trimmed.lastIndexOf('#');
  if (hash <= 0) return null;
  const pantryId = trimmed.slice(0, hash).trim();
  const keyB64 = trimmed.slice(hash + 1).trim();
  if (!pantryId || !keyB64) return null;
  return { pantryId, keyB64 };
}

// ─── Utilerias binarias ──────────────────────────────────────────────────────

function toB64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ─── Cifrado AES-GCM ─────────────────────────────────────────────────────────

const fpCache = new Map<string, string>();

/** Huella corta (no reversible) de la clave, para detectar codigos que no
 *  coinciden ANTES de intentar descifrar. */
async function keyFingerprint(keyB64: string): Promise<string> {
  const cached = fpCache.get(keyB64);
  if (cached) return cached;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyB64));
  const fp = toB64(new Uint8Array(digest)).slice(0, 12);
  fpCache.set(keyB64, fp);
  return fp;
}

export class SyncKeyMismatchError extends Error {
  constructor() {
    super(
      'El codigo de sincronizacion de este dispositivo NO coincide con el respaldo en la nube. ' +
        'Pega el CODIGO COMPLETO (ID#clave) que aparece en Configuracion > Sincronizacion del dispositivo original.',
    );
    this.name = 'SyncKeyMismatchError';
  }
}

async function ensureKeyMatch(cfg: SyncConfig, envelope: SyncEnvelope): Promise<void> {
  if (!envelope.keyFp) return; // respaldo de version anterior: sin huella
  const fp = await keyFingerprint(cfg.keyB64);
  if (envelope.keyFp !== fp) throw new SyncKeyMismatchError();
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromB64(keyB64) as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

async function encryptBytes(keyB64: string, data: Uint8Array): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data as BufferSource),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv);
  combined.set(ct, iv.length);
  return toB64(combined);
}

async function decryptBytes(keyB64: string, payloadB64: string): Promise<Uint8Array> {
  const key = await importKey(keyB64);
  const combined = fromB64(payloadB64);
  const iv = combined.subarray(0, 12);
  const ct = combined.subarray(12);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource),
  );
}

// ─── Fotos/firmas: no viajan a la nube ───────────────────────────────────────
// Se sustituyen por un marcador; al recibir datos, el marcador se rellena con
// lo que este dispositivo ya tenga guardado localmente.

function stripMedia<T>(value: T): T {
  if (typeof value === 'string') {
    return (value.startsWith('data:') ? MEDIA_MARKER : value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripMedia(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripMedia(v);
    }
    return out as unknown as T;
  }
  return value;
}

// Detecta si un valor (o cualquier hijo anidado) contiene un medio en base64
function containsMedia(value: unknown): boolean {
  if (typeof value === 'string') return value.startsWith('data:');
  if (Array.isArray(value)) return value.some((v) => containsMedia(v));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => containsMedia(v));
  }
  return false;
}

function restoreMedia<T>(remote: T, local: unknown): T {
  if (remote === MEDIA_MARKER) {
    return (typeof local === 'string' && local.startsWith('data:') ? local : undefined) as unknown as T;
  }
  if (Array.isArray(remote)) {
    const localArr = Array.isArray(local) ? local : [];
    // v2.5: los elementos con id se emparejan POR ID, no por posicion. Las
    // listas anidadas (incidentes, evaluaciones) se PREPENDEN, asi que el
    // emparejamiento por indice pegaba la firma de un incidente viejo al
    // incidente nuevo despues de un merge entre dispositivos.
    const localById = new Map(
      localArr
        .filter((v): v is { id: string } => !!v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string')
        .map((v) => [v.id, v]),
    );
    return remote.map((v, i) => {
      const vid = v && typeof v === 'object' ? (v as { id?: unknown }).id : undefined;
      const match = typeof vid === 'string' && localById.has(vid) ? localById.get(vid) : localArr[i];
      return restoreMedia(v, match);
    }) as unknown as T;
  }
  if (remote && typeof remote === 'object') {
    const localObj = local && typeof local === 'object' ? (local as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(remote as Record<string, unknown>)) {
      out[k] = restoreMedia(v, localObj[k]);
    }
    // Conserva medios que SI existen aqui pero que el remoto no trae: otro
    // dispositivo sin la foto la dejo en undefined y su push omitio la clave.
    // Sin esto, un pull borraria la foto/firma en el dispositivo que la tomo.
    // Aplica tambien a OBJETOS anidados con medios adentro (p. ej. la llave
    // signedDocsV2.renunciaVoluntaria con su escaneo firmado, que un
    // dispositivo con version anterior de la app no incluye en su push).
    for (const [k, v] of Object.entries(localObj)) {
      if (!(k in (remote as Record<string, unknown>)) && containsMedia(v)) {
        out[k] = v;
      }
    }
    return out as unknown as T;
  }
  return remote;
}

// v2.5: cada registro lleva su marca de tiempo (syncStamp) y en los
// compartidos GANA EL MAS RECIENTE — antes lo remoto siempre ganaba, y una
// captura hecha aqui se revertia si otro dispositivo subia una copia vieja.
function recordStamp(e: object): string {
  const r = e as { syncStamp?: string; modificadaEn?: string; creadaEn?: string };
  return r.syncStamp ?? r.modificadaEn ?? r.creadaEn ?? '';
}

// Merge de UNION: en registros compartidos gana el mas reciente (restaurando
// medios locales), y los registros que SOLO existen aqui se CONSERVAN —
// capturas hechas sin internet o simultaneas en otra tablet ya no se pierden.
function mergeEntities<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const localById = new Map(local.map((e) => [e.id, e]));
  const remoteIds = new Set(remote.map((r) => r.id));
  const merged = remote.map((r) => {
    const loc = localById.get(r.id);
    // La copia local es mas nueva que la remota: se conserva tal cual
    if (loc && recordStamp(loc) > recordStamp(r)) return loc;
    return restoreMedia(r, loc);
  });
  const soloLocales = local.filter((e) => !remoteIds.has(e.id));
  return [...merged, ...soloLocales].filter((e) => !tombstones.has(e.id));
}

// ─── Pantry (nube) ───────────────────────────────────────────────────────────

async function pantryGetBasket(cfg: SyncConfig): Promise<SyncEnvelope | null> {
  const res = await fetchTimeout(`${PANTRY_API}/${cfg.pantryId}/basket/${BASKET}`, { cache: 'no-store' });
  if (res.status === 400 || res.status === 404) return null; // basket aun no existe
  if (!res.ok) throw new Error(`Nube respondio ${res.status}`);
  return (await res.json()) as SyncEnvelope;
}

async function pantryPutBasket(cfg: SyncConfig, envelope: SyncEnvelope): Promise<void> {
  const res = await fetchTimeout(`${PANTRY_API}/${cfg.pantryId}/basket/${BASKET}`, {
    method: 'POST', // POST = crear o reemplazar el basket completo
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  if (!res.ok) throw new Error(`Nube respondio ${res.status} al guardar`);
}

// ─── Empaquetado del estado ──────────────────────────────────────────────────

export function collectData(): SyncData {
  const s = useStore.getState();
  const t = useTrainingStore.getState();
  return {
    candidates: stripMedia(s.candidates),
    employees: stripMedia(s.employees),
    alerts: s.alerts,
    settings: stripMedia(s.settings),
    questionBank: stripMedia(useQuestionBank.getState().questions),
    training: {
      procesos: stripMedia(t.procesos),
      registros: stripMedia(t.registros),
      catalogs: stripMedia(t.catalogs),
    },
  };
}

async function buildEnvelope(cfg: SyncConfig, data: SyncData): Promise<SyncEnvelope> {
  const json = JSON.stringify(data);
  const raw = new TextEncoder().encode(json);
  const gzipped = await gzipBytes(raw);
  const payload = await encryptBytes(cfg.keyB64, gzipped ?? raw);
  return {
    v: 1,
    updatedAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    gz: gzipped !== null,
    payload,
    tombstones: [...tombstones],
    keyFp: await keyFingerprint(cfg.keyB64),
  };
}

async function openEnvelope(cfg: SyncConfig, envelope: SyncEnvelope): Promise<SyncData> {
  const decrypted = await decryptBytes(cfg.keyB64, envelope.payload);
  const raw = envelope.gz ? await gunzipBytes(decrypted) : decrypted;
  return JSON.parse(new TextDecoder().decode(raw)) as SyncData;
}

export function applyRemote(data: SyncData, remoteTombstones: string[] = [], reschedulePush = true) {
  // Union de borrados de todos los dispositivos ANTES del merge
  remoteTombstones.forEach((id) => tombstones.add(id));
  saveTombstones();

  const local = useStore.getState();
  applyingRemote = true;
  try {
    useStore.setState({
      candidates: mergeEntities(data.candidates, local.candidates),
      employees: mergeEntities(data.employees, local.employees),
      alerts: mergeEntities(data.alerts, local.alerts),
      // La configuracion tambien viaja (catalogos de horarios/areas, umbrales,
      // PINs) para que todos los dispositivos trabajen igual. Gana la mas
      // reciente entre la local y la remota.
      settings:
        (local.settings.syncStamp ?? '') > (data.settings.syncStamp ?? '')
          ? local.settings
          : restoreMedia(data.settings, local.settings),
    });
    // v2.5: banco de preguntas — merge por id, gana la version mas reciente
    if (data.questionBank) {
      const localQs = useQuestionBank.getState().questions;
      useQuestionBank.setState({ questions: mergeEntities(data.questionBank, localQs) });
    }
    // v2.5: JAC Capacita — procesos/registros/catalogos tambien se comparten
    if (data.training) {
      const t = useTrainingStore.getState();
      useTrainingStore.setState({
        procesos: mergeEntities(data.training.procesos, t.procesos),
        registros: mergeEntities(data.training.registros, t.registros),
        catalogs: Object.fromEntries(
          Object.entries(data.training.catalogs).map(([k, remoteItems]) => [
            k,
            mergeEntities(remoteItems, t.catalogs[k as keyof TrainingCatalogs] ?? []),
          ]),
        ) as unknown as TrainingCatalogs,
      });
    }
  } finally {
    applyingRemote = false;
    prevIds = collectIds();
  }
  // El merge pudo conservar registros que la nube no tiene: se re-suben pronto
  // para que los demas dispositivos tambien los vean.
  if (reschedulePush) schedulePush();
}

// ─── API publica ─────────────────────────────────────────────────────────────

export function isSyncConfigured(): boolean {
  return config !== null;
}

/**
 * Conecta este dispositivo. `input` puede ser:
 *  · un Pantry ID nuevo (primer dispositivo) → crea el respaldo y genera codigo
 *  · un codigo completo `pantryId#clave` (demas dispositivos) → descarga datos
 */
export async function connectSync(input: string): Promise<void> {
  const parsed = parseSyncCode(input);
  let cfg: SyncConfig;
  if (parsed) {
    cfg = parsed;
  } else {
    // Pantry ID "pelado": primer dispositivo — se genera la clave de cifrado
    const keyBytes = crypto.getRandomValues(new Uint8Array(16));
    cfg = { pantryId: input.trim(), keyB64: toB64(keyBytes) };
  }

  setStatus({ state: 'syncing', error: null });
  try {
    const existing = await pantryGetBasket(cfg);
    if (existing) {
      await ensureKeyMatch(cfg, existing);
      let data: SyncData;
      try {
        data = await openEnvelope(cfg, existing);
      } catch {
        // Descifrado fallido: clave equivocada. Mensaje claro en lugar del
        // DOMException criptico (antes esto podia ademas FORCAR la clave si
        // se pegaba un ID pelado, partiendo la flota en dos islas).
        throw parsed
          ? new Error('El codigo no es correcto: no se pudo leer el respaldo de la nube. Verifica que copiaste el codigo completo.')
          : new Error(
              'Este Pantry ya tiene un respaldo de otro dispositivo. Pega el CODIGO COMPLETO (ID#clave) que aparece en Configuracion > Sincronizacion del dispositivo original.',
            );
      }
      saveConfig(cfg);
      lastRemoteStamp = existing.updatedAt;
      applyRemote(data, existing.tombstones ?? []);
      setStatus({ state: 'ok', code: formatCode(cfg), lastPull: new Date().toISOString() });
    } else {
      // No hay respaldo todavia: se sube el estado de este dispositivo
      const envelope = await buildEnvelope(cfg, collectData());
      await pantryPutBasket(cfg, envelope);
      saveConfig(cfg);
      lastRemoteStamp = envelope.updatedAt;
      lastPushedJson = JSON.stringify(collectData());
      setStatus({ state: 'ok', code: formatCode(cfg), lastPush: new Date().toISOString() });
    }
    startAutoSync();
  } catch (err) {
    setStatus({ state: config ? 'error' : 'off', error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// Candado: evita DOS subidas simultaneas (podian aterrizar en desorden y
// dejar datos VIEJOS como los mas recientes para toda la flota)
let pushing = false;

export async function pushNow(): Promise<void> {
  if (!config) return;
  if (pushing) {
    schedulePush(); // ya hay una subida en curso: se reintenta en un momento
    return;
  }
  pushing = true;
  if (pushRetryTimer) {
    clearTimeout(pushRetryTimer);
    pushRetryTimer = null;
  }
  setStatus({ state: 'syncing', error: null });
  try {
    // v2.5: TRAER y fusionar lo mas reciente ANTES de subir. Sin esto, el
    // POST reemplazaba el respaldo completo y pisaba lo que otro dispositivo
    // hubiera subido desde nuestro ultimo pull.
    try {
      const remote = await pantryGetBasket(config);
      if (remote) {
        await ensureKeyMatch(config, remote);
        if (remote.updatedAt !== lastRemoteStamp) {
          const remoteData = await openEnvelope(config, remote);
          lastRemoteStamp = remote.updatedAt;
          applyRemote(remoteData, remote.tombstones ?? [], false);
        }
      }
    } catch (err) {
      // Clave equivocada: NO subir (se pisaria el respaldo de otra flota)
      if (err instanceof SyncKeyMismatchError) throw err;
      // GET fallo (sin internet, etc.): se intenta subir de todos modos
    }
    const data = collectData();
    const envelope = await buildEnvelope(config, data);
    await pantryPutBasket(config, envelope);
    lastRemoteStamp = envelope.updatedAt;
    lastPushedJson = JSON.stringify(data);
    setStatus({ state: 'ok', lastPush: new Date().toISOString() });
  } catch (err) {
    setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
    // Sin internet o la nube fallo: se reintenta solo, para que una captura
    // hecha sin conexion no se quede sin subir. (Con clave equivocada NO se
    // reintenta: seria insistir en pisar el respaldo ajeno.)
    if (!(err instanceof SyncKeyMismatchError)) {
      pushRetryTimer = setTimeout(() => {
        pushRetryTimer = null;
        void pushNow();
      }, PUSH_RETRY_MS);
    }
  } finally {
    pushing = false;
  }
}

export async function pullNow(): Promise<void> {
  if (!config) return;
  setStatus({ state: 'syncing', error: null });
  try {
    const envelope = await pantryGetBasket(config);
    if (envelope && envelope.updatedAt !== lastRemoteStamp) {
      await ensureKeyMatch(config, envelope);
      const data = await openEnvelope(config, envelope);
      lastRemoteStamp = envelope.updatedAt;
      applyRemote(data, envelope.tombstones ?? []);
    }
    setStatus({ state: 'ok', lastPull: new Date().toISOString() });
  } catch (err) {
    setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
  }
}

export function disconnectSync(): void {
  saveConfig(null);
  if (pushTimer) clearTimeout(pushTimer);
  if (pushRetryTimer) clearTimeout(pushRetryTimer);
  if (pullTimer) clearInterval(pullTimer);
  pushTimer = null;
  pushRetryTimer = null;
  pullTimer = null;
  setStatus({ state: 'off', code: null, error: null });
}

function schedulePush() {
  if (!config || applyingRemote) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (!config) return;
    // Solo empujar si de verdad cambio la informacion (no la navegacion/sesion)
    const json = JSON.stringify(collectData());
    if (json !== lastPushedJson) void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

function startAutoSync() {
  if (!config) return;
  if (!pullTimer) {
    pullTimer = setInterval(() => {
      if (navigator.onLine && !document.hidden) void pullNow();
    }, PULL_INTERVAL_MS);
  }
}

/** Arranque: reanuda la sincronizacion si este dispositivo ya estaba conectado. */
export function initCloudSync(): void {
  if (initialized) return;
  initialized = true;

  prevIds = collectIds();

  useStore.subscribe(() => {
    // Detectar registros ELIMINADOS localmente → tombstone, para que el merge
    // de union no los reviva con los datos de otro dispositivo.
    const ids = collectIds();
    if (prevIds && !applyingRemote) {
      let changed = false;
      for (const id of prevIds) {
        if (!ids.has(id)) {
          tombstones.add(id);
          changed = true;
        }
      }
      if (changed) saveTombstones();
    }
    prevIds = ids;
    schedulePush();
  });

  // v2.5: el banco de preguntas y JAC Capacita tambien disparan la subida —
  // antes solo useStore se vigilaba y sus cambios nunca viajaban.
  useQuestionBank.subscribe(() => schedulePush());
  useTrainingStore.subscribe(() => schedulePush());

  document.addEventListener('visibilitychange', () => {
    if (!config) return;
    if (document.hidden) {
      // v2.5: al ocultar la pestana (cambiar de app / suspender la tablet) se
      // SUBE de inmediato lo pendiente: el debounce de 4s moria con la
      // pestana y la captura se quedaba solo en este dispositivo.
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      if (JSON.stringify(collectData()) !== lastPushedJson) void pushNow();
    } else {
      void pullNow();
    }
  });

  // Al recuperar internet: subir lo pendiente y traer lo nuevo
  window.addEventListener('online', () => {
    if (config) {
      void pushNow();
      void pullNow();
    }
  });

  if (config) {
    startAutoSync();
    void pullNow();
    // v2.5: respaldo de arranque — si quedo algo capturado sin subir en la
    // sesion anterior (se cerro la app antes del debounce), se sube ahora
    // aunque el pull falle o el respaldo aun no exista.
    schedulePush();
  }
}
