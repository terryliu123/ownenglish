import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

interface User {
  id: string
  email: string | null
  username: string | null
  name: string
  role: string
  is_active: boolean
  is_guest: boolean
  created_at: string
  membership_status?: string | null
  membership_plan?: string | null
  membership_started_at?: string | null
  membership_expires_at?: string | null
}

const MEMBERSHIP_PLANS = [
  { code: 'free', label: '免费会员' },
  { code: 'paid_monthly', label: '月度会员' },
  { code: 'paid_yearly', label: '年度会员' },
]

const statusLabels: Record<string, { text: string; color: string }> = {
  free: { text: '免费', color: 'bg-slate-600 text-slate-200' },
  trial: { text: '试用', color: 'bg-yellow-900 text-yellow-200' },
  active: { text: '有效', color: 'bg-green-900 text-green-200' },
  expired: { text: '过期', color: 'bg-red-900 text-red-200' },
}

export default function AdminUsers() {
  const { t, tWithParams } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Membership edit modal
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editPlan, setEditPlan] = useState('monthly')
  const [editExpires, setEditExpires] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)

  // Password change modal
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const loadUsers = () => {
    setLoading(true)
    const params: any = { page, page_size: 20 }
    if (roleFilter) params.role = roleFilter
    if (search) params.search = search
    api.get('/admin/users', { params }).then((res) => {
      setUsers(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [page, roleFilter, search])

  const toggleActive = async (user: User) => {
    await api.post(`/admin/users/${user.id}/toggle-active`)
    loadUsers()
  }

  const deleteUser = async (user: User) => {
    if (!confirm(tWithParams('adminUi.users.deleteConfirm', { name: user.name }))) return
    await api.delete(`/admin/users/${user.id}`)
    loadUsers()
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map(u => u.id)))
    }
  }

  const batchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个用户吗？此操作不可撤销。`)) return
    setBatchDeleting(true)
    try {
      await api.post('/admin/users/batch-delete', { user_ids: Array.from(selectedIds) })
      setSelectedIds(new Set())
      loadUsers()
    } catch (err: any) {
      alert(err?.response?.data?.detail || '批量删除失败')
    } finally {
      setBatchDeleting(false)
    }
  }

  const changePassword = async () => {
    if (!passwordUser || !newPassword.trim()) return
    setPasswordSaving(true)
    try {
      await api.patch(`/admin/users/${passwordUser.id}/password`, { new_password: newPassword })
      setPasswordUser(null)
      setNewPassword('')
    } catch (err: any) {
      alert(err?.response?.data?.detail || '修改密码失败')
    } finally {
      setPasswordSaving(false)
    }
  }

  const openMembershipModal = (user: User) => {
    setEditUser(user)
    setEditPlan(user.membership_plan || 'monthly')
    if (user.membership_expires_at) {
      setEditExpires(new Date(user.membership_expires_at).toISOString().slice(0, 10))
    } else {
      // Default: 1 year from now
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      setEditExpires(d.toISOString().slice(0, 10))
    }
  }

  const saveMembership = async () => {
    if (!editUser) return
    setEditSaving(true)
    try {
      await api.put(`/admin/users/${editUser.id}/membership`, {
        plan_code: editPlan,
        expires_at: editExpires ? new Date(editExpires + 'T23:59:59Z').toISOString() : null,
      })
      setEditUser(null)
      loadUsers()
    } catch (err) {
      alert('保存失败: ' + (err as any)?.response?.data?.detail || '未知错误')
    } finally {
      setEditSaving(false)
    }
  }

  const roleColors: Record<string, string> = {
    teacher: 'bg-green-100 text-green-700',
    student: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">{t('adminUi.users.title')}</h1>
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder={t('adminUi.users.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
        >
          <option value="">{t('adminUi.users.allRoles')}</option>
          <option value="teacher">{t('adminUi.users.teacher')}</option>
          <option value="student">{t('adminUi.users.student')}</option>
          <option value="admin">{t('adminUi.users.admin')}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('adminUi.users.loading')}</div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-slate-300 w-10">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedIds.size === users.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">{t('adminUi.users.user')}</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">{t('adminUi.users.role')}</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">{t('adminUi.users.status')}</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">会员</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">{t('adminUi.users.createdAt')}</th>
                  <th className="px-4 py-3 text-right text-sm text-slate-300">{t('adminUi.users.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="w-4 h-4 rounded accent-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-slate-400 text-sm">{user.email || user.username || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role.toLowerCase()] || 'bg-slate-100'}`}>
                        {user.role.toUpperCase() === 'ADMIN' ? t('adminUi.users.admin') : user.role.toUpperCase() === 'TEACHER' ? t('adminUi.users.teacher') : t('adminUi.users.student')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active ? t('adminUi.users.active') : t('adminUi.users.disabled')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.role.toUpperCase() === 'TEACHER' ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {user.membership_status && statusLabels[user.membership_status] ? (
                              <>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusLabels[user.membership_status].color}`}>
                                  {statusLabels[user.membership_status].text}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">-</span>
                            )}
                            <button
                              onClick={() => openMembershipModal(user)}
                              className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              设置
                            </button>
                          </div>
                          {user.membership_expires_at && (
                            <span className="text-xs text-slate-400">
                              到期: {new Date(user.membership_expires_at).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(user)}
                        className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-500 rounded-lg mr-1"
                      >
                        {user.is_active ? t('adminUi.users.disable') : t('adminUi.users.enable')}
                      </button>
                      <button
                        onClick={() => setPasswordUser(user)}
                        className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-lg mr-1"
                      >
                        改密
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded-lg"
                      >
                        {t('adminUi.users.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedIds.size > 0 && (
            <div className="mt-4 flex items-center gap-4 p-4 bg-slate-800 rounded-xl">
              <span className="text-slate-300">已选择 <strong>{selectedIds.size}</strong> 个用户</span>
              <button
                onClick={batchDelete}
                disabled={batchDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg disabled:opacity-50"
              >
                {batchDeleting ? '删除中...' : `批量删除 (${selectedIds.size})`}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
              >
                取消选择
              </button>
            </div>
          )}
          <div className="flex justify-between items-center mt-4">
            <p className="text-slate-400">{tWithParams('adminUi.users.total', { count: total })}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50"
              >
                {t('adminUi.users.prev')}
              </button>
              <span className="px-4 py-2 text-slate-400">{tWithParams('adminUi.users.page', { page })}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={users.length < 20}
                className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50"
              >
                {t('adminUi.users.next')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Password change modal */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-1">修改密码</h3>
            <p className="text-sm text-slate-400 mb-6">{passwordUser.name} ({passwordUser.email || passwordUser.username})</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setPasswordUser(null); setNewPassword('') }}
                className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-xl"
              >
                取消
              </button>
              <button
                onClick={changePassword}
                disabled={passwordSaving || !newPassword.trim()}
                className="px-6 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-500 disabled:opacity-50"
              >
                {passwordSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Membership edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-1">设置会员</h3>
            <p className="text-sm text-slate-400 mb-6">{editUser.name} ({editUser.email || editUser.username})</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">会员方案</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white"
                >
                  {MEMBERSHIP_PLANS.map((p) => (
                    <option key={p.code} value={p.code}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">到期时间</label>
                <input
                  type="date"
                  value={editExpires}
                  onChange={(e) => setEditExpires(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">留空表示永不过期</p>
              </div>

              {editUser.membership_status && (
                <div className="bg-slate-700/50 rounded-xl p-3 text-sm text-slate-400">
                  <p>当前状态: <span className="text-white">{statusLabels[editUser.membership_status]?.text || editUser.membership_status}</span></p>
                  {editUser.membership_expires_at && (
                    <p>当前到期: <span className="text-white">{new Date(editUser.membership_expires_at).toLocaleString('zh-CN')}</span></p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-xl"
              >
                取消
              </button>
              <button
                onClick={saveMembership}
                disabled={editSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50"
              >
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
