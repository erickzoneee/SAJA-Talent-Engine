// Variantes de animación y hooks compartidos del módulo de Capacitación.
// Se mantienen separados de los componentes para que el fast-refresh de Vite
// funcione correctamente (un archivo de componentes solo exporta componentes).
import { useStore } from '../../store/useStore';

export const pageTransition = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.25, ease: 'easeIn' as const } },
};

export const listItem = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

/** Empleados registrados (para autocompletar la identificación del trabajador). */
export function useEmpleados(): { nombre: string; numero: string }[] {
  const employees = useStore((s) => s.employees);
  return employees
    .filter((e) => e.status !== 'inactive')
    .map((e) => ({ nombre: e.fullName, numero: `EMP-${String(e.expedientNumber).padStart(3, '0')}` }));
}
