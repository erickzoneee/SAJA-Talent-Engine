import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pencil,
  History,
  Eye,
  ArrowLeft,
  Save,
  Power,
  ShieldCheck,
} from 'lucide-react';
import type { BankQuestion, JobPosition, OptionKey } from '../../types';
import { JOB_POSITIONS } from '../../types';
import { useStore } from '../../store/useStore';
import { useQuestionBank, countByPosition, positionsBelowMinimum } from '../../store/useQuestionBank';
import type { NewQuestionInput } from '../../store/useQuestionBank';
import { EXAM_SPECIFIC_COUNT } from '../../utils/examBank';
import { formatDate } from '../../utils/helpers';

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

type ViewState = { view: 'list' } | { view: 'form'; editId?: string };

export default function QuestionBankModule() {
  const authRole = useStore((s) => s.authRole);
  const [viewState, setViewState] = useState<ViewState>({ view: 'list' });

  // Permisos: solo Administrador del sistema y Direccion (BRD seccion 5)
  if (authRole !== 'direction') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-400">
        <ShieldCheck size={48} className="mb-3 text-danger-500" />
        <p className="font-medium">Acceso restringido</p>
        <p className="text-sm mt-1">
          Solo el Administrador del sistema y Direccion pueden administrar el banco de preguntas.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState.view === 'list' ? (
          <motion.div key="list" {...fadeUp} className="flex-1 flex flex-col overflow-hidden">
            <BankListView
              onNew={() => setViewState({ view: 'form' })}
              onEdit={(id) => setViewState({ view: 'form', editId: id })}
            />
          </motion.div>
        ) : (
          <motion.div key="form" {...fadeUp} className="flex-1 flex flex-col overflow-hidden">
            <QuestionFormView
              editId={viewState.view === 'form' ? viewState.editId : undefined}
              onBack={() => setViewState({ view: 'list' })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIST : contadores, filtros y listado de preguntas
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BankListView({ onNew, onEdit }: { onNew: () => void; onEdit: (id: string) => void }) {
  const questions = useQuestionBank((s) => s.questions);
  const toggleActive = useQuestionBank((s) => s.toggleActive);
  const settings = useStore((s) => s.settings);

  const [filterTipo, setFilterTipo] = useState<'all' | 'comun' | 'especifica'>('all');
  const [filterPuesto, setFilterPuesto] = useState<JobPosition | ''>('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'activa' | 'inactiva'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);

  const counts = useMemo(() => countByPosition(questions), [questions]);
  const lowPositions = useMemo(() => positionsBelowMinimum(questions), [questions]);
  const comunesActivas = questions.filter((q) => q.tipo === 'comun' && q.activa).length;

  const usuario = `${settings.directorName} (Direccion)`;

  const filtered = useMemo(
    () =>
      questions.filter((q) => {
        if (filterTipo !== 'all' && q.tipo !== filterTipo) return false;
        if (filterPuesto !== '' && q.puesto !== filterPuesto) return false;
        if (filterEstado === 'activa' && !q.activa) return false;
        if (filterEstado === 'inactiva' && q.activa) return false;
        if (
          searchTerm !== '' &&
          !q.texto.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !q.categoria.toLowerCase().includes(searchTerm.toLowerCase())
        )
          return false;
        return true;
      }),
    [questions, filterTipo, filterPuesto, filterEstado, searchTerm],
  );

  return (
    <>
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Banco de Preguntas</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Entrevista y examen viven en base de datos — nunca en el codigo · {questions.length} preguntas
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={onNew}>
          <Plus size={18} />
          Agregar Pregunta
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {/* Alerta de puestos con menos de 15 activas */}
        {lowPositions.length > 0 && (
          <motion.div
            {...fadeUp}
            className="glass-card p-4 border-2 border-danger-500/50 bg-danger-500/5 flex items-start gap-3"
          >
            <AlertTriangle size={20} className="text-danger-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger-400 text-sm">
                Alerta: puestos con menos de {EXAM_SPECIFIC_COUNT} preguntas especificas activas
              </p>
              <p className="text-xs text-surface-400 mt-1">
                {lowPositions.map((p) => `${JOB_POSITIONS[p].name} (${counts[p].activas} activas)`).join(' · ')}
                {' — '}agrega o reactiva preguntas para completar el examen de estos puestos.
              </p>
            </div>
          </motion.div>
        )}

        {/* Contadores por puesto */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-surface-500">Bloque comun</p>
            <p className="text-2xl font-bold text-surface-100">{comunesActivas}</p>
            <p className="text-xs text-surface-400">activas (se usan 10 por examen)</p>
          </div>
          {(Object.keys(JOB_POSITIONS) as JobPosition[]).map((pos) => {
            const c = counts[pos];
            const low = c.activas < EXAM_SPECIFIC_COUNT;
            return (
              <div key={pos} className={`glass-card p-4 ${low ? 'border border-danger-500/40' : ''}`}>
                <p className="text-xs text-surface-500 truncate" title={JOB_POSITIONS[pos].name}>
                  {JOB_POSITIONS[pos].name}
                </p>
                <p className={`text-2xl font-bold ${low ? 'text-danger-400' : 'text-surface-100'}`}>
                  {c.activas}
                  <span className="text-sm font-normal text-surface-500"> activas</span>
                </p>
                <p className="text-xs text-surface-400">
                  {c.inactivas} inactiva{c.inactivas !== 1 ? 's' : ''}
                  {low && <span className="text-danger-400 font-semibold"> · minimo {EXAM_SPECIFIC_COUNT}</span>}
                </p>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Buscar por texto o categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="input-field w-auto" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as typeof filterTipo)}>
            <option value="all">Comunes y especificas</option>
            <option value="comun">Solo comunes</option>
            <option value="especifica">Solo especificas</option>
          </select>
          <select className="input-field w-auto" value={filterPuesto} onChange={(e) => setFilterPuesto(e.target.value as JobPosition | '')}>
            <option value="">Todos los puestos</option>
            {(Object.entries(JOB_POSITIONS) as [JobPosition, (typeof JOB_POSITIONS)[JobPosition]][]).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name}
              </option>
            ))}
          </select>
          <select className="input-field w-auto" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as typeof filterEstado)}>
            <option value="all">Activas e inactivas</option>
            <option value="activa">Solo activas</option>
            <option value="inactiva">Solo inactivas</option>
          </select>
        </div>

        {/* Reglas */}
        <p className="text-[11px] text-surface-500">
          Las preguntas no se borran: se desactivan y quedan en historial. Los examenes ya realizados
          conservan las preguntas con las que se aplicaron. Si un puesto tiene mas de {EXAM_SPECIFIC_COUNT}{' '}
          activas, el sistema selecciona {EXAM_SPECIFIC_COUNT} aleatoriamente en cada examen.
        </p>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center text-surface-500">
            <Database size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay preguntas con estos filtros.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((q) => (
              <div key={q.id} className={`glass-card p-4 ${!q.activa ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`badge ${q.tipo === 'comun' ? 'badge-blue' : 'badge-purple'}`}>
                        {q.tipo === 'comun' ? 'Comun' : q.puesto ? JOB_POSITIONS[q.puesto].name : 'Especifica'}
                      </span>
                      <span className="text-xs text-surface-500">{q.categoria}</span>
                      <span className={`badge ${q.activa ? 'badge-green' : 'badge-red'}`}>
                        {q.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="text-sm text-surface-100 font-medium">{q.texto}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 mt-2">
                      {OPTION_KEYS.map((k) => (
                        <p
                          key={k}
                          className={`text-xs flex items-center gap-1.5 ${
                            q.correcta === k ? 'text-success-400 font-medium' : 'text-surface-400'
                          }`}
                        >
                          {q.correcta === k ? <CheckCircle size={11} className="flex-shrink-0" /> : <span className="w-[11px]" />}
                          {k.toUpperCase()}) {q.opciones[k]}
                        </p>
                      ))}
                    </div>
                    <p className="text-[11px] text-surface-600 mt-2">
                      Creada por {q.creadaPor} · {formatDate(q.creadaEn)}
                      {q.modificadaPor && (
                        <>
                          {' '}· Ultima modificacion: {q.modificadaPor} · {q.modificadaEn ? formatDate(q.modificadaEn) : ''}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      className="p-2 rounded-xl hover:bg-primary-500/15 text-surface-400 hover:text-primary-400 transition-colors"
                      title="Editar"
                      onClick={() => onEdit(q.id)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className={`p-2 rounded-xl transition-colors ${
                        q.activa
                          ? 'hover:bg-danger-500/15 text-surface-400 hover:text-danger-400'
                          : 'hover:bg-success-500/15 text-surface-400 hover:text-success-400'
                      }`}
                      title={q.activa ? 'Desactivar' : 'Reactivar'}
                      onClick={() => toggleActive(q.id, usuario)}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      className="p-2 rounded-xl hover:bg-surface-700/40 text-surface-400 hover:text-surface-200 transition-colors"
                      title="Historial"
                      onClick={() => setHistoryId(historyId === q.id ? null : q.id)}
                    >
                      <History size={16} />
                    </button>
                  </div>
                </div>

                {/* Historial */}
                <AnimatePresence>
                  {historyId === q.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
                        {q.historial.map((h, idx) => (
                          <p key={idx} className="text-xs text-surface-500 flex items-center gap-2">
                            <History size={11} className="flex-shrink-0" />
                            {formatDate(h.fecha)}{' '}
                            {new Date(h.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} —{' '}
                            {h.accion} ({h.usuario})
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORM : agregar / editar pregunta + vista previa de tablet
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function QuestionFormView({ editId, onBack }: { editId?: string; onBack: () => void }) {
  const questions = useQuestionBank((s) => s.questions);
  const addQuestion = useQuestionBank((s) => s.addQuestion);
  const updateQuestion = useQuestionBank((s) => s.updateQuestion);
  const settings = useStore((s) => s.settings);

  const editing: BankQuestion | undefined = editId ? questions.find((q) => q.id === editId) : undefined;

  const [form, setForm] = useState<NewQuestionInput>({
    tipo: editing?.tipo ?? 'especifica',
    puesto: editing?.puesto ?? null,
    categoria: editing?.categoria ?? '',
    texto: editing?.texto ?? '',
    opciones: editing ? { ...editing.opciones } : { a: '', b: '', c: '', d: '' },
    correcta: editing?.correcta ?? 'a',
    explicacion: editing?.explicacion ?? '',
  });

  const usuario = `${settings.directorName} (Direccion)`;

  const setField = <K extends keyof NewQuestionInput>(key: K, value: NewQuestionInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setOpcion = (key: OptionKey, value: string) =>
    setForm((prev) => ({ ...prev, opciones: { ...prev.opciones, [key]: value } }));

  const valid =
    form.texto.trim() !== '' &&
    form.categoria.trim() !== '' &&
    OPTION_KEYS.every((k) => form.opciones[k].trim() !== '') &&
    (form.tipo === 'comun' || form.puesto !== null);

  const handleSave = () => {
    if (!valid) return;
    if (editing) {
      updateQuestion(
        editing.id,
        {
          tipo: form.tipo,
          puesto: form.tipo === 'comun' ? null : form.puesto,
          categoria: form.categoria.trim(),
          texto: form.texto.trim(),
          opciones: form.opciones,
          correcta: form.correcta,
          explicacion: form.explicacion,
        },
        usuario,
      );
    } else {
      addQuestion(form, usuario);
    }
    onBack();
  };

  return (
    <>
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <button className="p-2 rounded-xl hover:bg-surface-800 transition-colors" onClick={onBack}>
          <ArrowLeft size={20} className="text-surface-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">{editing ? 'Editar Pregunta' : 'Agregar Pregunta'}</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {editing ? 'Los cambios quedan registrados en el historial' : 'La pregunta queda activa al guardarla'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {/* Formulario */}
          <div className="glass-card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-surface-400 mb-1">Tipo *</label>
                <select
                  className="input-field"
                  value={form.tipo}
                  onChange={(e) => setField('tipo', e.target.value as 'comun' | 'especifica')}
                >
                  <option value="comun">Comun (todos los puestos)</option>
                  <option value="especifica">Especifica de un puesto</option>
                </select>
              </div>
              {form.tipo === 'especifica' && (
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Puesto *</label>
                  <select
                    className="input-field"
                    value={form.puesto ?? ''}
                    onChange={(e) => setField('puesto', (e.target.value || null) as JobPosition | null)}
                  >
                    <option value="">Seleccionar</option>
                    {(Object.entries(JOB_POSITIONS) as [JobPosition, (typeof JOB_POSITIONS)[JobPosition]][]).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Categoria *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: medidas, electricidad, excel, BPM"
                value={form.categoria}
                onChange={(e) => setField('categoria', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Texto de la pregunta *</label>
              <textarea
                className="input-field min-h-[70px] resize-y"
                placeholder="Texto completo de la pregunta (nivel primaria — accesible para todos)"
                value={form.texto}
                onChange={(e) => setField('texto', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-surface-400">Opciones de respuesta * (marca la correcta)</label>
              {OPTION_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setField('correcta', k)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all cursor-pointer ${
                      form.correcta === k
                        ? 'bg-success-500 text-white ring-2 ring-success-500/50'
                        : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                    }`}
                    title={form.correcta === k ? 'Respuesta correcta' : 'Marcar como correcta'}
                  >
                    {k.toUpperCase()}
                  </button>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={`Opcion ${k.toUpperCase()}`}
                    value={form.opciones[k]}
                    onChange={(e) => setOpcion(k, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1">Explicacion (retroalimentacion opcional)</label>
              <textarea
                className="input-field min-h-[50px] resize-y"
                placeholder="Por que es correcta la respuesta"
                value={form.explicacion}
                onChange={(e) => setField('explicacion', e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={onBack}>
                Cancelar
              </button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={!valid} onClick={handleSave}>
                <Save size={16} />
                {editing ? 'Guardar cambios' : 'Agregar pregunta'}
              </button>
            </div>
          </div>

          {/* Vista previa de tablet */}
          <div>
            <h3 className="text-sm font-semibold text-surface-300 mb-2 flex items-center gap-2">
              <Eye size={15} className="text-primary-400" />
              Vista previa — asi se vera en la tablet
            </h3>
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${form.tipo === 'comun' ? 'badge-blue' : 'badge-purple'}`}>
                  {form.tipo === 'comun' ? 'Bloque comun' : 'Especifica del puesto'}
                </span>
                <span className="text-xs text-surface-500">{form.categoria || 'categoria'}</span>
              </div>
              <div className="flex items-start gap-3 mb-5">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-bold">
                  ?
                </span>
                <p className="text-surface-100 font-medium leading-relaxed pt-1">
                  {form.texto || 'El texto de la pregunta aparecera aqui...'}
                </p>
              </div>
              <div className="space-y-2">
                {OPTION_KEYS.map((k) => (
                  <div
                    key={k}
                    className="w-full text-left p-4 rounded-xl border bg-surface-900/40 border-surface-700 text-surface-300 flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 bg-surface-800 text-surface-400">
                      {k.toUpperCase()}
                    </span>
                    <span className="text-sm">{form.opciones[k] || `Opcion ${k.toUpperCase()}`}</span>
                    {form.correcta === k && (
                      <span className="badge badge-green ml-auto text-[10px]">
                        <CheckCircle size={10} /> correcta
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {form.explicacion && (
                <p className="text-xs text-surface-500 mt-3 flex items-start gap-1.5">
                  <XCircle size={12} className="mt-0.5 flex-shrink-0 rotate-45 text-primary-400" />
                  Retroalimentacion: {form.explicacion}
                </p>
              )}
            </div>
            <p className="text-[11px] text-surface-500 mt-2">
              El candidato ve una pregunta a la vez con barra de avance, sin limite de tiempo. La marca
              de respuesta correcta solo es visible aqui, en administracion.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
