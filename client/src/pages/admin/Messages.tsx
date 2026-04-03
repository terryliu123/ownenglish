import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { api } from '../../services/api'

export default function AdminMessages() {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/messages').then((res) => {
      setMessages(res.data.items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post('/admin/messages', { title, content, target_role: targetRole || null })
      alert(t('adminUi.messages.sendSuccess'))
      setTitle('')
      setContent('')
      setTargetRole('')
      const res = await api.get('/admin/messages')
      setMessages(res.data.items)
    } catch {
      alert(t('adminUi.messages.sendFailed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">{t('adminUi.messages.title')}</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium text-white mb-4">{t('adminUi.messages.newMessage')}</h2>
          <form onSubmit={sendMessage} className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('adminUi.messages.titlePlaceholder')}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
              required
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('adminUi.messages.contentPlaceholder')}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
              required
            />
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white"
            >
              <option value="">{t('adminUi.messages.allUsers')}</option>
              <option value="teacher">{t('adminUi.messages.teachersOnly')}</option>
              <option value="student">{t('adminUi.messages.studentsOnly')}</option>
            </select>
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? t('adminUi.messages.sending') : t('adminUi.messages.send')}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-medium text-white mb-4">{t('adminUi.messages.history')}</h2>
          {loading ? (
            <div className="text-slate-400">{t('adminUi.messages.loading')}</div>
          ) : messages.length === 0 ? (
            <div className="text-slate-400">{t('adminUi.messages.empty')}</div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <p className="font-medium text-white">{msg.title}</p>
                  <p className="text-slate-400 text-sm mt-1">{msg.content}</p>
                  <p className="text-slate-500 text-xs mt-2">
                    {new Date(msg.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
