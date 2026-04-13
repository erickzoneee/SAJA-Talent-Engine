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
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = completedSteps.includes(stepNumber);
        const isCurrent = currentStep === stepNumber;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
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
                className={`text-xs font-medium text-center whitespace-nowrap ${
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
  );
}
