import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Candidate, Employee, AppSettings } from '../types';

interface AppState {
  candidates: Candidate[];
  employees: Employee[];
  settings: AppSettings;
  isAuthenticated: boolean;
  authRole: 'supervisor' | 'direction' | null;
  currentView: string;

  // Auth
  login: (pin: string) => boolean;
  logout: () => void;

  // Candidates
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (id: string, data: Partial<Candidate>) => void;
  deleteCandidate: (id: string) => void;

  // Employees
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Navigation
  setCurrentView: (view: string) => void;

  // Utility
  getNextExpedientNumber: () => number;
}

const defaultSettings: AppSettings = {
  companyName: 'Jabones y Amenidades de Calidad, S.A. de C.V.',
  companyAddress: 'Ciudad de Mexico',
  companyPhone: '',
  companyRfc: '',
  directorName: 'Director General',
  recommendedThreshold: 68,
  reservationsThreshold: 45,
  mathPassScore: 12,
  supervisorPin: '123456',
  directionPin: '567890',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      candidates: [],
      employees: [],
      settings: defaultSettings,
      isAuthenticated: false,
      authRole: null,
      currentView: 'dashboard',

      login: (pin: string) => {
        const { settings } = get();
        if (pin === settings.supervisorPin) {
          set({ isAuthenticated: true, authRole: 'supervisor' });
          return true;
        }
        if (pin === settings.directionPin) {
          set({ isAuthenticated: true, authRole: 'direction' });
          return true;
        }
        return false;
      },

      logout: () => set({ isAuthenticated: false, authRole: null }),

      addCandidate: (candidate) =>
        set((state) => ({ candidates: [candidate, ...state.candidates] })),

      updateCandidate: (id, data) =>
        set((state) => ({
          candidates: state.candidates.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),

      deleteCandidate: (id) =>
        set((state) => ({
          candidates: state.candidates.filter((c) => c.id !== id),
        })),

      addEmployee: (employee) =>
        set((state) => ({ employees: [employee, ...state.employees] })),

      updateEmployee: (id, data) =>
        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setCurrentView: (view) => set({ currentView: view }),

      getNextExpedientNumber: () => {
        const { employees } = get();
        if (employees.length === 0) return 1;
        return Math.max(...employees.map((e) => e.expedientNumber)) + 1;
      },
    }),
    {
      name: 'saja-talent-engine-storage',
      version: 1,
    }
  )
);
