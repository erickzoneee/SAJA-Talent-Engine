import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { Cloud, Lock, Mail, LogIn, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase, SUPABASE_ENABLED } from '../utils/supabaseClient';
import { signInWithPassword } from '../utils/supabaseSync';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.9 — Puerta de acceso a la nube. Antes de usar la app, este dispositivo
// inicia sesion UNA vez con la cuenta de la empresa; a partir de ahi la sesion
// se guarda y todo sincroniza solo. Incluye una salida "usar sin sincronizar"
// para que un problema de red NUNCA deje sin acceso a los datos locales.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function SupabaseGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(!SUPABASE_ENABLED);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!SUPABASE_ENABLED || session || skip) return <>{children}</>;

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <Loader2 className="animate-spin text-primary-400" size={28} />
      </div>
    );
  }

  return <SupabaseLogin onSkip={() => setSkip(true)} />;
}

function SupabaseLogin({ onSkip }: { onSkip: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      // onAuthStateChange en el gate detecta la sesion y muestra la app
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setError(
        /invalid login credentials/i.test(m)
          ? 'Correo o contrasena incorrectos.'
          : `No se pudo iniciar sesion: ${m}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card w-full max-w-md p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/25 to-accent-500/25 flex items-center justify-center mb-3">
            <Cloud size={28} className="text-primary-300" />
          </div>
          <h1 className="text-xl font-bold text-white">SAJA Talent Engine</h1>
          <p className="text-sm text-surface-400 mt-1">
            Inicia sesion con la cuenta de la empresa para sincronizar este dispositivo con los demas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">
              <Mail size={13} className="inline mr-1.5 -mt-0.5" /> Correo
            </label>
            <input
              type="email"
              autoComplete="username"
              className="input-field no-uppercase"
              placeholder="correo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">
              <Lock size={13} className="inline mr-1.5 -mt-0.5" /> Contrasena
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="input-field no-uppercase"
              placeholder="Tu contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 flex items-start gap-2">
              <AlertTriangle size={15} className="text-danger-400 mt-0.5 shrink-0" />
              <p className="text-xs text-danger-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            disabled={busy || !email.trim() || !password}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {busy ? 'Iniciando sesion...' : 'Iniciar sesion'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
          >
            Usar solo en este dispositivo (sin sincronizar)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
