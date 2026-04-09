import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

interface InvitationCode {
  id: string
  code: string
  is_active: boolean
  used_count: number
  notes: string | null
  created_at: string
}

interface CodeUser {
  id: string
  name: string
  email: string | null
  role: string
  created_at: string
}

export default function AdminInvitationCodes() {
  const { t: _t } = useTranslation()
  const [codes, setCodes] = useState<InvitationCode[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  // Users modal
  const [usersCode, setUsersCode] = useState<{ code: string; users: CodeUser[] } | null>(null)
  const [usersLoading, setUsersLoading] = useState(false)

  // Create
  const [creating, setCreating] = useState(false)
  const [newNotes, setNewNotes] = useState('')

  const loadCodes = () => {
    setLoading(true)
    api.get('/admin/invitation-codes', { params: { limit: pageSize, offset } }).then((res) => {
      setCodes(res.data.items)
      setTotal(res.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadCodes() }, [offset])

  const createCode = async () => {
    setCreating(true)
    try {
      await api.post('/admin/invitation-codes', { notes: newNotes || undefined })
      setNewNotes('')
      loadCodes()
    } catch (err: any) {
      alert(err?.response?.data?.detail || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (code: InvitationCode) => {
    try {
      await api.patch(`/admin/invitation-codes/${code.id}`, null, {
        params: { is_active: !code.is_active },
      })
      loadCodes()
    } catch (err: any) {
      alert(err?.response?.data?.detail || '操作失败')
    }
  }

  const deleteCode = async (code: InvitationCode) => {
    if (!confirm(`确定删除邀请码「${code.code}」吗？`)) return
    try {
      await api.delete(`/admin/invitation-codes/${code.id}`)
      loadCodes()
    } catch (err: any) {
      alert(err?.response?.data?.detail || '删除失败')
    }
  }

  const viewUsers = async (code: InvitationCode) => {
    setUsersLoading(true)
    try {
      const res = await api.get(`/admin/invitation-codes/${code.id}/users`)
      setUsersCode({ code: res.data.code, users: res.data.users })
    } catch (err: any) {
      alert(err?.response?.data?.detail || '查询失败')
    } finally {
      setUsersLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">邀请码管理</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="备注（选填）"
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
          />
          <button
            onClick={createCode}
            disabled={creating}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 text-sm font-medium"
          >
            {creating ? '创建中...' : '创建邀请码'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">邀请码</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">状态</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">已使用</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">备注</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-300">创建时间</th>
                  <th className="px-4 py-3 text-right text-sm text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">暂无邀请码</td>
                  </tr>
                ) : (
                  codes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <span className="text-white font-mono font-bold tracking-wider text-sm bg-slate-700 px-2 py-1 rounded">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                          {c.is_active ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{c.used_count}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm max-w-[200px] truncate">{c.notes || '-'}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {new Date(c.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => viewUsers(c)}
                          className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-500 rounded-lg mr-1"
                        >
                          用户
                        </button>
                        <button
                          onClick={() => toggleActive(c)}
                          className={`px-3 py-1 text-sm rounded-lg mr-1 ${c.is_active ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}
                        >
                          {c.is_active ? '停用' : '启用'}
                        </button>
                        <button
                          onClick={() => deleteCode(c)}
                          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded-lg"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-slate-400">共 {total} 条</p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
                disabled={offset === 0}
                className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-slate-400">第 {Math.floor(offset / pageSize) + 1} 页</span>
              <button
                onClick={() => setOffset((o) => o + pageSize)}
                disabled={codes.length < pageSize}
                className="px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}

      {/* Users modal */}
      {usersCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">邀请码用户 - {usersCode.code}</h3>
              <button
                onClick={() => setUsersCode(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            {usersLoading ? (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            ) : usersCode.users.length === 0 ? (
              <p className="text-slate-500 text-center py-8">暂无用户使用此邀请码</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-3 py-2 text-left text-sm text-slate-400">用户名</th>
                    <th className="px-3 py-2 text-left text-sm text-slate-400">邮箱</th>
                    <th className="px-3 py-2 text-left text-sm text-slate-400">角色</th>
                    <th className="px-3 py-2 text-left text-sm text-slate-400">注册时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {usersCode.users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-3 py-2 text-white text-sm">{u.name}</td>
                      <td className="px-3 py-2 text-slate-400 text-sm">{u.email || '-'}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-900 text-green-200">
                          {u.role?.toUpperCase() === 'TEACHER' ? '教师' : u.role?.toUpperCase() === 'STUDENT' ? '学生' : u.role || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-sm">
                        {new Date(u.created_at).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
