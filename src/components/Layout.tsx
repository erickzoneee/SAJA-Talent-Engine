import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  FileCheck,
  GraduationCap,
  TrendingUp,
  LogOut,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Shield,
  Power,
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  directionOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  { id: 'recruitment', label: 'Reclutamiento', icon: UserPlus, route: '/recruitment' },
  { id: 'interview', label: 'Entrevistas', icon: ClipboardList, route: '/interview' },
  { id: 'hiring', label: 'Contratacion', icon: FileCheck, route: '/hiring' },
  { id: 'onboarding', label: 'Onboarding', icon: GraduationCap, route: '/onboarding' },
  { id: 'performance', label: 'Desempeno', icon: TrendingUp, route: '/performance' },
  { id: 'exit', label: 'Egreso', icon: LogOut, route: '/exit' },
  { id: 'analytics', label: 'Analisis', icon: BarChart3, route: '/analytics' },
  { id: 'settings', label: 'Configuracion', icon: Settings, route: '/settings', directionOnly: true },
];

const moduleLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recruitment': 'Reclutamiento',
  '/interview': 'Entrevistas',
  '/hiring': 'Contratacion',
  '/onboarding': 'Onboarding',
  '/performance': 'Desempeno',
  '/exit': 'Egreso',
  '/analytics': 'Analisis',
  '/settings': 'Configuracion',
};

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(51,141,255,0.4) 0%, transparent 70%)',
          top: '-10%',
          right: '-5%',
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(217,70,239,0.4) 0%, transparent 70%)',
          bottom: '-15%',
          left: '-10%',
        }}
        animate={{
          x: [0, -25, 35, 0],
          y: [0, 30, -25, 0],
          scale: [1, 0.9, 1.08, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)',
          top: '40%',
          left: '30%',
        }}
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -20, 35, 0],
          scale: [1, 1.05, 0.92, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' as const }}
      />
    </div>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { authRole, logout, setCurrentView } = useStore();

  const filteredNavItems = useMemo(
    () => navItems.filter((item) => !item.directionOnly || authRole === 'direction'),
    [authRole],
  );

  const currentModuleLabel = moduleLabels[location.pathname] ?? 'Dashboard';

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handleNav(item: NavItem) {
    setCurrentView(item.id);
    navigate(item.route);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebarWidth = collapsed ? 72 : 280;

  return (
    <div className="h-screen w-screen flex overflow-hidden relative">
      <BackgroundOrbs />

      {/* Sidebar */}
      <motion.aside
        className="glass h-full flex flex-col z-20 relative shrink-0"
        animate={{ width: sidebarWidth }}
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
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      transition-all duration-200 relative group cursor-pointer
                      ${isActive
                        ? 'text-white'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
                      }
                    `}
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
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-surface-400 hover:text-danger-500 hover:bg-danger-500/[0.08]
              transition-all duration-200 cursor-pointer
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Cerrar sesion' : undefined}
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
          className="absolute -right-3 top-20 w-6 h-6 rounded-full glass flex items-center justify-center
            text-surface-400 hover:text-white hover:bg-primary-500/20 transition-all duration-200 z-30 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Top bar */}
        <motion.header
          className="glass-light h-14 flex items-center justify-between px-6 shrink-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-base font-semibold text-surface-200 tracking-tight">
            {currentModuleLabel}
          </h2>
          <div className="flex items-center gap-2 text-surface-400 text-sm">
            <Calendar size={14} />
            <span className="capitalize">{today}</span>
          </div>
        </motion.header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
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
    </div>
  );
}
