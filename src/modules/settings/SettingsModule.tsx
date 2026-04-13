import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RotateCcw, Shield, Building, Sliders, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AppSettings } from '../../types';

export default function SettingsModule() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setForm({ ...settings });
  };

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
