import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { useStore } from '../store/useStore';
import { useQuestionBank } from '../store/useQuestionBank';
import { useTrainingStore } from '../store/useTrainingStore';
import { collectData, applyRemote, getTombstones } from './cloudSync';
import type { SyncData } from './cloudSync';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SINCRONIZACION CON SUPABASE (v2.9)
// Toda la informacion (colaboradores, candidatos, expedientes, banco de
// preguntas, capacitacion, configuracion) se guarda en UNA fila jsonb de la
// tabla `saja_state`. Reutiliza la logica de MEZCLA ya probada de cloudSync
// (collectData / applyRemote / tombstones): en registros compartidos gana el
// mas reciente, los solo-locales se conservan y los borrados se propagan.
//
// Las FOTOS/FIRMAS/ESCANEOS siguen sin viajar (collectData las quita): se
// quedan en el dispositivo donde se capturaron. Es una primera version; mover
// las imagenes a Supabase Storage queda como segundo paso.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TABLE = 'saja_state';
const ROW_ID = 'main';
const PUSH_DEBOUNCE_MS = 4000;
const PULL_INTERVAL_MS = 60000;

export interface SupaSyncStatus {
  enabled: boolean;
  signedIn: boolean;
  email: string | null;
  state: 'off' | 'ok' | 'syncing' | 'error';
  lastPush: string | null;
  lastPull: string | null;
  error: string | null;
}

interface RowData extends SyncData {
  tombstones?: string[];
}

let status: SupaSyncStatus = {
  enabled: SUPABASE_ENABLED,
  signedIn: false,
  email: null,
  state: 'off',
  lastPush: null,
  lastPull: null,
  error: null,
};

const listeners = new Set<() => void>();

export function subscribeSupaStatus(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSupaStatus(): SupaSyncStatus {
  return status;
}

function setStatus(p: Partial<SupaSyncStatus>) {
  status = { ...status, ...p };
  listeners.forEach((l) => l());
}

function msg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let pushing = false;
let applying = false;
let initialized = false;
let lastPushedJson = '';
let lastRemoteUpdatedAt = '';

// El estado remoto ya trae la forma esperada (arreglos). Se valida antes de
// aplicar para no romper si la fila esta vacia ('{}') o corrupta.
function isSyncShape(d: unknown): d is RowData {
  return !!d && typeof d === 'object' && Array.isArray((d as RowData).employees);
}

function mergeRemote(rd: RowData) {
  applying = true;
  try {
    applyRemote(rd as SyncData, rd.tombstones ?? [], false);
  } finally {
    applying = false;
  }
}

async function supaPull(): Promise<void> {
  if (!status.signedIn) return;
  setStatus({ state: 'syncing', error: null });
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data, updated_at')
      .eq('id', ROW_ID)
      .maybeSingle();
    if (error) throw error;
    if (data && data.updated_at !== lastRemoteUpdatedAt) {
      lastRemoteUpdatedAt = data.updated_at as string;
      const rd = data.data as unknown;
      if (isSyncShape(rd)) {
        mergeRemote(rd);
        // el merge pudo conservar registros locales que la nube no tenia:
        // se re-suben para que los demas dispositivos tambien los vean
        schedulePush();
      }
    }
    setStatus({ state: 'ok', lastPull: new Date().toISOString() });
  } catch (err) {
    setStatus({ state: 'error', error: msg(err) });
  }
}

async function supaPush(): Promise<void> {
  if (!status.signedIn) return;
  if (pushing) {
    schedulePush();
    return;
  }
  pushing = true;
  setStatus({ state: 'syncing', error: null });
  try {
    // Traer y fusionar lo remoto ANTES de subir, para no pisar cambios que
    // otro dispositivo haya subido desde nuestro ultimo pull.
    try {
      const { data } = await supabase.from(TABLE).select('data, updated_at').eq('id', ROW_ID).maybeSingle();
      if (data && data.updated_at !== lastRemoteUpdatedAt) {
        lastRemoteUpdatedAt = data.updated_at as string;
        const rd = data.data as unknown;
        if (isSyncShape(rd)) mergeRemote(rd);
      }
    } catch {
      // sin conexion al leer: se intenta subir de todos modos
    }

    const payload: RowData = { ...collectData(), tombstones: getTombstones() };
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: payload, updated_at: updatedAt });
    if (error) throw error;
    lastRemoteUpdatedAt = updatedAt;
    lastPushedJson = JSON.stringify(collectData());
    setStatus({ state: 'ok', lastPush: new Date().toISOString() });
  } catch (err) {
    setStatus({ state: 'error', error: msg(err) });
  } finally {
    pushing = false;
  }
}

function schedulePush() {
  if (!status.signedIn || applying) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (!status.signedIn) return;
    // Solo subir si de verdad cambio la informacion (no la navegacion)
    if (JSON.stringify(collectData()) !== lastPushedJson) void supaPush();
  }, PUSH_DEBOUNCE_MS);
}

export async function supaPullNow(): Promise<void> {
  await supaPull();
}

export async function supaPushNow(): Promise<void> {
  await supaPush();
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signOutSupabase(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  // subir lo pendiente antes de cerrar sesion (mejor esfuerzo)
  try {
    if (status.signedIn && JSON.stringify(collectData()) !== lastPushedJson) await supaPush();
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut();
}

function onSession(session: Session | null) {
  const signedIn = !!session;
  const wasSignedIn = status.signedIn;
  setStatus({
    signedIn,
    email: session?.user?.email ?? null,
    state: signedIn ? 'ok' : 'off',
    error: signedIn ? null : status.error,
  });
  if (signedIn && !wasSignedIn) {
    lastRemoteUpdatedAt = '';
    lastPushedJson = '';
    if (!pullTimer) {
      pullTimer = setInterval(() => {
        if (navigator.onLine && !document.hidden) void supaPull();
      }, PULL_INTERVAL_MS);
    }
    void supaPull();
    // sube lo que este dispositivo ya tenia capturado localmente
    schedulePush();
  } else if (!signedIn && wasSignedIn) {
    if (pullTimer) {
      clearInterval(pullTimer);
      pullTimer = null;
    }
  }
}

/** Arranque: conecta la sincronizacion con Supabase y escucha la sesion. */
export function initSupabaseSync(): void {
  if (initialized || !SUPABASE_ENABLED) return;
  initialized = true;

  void supabase.auth.getSession().then(({ data }) => onSession(data.session));
  supabase.auth.onAuthStateChange((_event, session) => onSession(session));

  // Cambios locales → subir (con debounce). Durante un merge remoto no se sube.
  useStore.subscribe(() => schedulePush());
  useQuestionBank.subscribe(() => schedulePush());
  useTrainingStore.subscribe(() => schedulePush());

  document.addEventListener('visibilitychange', () => {
    if (!status.signedIn) return;
    if (document.hidden) {
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      if (JSON.stringify(collectData()) !== lastPushedJson) void supaPush();
    } else {
      void supaPull();
    }
  });

  window.addEventListener('online', () => {
    if (status.signedIn) {
      void supaPush();
      void supaPull();
    }
  });
}
