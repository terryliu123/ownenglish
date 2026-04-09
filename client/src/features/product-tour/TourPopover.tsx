import type { PopoverContentProps } from '@reactour/tour'

export default function TourPopover(props: PopoverContentProps) {
  const { steps, currentStep, setCurrentStep, setIsOpen } = props

  const step = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const content = typeof step.content === 'function' ? (step.content(props) ?? null) : step.content

  return (
    <div className="w-[320px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
          {currentStep + 1} / {steps.length}
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          跳过
        </button>
      </div>

      <div className="text-sm leading-6 text-slate-700">
        {typeof content === 'string' ? <p>{content}</p> : content}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentStep((stepIndex) => Math.max(0, stepIndex - 1))}
          disabled={isFirstStep}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            isFirstStep
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          上一步
        </button>

        {isLastStep ? (
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            完成
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep((stepIndex) => Math.min(steps.length - 1, stepIndex + 1))}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            下一步
          </button>
        )}
      </div>
    </div>
  )
}
