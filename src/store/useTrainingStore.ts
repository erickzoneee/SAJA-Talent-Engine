import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CatalogItem,
  CatalogKey,
  Proceso,
  RegistroCapacitacion,
  TrainingCatalogs,
  VozPref,
} from '../types/training';

// ── Semillas de catálogos (spec 3.9 / 4.1) ───────────────────────────────────

function seed(nombres: string[], extra?: (n: string, i: number) => Partial<CatalogItem>): CatalogItem[] {
  return nombres.map((nombre, i) => ({
    id: `seed_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    nombre,
    activo: true,
    ...(extra ? extra(nombre, i) : {}),
  }));
}

const defaultCatalogs: TrainingCatalogs = {
  areas: seed(['Producción', 'Calidad', 'Almacén', 'Mantenimiento', 'Limpieza', 'Administración']),
  lineas: seed([
    'Jabones de barra',
    'Jabones líquidos',
    'Amenidades hotel',
    'Cremas y lociones',
    'Aromaterapia',
    'Empaque',
    'General',
  ]),
  tipos: seed([
    'Manufactura',
    'Control de calidad',
    'Mantenimiento',
    'Limpieza y sanitización',
    'Almacén',
    'Seguridad',
  ]),
  epp: [
    { id: 'epp_guantes', nombre: 'Guantes de nitrilo', activo: true, icono: '🧤' },
    { id: 'epp_lentes', nombre: 'Lentes de seguridad', activo: true, icono: '🥽' },
    { id: 'epp_cubreboca', nombre: 'Cubrebocas', activo: true, icono: '😷' },
    { id: 'epp_cofia', nombre: 'Cofia / red para cabello', activo: true, icono: '🧑‍🍳' },
    { id: 'epp_botas', nombre: 'Botas antiderrapantes', activo: true, icono: '🥾' },
    { id: 'epp_mandil', nombre: 'Mandil', activo: true, icono: '🦺' },
    { id: 'epp_casco', nombre: 'Casco', activo: true, icono: '⛑️' },
    { id: 'epp_audifonos', nombre: 'Protección auditiva', activo: true, icono: '🎧' },
  ],
  materiales: [
    { id: 'mat_glicerina', nombre: 'Glicerina vegetal', activo: true, unidad: 'kg' },
    { id: 'mat_fragancia', nombre: 'Fragancia', activo: true, unidad: 'ml' },
    { id: 'mat_colorante', nombre: 'Colorante', activo: true, unidad: 'g' },
    { id: 'mat_corrugado', nombre: 'Caja de corrugado', activo: true, unidad: 'pza' },
    { id: 'mat_etiqueta', nombre: 'Etiqueta', activo: true, unidad: 'pza' },
    { id: 'mat_bolsa', nombre: 'Bolsa de empaque', activo: true, unidad: 'pza' },
  ],
};

// ── Estado ───────────────────────────────────────────────────────────────────

interface TrainingState {
  procesos: Proceso[];
  registros: RegistroCapacitacion[];
  catalogs: TrainingCatalogs;
  vozPref: VozPref;

  // Procesos
  addProceso: (proceso: Proceso) => void;
  updateProceso: (id: string, data: Partial<Proceso>) => void;
  deleteProceso: (id: string) => void;
  publicarProceso: (id: string) => void;
  autorizarProceso: (id: string, autorizadoPor: string) => void;
  archivarProceso: (id: string) => void;
  marcarListoParaAutorizar: (id: string, listo: boolean) => void;
  /** Crea una nueva versión (Borrador) de un proceso Autorizado y archiva el anterior. */
  crearNuevaVersion: (id: string, motivo: string, creadoPor: string) => string | null;

  // Registros
  addRegistro: (registro: RegistroCapacitacion) => void;
  /** Cuenta intentos reprobados hoy de un empleado en un proceso (spec 4.8.3). */
  intentosFallidosHoy: (empleadoNumero: string, procesoId: string) => number;

  // Catálogos
  addCatalogItem: (key: CatalogKey, item: CatalogItem) => void;
  updateCatalogItem: (key: CatalogKey, id: string, data: Partial<CatalogItem>) => void;
  toggleCatalogItem: (key: CatalogKey, id: string) => void;

  // Preferencias
  setVozRate: (rate: number) => void;
}

function nextVersion(v: string): string {
  const major = parseInt(v.split('.')[0], 10);
  return Number.isFinite(major) ? `${major + 1}.0` : '2.0';
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
      procesos: [],
      registros: [],
      catalogs: defaultCatalogs,
      vozPref: { rate: 1 },

      addProceso: (proceso) => set((s) => ({ procesos: [proceso, ...s.procesos] })),

      updateProceso: (id, data) =>
        set((s) => ({
          procesos: s.procesos.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),

      deleteProceso: (id) =>
        set((s) => ({ procesos: s.procesos.filter((p) => p.id !== id) })),

      publicarProceso: (id) =>
        set((s) => ({
          procesos: s.procesos.map((p) =>
            p.id === id
              ? { ...p, estado: 'publicado', publicadoAt: new Date().toISOString() }
              : p,
          ),
        })),

      autorizarProceso: (id, autorizadoPor) =>
        set((s) => ({
          procesos: s.procesos.map((p) =>
            p.id === id
              ? {
                  ...p,
                  estado: 'autorizado',
                  autorizadoPor,
                  autorizadoAt: new Date().toISOString(),
                  listoParaAutorizar: false,
                }
              : p,
          ),
        })),

      archivarProceso: (id) =>
        set((s) => ({
          procesos: s.procesos.map((p) => (p.id === id ? { ...p, estado: 'archivado' } : p)),
        })),

      marcarListoParaAutorizar: (id, listo) =>
        set((s) => ({
          procesos: s.procesos.map((p) =>
            p.id === id ? { ...p, listoParaAutorizar: listo } : p,
          ),
        })),

      crearNuevaVersion: (id, motivo, creadoPor) => {
        const original = get().procesos.find((p) => p.id === id);
        if (!original) return null;
        const nuevoId = `proc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        const copia: Proceso = {
          ...original,
          id: nuevoId,
          version: nextVersion(original.version),
          estado: 'borrador',
          procesoPadreId: original.id,
          motivoCambio: motivo,
          creadoPor,
          creadoAt: new Date().toISOString(),
          publicadoAt: undefined,
          autorizadoPor: undefined,
          autorizadoAt: undefined,
          listoParaAutorizar: false,
        };
        set((s) => ({
          procesos: [
            copia,
            ...s.procesos.map((p) => (p.id === id ? { ...p, estado: 'archivado' as const } : p)),
          ],
        }));
        return nuevoId;
      },

      addRegistro: (registro) => set((s) => ({ registros: [...s.registros, registro] })),

      intentosFallidosHoy: (empleadoNumero, procesoId) => {
        const hoy = new Date().toDateString();
        return get().registros.filter(
          (r) =>
            r.empleadoNumero === empleadoNumero &&
            r.procesoId === procesoId &&
            !r.pasa &&
            new Date(r.finAt).toDateString() === hoy,
        ).length;
      },

      addCatalogItem: (key, item) =>
        set((s) => ({ catalogs: { ...s.catalogs, [key]: [...s.catalogs[key], item] } })),

      updateCatalogItem: (key, id, data) =>
        set((s) => ({
          catalogs: {
            ...s.catalogs,
            [key]: s.catalogs[key].map((it) => (it.id === id ? { ...it, ...data } : it)),
          },
        })),

      toggleCatalogItem: (key, id) =>
        set((s) => ({
          catalogs: {
            ...s.catalogs,
            [key]: s.catalogs[key].map((it) =>
              it.id === id ? { ...it, activo: !it.activo } : it,
            ),
          },
        })),

      setVozRate: (rate) => set((s) => ({ vozPref: { ...s.vozPref, rate } })),
    }),
    {
      name: 'jac-capacita-storage',
      version: 1,
    },
  ),
);
