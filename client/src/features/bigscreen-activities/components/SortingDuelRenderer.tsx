import type { BigscreenContentAsset } from '../../../services/api'
import type { BigscreenSideAnswer } from '../runtime'

export function SortingDuelRenderer({
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
  const items = Array.isArray((asset.payload as any)?.items) ? (asset.payload as any).items : []
  const currentOrder = answer.type === 'sorting'
    ? answer.order
    : items.map((item: any) => String(item?.id))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= currentOrder.length) return
    const next = [...currentOrder]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange({ type: 'sorting', order: next })
  }

  return (
    <div className="space-y-3">
      {currentOrder.map((itemId: string, index: number) => {
        const item = items.find((current: any) => String(current?.id) === itemId)
        return (
          <div key={itemId} className="grid gap-3 md:grid-cols-[60px,1fr,auto,auto]">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-center text-slate-100">{index + 1}</div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-slate-100">{String(item?.text ?? itemId)}</div>
            <button disabled={disabled} onClick={() => move(index, -1)} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50">
              上移
            </button>
            <button disabled={disabled} onClick={() => move(index, 1)} className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50">
              下移
            </button>
          </div>
        )
      })}
    </div>
  )
}
