import { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface Order {
  id: string
  order_no: string
  user_name: string
  user_email: string | null
  user_registered_at: string | null
  plan_code: string
  amount: number
  status: string
  paid_at: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: 'bg-yellow-900 text-yellow-200' },
  paid: { text: '已支付', color: 'bg-green-900 text-green-200' },
  failed: { text: '失败', color: 'bg-red-900 text-red-200' },
  cancelled: { text: '已取消', color: 'bg-slate-600 text-slate-200' },
  expired: { text: '已过期', color: 'bg-slate-600 text-slate-400' },
}

const PLAN_LABELS: Record<string, string> = {
  free: '免费',
  paid_monthly: '月度会员',
  paid_yearly: '年度会员',
}

function formatAmount(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)

  const loadOrders = () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, page_size: 20 }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    api.get('/admin/orders', { params }).then((res) => {
      setOrders(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [page, search, statusFilter, startDate, endDate])

  const handleSearchReset = () => {
    setSearch('')
    setStatusFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">订单管理</h1>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="搜索用户名 / 邮箱..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
        >
          <option value="">所有状态</option>
          <option value="pending">待支付</option>
          <option value="paid">已支付</option>
          <option value="failed">失败</option>
          <option value="cancelled">已取消</option>
          <option value="expired">已过期</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
          title="开始日期"
        />
        <span className="self-center text-slate-400">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
          title="结束日期"
        />
        <button
          onClick={handleSearchReset}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          重置
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">订单号</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">用户</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">方案</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">金额</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">状态</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">购买时间</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">注册时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">暂无订单记录</td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {order.order_no}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{order.user_name}</p>
                        <p className="text-slate-400 text-sm">{order.user_email || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {PLAN_LABELS[order.plan_code] || order.plan_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {formatAmount(order.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[order.status]?.color || 'bg-slate-600 text-slate-200'}`}>
                          {STATUS_LABELS[order.status]?.text || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {order.paid_at
                          ? new Date(order.paid_at).toLocaleString('zh-CN')
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {order.user_registered_at
                          ? new Date(order.user_registered_at).toLocaleDateString('zh-CN')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-slate-400">共 {total} 条记录</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-slate-400">第 {page} 页</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={orders.length < 20}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
