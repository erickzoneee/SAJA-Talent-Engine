import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Wrench,
  BookOpen,
  BarChart3,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTrainingStore } from '../../store/useTrainingStore';
import { pageTransition } from './anims';
import CreatorWizard from './CreatorWizard';
import ProcessLibrary from './ProcessLibrary';
import TrainingFlow from './TrainingFlow';
import QuickConsult from './QuickConsult';
import ResultsDashboard from './ResultsDashboard';
import CatalogsManager from './CatalogsManager';

type View =
  | { v: 'home' }
  | { v: 'creator'; editId?: string }
  | { v: 'library' }
  | { v: 'training' }
  | { v: 'consult' }
  | { v: 'results' }
  | { v: 'catalogs' };

interface ModeCard {
  id: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  gradient: string;
  ring: string;
  go: () => void;
  show: boolean;
}

export default function TrainingModule() {
  const authRole = useStore((s) => s.authRole);
  const isAdmin = authRole === 'direction';
  const creadoPor = isAdmin ? 'Dirección' : 'Supervisor';

  const { procesos, registros } = useTrainingStore();
  const [view, setView] = useState<View>({ v: 'home' });

  const publicados = procesos.filter((p) => p.estado === 'publicado' || p.estado === 'autorizado').length;

  if (view.v === 'creator')
    return (
      <Wrap k="creator">
        <CreatorWizard procesoId={view.editId} creadoPor={creadoPor} onDone={() => setView({ v: 'library' })} />
      </Wrap>
    );
  if (view.v === 'library')
    return (
      <Wrap k="library">
        <ProcessLibrary
          isAdmin={isAdmin}
          creadoPor={creadoPor}
          onBack={() => setView({ v: 'home' })}
          onNew={() => setView({ v: 'creator' })}
          onEdit={(id) => setView({ v: 'creator', editId: id })}
        />
      </Wrap>
    );
  if (view.v === 'training')
    return (
      <Wrap k="training">
        <TrainingFlow onBack={() => setView({ v: 'home' })} />
      </Wrap>
    );
  if (view.v === 'consult')
    return (
      <Wrap k="consult">
        <QuickConsult onBack={() => setView({ v: 'home' })} />
      </Wrap>
    );
  if (view.v === 'results')
    return (
      <Wrap k="results">
        <ResultsDashboard isAdmin={isAdmin} onBack={() => setView({ v: 'home' })} />
      </Wrap>
    );
  if (view.v === 'catalogs')
    return (
      <Wrap k="catalogs">
        <CatalogsManager onBack={() => setView({ v: 'home' })} />
      </Wrap>
    );

  // ── Pantalla de inicio ──
  const modos: ModeCard[] = [
    {
      id: 'training',
      icon: GraduationCap,
      title: 'Capacitación',
      desc: 'El trabajador aprende y hace su evaluación',
      gradient: 'from-blue-500 to-indigo-600',
      ring: 'hover:border-blue-500/40',
      go: () => setView({ v: 'training' }),
      show: true,
    },
    {
      id: 'consult',
      icon: BookOpen,
      title: 'Consulta rápida',
      desc: 'Repasa cualquier proceso sin evaluación',
      gradient: 'from-amber-500 to-orange-600',
      ring: 'hover:border-amber-500/40',
      go: () => setView({ v: 'consult' }),
      show: true,
    },
    {
      id: 'creator',
      icon: Wrench,
      title: 'Crear / Mis procesos',
      desc: 'Crea, edita, publica y autoriza procesos',
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'hover:border-emerald-500/40',
      go: () => setView({ v: 'library' }),
      show: true,
    },
    {
      id: 'results',
      icon: BarChart3,
      title: 'Resultados',
      desc: 'Quién se capacitó y sus calificaciones',
      gradient: 'from-fuchsia-500 to-purple-600',
      ring: 'hover:border-fuchsia-500/40',
      go: () => setView({ v: 'results' }),
      show: true,
    },
    {
      id: 'catalogs',
      icon: Layers,
      title: 'Catálogos',
      desc: 'Áreas, líneas, EPP, materiales',
      gradient: 'from-cyan-500 to-teal-600',
      ring: 'hover:border-cyan-500/40',
      go: () => setView({ v: 'catalogs' }),
      show: isAdmin,
    },
  ];

  return (
    <Wrap k="home">
      <div className="flex flex-col gap-6 h-full overflow-y-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-fuchsia-500/10 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0" style={{ background: '#f5c518', color: '#1a5c3a' }}>
              JAC
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold gradient-text">JAC Capacita</h1>
              <p className="text-sm text-surface-400 mt-0.5">
                Sistema de capacitación interna · {creadoPor}
                <span className="inline-flex items-center gap-1 ml-2 text-blue-400">
                  <ShieldCheck size={13} />
                  {isAdmin ? 'Acceso de administrador' : 'Acceso de supervisor'}
                </span>
              </p>
            </div>
            <div className="hidden sm:flex gap-6 text-right">
              <div>
                <div className="text-2xl font-bold text-emerald-400">{publicados}</div>
                <div className="text-xs text-surface-500">procesos activos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-fuchsia-400">{registros.length}</div>
                <div className="text-xs text-surface-500">capacitaciones</div>
              </div>
            </div>
          </div>
        </motion.div>

        <p className="text-sm text-surface-400 -mb-2">¿Qué quieres hacer hoy?</p>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modos
            .filter((m) => m.show)
            .map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={m.go}
                  className={`glass-card p-5 flex items-center gap-4 text-left cursor-pointer group border border-transparent ${m.ring} transition-colors`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shrink-0`}>
                    <Icon size={26} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-surface-100">{m.title}</h3>
                    <p className="text-sm text-surface-400 mt-0.5">{m.desc}</p>
                  </div>
                  <ArrowRight size={20} className="text-surface-500 group-hover:text-primary-400 transition-colors shrink-0" />
                </motion.button>
              );
            })}
        </div>
      </div>
    </Wrap>
  );
}

function Wrap({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={k} {...pageTransition} className="flex-1 flex flex-col overflow-hidden">
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
