import { useState, useMemo, useSyncExternalStore, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  FileCheck,
  GraduationCap,
  School,
  TrendingUp,
  LogOut,
  BarChart3,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Shield,
  Power,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getSyncStatus, subscribeSyncStatus, pullNow } from '../utils/cloudSync';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v2.20 — El sistema se usa en celular. Debajo de 768px el menu lateral se
// oculta por completo (antes se comia 280px de una pantalla de 375px) y la
// navegacion pasa a una barra de pestanas abajo, al estilo de una app: los
// modulos del dia a dia siempre a la mano y el resto en la hoja "Mas".
// De 768px para arriba NADA cambia respecto a la version anterior.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** true cuando la pantalla es de 768px o mas (tablet/escritorio). */
export function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(min-width: 768px)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => true,
  );
}

// v2.5: estado de la nube visible para TODOS los roles — antes solo Direccion
// podia verlo en Configuracion y un error de sync pasaba dias sin detectarse.
function SyncChip({ collapsed, compact = false }: { collapsed: boolean; compact?: boolean }) {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus);
  // v2.20: en celular el motivo del error tiene que poder LEERSE; el atributo
  // title nunca aparece en una pantalla tactil.
  const [showError, setShowError] = useState(false);
  if (status.state === 'off') return null;

  const icon =
    status.state === 'error' ? (
      <CloudOff size={14} className="text-danger-500 shrink-0" />
    ) : status.state === 'syncing' ? (
      <RefreshCw size={14} className="text-warning-500 shrink-0 animate-spin" />
    ) : (
      <Cloud size={14} className="text-success-500 shrink-0" />
    );
  const label =
    status.state === 'error'
      ? 'Sin sincronizar'
      : status.state === 'syncing'
        ? 'Sincronizando...'
        : 'Nube al dia';

  if (compact) {
    return (
      <div className="relative">
        <button
          className="flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg active:bg-white/[0.06] transition-colors"
          aria-label={label}
          onClick={() => {
            if (status.state === 'error') setShowError((v) => !v);
            else void pullNow();
          }}
        >
          {icon}
        </button>
        {showError && status.error && (
          <div className="absolute right-0 top-full mt-1 z-50 w-[min(18rem,80vw)] rounded-xl border border-danger-500/30 bg-surface-900 p-3 text-xs text-surface-300 shadow-2xl">
            <p className="font-semibold text-danger-500 mb-1">{label}</p>
            <p className="break-words">{status.error}</p>
            <button
              className="mt-2 text-primary-400 font-semibold"
              onClick={() => {
                setShowError(false);
                void pullNow();
              }}
            >
              Reintentar ahora
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors ${collapsed ? 'justify-center' : ''}`}
      title={status.error ?? `${label} — toca para actualizar ahora`}
      onClick={() => void pullNow()}
    >
      {icon}
      {!collapsed && (
        <span
          className={`text-xs ${
            status.state === 'error'
              ? 'text-danger-500'
              : status.state === 'syncing'
                ? 'text-warning-500'
                : 'text-surface-400'
          }`}
        >
          {label}
        </span>
      )}
    </button>
  );
}

interface NavItem {
  id: string;
  label: string;
  /** Etiqueta corta para la barra de pestanas del celular. */
  short: string;
  icon: React.ElementType;
  route: string;
  directionOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Inicio', icon: LayoutDashboard, route: '/dashboard' },
  { id: 'recruitment', label: 'Recepcion', short: 'Recepcion', icon: UserPlus, route: '/recruitment' },
  { id: 'interview', label: 'Entrevistas', short: 'Entrevista', icon: ClipboardList, route: '/interview' },
  { id: 'hiring', label: 'Contratacion', short: 'Contrato', icon: FileCheck, route: '/hiring' },
  // v2.18: expedientes en fichas — solo consulta (las altas viven en Contratacion)
  { id: 'colaboradores', label: 'Colaboradores', short: 'Fichas', icon: Users, route: '/colaboradores' },
  { id: 'onboarding', label: 'Onboarding', short: 'Onboarding', icon: GraduationCap, route: '/onboarding' },
  { id: 'training', label: 'Capacitacion', short: 'Capacita', icon: School, route: '/training' },
  { id: 'performance', label: 'Desempeno', short: 'Desempeno', icon: TrendingUp, route: '/performance' },
  { id: 'exit', label: 'Egreso', short: 'Egreso', icon: LogOut, route: '/exit' },
  { id: 'analytics', label: 'Analisis', short: 'Analisis', icon: BarChart3, route: '/analytics' },
  { id: 'questions', label: 'Banco de Preguntas', short: 'Preguntas', icon: Database, route: '/questions', directionOnly: true },
  { id: 'settings', label: 'Configuracion', short: 'Ajustes', icon: Settings, route: '/settings', directionOnly: true },
];

/** Modulos que viven en la barra de abajo del celular (el resto va en "Mas"). */
const mobileTabIds = ['dashboard', 'recruitment', 'interview', 'hiring'];

const moduleLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recruitment': 'Recepcion',
  '/interview': 'Entrevistas',
  '/hiring': 'Contratacion',
  '/colaboradores': 'Colaboradores',
  '/onboarding': 'Onboarding',
  '/training': 'Capacitacion',
  '/performance': 'Desempeno',
  '/exit': 'Egreso',
  '/analytics': 'Analisis',
  '/questions': 'Banco de Preguntas',
  '/settings': 'Configuracion',
};

function BackgroundOrbs() {
  // v2.20: en celular los orbes se dibujan quietos. Animar tres degradados de
  // 500px detras de dos capas con backdrop-filter obliga a recomponer la
  // pantalla completa en cada cuadro y hace que el desplazamiento, el video y
  // la firma se sientan a tirones en telefonos de gama baja.
  const isDesktop = useIsDesktop();
  const anim = (v: Record<string, number[]>) => (isDesktop ? v : undefined);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        className="absolute w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(51,141,255,0.4) 0%, transparent 70%)',
          top: '-10%',
          right: '-5%',
        }}
        animate={anim({
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        })}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      <motion.div
        className="absolute w-[95vw] h-[95vw] max-w-[600px] max-h-[600px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(217,70,239,0.4) 0%, transparent 70%)',
          bottom: '-15%',
          left: '-10%',
        }}
        animate={anim({
          x: [0, -25, 35, 0],
          y: [0, 30, -25, 0],
          scale: [1, 0.9, 1.08, 1],
        })}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      <motion.div
        className="absolute w-[65vw] h-[65vw] max-w-[400px] max-h-[400px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)',
          top: '40%',
          left: '30%',
        }}
        animate={anim({
          x: [0, 40, -30, 0],
          y: [0, -20, 35, 0],
          scale: [1, 1.05, 0.92, 1],
        })}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' as const }}
      />
    </div>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const { authRole, logout, setCurrentView } = useStore();

  const filteredNavItems = useMemo(
    () => navItems.filter((item) => !item.directionOnly || authRole === 'direction'),
    [authRole],
  );

  const mobileTabs = useMemo(
    () => filteredNavItems.filter((item) => mobileTabIds.includes(item.id)),
    [filteredNavItems],
  );

  const currentModuleLabel = moduleLabels[location.pathname] ?? 'Dashboard';

  // v2.20: la hoja "Mas" se cierra sola al cambiar de modulo o al pasar a
  // escritorio, para que nunca quede una capa invisible comiendose los toques.
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (isDesktop) setSheetOpen(false);
  }, [isDesktop]);

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  // v2.20: la fecha larga (~220px) no cabe junto al titulo en un celular.
  const todayShort = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function handleNav(item: NavItem) {
    setCurrentView(item.id);
    navigate(item.route);
    setSheetOpen(false);
  }

  function handleLogout() {
    setSheetOpen(false);
    logout();
    navigate('/login');
  }

  const sidebarWidth = collapsed ? 72 : 280;

  return (
    <div className="h-dvh w-screen flex overflow-hidden relative">
      <BackgroundOrbs />

      {/* Sidebar — oculto en celular (v2.20), identico al de siempre desde 768px */}
      <motion.aside
        className="glass h-full flex-col z-20 relative shrink-0 hidden md:flex"
        animate={{ width: isDesktop ? sidebarWidth : 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo area */}
        <div className="px-5 pt-6 pb-4 border-b border-white/[0.06]">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="expanded-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="gradient-text text-xl font-bold tracking-tight leading-tight">
                  SAJA Talent Engine
                </h1>
                <p className="text-surface-400 text-xs mt-1 font-medium tracking-wide uppercase">
                  JabonesSelectos
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex justify-center"
              >
                <span className="gradient-text text-xl font-bold">S</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.route;
              const Icon = item.icon;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNav(item)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl min-h-[44px]
                      transition-all duration-200 relative group cursor-pointer
                      ${isActive
                        ? 'text-white'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04] active:bg-white/[0.06]'
                      }
                    `}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active indicator: left border */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-border"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary-500"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    {/* Active background glow */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 rounded-xl bg-primary-500/[0.1]"
                        style={{
                          boxShadow: '0 0 20px rgba(51,141,255,0.08), inset 0 0 20px rgba(51,141,255,0.05)',
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    <div className="relative z-10 shrink-0">
                      <Icon
                        size={20}
                        className={`transition-colors duration-200 ${
                          isActive ? 'text-primary-400' : ''
                        }`}
                      />
                    </div>

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="relative z-10 text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/[0.06] px-3 py-4 space-y-3">
          {/* Estado de la nube (v2.5) */}
          <SyncChip collapsed={collapsed} />

          {/* Role badge */}
          <AnimatePresence>
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-2"
              >
                <Shield size={14} className="text-primary-400 shrink-0" />
                <span className="badge badge-blue text-xs capitalize">
                  {authRole ?? 'unknown'}
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <Shield size={14} className="text-primary-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl min-h-[44px]
              text-surface-400 hover:text-danger-500 hover:bg-danger-500/[0.08]
              active:bg-danger-500/[0.12] active:text-danger-500
              transition-all duration-200 cursor-pointer
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Cerrar sesion' : undefined}
            aria-label="Cerrar sesion"
          >
            <Power size={18} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Cerrar sesion
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute -right-3 top-20 w-7 h-7 rounded-full glass hidden md:flex items-center justify-center
            text-surface-400 hover:text-white hover:bg-primary-500/20 transition-all duration-200 z-30 cursor-pointer"
          aria-label={collapsed ? 'Expandir menu' : 'Contraer menu'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      {/* Main content area
          v2.20: sin `z-10`. Ese z-index creaba un contexto de apilamiento que
          dejaba las ventanas emergentes de los modulos (fixed z-50, dibujadas
          aqui dentro) POR DEBAJO del menu lateral (z-20). */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <motion.header
          className="glass-light h-14 flex items-center justify-between gap-2 px-4 md:px-6 shrink-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-base font-semibold text-surface-200 tracking-tight truncate">
            {currentModuleLabel}
          </h2>
          <div className="flex items-center gap-1 md:gap-2 text-surface-400 text-sm shrink-0">
            {/* En celular el estado de la nube vive aqui: el menu lateral no existe */}
            <span className="md:hidden">
              <SyncChip collapsed compact />
            </span>
            <Calendar size={14} className="hidden sm:block" />
            <span className="capitalize hidden lg:inline">{today}</span>
            <span className="capitalize hidden sm:inline lg:hidden">{todayShort}</span>
          </div>
        </motion.header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* ── Barra de pestanas del celular (v2.20) ───────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/[0.08]
          flex items-stretch pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegacion principal"
      >
        {mobileTabs.map((item) => {
          const isActive = location.pathname === item.route;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]
                transition-colors ${isActive ? 'text-primary-400' : 'text-surface-400 active:text-surface-200'}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} className="shrink-0" />
              <span className="text-[10px] font-medium leading-none max-w-full truncate px-0.5">
                {item.short}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setSheetOpen(true)}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px]
            transition-colors ${
              sheetOpen || !mobileTabIds.includes(navItems.find((n) => n.route === location.pathname)?.id ?? '')
                ? 'text-primary-400'
                : 'text-surface-400 active:text-surface-200'
            }`}
          aria-label="Mas modulos"
        >
          <MoreHorizontal size={20} className="shrink-0" />
          <span className="text-[10px] font-medium leading-none">Mas</span>
        </button>
      </nav>

      {/* ── Hoja "Mas": el resto de los modulos + sesion ─────────────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            key="mobile-sheet"
            className="md:hidden fixed inset-0 z-40 flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSheetOpen(false)}
            />
            <div
              className="relative glass rounded-t-2xl border-t border-white/[0.1] max-h-[85dvh] flex flex-col
                pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield size={14} className="text-primary-400 shrink-0" />
                  <span className="badge badge-blue text-xs capitalize">{authRole ?? 'unknown'}</span>
                </div>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-xl
                    text-surface-400 active:bg-white/[0.06]"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-2">
                <ul className="grid grid-cols-2 gap-2">
                  {filteredNavItems.map((item) => {
                    const isActive = location.pathname === item.route;
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleNav(item)}
                          className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl min-h-[52px] text-left
                            transition-colors ${
                              isActive
                                ? 'bg-primary-500/[0.12] text-white'
                                : 'text-surface-300 active:bg-white/[0.06]'
                            }`}
                        >
                          <Icon size={18} className={`shrink-0 ${isActive ? 'text-primary-400' : ''}`} />
                          <span className="text-sm font-medium leading-tight break-words min-w-0">
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <button
                  onClick={handleLogout}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl min-h-[52px]
                    text-danger-500 border border-danger-500/25 active:bg-danger-500/[0.12] transition-colors"
                >
                  <Power size={18} />
                  <span className="text-sm font-semibold">Cerrar sesion</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
