interface Step {
  num: number;
  label: string;
  active: boolean;
  completed: boolean;
}

interface ProgressBreadcrumbProps {
  currentStep: number;
  steps: { label: string }[];
}

export function ProgressBreadcrumb({ currentStep, steps }: ProgressBreadcrumbProps) {
  const stepsWithStatus = steps.map((step, index) => ({
    num: index + 1,
    label: step.label,
    active: index + 1 === currentStep,
    completed: index + 1 < currentStep,
  }));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stepsWithStatus.map((step, index) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            step.active 
              ? 'bg-blue-100 border-2 border-blue-500' 
              : step.completed
              ? 'bg-green-100 border-2 border-green-500'
              : 'bg-gray-100 border-2 border-gray-300 opacity-50'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step.active 
                ? 'bg-blue-500 text-white' 
                : step.completed
                ? 'bg-green-500 text-white'
                : 'bg-gray-400 text-white'
            }`}>
              {step.completed ? '✓' : step.num}
            </div>
            <span className={`text-sm font-medium ${
              step.active 
                ? 'text-blue-900' 
                : step.completed
                ? 'text-green-900'
                : 'text-gray-600'
            }`}>
              {step.label}
            </span>
          </div>
          {index < stepsWithStatus.length - 1 && (
            <div className="w-4 h-0.5 bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}
