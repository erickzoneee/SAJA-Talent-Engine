import { Check } from 'lucide-react';

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
}

export default function ProgressSteps({
  steps,
  currentStep,
  completedSteps,
}: ProgressStepsProps) {
  // v2.20: en celular el riel completo no cabe. Con 5 pasos y etiquetas en
  // espanol el renglon necesita ~500px y las etiquetas (whitespace-nowrap) se
  // encimaban unas con otras. Debajo de 640px se muestra un resumen compacto;
  // de 640px para arriba el riel de siempre, sin ningun cambio.
  const total = steps.length;
  const safeCurrent = Math.min(Math.max(currentStep, 1), total);
  const currentLabel = steps[safeCurrent - 1] ?? '';
  const doneCount = completedSteps.filter((n) => n >= 1 && n <= total).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <>
      {/* ── Celular: "Paso 3 de 7 — Diagnostico" + barra de avance ── */}
      <div className="sm:hidden w-full">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-xs font-semibold text-primary-400 shrink-0">
            Paso {safeCurrent} de {total}
          </span>
          <span className="text-xs font-medium text-surface-300 text-right break-words min-w-0">
            {currentLabel}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-700/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Tablet y escritorio: el riel de siempre ── */}
      <div className="hidden sm:flex items-center w-full">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = currentStep === stepNumber;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none min-w-0">
              <div className="flex flex-col items-center gap-2 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shrink-0 ${
                    isCompleted
                      ? 'bg-success-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                      : isCurrent
                        ? 'bg-primary-600 text-white shadow-[0_0_12px_rgba(51,141,255,0.4)]'
                        : 'bg-surface-700/60 text-surface-400 border border-surface-600/30'
                  }`}
                >
                  {isCompleted ? <Check size={18} /> : stepNumber}
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight break-words ${
                    isCompleted
                      ? 'text-success-500'
                      : isCurrent
                        ? 'text-primary-400'
                        : 'text-surface-500'
                  }`}
                >
                  {step}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 mt-[-1.5rem]">
                  <div className="h-0.5 w-full rounded-full bg-surface-700/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'w-full bg-success-500'
                          : 'w-0 bg-primary-600'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
