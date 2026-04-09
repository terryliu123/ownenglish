import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import { classService } from '../../services/api'
import { useAppStore } from '../../stores/app-store'

function getJoinErrorMessage(err: any, fallback: string) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') {
    if (detail.includes('full') || detail.includes('60')) return '该班级人数已满，请联系老师处理。'
    return detail
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item: any) => item?.msg || '输入信息有误').join('，')
  }
  if (detail?.message) return detail.message
  if (detail?.msg) return detail.msg
  if (err?.response?.data?.message) return err.response.data.message
  return fallback
}

export default function JoinClass() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAppStore()

  const [code, setCode] = useState('')
  const [studentIdNumber, setStudentIdNumber] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'login' | 'guest'>('login')

  useEffect(() => {
    const queryCode = (searchParams.get('invite_code') || '').trim().toUpperCase()
    const pendingCode = (localStorage.getItem('pending_invite_code') || '').trim().toUpperCase()

    if (queryCode) {
      setCode(queryCode)
      localStorage.setItem('pending_invite_code', queryCode)
    } else if (pendingCode) {
      setCode(pendingCode)
    }

    if (searchParams.get('expired') === '1') {
      setError('游客身份已过期，请重新输入邀请码加入课堂。')
    }

    if (!user) {
      setMode('guest')
    }
  }, [searchParams, user])

  const handleGuestJoin = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const result = await classService.guestJoin({
        invite_code: code.trim().toUpperCase(),
        student_id_number: studentIdNumber.trim(),
        name: name.trim(),
      })

      localStorage.setItem('token', result.access_token)
      if (result.refresh_token) localStorage.setItem('refresh_token', result.refresh_token)
      localStorage.setItem('guest_expires_at', result.expires_at)
      localStorage.setItem('was_guest', 'true')
      localStorage.removeItem('pending_invite_code')

      useAppStore.getState().setToken(result.access_token)
      useAppStore.getState().setUser(result.user)

      setSuccess(true)
      window.setTimeout(() => navigate('/student'), 1400)
    } catch (err: any) {
      setError(getJoinErrorMessage(err, '加入班级失败，请稍后重试。'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleLoginJoin = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await classService.joinByCode(code.trim().toUpperCase())
      localStorage.removeItem('pending_invite_code')
      setSuccess(true)
      window.setTimeout(() => navigate('/student/live'), 1400)
    } catch (err: any) {
      const message = getJoinErrorMessage(err, '加入班级失败，请稍后重试。')
      if (/already enrolled|already in class|已经加入|已在班级/i.test(message)) {
        localStorage.removeItem('pending_invite_code')
        setSuccess(true)
        window.setTimeout(() => navigate('/student/live'), 1000)
        return
      }
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="student-page">
          <div className="student-page-shell">
            <div className="student-panel">
              <div className="student-panel-body flex min-h-[56vh] flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(90,155,110,0.14)] text-[var(--green)]">
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="mt-6 text-3xl font-semibold text-[var(--ink)]">加入成功</h1>
                <p className="mt-3 max-w-md text-sm text-[var(--muted)]">
                  系统正在带你进入课堂主页，稍后即可查看老师发布的课堂任务和互动。
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="student-page">
        <div className="student-page-shell">
          <section className="student-hero">
            <div className="relative z-10 max-w-2xl">
              <p className="eyebrow !mb-2 !text-white/70">加入课堂</p>
              <h1 className="text-3xl font-semibold !text-white">输入邀请码，快速进入老师的课堂</h1>
              <p className="mt-3 text-sm text-white/80">
                已登录同学可直接输入邀请码加入班级。未登录同学也可以先用游客身份进入课堂，再根据需要补全正式账号。
              </p>
            </div>
          </section>

          <section className="student-panel">
            <div className="student-panel-body">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-[var(--ink)]">课堂邀请码</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">邀请码一般由老师提供，也可能已经通过链接自动带入。</p>
              </div>

              {error ? <div className="student-alert error mb-4">{error}</div> : null}

              {user ? (
                <form onSubmit={handleLoginJoin} className="student-form">
                  <div className="student-form-field">
                    <label className="student-form-label">邀请码</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      className="student-input code"
                      placeholder="请输入邀请码"
                      maxLength={8}
                      required
                    />
                  </div>
                  <button type="submit" className="solid-button wide-button" disabled={!code || submitting}>
                    {submitting ? '正在加入…' : '加入班级'}
                  </button>
                </form>
              ) : (
                <>
                  <div className="student-segment mb-5">
                    <button
                      type="button"
                      className={mode === 'guest' ? 'active' : ''}
                      onClick={() => setMode('guest')}
                    >
                      游客加入
                    </button>
                    <button
                      type="button"
                      className={mode === 'login' ? 'active' : ''}
                      onClick={() => {
                        setMode('login')
                        navigate('/login')
                      }}
                    >
                      登录后加入
                    </button>
                  </div>

                  {mode === 'guest' ? (
                    <form onSubmit={handleGuestJoin} className="student-form">
                      <div className="student-form-field">
                        <label className="student-form-label">邀请码</label>
                        <input
                          type="text"
                          value={code}
                          onChange={(event) => setCode(event.target.value.toUpperCase())}
                          className="student-input code"
                          placeholder="请输入邀请码"
                          maxLength={8}
                          required
                        />
                      </div>
                      <div className="student-form-field">
                        <label className="student-form-label">学号或编号</label>
                        <input
                          type="text"
                          value={studentIdNumber}
                          onChange={(event) => setStudentIdNumber(event.target.value)}
                          className="student-input"
                          placeholder="请输入老师要求的学号或编号"
                          required
                        />
                      </div>
                      <div className="student-form-field">
                        <label className="student-form-label">姓名</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          className="student-input"
                          placeholder="请输入你的姓名"
                          required
                        />
                      </div>
                      <div className="student-alert warn">
                        游客身份适合临时上课使用，课堂结束后建议尽快登录正式账号，避免学习记录和班级关系丢失。
                      </div>
                      <button
                        type="submit"
                        className="solid-button wide-button"
                        disabled={!code || !studentIdNumber.trim() || !name.trim() || submitting}
                      >
                        {submitting ? '正在加入…' : '立即加入课堂'}
                      </button>
                    </form>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[rgba(24,36,58,0.14)] px-5 py-8 text-center">
                      <p className="text-sm text-[var(--muted)]">登录后可以保留课堂记录、学习进度和班级关系。</p>
                      <div className="mt-4">
                        <button type="button" className="ghost-button" onClick={() => navigate('/login')}>
                          前往登录
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}
