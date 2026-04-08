import type { BigscreenContentAsset } from '../../../services/api'
import type { BigscreenSideAnswer } from '../runtime'

export function ClassificationDuelRenderer({
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
  const categories = Array.isArray((asset.payload as any)?.categories) ? (asset.payload as any).categories : []
  const items = Array.isArray((asset.payload as any)?.items) ? (asset.payload as any).items : []
  const assignments = answer.type === 'classification' ? answer.assignments : {}

  return (
    <div className="space-y-3">
      {items.map((item: any, index: number) => (
        <div key={String(item?.id ?? index)} className="grid gap-3 md:grid-cols-[1fr,220px]">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-slate-100">{String(item?.text ?? '')}</div>
          <select
            value={assignments[String(item?.id ?? '')] || ''}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                type: 'classification',
                assignments: {
                  ...assignments,
                  [String(item?.id ?? '')]: e.target.value,
                },
              })
            }
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
          >
            <option value="">选择分类</option>
            {categories.map((category: any) => (
              <option key={String(category?.key ?? '')} value={String(category?.key ?? '')}>{String(category?.label ?? '')}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
