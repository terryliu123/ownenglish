import { useState } from 'react'
import { api } from '../../services/api'

export default function AdminChangePassword() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: '请填写所有字段' })
      return
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少 6 位' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' })
      return
    }

    setLoading(true)
    try {
      await api.post('/admin/change-password', { old_password: oldPassword, new_password: newPassword })
      setMessage({ type: 'success', text: '密码修改成功' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || '修改失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">修改密码</h2>
      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">当前密码</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">新密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">确认新密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '提交中...' : '确认修改'}
        </button>
      </form>
    </div>
  )
}
