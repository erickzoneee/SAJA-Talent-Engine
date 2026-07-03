import { useStore } from '../store/useStore';
import type { Candidate, Employee, AppSettings, SystemAlert } from '../types';

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
}

interface SyncData {
  candidates: Candidate[];
  employees: Employee[];
  alerts: SystemAlert[];
  settings: AppSettings;
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
let tombstones = new Set<string>(loadTombstones());
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

function restoreMedia<T>(remote: T, local: unknown): T {
  if (remote === MEDIA_MARKER) {
    return (typeof local === 'string' && local.startsWith('data:') ? local : undefined) as unknown as T;
  }
  if (Array.isArray(remote)) {
    const localArr = Array.isArray(local) ? local : [];
    return remote.map((v, i) => restoreMedia(v, localArr[i])) as unknown as T;
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
    for (const [k, v] of Object.entries(localObj)) {
      if (!(k in (remote as Record<string, unknown>)) && typeof v === 'string' && v.startsWith('data:')) {
        out[k] = v;
      }
    }
    return out as unknown as T;
  }
  return remote;
}

// Merge de UNION: lo remoto gana en registros compartidos (restaurando medios
// locales), y los registros que SOLO existen aqui se CONSERVAN — capturas
// hechas sin internet o simultaneas en otra tablet ya no se pierden.
function mergeEntities<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const localById = new Map(local.map((e) => [e.id, e]));
  const remoteIds = new Set(remote.map((r) => r.id));
  const merged = remote.map((r) => restoreMedia(r, localById.get(r.id)));
  const soloLocales = local.filter((e) => !remoteIds.has(e.id));
  return [...merged, ...soloLocales].filter((e) => !tombstones.has(e.id));
}

// ─── Pantry (nube) ───────────────────────────────────────────────────────────

async function pantryGetBasket(cfg: SyncConfig): Promise<SyncEnvelope | null> {
  const res = await fetch(`${PANTRY_API}/${cfg.pantryId}/basket/${BASKET}`, { cache: 'no-store' });
  if (res.status === 400 || res.status === 404) return null; // basket aun no existe
  if (!res.ok) throw new Error(`Nube respondio ${res.status}`);
  return (await res.json()) as SyncEnvelope;
}

async function pantryPutBasket(cfg: SyncConfig, envelope: SyncEnvelope): Promise<void> {
  const res = await fetch(`${PANTRY_API}/${cfg.pantryId}/basket/${BASKET}`, {
    method: 'POST', // POST = crear o reemplazar el basket completo
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  if (!res.ok) throw new Error(`Nube respondio ${res.status} al guardar`);
}

// ─── Empaquetado del estado ──────────────────────────────────────────────────

function collectData(): SyncData {
  const s = useStore.getState();
  return {
    candidates: stripMedia(s.candidates),
    employees: stripMedia(s.employees),
    alerts: s.alerts,
    settings: stripMedia(s.settings),
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
  };
}

async function openEnvelope(cfg: SyncConfig, envelope: SyncEnvelope): Promise<SyncData> {
  const decrypted = await decryptBytes(cfg.keyB64, envelope.payload);
  const raw = envelope.gz ? await gunzipBytes(decrypted) : decrypted;
  return JSON.parse(new TextDecoder().decode(raw)) as SyncData;
}

function applyRemote(data: SyncData, remoteTombstones: string[] = []) {
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
      // PINs) para que todos los dispositivos trabajen igual.
      settings: restoreMedia(data.settings, local.settings),
    });
  } finally {
    applyingRemote = false;
    prevIds = collectIds();
  }
  // El merge pudo conservar registros que la nube no tiene: se re-suben pronto
  // para que los demas dispositivos tambien los vean.
  schedulePush();
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
      const data = await openEnvelope(cfg, existing);
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

export async function pushNow(): Promise<void> {
  if (!config) return;
  if (pushRetryTimer) {
    clearTimeout(pushRetryTimer);
    pushRetryTimer = null;
  }
  setStatus({ state: 'syncing', error: null });
  try {
    const data = collectData();
    const envelope = await buildEnvelope(config, data);
    await pantryPutBasket(config, envelope);
    lastRemoteStamp = envelope.updatedAt;
    lastPushedJson = JSON.stringify(data);
    setStatus({ state: 'ok', lastPush: new Date().toISOString() });
  } catch (err) {
    setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
    // Sin internet o la nube fallo: se reintenta solo, para que una captura
    // hecha sin conexion no se quede sin subir.
    pushRetryTimer = setTimeout(() => {
      pushRetryTimer = null;
      void pushNow();
    }, PUSH_RETRY_MS);
  }
}

export async function pullNow(): Promise<void> {
  if (!config) return;
  setStatus({ state: 'syncing', error: null });
  try {
    const envelope = await pantryGetBasket(config);
    if (envelope && envelope.updatedAt !== lastRemoteStamp) {
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

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && config) void pullNow();
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
  }
}
