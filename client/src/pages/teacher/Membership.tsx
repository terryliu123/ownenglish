import { useEffect, useMemo, useRef, useState } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import TeacherPageHeader from '../../components/layout/TeacherPageHeader'
import {
  membershipService,
  type MembershipPlanData,
  type MembershipSnapshot,
  type PaymentOrderData,
} from '../../services/api'

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`
}

function formatLimit(value: number | null) {
  return value == null ? '不限' : String(value)
}

function getStatusLabel(status: MembershipSnapshot['status']) {
  switch (status) {
    case 'active':
      return '有效'
    case 'trial':
      return '试用中'
    case 'expired':
      return '已过期'
    default:
      return '免费版'
  }
}

function getOrderStatusLabel(status: PaymentOrderData['status']) {
  switch (status) {
    case 'pending':
      return '待支付'
    case 'paid':
      return '已支付'
    case 'failed':
      return '支付失败'
    case 'cancelled':
      return '已取消'
    case 'expired':
      return '已失效'
    default:
      return status
  }
}

function getExpiryNotice(membership: MembershipSnapshot | null) {
  if (!membership?.expires_at || membership.status === 'free') return null
  const daysLeft = Math.ceil((new Date(membership.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 0) {
    return {
      tone: 'danger',
      text: '当前会员已过期，部分高级能力已受限。请完成续费后继续使用。',
    }
  }
  if (daysLeft <= 7) {
    return {
      tone: 'warn',
      text: `当前会员将在 ${daysLeft} 天后到期，建议提前续费避免影响课堂使用。`,
    }
  }
  return null
}

export default function TeacherMembership() {
  const [membership, setMembership] = useState<MembershipSnapshot | null>(null)
  const [plans, setPlans] = useState<MembershipPlanData[]>([])
  const [orders, setOrders] = useState<PaymentOrderData[]>([])
  const [payingPlan, setPayingPlan] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadData() {
    try {
      const [membershipData, planData, ordersData] = await Promise.all([
        membershipService.getMyMembership(),
        membershipService.getPlans(),
        membershipService.getOrders(),
      ])
      setMembership(membershipData)
      setPlans(planData.items || [])
      setOrders(ordersData.items || [])
    } catch (error) {
      console.error('Failed to load membership data:', error)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  async function handlePurchase(planCode: string) {
    try {
      setPayingPlan(planCode)
      const order = await membershipService.createOrder(planCode)
      const codeUrl = order.payment?.code_url

      if (!codeUrl) {
        alert('创建订单成功，但没有返回微信支付二维码。请检查支付配置。')
        return
      }

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(codeUrl)}`
      setQrCodeUrl(qrUrl)
      setShowQrModal(true)
      startPolling(order.order_no)
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      alert(typeof detail === 'string' ? detail : detail?.message || '创建订单失败，请稍后重试。')
    } finally {
      setPayingPlan(null)
    }
  }

  function startPolling(orderNo: string) {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(async () => {
      try {
        const order = await membershipService.getOrder(orderNo)
        if (order.status === 'paid') {
          stopPolling()
          setShowQrModal(false)
          setQrCodeUrl('')
          await loadData()
        }
      } catch (error) {
        console.error('Polling order status failed:', error)
      }
    }, 3000)
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function closeQrModal() {
    stopPolling()
    setShowQrModal(false)
    setQrCodeUrl('')
  }

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.code === membership?.plan_code) || null,
    [plans, membership]
  )

  const expiryNotice = getExpiryNotice(membership)

  const usageTiles = membership
    ? [
        { label: '班级数量', value: `${membership.usage.class_count} / ${formatLimit(membership.limits.max_classes)}` },
        { label: '平板任务', value: `${membership.usage.task_group_count} / ${formatLimit(membership.limits.max_task_groups)}` },
        { label: '学习包', value: `${membership.usage.study_pack_count} / ${formatLimit(membership.limits.max_study_packs)}` },
        {
          label: '大屏素材',
          value: `${membership.usage.bigscreen_content_asset_count} / ${formatLimit(membership.limits.max_bigscreen_content_assets)}`,
        },
        {
          label: '大屏活动',
          value: `${membership.usage.bigscreen_activity_pack_count} / ${formatLimit(membership.limits.max_bigscreen_activity_packs)}`,
        },
      ]
    : []

  return (
    <Layout sidebar={<TeacherSidebar activePage="membership" />} leftSidebar={<TeacherLeftSidebar activePage="membership" />}>
      <div className="teacher-page">
        <TeacherPageHeader
          eyebrow="会员中心"
          title="管理订阅与使用额度"
          description="查看当前会员状态、升级可用权益，并跟踪最近的支付订单。"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 9l2.5 6h9L19 9m-2.5 6L12 19l-4.5-4M7.5 15L5 9l4 .5L12 5l3 4.5 4-.5-2.5 6" />
            </svg>
          }
          meta={currentPlan ? <span className="teacher-page-pill">当前方案：{currentPlan.name}</span> : null}
          actions={
            <button className="ghost-button" type="button" onClick={() => void loadData()}>
              刷新数据
            </button>
          }
        />

        {expiryNotice ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              expiryNotice.tone === 'danger'
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-amber-300 bg-amber-50 text-amber-700'
            }`}
          >
            {expiryNotice.text}
          </div>
        ) : null}

        {membership ? (
          <section className="surface-card">
            <div className="surface-head">
              <h3>当前会员状态</h3>
              <span>会员有效期、额度和 AI 能力一目了然。</span>
            </div>
            <div className="teacher-stat-grid p-4">
              <article className="teacher-stat-tile">
                <span className="teacher-stat-label">会员方案：</span>
                <strong className="teacher-stat-value">{membership.plan_name}</strong>
                <p className="teacher-stat-copy">来源：{membership.source || '系统分配'}</p>
              </article>
              <article className="teacher-stat-tile">
                <span className="teacher-stat-label">状态：</span>
                <strong className="teacher-stat-value">{getStatusLabel(membership.status)}</strong>
                <p className="teacher-stat-copy">{membership.can_use_ai ? '已包含课堂 AI 能力' : '不包含课堂 AI 能力'}</p>
              </article>
              <article className="teacher-stat-tile">
                <span className="teacher-stat-label">生效时间：</span>
                <strong className="teacher-stat-value !text-lg">{formatDate(membership.started_at)}</strong>
                <p className="teacher-stat-copy">试用到期：{formatDate(membership.trial_ends_at)}</p>
              </article>
              <article className="teacher-stat-tile">
                <span className="teacher-stat-label">到期时间：</span>
                <strong className="teacher-stat-value !text-lg">{membership.expires_at ? formatDate(membership.expires_at) : '长期有效'}</strong>
                <p className="teacher-stat-copy">
                  微信支付:{membership.wechat_pay_configured ? '已配置' : '未配置'}
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {usageTiles.length > 0 ? (
          <section className="surface-card">
            <div className="surface-head">
              <h3>当前额度使用情况</h3>
              <span>用于判断是否需要升级方案。</span>
            </div>
            <div className="teacher-stat-grid p-4">
              {usageTiles.map((tile) => (
                <article key={tile.label} className="teacher-stat-tile">
                  <span className="teacher-stat-label">{tile.label}</span>
                  <strong className="teacher-stat-value !text-2xl">{tile.value}</strong>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="surface-card">
          <div className="surface-head">
            <h3>会员方案</h3>
            <span>对比不同方案的班级、任务和大屏互动能力。</span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.code === plan.code
              const isFree = plan.code === 'free'
              return (
                <article
                  key={plan.code}
                  className={`flex flex-col rounded-2xl border p-5 ${
                    isCurrent ? 'border-emerald-300 bg-emerald-50' : 'border-line bg-white'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-[var(--ink)]">{plan.name}</h4>
                      <p className="mt-1 text-sm text-slate-500">{plan.description || '适合不同阶段的课堂使用需求。'}</p>
                    </div>
                    {isCurrent ? <span className="teacher-page-pill">当前方案</span> : null}
                  </div>

                  <div className="mb-5">
                    <div className="text-3xl font-semibold text-[var(--ink)]">
                      {plan.price_cents > 0 ? formatMoney(plan.price_cents) : '免费'}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.duration_days ? `${plan.duration_days} 天有效期` : '长期使用'}
                    </p>
                  </div>

                  <div className="flex-1 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">班级数量</span>
                      <span className="font-medium text-[var(--ink)]">{formatLimit(plan.max_classes)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">单班学生数</span>
                      <span className="font-medium text-[var(--ink)]">{formatLimit(plan.max_students_per_class)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">平板任务</span>
                      <span className="font-medium text-[var(--ink)]">{formatLimit(plan.max_task_groups)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">学习包</span>
                      <span className="font-medium text-[var(--ink)]">{formatLimit(plan.max_study_packs)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">课堂 AI</span>
                      <span className={`status-badge ${plan.can_use_ai ? 'active' : 'archived'}`}>
                        {plan.can_use_ai ? '支持' : '不支持'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">大屏互动素材</span>
                      <span className="font-medium text-[var(--ink)]">{plan.can_use_ai ? '不限' : '5'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">大屏互动活动</span>
                      <span className="font-medium text-[var(--ink)]">{plan.can_use_ai ? '不限' : '2'}</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    {isFree ? (
                      <div className="py-2 text-center text-sm text-slate-400">{isCurrent ? '当前正在使用免费版' : '基础能力默认开放'}</div>
                    ) : !membership?.wechat_pay_configured ? (
                      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
                        微信支付未配置，暂时无法在线购买。
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="solid-button wide-button"
                        disabled={payingPlan === plan.code}
                        onClick={() => void handlePurchase(plan.code)}
                      >
                        {payingPlan === plan.code ? '正在创建订单…' : '立即购买'}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="surface-card">
          <div className="surface-head">
            <h3>订单记录</h3>
            <span>最近的购买订单和支付状态会显示在这里。</span>
          </div>
          {orders.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">暂时没有订单记录。</p>
          ) : (
            <div className="table-wrapper">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>方案</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>支付渠道</th>
                    <th>创建时间</th>
                    <th>支付时间</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_no}>
                      <td>{plans.find((plan) => plan.code === order.plan_code)?.name || order.plan_code}</td>
                      <td>{formatMoney(order.amount)}</td>
                      <td>{getOrderStatusLabel(order.status)}</td>
                      <td>{order.payment_channel || '-'}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>{formatDate(order.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showQrModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--ink)]">微信支付</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">请使用微信扫码完成支付，系统会自动刷新支付状态。</p>
                </div>
                <button
                  type="button"
                  onClick={closeQrModal}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-center rounded-2xl bg-slate-50 p-5">
                {qrCodeUrl ? <img src={qrCodeUrl} alt="微信支付二维码" className="h-56 w-56" /> : null}
              </div>
              <p className="mt-4 text-center text-xs text-slate-500">支付完成后弹窗会自动关闭，并刷新当前会员状态。</p>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
