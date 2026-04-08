import type { BigscreenContentAsset } from '../../../services/api'
import type { BigscreenSideAnswer } from '../runtime'

export function MatchingDuelRenderer({
  asset,
  answer,
  disabled,
  onChange,
}: {
  asset: BigscreenContentAsset
  answer: BigscreenSideAnswer
  disabled: boolean
  onChange: (next: BigscreenSideAnswer) => void
}) {
  const pairs = Array.isArray((asset.payload as any)?.pairs) ? (asset.payload as any).pairs : []
  const currentAnswers = answer.type === 'matching' ? answer.answers : {}

  return (
    <div className="space-y-3">
      {pairs.map((pair: any, index: number) => {
        const left = String(pair?.left ?? '')
        const options = pairs.map((item: any) => String(item?.right ?? '')).filter(Boolean)
        return (
          <div key={`${left}-${index}`} className="grid gap-3 md:grid-cols-[1fr,1fr]">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-slate-100">{left}</div>
            <select
              value={currentAnswers[left] || ''}
              disabled={disabled}
              onChange={(e) => onChange({ type: 'matching', answers: { ...currentAnswers, [left]: e.target.value } })}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
            >
              <option value="">选择配对结果</option>
              {options.map((option: string) => (
                <option key={`${left}-${option}`} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
