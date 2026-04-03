import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout, { TeacherSidebar } from '../../components/layout/Layout'
import { membershipService, type MembershipSnapshot, type PaymentOrderData } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

function formatMoney(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`
}

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

type PageStatus = 'loading' | 'success' | 'failed' | 'pending'

export default function PaymentResult() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading')
  const [order, setOrder] = useState<PaymentOrderData | null>(null)
  const [membership, setMembership] = useState<MembershipSnapshot | null>(null)
  const [dots, setDots] = useState(0)

  const orderNo = searchParams.get('order_no') || ''
  const maxRetries = 15
  const pollInterval = 3000

  // Animated dots
  useEffect(() => {
    if (pageStatus !== 'loading') return
    const timer = setInterval(() => setDots(d => (d + 1) % 4), 500)
    return () => clearInterval(timer)
  }, [pageStatus])

  // Poll order status
  useEffect(() => {
    if (!orderNo) {
      setPageStatus('failed')
      return
    }
    let cancelled = false
    let retries = 0

    const poll = async () => {
      while (!cancelled && retries < maxRetries) {
        try {
          const orderData = await membershipService.getOrder(orderNo)
          setOrder(orderData)
          if (orderData.status === 'paid') {
            setPageStatus('success')
            try {
              const mem = await membershipService.getMyMembership()
              setMembership(mem)
            } catch { /* ignore */ }
            return
          }
          if (['cancelled', 'failed', 'expired'].includes(orderData.status)) {
            setPageStatus('failed')
            return
          }
          retries++
          await new Promise(r => setTimeout(r, pollInterval))
        } catch {
          setPageStatus('failed')
          return
        }
      }
      if (!cancelled) setPageStatus('pending')
    }
    poll()
    return () => { cancelled = true }
  }, [orderNo])

  async function manualCheck() {
    try {
      const orderData = await membershipService.getOrder(orderNo)
      setOrder(orderData)
      if (orderData.status === 'paid') {
        setPageStatus('success')
        try {
          const mem = await membershipService.getMyMembership()
          setMembership(mem)
        } catch { /* ignore */ }
      } else if (['cancelled', 'failed', 'expired'].includes(orderData.status)) {
        setPageStatus('failed')
      } else {
        setPageStatus('loading')
      }
    } catch { /* ignore */ }
  }

  return (
    <Layout sidebar={<TeacherSidebar activePage="membership" />}>
      <div className="panel-page max-w-2xl mx-auto">
        <section className="surface-card p-8">
          {/* Loading */}
          {pageStatus === 'loading' && (
            <div className="text-center py-16">
              <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <p className="text-slate-500">
                {t('membership.paymentChecking')}{'.'.repeat(dots)}
              </p>
            </div>
          )}

          {/* Success */}
          {pageStatus === 'success' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L7 18" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-green-700 mb-2">
                {t('membership.paymentSuccess')}
              </h2>
              <p className="text-slate-500 mb-8">{t('membership.paymentSuccessDesc')}</p>
            </div>
          )}

          {/* Failed */}
          {pageStatus === 'failed' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-red-600 mb-2">
                {t('membership.paymentFailed')}
              </h2>
              <p className="text-slate-500 mb-6">{t('membership.paymentFailedDesc')}</p>
            </div>
          )}

          {/* Pending (timeout) */}
          {pageStatus === 'pending' && (
            <div className="text-center py-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l6 4.5" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-amber-600 mb-2">
                {t('membership.paymentStillChecking')}
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                {t('membership.paymentStillCheckingDesc')}
              </p>
            </div>
          )}

          {/* Order info */}
          {order && pageStatus !== 'loading' && (
            <div className="mt-4 bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('membership.orderNo')}</span>
                <span className="font-medium text-slate-700">{order.order_no}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('membership.amount')}</span>
                <span className="font-medium">{formatMoney(order.amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('membership.orderStatus')}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  order.status === 'paid' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {t(`membership.orderStatuses.${order.status}`)}
                </span>
              </div>
              {order.paid_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t('membership.orderPaid')}</span>
                  <span className="text-sm text-slate-600">{formatDate(order.paid_at)}</span>
                </div>
              )}
            </div>
          )}

          {/* Membership card (success only) */}
          {membership && pageStatus === 'success' && (
            <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                {t('membership.newPlanInfo')}
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('membership.newPlan')}</span>
                <span className="font-semibold text-slate-700">{membership.plan_name}</span>
              </div>
              {membership.expires_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{t('membership.newExpiry')}</span>
                  <span className="text-sm font-semibold text-slate-600">
                    {formatDate(membership.expires_at)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{t('membership.newStatus')}</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {t('membership.statuses.active')}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {pageStatus === 'success' && (
              <>
                <button
                  onClick={() => navigate('/teacher')}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  {t('membership.backToDashboard')}
                </button>
                <button
                  onClick={() => navigate('/teacher/membership')}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"                >
                  {t('membership.viewMembership')}
                </button>
              </>
            )}
            {pageStatus === 'failed' && (
              <button
                onClick={() => navigate('/teacher/membership')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                {t('membership.retryPurchase')}
              </button>
            )}
            {(pageStatus === 'pending' || pageStatus === 'loading') && (
              <button
                onClick={manualCheck}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                {t('membership.checkAgain')}
              </button>
            )}
            <button
              onClick={() => navigate('/teacher/membership')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"                >
              {t('membership.viewMembership')}
            </button>
          </div>
        </section>
      </div>
    </Layout>
  )
}
