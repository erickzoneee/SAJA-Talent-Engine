import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Plus, Check, X, SquarePen, Eye, EyeOff } from 'lucide-react';
import type { CatalogItem, CatalogKey } from '../../types/training';
import { useTrainingStore } from '../../store/useTrainingStore';
import { TrainingHeader } from './shared';
import { fadeUp, listItem } from './anims';

const TABS: { key: CatalogKey; label: string; hint: string; conIcono?: boolean; conUnidad?: boolean }[] = [
  { key: 'areas', label: 'Áreas', hint: 'Producción, Calidad, Almacén…' },
  { key: 'lineas', label: 'Líneas', hint: 'Jabones de barra, líquidos…' },
  { key: 'tipos', label: 'Tipos de tarea', hint: 'Manufactura, Control de calidad…' },
  { key: 'epp', label: 'EPP', hint: 'Guantes, lentes, casco…', conIcono: true },
  { key: 'materiales', label: 'Materiales', hint: 'Glicerina, fragancia…', conUnidad: true },
];

function newId(): string {
  return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function CatalogsManager({ onBack }: { onBack: () => void }) {
  const { catalogs, addCatalogItem, updateCatalogItem, toggleCatalogItem } = useTrainingStore();
  const [tab, setTab] = useState<CatalogKey>('areas');
  const [nuevo, setNuevo] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState('');
  const [nuevoUnidad, setNuevoUnidad] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const meta = TABS.find((t) => t.key === tab)!;
  const items = catalogs[tab];

  function agregar() {
    const nombre = nuevo.trim();
    if (!nombre) return;
    const item: CatalogItem = {
      id: newId(),
      nombre,
      activo: true,
      ...(meta.conIcono && nuevoIcono.trim() ? { icono: nuevoIcono.trim() } : {}),
      ...(meta.conUnidad && nuevoUnidad.trim() ? { unidad: nuevoUnidad.trim() } : {}),
    };
    addCatalogItem(tab, item);
    setNuevo('');
    setNuevoIcono('');
    setNuevoUnidad('');
  }

  function guardarEdicion(id: string) {
    if (editVal.trim()) updateCatalogItem(tab, id, { nombre: editVal.trim() });
    setEditId(null);
  }

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      <TrainingHeader
        icon={Layers}
        gradient="from-cyan-500 to-teal-600"
        title="Gestión de Catálogos"
        subtitle="Administra las listas desplegables del sistema"
        onBack={onBack}
      />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setEditId(null);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              tab === t.key
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                : 'glass-light text-surface-400 hover:text-surface-200'
            }`}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-60">{catalogs[t.key].length}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* Add row */}
        <motion.div {...fadeUp} className="glass-card p-4">
          <p className="text-xs text-surface-400 mb-3">Agregar opción a «{meta.label}» — {meta.hint}</p>
          <div className="flex flex-wrap gap-2">
            {meta.conIcono && (
              <input
                value={nuevoIcono}
                onChange={(e) => setNuevoIcono(e.target.value)}
                placeholder="🧤"
                className="input-field w-16 text-center text-lg"
                maxLength={2}
              />
            )}
            <input
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregar()}
              placeholder="Nombre de la opción…"
              className="input-field flex-1 min-w-[180px]"
            />
            {meta.conUnidad && (
              <input
                value={nuevoUnidad}
                onChange={(e) => setNuevoUnidad(e.target.value)}
                placeholder="unidad (kg, pza…)"
                className="input-field w-32"
              />
            )}
            <button onClick={agregar} disabled={!nuevo.trim()} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={16} /> Agregar
            </button>
          </div>
        </motion.div>

        {/* List */}
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-center text-surface-500 text-sm py-8">
              Catálogo vacío. Agrega la primera opción arriba.
            </p>
          )}
          {items.map((it, i) => (
            <motion.div
              key={it.id}
              custom={i}
              variants={listItem}
              initial="initial"
              animate="animate"
              className={`glass-card p-3 flex items-center gap-3 ${!it.activo ? 'opacity-50' : ''}`}
            >
              {it.icono && <span className="text-2xl shrink-0">{it.icono}</span>}
              {editId === it.id ? (
                <input
                  autoFocus
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarEdicion(it.id);
                    if (e.key === 'Escape') setEditId(null);
                  }}
                  className="input-field flex-1 py-1.5 text-sm"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-surface-200">{it.nombre}</span>
                  {it.unidad && <span className="text-xs text-surface-500 ml-2">({it.unidad})</span>}
                  {!it.activo && <span className="badge badge-red text-[10px] ml-2">Inactivo</span>}
                </div>
              )}

              {editId === it.id ? (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => guardarEdicion(it.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 cursor-pointer">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditId(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:bg-white/10 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditId(it.id);
                      setEditVal(it.nombre);
                    }}
                    title="Renombrar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <SquarePen size={15} />
                  </button>
                  <button
                    onClick={() => toggleCatalogItem(tab, it.id)}
                    title={it.activo ? 'Desactivar' : 'Reactivar'}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    {it.activo ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
