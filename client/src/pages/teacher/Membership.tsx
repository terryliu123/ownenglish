import { useEffect, useMemo, useRef, useState } from 'react'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import TeacherLeftSidebar from '../../components/layout/TeacherLeftSidebar'
import { membershipService, type MembershipPlanData, type MembershipSnapshot, type PaymentOrderData } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

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

export default function TeacherMembership() {
  const { t, tWithParams } = useTranslation()
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
    } finally {
      // no-op
    }
  }

  useEffect(() => {
    loadData()
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
      if (codeUrl) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codeUrl)}`
        setQrCodeUrl(qrUrl)
        setShowQrModal(true)
        startPolling(order.order_no)
      } else {
        console.error('No code_url in response:', order)
        alert('创建订单失败：未获取到支付二维码')
      }
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      alert(typeof detail === 'string' ? detail : detail?.message || t('membership.createOrderFailed'))
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
          await loadData()
        }
      } catch (error) {
        console.error('Polling error:', error)
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
    () => plans.find((p) => p.code === membership?.plan_code) || null,
    [plans, membership]
  )

  return (
    <Layout sidebar={<TeacherSidebar activePage="membership" />} leftSidebar={<TeacherLeftSidebar activePage="membership" />}>
      <section className="panel-head">
        <div>
          <p className="eyebrow">{t('membership.centerEntry')}</p>
          <h2>{t('membership.title')}</h2>
        </div>
        <div className="panel-actions">
          <button className="ghost-button" onClick={() => void loadData()}>
            {t('membership.refresh')}
          </button>
        </div>
      </section>

      {/* Row 1: Plans in 3 columns */}
      <section className="surface-card mt-6">
        <div className="surface-head">
          <h3>{t('membership.plans')}</h3>
          <span>{t('membership.planDescription')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.code === plan.code
            return (
              <div key={plan.code} className={`rounded-2xl border p-5 flex flex-col ${isCurrent ? 'border-emerald-300 bg-emerald-50' : 'border-line bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-base font-semibold">{plan.name}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{plan.description}</p>
                  </div>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      {t('membership.currentPlan')}
                    </span>
                  )}
                </div>
                <div className="text-center mb-4">
                  <div className="mt-2">
                    <strong className="text-2xl">{plan.price_cents > 0 ? formatMoney(plan.price_cents) : t('membership.freePrice')}</strong>
                    {plan.duration_days && (
                      <p className="text-xs text-slate-400 mt-1">{tWithParams('membership.durationDays', { days: plan.duration_days })}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm flex-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('membership.planClassesLabel')}</span>
                    <span className="font-medium">{formatLimit(plan.max_classes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('membership.planStudentsLabel')}</span>
                    <span className="font-medium">{formatLimit(plan.max_students_per_class)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('membership.planTaskGroupsLabel')}</span>
                    <span className="font-medium">{formatLimit(plan.max_task_groups)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('membership.planStudyPacksLabel')}</span>
                    <span className="font-medium">{formatLimit(plan.max_study_packs)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">AI</span>
                    <span className={`status-badge ${plan.can_use_ai ? 'active' : 'archived'}`}>
                      {plan.can_use_ai ? t('membership.aiEnabled') : t('membership.aiDisabled')}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  {plan.code === 'free' ? (
                    <div className="text-center text-sm text-slate-400 py-2">
                      {isCurrent ? t('membership.currentPlan') : ''}
                    </div>
                  ) : !membership?.wechat_pay_configured ? (
                    <div className="text-center text-sm text-amber-600 py-2">
                      {t('membership.wechatNotConfigured')}
                    </div>
                  ) : (
                    <button
                      className="solid-button w-full"
                      disabled={payingPlan === plan.code}
                      onClick={() => void handlePurchase(plan.code)}
                    >
                      {payingPlan === plan.code ? t('membership.processing') : t('membership.purchase')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Row 2: Order History - full width */}
      <section className="surface-card mt-6">
        <div className="surface-head">
          <h3>{t('membership.orderHistory')}</h3>
          <span>{t('membership.recentOrders')}</span>
        </div>
        {orders.length === 0 ? (
          <p className="p-6 text-center text-slate-400">{t('membership.noOrders')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">{t('membership.plan')}</th>
                  <th className="py-2">{t('membership.amount')}</th>
                  <th className="py-2">{t('membership.orderStatus')}</th>
                  <th className="py-2">{t('membership.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_no} className="border-t border-line">
                    <td className="py-2">{plans.find((p) => p.code === order.plan_code)?.name || order.plan_code}</td>
                    <td className="py-2">{formatMoney(order.amount)}</td>
                    <td className="py-2">{t(`membership.orderStatuses.${order.status}`)}</td>
                    <td className="py-2">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('membership.wechatPay')}</h3>
              <button onClick={closeQrModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-sm text-slate-600 mb-4">{t('membership.scanToPay')}</p>
            <div className="flex justify-center">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="WeChat Pay QR Code" className="w-48 h-48" />
              )}
            </div>
            <p className="text-xs text-slate-500 text-center mt-4">{t('membership.autoCloseAfterPay')}</p>
          </div>
        </div>
      )}
    </Layout>
  )
}
