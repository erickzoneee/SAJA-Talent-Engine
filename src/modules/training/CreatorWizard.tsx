import { useId, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Check,
  X,
  Save,
  Megaphone,
  ClipboardList,
  Image as ImageIcon,
  Package,
  ListChecks,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import type { Pregunta, Proceso, ProcesoPaso } from '../../types/training';
import { useTrainingStore } from '../../store/useTrainingStore';
import {
  generarEvaluacionLocal,
  mejorarTextoLocal,
  numPreguntasPorComplejidad,
} from '../../utils/trainingHelpers';
import { TrainingHeader, PhotoManager, SinglePhotoPicker, ConfirmDialog } from './shared';
import { fadeUp, scaleIn } from './anims';
import NarrationButton from '../../components/NarrationButton';

const STEPS = ['Datos', 'Portada', 'Recursos', 'Pasos', 'Evaluación', 'Publicar'];

function uid(p: string): string {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function blankProceso(creadoPor: string): Proceso {
  return {
    id: uid('proc'),
    nombre: '',
    area: '',
    linea: '',
    tipo: '',
    objetivo: '',
    version: '1.0',
    estado: 'borrador',
    materiales: [],
    equipo: [],
    epp: [],
    pasos: [],
    preguntas: [],
    creadoPor,
    creadoAt: new Date().toISOString(),
  };
}

interface CreatorWizardProps {
  procesoId?: string;
  creadoPor: string;
  onDone: () => void;
}

export default function CreatorWizard({ procesoId, creadoPor, onDone }: CreatorWizardProps) {
  const { procesos, addProceso, updateProceso } = useTrainingStore();
  const existing = procesoId ? procesos.find((p) => p.id === procesoId) : undefined;

  const [proc, setProc] = useState<Proceso>(() => existing ?? blankProceso(creadoPor));
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const isEdit = !!existing;

  function upd(changes: Partial<Proceso>) {
    setProc((p) => ({ ...p, ...changes }));
  }

  function persist(extra: Partial<Proceso> = {}) {
    const toSave = { ...proc, ...extra };
    setProc(toSave);
    if (procesos.some((p) => p.id === toSave.id)) updateProceso(toSave.id, toSave);
    else addProceso(toSave);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  // ── Validaciones por etapa ──
  const v1 = !!(proc.nombre && proc.area && proc.linea && proc.tipo && proc.objetivo.trim());
  const pasosOk = proc.pasos.length > 0 && proc.pasos.every((p) => p.nombre.trim() && p.narrativa.trim());

  function next() {
    persist();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="flex flex-col gap-4 overflow-hidden h-full">
      <TrainingHeader
        icon={Wrench}
        gradient="from-emerald-500 to-teal-600"
        title={isEdit ? `Editar: ${proc.nombre || 'proceso'}` : 'Crear proceso'}
        subtitle={`Etapa ${step + 1} de ${STEPS.length} · ${STEPS[step]}`}
        onBack={onDone}
        right={
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="badge badge-green text-xs"
                >
                  <Check size={12} /> Guardado
                </motion.span>
              )}
            </AnimatePresence>
            <button onClick={() => persist()} className="btn-secondary text-xs flex items-center gap-1.5">
              <Save size={14} /> Borrador
            </button>
          </div>
        }
      />

      {/* Stepper */}
      <div className="shrink-0">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-surface-800/60'
                }`}
              />
              <span
                className={`text-[10px] mt-1 block ${i === step ? 'text-emerald-400 font-semibold' : 'text-surface-500'}`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <StepDatos proc={proc} upd={upd} />}
            {step === 1 && <StepPortada proc={proc} upd={upd} />}
            {step === 2 && <StepRecursos proc={proc} upd={upd} />}
            {step === 3 && <StepPasos proc={proc} upd={upd} />}
            {step === 4 && <StepEvaluacion proc={proc} upd={upd} />}
            {step === 5 && <StepPublicar proc={proc} onPublish={() => persist({ estado: 'publicado', publicadoAt: new Date().toISOString() })} onDone={onDone} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      {step < 5 && (
        <div className="flex justify-between shrink-0 pt-1">
          <button
            onClick={prev}
            disabled={step === 0}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Atrás
          </button>
          <button
            onClick={next}
            disabled={(step === 0 && !v1) || (step === 3 && !pasosOk)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            {step === 3 ? 'Ir a evaluación' : 'Siguiente'} <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ETAPA 1 — DATOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-surface-300 mb-1.5">
        {label}
        {hint && <span className="text-surface-500 font-normal"> — {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function CatalogSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field cursor-pointer">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function StepDatos({ proc, upd }: { proc: Proceso; upd: (c: Partial<Proceso>) => void }) {
  const catalogs = useTrainingStore((s) => s.catalogs);
  const areas = catalogs.areas.filter((a) => a.activo).map((a) => a.nombre);
  const lineas = catalogs.lineas.filter((a) => a.activo).map((a) => a.nombre);
  const tipos = catalogs.tipos.filter((a) => a.activo).map((a) => a.nombre);

  return (
    <motion.div {...fadeUp} className="glass-card p-5 max-w-2xl">
      <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-1">
        <ClipboardList size={18} className="text-emerald-400" /> Datos del proceso
      </h2>
      <p className="text-sm text-surface-400 mb-5">¿De qué trata este proceso? Empieza con lo básico.</p>

      <Field label="Nombre del proceso *">
        <input
          value={proc.nombre}
          onChange={(e) => upd({ nombre: e.target.value })}
          placeholder="Ej: Elaboración de barra de jabón de glicerina"
          className="input-field"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Área *">
          <CatalogSelect value={proc.area} onChange={(v) => upd({ area: v })} options={areas} placeholder="— Selecciona —" />
        </Field>
        <Field label="Línea de producto *">
          <CatalogSelect value={proc.linea} onChange={(v) => upd({ linea: v })} options={lineas} placeholder="— Selecciona —" />
        </Field>
        <Field label="Tipo de tarea *">
          <CatalogSelect value={proc.tipo} onChange={(v) => upd({ tipo: v })} options={tipos} placeholder="— Selecciona —" />
        </Field>
      </div>

      <Field label="Objetivo del proceso *" hint="¿Para qué sirve? En palabras simples.">
        <textarea
          value={proc.objetivo}
          onChange={(e) => upd({ objetivo: e.target.value })}
          placeholder="Ej: Hacer barras de jabón de glicerina siguiendo los pasos correctos para que el producto salga de calidad uniforme."
          rows={3}
          className="input-field resize-y leading-relaxed"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Versión">
          <input value={proc.version} onChange={(e) => upd({ version: e.target.value })} placeholder="1.0" className="input-field" />
        </Field>
        <Field label="Tiempo estimado (min)">
          <input
            type="number"
            value={proc.tiempoEstimado ?? ''}
            onChange={(e) => upd({ tiempoEstimado: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Ej: 30"
            className="input-field"
          />
        </Field>
        <Field label="Personas requeridas">
          <input
            type="number"
            value={proc.personasRequeridas ?? ''}
            onChange={(e) => upd({ personasRequeridas: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Ej: 2"
            className="input-field"
          />
        </Field>
      </div>

      <Field label="Notas internas" hint="Solo visibles para supervisores, no se muestran al trabajador">
        <textarea
          value={proc.notasInternas ?? ''}
          onChange={(e) => upd({ notasInternas: e.target.value })}
          rows={2}
          className="input-field resize-y"
          placeholder="Notas para el equipo…"
        />
      </Field>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ETAPA 2 — PORTADA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StepPortada({ proc, upd }: { proc: Proceso; upd: (c: Partial<Proceso>) => void }) {
  return (
    <motion.div {...fadeUp} className="space-y-4 max-w-3xl">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-1">
          <ImageIcon size={18} className="text-emerald-400" /> Portada del proceso
        </h2>
        <p className="text-sm text-surface-400 mb-4">
          Es lo primero que ve el trabajador: el punto de partida y el resultado esperado.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SinglePhotoPicker
            label="Foto de inicio — ¿con qué empezamos?"
            value={proc.portadaInicio}
            onChange={(v) => upd({ portadaInicio: v })}
          />
          <SinglePhotoPicker
            label="Foto de resultado — ¿cómo debe quedar?"
            value={proc.portadaResultado}
            onChange={(v) => upd({ portadaResultado: v })}
          />
        </div>
      </div>

      <div className="glass-card p-5">
        <Field label="Narración de introducción" hint="2-3 frases que se leerán en voz alta">
          <textarea
            value={proc.portadaNarracion ?? ''}
            onChange={(e) => upd({ portadaNarracion: e.target.value })}
            rows={3}
            className="input-field resize-y leading-relaxed"
            placeholder="Ej: En este proceso vamos a armar la caja y colocar el jabón dentro. Pon atención a cada paso."
          />
        </Field>
        {proc.portadaNarracion?.trim() && (
          <NarrationButton text={proc.portadaNarracion} label="Escuchar introducción" />
        )}
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ETAPA 3 — RECURSOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChipListEditor({
  items,
  onChange,
  placeholder,
  suggestions,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [val, setVal] = useState('');
  const listId = useId();
  function add() {
    const v = val.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setVal('');
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="input-field flex-1"
          list={suggestions ? listId : undefined}
        />
        {suggestions && (
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        <button onClick={add} disabled={!val.trim()} className="btn-secondary text-sm flex items-center gap-1.5">
          <Plus size={15} /> Agregar
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {items.map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-surface-800/50 border border-surface-700/40 rounded-lg px-2.5 py-1 text-sm text-surface-200"
            >
              {it}
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-surface-500 hover:text-danger-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StepRecursos({ proc, upd }: { proc: Proceso; upd: (c: Partial<Proceso>) => void }) {
  const catalogs = useTrainingStore((s) => s.catalogs);
  const eppCat = catalogs.epp.filter((e) => e.activo);
  const matSug = catalogs.materiales.filter((m) => m.activo).map((m) => m.nombre);

  function toggleEpp(nombre: string) {
    upd({ epp: proc.epp.includes(nombre) ? proc.epp.filter((e) => e !== nombre) : [...proc.epp, nombre] });
  }

  return (
    <motion.div {...fadeUp} className="space-y-4 max-w-2xl">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-1">
          <Package size={18} className="text-emerald-400" /> Recursos necesarios
        </h2>
        <p className="text-sm text-surface-400 mb-4">¿Qué se necesita para realizar este proceso?</p>

        <p className="text-sm font-semibold text-surface-300 mb-2">Equipo de protección personal (EPP)</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {eppCat.map((e) => {
            const on = proc.epp.includes(e.nombre);
            return (
              <button
                key={e.id}
                onClick={() => toggleEpp(e.nombre)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm border transition-all cursor-pointer ${
                  on
                    ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                    : 'bg-surface-800/40 border-surface-700/40 text-surface-300 hover:bg-surface-700/40'
                }`}
              >
                {e.icono && <span className="text-base">{e.icono}</span>}
                {e.nombre}
                {on && <Check size={14} />}
              </button>
            );
          })}
          {eppCat.length === 0 && (
            <span className="text-xs text-surface-500">No hay EPP en el catálogo. Agrégalo en Catálogos.</span>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-surface-300 mb-2">Materiales e insumos</p>
        <ChipListEditor
          items={proc.materiales}
          onChange={(v) => upd({ materiales: v })}
          placeholder="Ej: Glicerina vegetal, fragancia…"
          suggestions={matSug}
        />
      </div>

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-surface-300 mb-2">Maquinaria y herramientas</p>
        <ChipListEditor
          items={proc.equipo}
          onChange={(v) => upd({ equipo: v })}
          placeholder="Ej: Marmita, moldes, termómetro…"
        />
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ETAPA 4 — PASOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StepPasos({ proc, upd }: { proc: Proceso; upd: (c: Partial<Proceso>) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  function addPaso() {
    const nuevo: ProcesoPaso = { id: uid('mp'), nombre: '', narrativa: '', fotos: [] };
    upd({ pasos: [...proc.pasos, nuevo] });
    setOpenId(nuevo.id);
  }
  function updPaso(id: string, changes: Partial<ProcesoPaso>) {
    upd({ pasos: proc.pasos.map((p) => (p.id === id ? { ...p, ...changes } : p)) });
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= proc.pasos.length) return;
    const arr = [...proc.pasos];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    upd({ pasos: arr });
  }
  function duplicate(i: number) {
    const orig = proc.pasos[i];
    const copia: ProcesoPaso = {
      ...orig,
      id: uid('mp'),
      nombre: `${orig.nombre} (copia)`,
      fotos: orig.fotos.map((f) => ({ ...f, id: uid('f') })),
    };
    const arr = [...proc.pasos];
    arr.splice(i + 1, 0, copia);
    upd({ pasos: arr });
  }

  return (
    <motion.div {...fadeUp} className="space-y-3 max-w-2xl">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-1">
          <ListChecks size={18} className="text-emerald-400" /> Pasos del proceso
        </h2>
        <p className="text-sm text-surface-400">
          Agrega cada paso, descríbelo con tus palabras y agrega fotos. Reordénalos si es necesario.
        </p>
      </div>

      {proc.pasos.length === 0 && (
        <div className="glass-card p-8 text-center text-surface-400">
          <span className="text-4xl block mb-2">📝</span>
          Aún no hay pasos. Agrega el primero abajo.
        </div>
      )}

      {proc.pasos.map((mp, i) => {
        const open = openId === mp.id;
        const incompleto = !mp.nombre.trim() || !mp.narrativa.trim();
        return (
          <div key={mp.id} className="glass-card overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                {i + 1}
              </span>
              <button
                onClick={() => setOpenId(open ? null : mp.id)}
                className="flex-1 text-left min-w-0 cursor-pointer"
              >
                <span className="text-sm font-medium text-surface-200 block truncate">
                  {mp.nombre || 'Paso sin nombre'}
                </span>
                <span className="text-xs text-surface-500">
                  {mp.fotos.length} foto{mp.fotos.length !== 1 ? 's' : ''}
                  {incompleto && <span className="text-amber-400 ml-2">• incompleto</span>}
                </span>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <MiniBtn title="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp size={15} />
                </MiniBtn>
                <MiniBtn title="Bajar" disabled={i === proc.pasos.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown size={15} />
                </MiniBtn>
                <MiniBtn title="Duplicar" onClick={() => duplicate(i)}>
                  <Copy size={14} />
                </MiniBtn>
                <MiniBtn title="Eliminar" danger onClick={() => setConfirmDel(mp.id)}>
                  <Trash2 size={14} />
                </MiniBtn>
              </div>
            </div>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="border-t border-surface-700/30"
                >
                  <div className="p-4 space-y-4">
                    <input
                      value={mp.nombre}
                      onChange={(e) => updPaso(mp.id, { nombre: e.target.value })}
                      placeholder="Nombre del paso — Ej: Preparar la marmita"
                      className="input-field"
                    />
                    <NarrativaEditor
                      narrativa={mp.narrativa}
                      narrativaMejorada={mp.narrativaMejorada}
                      onChange={(narrativa) => updPaso(mp.id, { narrativa })}
                      onMejorada={(narrativaMejorada) => updPaso(mp.id, { narrativaMejorada })}
                      placeholder={`Describe qué hace el trabajador en "${mp.nombre || 'este paso'}".`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-surface-300 mb-2">📷 Fotos del paso</p>
                      <PhotoManager fotos={mp.fotos} onChange={(fotos) => updPaso(mp.id, { fotos })} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <button
        onClick={addPaso}
        className="w-full glass-card p-4 flex items-center justify-center gap-2 text-emerald-400 hover:bg-emerald-500/5 transition-colors cursor-pointer border-dashed"
      >
        <Plus size={18} /> Agregar paso
      </button>

      <ConfirmDialog
        open={!!confirmDel}
        title="¿Eliminar este paso?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          upd({ pasos: proc.pasos.filter((p) => p.id !== confirmDel) });
          setConfirmDel(null);
        }}
      />
    </motion.div>
  );
}

function MiniBtn({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        disabled
          ? 'text-surface-700 cursor-not-allowed'
          : danger
            ? 'text-surface-400 hover:text-danger-500 hover:bg-danger-500/10 cursor-pointer'
            : 'text-surface-400 hover:text-white hover:bg-white/10 cursor-pointer'
      }`}
    >
      {children}
    </button>
  );
}

function NarrativaEditor({
  narrativa,
  narrativaMejorada,
  onChange,
  onMejorada,
  placeholder,
}: {
  narrativa: string;
  narrativaMejorada?: string;
  onChange: (v: string) => void;
  onMejorada: (v: string | undefined) => void;
  placeholder: string;
}) {
  const [sugerencia, setSugerencia] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  function mejorar() {
    setSugerencia(mejorarTextoLocal(narrativa));
    setEditando(false);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1.5">Describe este paso *</label>
      <textarea
        value={narrativa}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="input-field resize-y leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          onClick={mejorar}
          disabled={narrativa.trim().length < 10}
          className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-40"
        >
          <Sparkles size={14} /> Mejorar redacción
        </button>
        {narrativaMejorada && (
          <span className="badge badge-purple text-[11px] flex items-center gap-1">
            <Sparkles size={11} /> Texto mejorado aplicado
            <button onClick={() => onMejorada(undefined)} className="ml-1 hover:text-white cursor-pointer">
              <X size={11} />
            </button>
          </span>
        )}
      </div>

      <AnimatePresence>
        {sugerencia !== null && (
          <motion.div
            {...scaleIn}
            className="mt-3 p-3 rounded-xl bg-accent-500/10 border border-accent-500/25"
          >
            <p className="text-xs text-accent-300 font-semibold mb-2 flex items-center gap-1.5">
              <Sparkles size={13} /> Sugerencia de redacción
            </p>
            {editando ? (
              <textarea
                value={sugerencia}
                onChange={(e) => setSugerencia(e.target.value)}
                rows={4}
                className="input-field resize-y text-sm leading-relaxed"
              />
            ) : (
              <p className="text-sm text-surface-200 leading-relaxed bg-surface-900/40 rounded-lg p-2.5">
                {sugerencia}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => {
                  onMejorada(sugerencia);
                  setSugerencia(null);
                }}
                className="btn-success text-xs flex items-center gap-1.5"
              >
                <Check size={13} /> Aceptar
              </button>
              <button onClick={() => setEditando((e) => !e)} className="btn-secondary text-xs">
                {editando ? 'Listo' : 'Editar'}
              </button>
              <button onClick={mejorar} className="btn-secondary text-xs">
                Volver a intentar
              </button>
              <button onClick={() => setSugerencia(null)} className="btn-secondary text-xs">
                Mantener original
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ETAPA 5 — EVALUACIÓN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StepEvaluacion({ proc, upd }: { proc: Proceso; upd: (c: Partial<Proceso>) => void }) {
  const [confirmRegen, setConfirmRegen] = useState(false);
  const objetivo = numPreguntasPorComplejidad(proc.pasos.length);

  function generar() {
    upd({ preguntas: generarEvaluacionLocal(proc) });
  }
  function updPregunta(id: string, changes: Partial<Pregunta>) {
    upd({ preguntas: proc.preguntas.map((q) => (q.id === id ? { ...q, ...changes } : q)) });
  }
  function addManual() {
    const q: Pregunta = {
      id: uid('q'),
      texto: '',
      opciones: ['', '', ''],
      correcta: 0,
      generadaPorIA: false,
    };
    upd({ preguntas: [...proc.preguntas, q] });
  }

  return (
    <motion.div {...fadeUp} className="space-y-3 max-w-2xl">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-emerald-400" /> Generar evaluación
        </h2>
        <p className="text-sm text-surface-400 mb-3">
          El sistema crea un borrador de preguntas a partir de los pasos. Revisa, edita o agrega las
          tuyas antes de publicar.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="badge badge-blue text-xs">
            {proc.pasos.length} pasos · {objetivo} preguntas sugeridas
          </div>
          {proc.preguntas.length === 0 ? (
            <button onClick={generar} className="btn-primary text-sm flex items-center gap-1.5">
              <Sparkles size={15} /> Generar evaluación
            </button>
          ) : (
            <button onClick={() => setConfirmRegen(true)} className="btn-secondary text-sm flex items-center gap-1.5">
              <Sparkles size={15} /> Regenerar todo
            </button>
          )}
        </div>
      </div>

      {proc.preguntas.map((q, i) => (
        <PreguntaCard
          key={q.id}
          index={i}
          pregunta={q}
          onChange={(c) => updPregunta(q.id, c)}
          onDelete={() => upd({ preguntas: proc.preguntas.filter((p) => p.id !== q.id) })}
        />
      ))}

      {proc.preguntas.length > 0 && (
        <button
          onClick={addManual}
          className="w-full glass-card p-4 flex items-center justify-center gap-2 text-emerald-400 hover:bg-emerald-500/5 transition-colors cursor-pointer border-dashed"
        >
          <Plus size={18} /> Agregar pregunta manual
        </button>
      )}

      <ConfirmDialog
        open={confirmRegen}
        title="¿Regenerar toda la evaluación?"
        message="Se reemplazarán todas las preguntas actuales, incluidas las que editaste manualmente."
        confirmLabel="Regenerar"
        onCancel={() => setConfirmRegen(false)}
        onConfirm={() => {
          generar();
          setConfirmRegen(false);
        }}
      />
    </motion.div>
  );
}

function PreguntaCard({
  index,
  pregunta,
  onChange,
  onDelete,
}: {
  index: number;
  pregunta: Pregunta;
  onChange: (c: Partial<Pregunta>) => void;
  onDelete: () => void;
}) {
  const letras = ['A', 'B', 'C'];
  return (
    <motion.div {...fadeUp} className="glass-card p-4">
      <div className="flex items-start gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg bg-surface-700/50 text-surface-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </span>
        <textarea
          value={pregunta.texto}
          onChange={(e) => onChange({ texto: e.target.value })}
          placeholder="Escribe la pregunta…"
          rows={2}
          className="input-field resize-y text-sm flex-1"
        />
        <button onClick={onDelete} className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-danger-500 hover:bg-danger-500/10 cursor-pointer shrink-0">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="space-y-2 pl-9">
        {pregunta.opciones.map((op, oi) => {
          const correcta = pregunta.correcta === oi;
          return (
            <div key={oi} className="flex items-center gap-2">
              <button
                onClick={() => onChange({ correcta: oi })}
                title="Marcar como correcta"
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-all cursor-pointer ${
                  correcta
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'border-surface-600 text-surface-400 hover:border-surface-500'
                }`}
              >
                {correcta ? <Check size={14} /> : letras[oi]}
              </button>
              <input
                value={op}
                onChange={(e) =>
                  onChange({ opciones: pregunta.opciones.map((o, j) => (j === oi ? e.target.value : o)) })
                }
                placeholder={`Opción ${letras[oi]}`}
                className={`input-field py-1.5 text-sm ${correcta ? 'border-green-500/30' : ''}`}
              />
            </div>
          );
        })}
        <p className="text-[11px] text-surface-500">Toca el círculo de la izquierda para marcar la respuesta correcta.</p>
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ETAPA 6 — PUBLICAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StepPublicar({
  proc,
  onPublish,
  onDone,
}: {
  proc: Proceso;
  onPublish: () => void;
  onDone: () => void;
}) {
  const [done, setDone] = useState(false);

  const checks = [
    { ok: !!proc.nombre, label: 'Nombre del proceso' },
    { ok: !!(proc.area && proc.linea && proc.tipo), label: 'Área, línea y tipo' },
    { ok: !!proc.objetivo.trim(), label: 'Objetivo definido' },
    { ok: proc.pasos.length > 0 && proc.pasos.every((p) => p.nombre && p.narrativa), label: 'Pasos con descripción' },
    { ok: proc.preguntas.length > 0, label: 'Evaluación con preguntas' },
  ];
  const allOk = checks.every((c) => c.ok);

  if (done) {
    return (
      <motion.div {...scaleIn} className="glass-card p-8 text-center max-w-lg mx-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/5 pointer-events-none" />
        <div className="text-6xl mb-3 relative z-10">🎉</div>
        <h2 className="text-2xl font-bold gradient-text relative z-10">¡Proceso publicado!</h2>
        <p className="text-surface-300 mt-2 relative z-10">
          «{proc.nombre}» ya está disponible para que el personal se capacite.
        </p>
        <button onClick={onDone} className="btn-primary mt-6 relative z-10">
          Volver
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeUp} className="space-y-4 max-w-2xl">
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-1">
          <Eye size={18} className="text-emerald-400" /> Vista previa y publicar
        </h2>
        <p className="text-sm text-surface-400 mb-4">Revisa que todo esté bien antes de publicar.</p>

        <div className="flex items-start gap-3 mb-4">
          {proc.portadaInicio && (
            <img src={proc.portadaInicio} alt="" className="w-20 h-20 rounded-xl object-cover border border-surface-700/40" />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-surface-100">{proc.nombre}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="badge badge-green text-[11px]">{proc.area}</span>
              <span className="badge badge-blue text-[11px]">{proc.linea}</span>
              <span className="badge badge-purple text-[11px]">v{proc.version}</span>
            </div>
            <p className="text-sm text-surface-400 mt-2">{proc.objetivo}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat n={proc.pasos.length} l="Pasos" />
          <Stat n={proc.preguntas.length} l="Preguntas" />
          <Stat n={proc.epp.length + proc.materiales.length + proc.equipo.length} l="Recursos" />
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
          <ListChecks size={16} className="text-emerald-400" /> Checklist de calidad
        </p>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-sm">
              {c.ok ? (
                <CheckCircle2 size={16} className="text-green-400 shrink-0" />
              ) : (
                <X size={16} className="text-danger-500 shrink-0" />
              )}
              <span className={c.ok ? 'text-surface-300' : 'text-surface-500'}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onDone} className="btn-secondary text-sm">
          Guardar como borrador
        </button>
        <button
          onClick={() => {
            onPublish();
            setDone(true);
          }}
          disabled={!allOk}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Megaphone size={16} /> Publicar proceso
        </button>
      </div>
    </motion.div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="bg-surface-800/30 border border-surface-700/30 rounded-xl py-3">
      <div className="text-xl font-bold text-surface-100">{n}</div>
      <div className="text-xs text-surface-500">{l}</div>
    </div>
  );
}
