import { useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  RotateCcw,
  Shield,
  Building,
  Sliders,
  CheckCircle,
  Video,
  Clock,
  Cloud,
  Copy,
  Link2,
  RefreshCw,
  Trash2,
  Plus,
  X,
  AlertTriangle,
  LogOut,
  Database,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AppSettings } from '../../types';
import { DEFAULT_SCHEDULES, DEFAULT_AREAS } from '../../types';
import { toUpper } from '../../utils/helpers';
import { getDefaultOnboardingModules } from '../../utils/onboardingModules';
import {
  connectSync,
  disconnectSync,
  pushNow,
  pullNow,
  getSyncStatus,
  subscribeSyncStatus,
} from '../../utils/cloudSync';
import { SUPABASE_ENABLED } from '../../utils/supabaseClient';
import {
  getSupaStatus,
  subscribeSupaStatus,
  supaPullNow,
  supaPushNow,
  signOutSupabase,
} from '../../utils/supabaseSync';

const ONBOARDING_VIDEO_MODULES = getDefaultOnboardingModules();

export default function SettingsModule() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // v2.4 Req 1: los datos de texto se guardan en MAYUSCULAS
    updateSettings({
      ...form,
      companyName: toUpper(form.companyName),
      companyAddress: toUpper(form.companyAddress),
      companyRfc: toUpper(form.companyRfc),
      directorName: toUpper(form.directorName),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setForm({ ...settings });
  };

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateOnboardingUrl = (id: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      onboardingVideoUrls: { ...(prev.onboardingVideoUrls ?? {}), [id]: value },
    }));
  };

  const updateOnboardingNarration = (id: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      onboardingNarrationUrls: { ...(prev.onboardingNarrationUrls ?? {}), [id]: value },
    }));
  };

  // ─── v2.4 Req 3: catalogos editables de horarios y areas ───
  const schedules = form.schedules?.length ? form.schedules : DEFAULT_SCHEDULES;
  const areas = form.areas?.length ? form.areas : DEFAULT_AREAS;
  const [newSchedule, setNewSchedule] = useState('');
  const [newArea, setNewArea] = useState('');

  const addSchedule = () => {
    const s = toUpper(newSchedule);
    if (!s || schedules.includes(s)) return;
    setForm((prev) => ({ ...prev, schedules: [...schedules, s] }));
    setNewSchedule('');
  };
  const removeSchedule = (s: string) =>
    setForm((prev) => ({ ...prev, schedules: schedules.filter((x) => x !== s) }));

  const addArea = () => {
    const a = toUpper(newArea);
    if (!a || areas.includes(a)) return;
    setForm((prev) => ({ ...prev, areas: [...areas, a] }));
    setNewArea('');
  };
  const removeArea = (a: string) =>
    setForm((prev) => ({ ...prev, areas: areas.filter((x) => x !== a) }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Configuracion del Sistema</h1>
          <p className="text-surface-400 text-sm">Solo accesible para Direccion General</p>
        </div>
      </div>

      {/* Company Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-surface-100">Datos de la Empresa</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Nombre de la empresa</label>
            <input
              className="input-field"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Direccion</label>
            <input
              className="input-field"
              value={form.companyAddress}
              onChange={(e) => updateField('companyAddress', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Telefono</label>
            <input
              className="input-field"
              value={form.companyPhone}
              onChange={(e) => updateField('companyPhone', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">RFC</label>
            <input
              className="input-field"
              value={form.companyRfc}
              onChange={(e) => updateField('companyRfc', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-surface-400 mb-1">Nombre del Director General</label>
            <input
              className="input-field"
              value={form.directorName}
              onChange={(e) => updateField('directorName', e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Scoring Thresholds */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-5 h-5 text-accent-400" />
          <h2 className="text-lg font-semibold text-surface-100">Umbrales de Evaluacion</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">
              Umbral RECOMENDADO <span className="text-success-500">(verde)</span>
            </label>
            <input
              type="number"
              className="input-field"
              value={form.recommendedThreshold}
              onChange={(e) => updateField('recommendedThreshold', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
            />
            <p className="text-xs text-surface-500 mt-1">Puntaje minimo para recomendado (actual: {form.recommendedThreshold}/100)</p>
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">
              Umbral CON RESERVAS <span className="text-warning-500">(amarillo)</span>
            </label>
            <input
              type="number"
              className="input-field"
              value={form.reservationsThreshold}
              onChange={(e) => updateField('reservationsThreshold', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
            />
            <p className="text-xs text-surface-500 mt-1">Puntaje minimo para reservas (actual: {form.reservationsThreshold}/100)</p>
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Aprobatorio examen de matematicas</label>
            <input
              type="number"
              className="input-field"
              value={form.mathPassScore}
              onChange={(e) => updateField('mathPassScore', parseInt(e.target.value) || 0)}
              min={0}
              max={18}
            />
            <p className="text-xs text-surface-500 mt-1">Aciertos minimos de 18 preguntas (actual: {form.mathPassScore}/18)</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-surface-900/50 border border-surface-700/50">
          <p className="text-xs text-surface-400">
            <strong className="text-surface-300">Como funciona:</strong> Puntaje ≥ {form.recommendedThreshold} = Recomendado |
            Puntaje {form.reservationsThreshold}-{form.recommendedThreshold - 1} = Con Reservas |
            Puntaje &lt; {form.reservationsThreshold} = No Recomendado
          </p>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-warning-500" />
          <h2 className="text-lg font-semibold text-surface-100">Seguridad</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">PIN Supervisor</label>
            <input
              type="password"
              className="input-field"
              value={form.supervisorPin}
              onChange={(e) => updateField('supervisorPin', e.target.value)}
              maxLength={6}
            />
            <p className="text-xs text-surface-500 mt-1">4-6 digitos para acceso de supervisor</p>
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">PIN Direccion</label>
            <input
              type="password"
              className="input-field"
              value={form.directionPin}
              onChange={(e) => updateField('directionPin', e.target.value)}
              maxLength={6}
            />
            <p className="text-xs text-surface-500 mt-1">4-6 digitos para acceso de direccion general</p>
          </div>
        </div>
      </motion.div>

      {/* v2.4 Req 3: Catalogos de contratacion (horarios y areas) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-surface-100">Horarios y Areas Asignables</h2>
        </div>
        <p className="text-sm text-surface-400 mb-5">
          Opciones que aparecen al contratar. Puedes agregar o quitar; recuerda presionar
          &quot;Guardar Cambios&quot; al final.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-surface-500 mb-2">
              Tipos de horario ({schedules.length})
            </p>
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s} className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/30">
                  <Clock size={14} className="text-primary-400 shrink-0" />
                  <span className="flex-1 text-sm text-surface-200">{s}</span>
                  <button
                    className="p-1 rounded-lg hover:bg-danger-500/20 text-surface-500 hover:text-danger-400 transition-colors cursor-pointer"
                    onClick={() => removeSchedule(s)}
                    title="Quitar horario"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                className="input-field text-xs"
                placeholder="Ej: TURNO NOCTURNO · LUN-SAB 22:00 - 6:00"
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSchedule()}
              />
              <button className="btn-primary text-xs px-3 flex items-center gap-1" onClick={addSchedule}>
                <Plus size={13} /> Agregar
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-surface-500 mb-2">
              Areas asignables ({areas.length})
            </p>
            <div className="space-y-2">
              {areas.map((a) => (
                <div key={a} className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-800/40 border border-surface-700/30">
                  <Building size={14} className="text-accent-400 shrink-0" />
                  <span className="flex-1 text-sm text-surface-200">{a}</span>
                  <button
                    className="p-1 rounded-lg hover:bg-danger-500/20 text-surface-500 hover:text-danger-400 transition-colors cursor-pointer"
                    onClick={() => removeArea(a)}
                    title="Quitar area"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                className="input-field text-xs"
                placeholder="Nombre de la nueva area"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addArea()}
              />
              <button className="btn-primary text-xs px-3 flex items-center gap-1" onClick={addArea}>
                <Plus size={13} /> Agregar
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* v2.4 Req 7 / v2.9: Sincronizacion entre dispositivos.
          Con Supabase activo, la nube es una base de datos real protegida por
          inicio de sesion; si no, se usa el respaldo cifrado con codigo (Pantry). */}
      {SUPABASE_ENABLED ? <SupabaseSyncSection /> : <SyncSection />}

      {/* Videos del Sistema */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-surface-100">Videos del Sistema</h2>
        </div>
        <p className="text-sm text-surface-400 mb-2">
          Cada modulo puede reproducir un <strong className="text-surface-300">video real</strong> (URL de
          archivo MP4/webm, YouTube o Vimeo) o una <strong className="text-surface-300">narracion</strong>
          (URL de audio TTS con subtitulos y laminas sincronizadas). Si hay video real, tiene prioridad;
          si solo hay narracion, se usa el modo narrado; si ambos quedan vacios, se usa el reproductor de
          demostracion.
        </p>
        <p className="text-xs text-surface-500 mb-5">
          Los videos de archivo y la narracion registran evidencia de visualizacion completa automaticamente.
        </p>

        {/* Recepcion */}
        <div className="mb-6 space-y-2">
          <label className="block text-sm text-surface-300 font-medium">
            Recepcion — video informativo <span className="text-surface-500">(asi trabajamos aqui)</span>
          </label>
          <input
            className="input-field no-uppercase"
            placeholder="Video (URL MP4, YouTube o Vimeo)"
            value={form.receptionVideoUrl ?? ''}
            onChange={(e) => updateField('receptionVideoUrl', e.target.value)}
          />
          <input
            className="input-field no-uppercase"
            placeholder="Narracion (URL de audio TTS)"
            value={form.receptionNarrationUrl ?? ''}
            onChange={(e) => updateField('receptionNarrationUrl', e.target.value)}
          />
        </div>

        {/* Onboarding — 11 videos */}
        <p className="text-xs uppercase tracking-wider text-surface-500 mb-3">
          Onboarding — 11 videos de la semana 1
        </p>
        <div className="space-y-4">
          {ONBOARDING_VIDEO_MODULES.map((m) => (
            <div key={m.id} className="space-y-1.5">
              <label className="block text-xs text-surface-400">
                {m.id}. {m.name}
                {m.critical && <span className="text-danger-400"> · critico</span>}
              </label>
              <input
                className="input-field no-uppercase"
                placeholder="Video (URL)"
                value={(form.onboardingVideoUrls ?? {})[m.id] ?? ''}
                onChange={(e) => updateOnboardingUrl(m.id, e.target.value)}
              />
              <input
                className="input-field no-uppercase"
                placeholder="Narracion (URL de audio)"
                value={(form.onboardingNarrationUrls ?? {})[m.id] ?? ''}
                onChange={(e) => updateOnboardingNarration(m.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3"
      >
        <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Guardado!' : 'Guardar Cambios'}
        </button>
        <button className="btn-secondary flex items-center gap-2" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          Restaurar
        </button>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-success-500 text-sm"
          >
            Configuracion actualizada correctamente
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.4 — Requerimiento 7: SINCRONIZACION ENTRE DISPOSITIVOS
// La informacion se respalda CIFRADA en la nube (Pantry, servicio gratuito) y
// cualquier tablet/computadora con el codigo de sincronizacion ve los mismos
// datos. Fotos, firmas y escaneos no viajan: se quedan en cada dispositivo.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// v2.9 — Estado de la sincronizacion con la base de datos real (Supabase).
function SupabaseSyncSection() {
  const status = useSyncExternalStore(subscribeSupaStatus, getSupaStatus);
  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  const badge = status.state === 'error'
    ? 'badge-red'
    : status.state === 'syncing'
      ? 'badge-yellow'
      : status.signedIn
        ? 'badge-green'
        : 'badge-blue';
  const badgeText = !status.signedIn
    ? 'Sin sesion'
    : status.state === 'error'
      ? 'Error'
      : status.state === 'syncing'
        ? 'Sincronizando...'
        : 'Conectado';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <Database className="w-5 h-5 text-accent-400" />
        <h2 className="text-lg font-semibold text-surface-100">Base de Datos en la Nube</h2>
        <span className={`badge ml-2 ${badge}`}>{badgeText}</span>
      </div>
      <p className="text-sm text-surface-400 mb-4">
        Todos los datos se guardan en una base de datos real protegida por inicio de sesion, y se
        sincronizan solos entre todos los dispositivos con la sesion iniciada. (Las fotos y escaneos aun
        se quedan en cada dispositivo.)
      </p>

      {status.signedIn ? (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-700/50">
            <p className="text-sm text-surface-200">
              Sesion iniciada como <strong className="text-white">{status.email}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-400 mt-2">
              <span>Ultimo envio: {fmtTime(status.lastPush)}</span>
              <span>Ultima descarga: {fmtTime(status.lastPull)}</span>
              {status.error && (
                <span className="text-danger-500 flex items-center gap-1">
                  <AlertTriangle size={12} /> {status.error}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => void supaPullNow()}>
              <RefreshCw size={13} /> Traer cambios de la nube
            </button>
            <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => void supaPushNow()}>
              <Cloud size={13} /> Enviar cambios ahora
            </button>
            <button className="btn-danger text-xs flex items-center gap-1.5" onClick={() => void signOutSupabase()}>
              <LogOut size={13} /> Cerrar sesion en este dispositivo
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20 text-sm text-surface-300">
          Este dispositivo esta trabajando <strong>sin sincronizar</strong>. Para ver los mismos datos en
          las demas tablets, recarga la app e inicia sesion con la cuenta de la empresa.
        </div>
      )}
    </motion.div>
  );
}

function SyncSection() {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const connected = status.state !== 'off';

  const handleConnect = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      await connectSync(input);
      setInput('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!status.code) return;
    try {
      await navigator.clipboard.writeText(status.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El portapapeles puede estar bloqueado — se muestra el codigo en pantalla de todos modos
    }
  };

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <Cloud className="w-5 h-5 text-accent-400" />
        <h2 className="text-lg font-semibold text-surface-100">Sincronizacion entre Dispositivos</h2>
        {connected && (
          <span className={`badge ml-2 ${status.state === 'error' ? 'badge-red' : status.state === 'syncing' ? 'badge-yellow' : 'badge-green'}`}>
            {status.state === 'error' ? 'Error' : status.state === 'syncing' ? 'Sincronizando...' : 'Conectado'}
          </span>
        )}
      </div>
      <p className="text-sm text-surface-400 mb-4">
        La base de datos vive en este dispositivo. Al conectar la nube, la informacion viaja
        CIFRADA y se puede ver en las demas tablets o computadoras usando el mismo codigo.
        Las fotos, firmas y escaneos no viajan (se quedan donde se capturaron).
      </p>

      {!connected ? (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-700/50 text-sm text-surface-300 space-y-2">
            <p className="font-semibold text-surface-200">Como conectar (solo una vez):</p>
            <p>
              1. En el PRIMER dispositivo: entra gratis a{' '}
              <a
                href="https://getpantry.cloud"
                target="_blank"
                rel="noreferrer"
                className="text-primary-400 underline hover:text-primary-300"
              >
                getpantry.cloud
              </a>{' '}
              , crea tu &quot;pantry&quot; (sin registro) y copia el <strong>Pantry ID</strong>. Pegalo aqui abajo y
              presiona Conectar: el sistema sube los datos y te da un <strong>codigo de sincronizacion</strong>.
            </p>
            <p>
              2. En los DEMAS dispositivos: pega ese mismo <strong>codigo de sincronizacion</strong> y presiona
              Conectar. Listo — todos ven la misma informacion.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              className="input-field no-uppercase font-mono text-sm"
              placeholder="Pantry ID (primer dispositivo) o codigo de sincronizacion (los demas)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button
              className="btn-primary flex items-center gap-2 shrink-0"
              disabled={!input.trim() || busy}
              onClick={handleConnect}
            >
              <Link2 size={15} />
              {busy ? 'Conectando...' : 'Conectar'}
            </button>
          </div>
          {localError && (
            <p className="text-xs text-danger-500 flex items-center gap-1.5">
              <AlertTriangle size={13} /> No se pudo conectar: {localError}. Revisa el ID/codigo y tu internet.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-surface-500 mb-1.5">
              Codigo de sincronizacion — pegalo en los demas dispositivos
            </label>
            <div className="flex gap-2">
              <input
                className="input-field no-uppercase font-mono text-xs"
                readOnly
                value={status.code ?? ''}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="btn-secondary flex items-center gap-1.5 text-xs shrink-0" onClick={handleCopy}>
                <Copy size={13} />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-surface-400">
            <span>Ultimo envio: {fmtTime(status.lastPush)}</span>
            <span>Ultima descarga: {fmtTime(status.lastPull)}</span>
            {status.error && (
              <span className="text-danger-500 flex items-center gap-1">
                <AlertTriangle size={12} /> {status.error}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary text-xs flex items-center gap-1.5"
              onClick={() => void pullNow()}
            >
              <RefreshCw size={13} />
              Traer cambios de la nube
            </button>
            <button
              className="btn-secondary text-xs flex items-center gap-1.5"
              onClick={() => void pushNow()}
            >
              <Cloud size={13} />
              Enviar cambios ahora
            </button>
            <button
              className="btn-danger text-xs flex items-center gap-1.5"
              onClick={() => disconnectSync()}
            >
              <Trash2 size={13} />
              Desconectar este dispositivo
            </button>
          </div>

          <p className="text-[11px] text-surface-500">
            Los cambios se envian solos unos segundos despues de capturar, y se revisan
            actualizaciones cada minuto y al volver a la app. Si dos dispositivos editan al mismo
            tiempo, gana el ultimo que guarda.
          </p>
        </div>
      )}
    </motion.div>
  );
}
