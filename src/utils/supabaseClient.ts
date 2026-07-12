import { createClient } from '@supabase/supabase-js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE — base de datos en la nube (v2.9)
// La "clave publicable" (sb_publishable_...) es SEGURA de exponer en el
// navegador: el acceso a los datos esta protegido por RLS + inicio de sesion.
// Sin una sesion valida, nadie puede leer ni escribir la informacion (CURP,
// RFC, sueldos, etc.). Cada dispositivo inicia sesion UNA vez y a partir de
// ahi todo sincroniza solo.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SUPABASE_URL = 'https://ztanglnticedshfrqgja.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_01l5VQX7dHcZcixkF0FFWg_6kq4K4Or';

export const SUPABASE_ENABLED = SUPABASE_URL.startsWith('https://') && !!SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'saja-supabase-auth',
  },
});
