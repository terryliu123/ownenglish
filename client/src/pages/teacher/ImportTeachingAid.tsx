import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { teachingAidService } from '../../services/api'

export default function ImportTeachingAid() {
  const { shareCode } = useParams<{ shareCode: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importedAid, setImportedAid] = useState<{ name: string } | null>(null)

  useEffect(() => {
    if (!shareCode) {
      setError('无效的分享码')
      setLoading(false)
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setError('请先登录后再导入教具')
      setLoading(false)
      return
    }

    // Auto import
    teachingAidService.importByShareCode(shareCode)
      .then((aid) => {
        setImportedAid({ name: aid.name })
        setLoading(false)
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || '导入失败'
        setError(msg)
        setLoading(false)
      })
  }, [shareCode])

  if (loading) {
    return (
      <Layout sidebar={null}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-slate-600">导入中...</div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout sidebar={null}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h2 className="mb-2 text-lg font-semibold text-red-700">导入失败</h2>
            <p className="mb-6 text-sm text-red-600">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-400"
              >
                登录
              </button>
              <button
                onClick={() => navigate('/teacher/teaching-aids')}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                返回教具库
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (importedAid) {
    return (
      <Layout sidebar={null}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="mb-4 text-4xl">✅</div>
            <h2 className="mb-2 text-lg font-semibold text-green-700">导入成功</h2>
            <p className="mb-6 text-sm text-green-600">
              教具「{importedAid.name}」已成功导入到您的教具库
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate('/teacher/teaching-aids?tab=mine')}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-400"
              >
                查看我的教具
              </button>
              <button
                onClick={() => navigate('/teacher/teaching-aids')}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                返回教具库
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return null
}
