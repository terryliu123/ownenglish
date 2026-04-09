import { useEffect, useMemo, useState } from 'react'
import { adminService, type AdminMembershipPlanConfig, type AdminWeChatPaySettingItem } from '../../services/api'
import { useTranslation } from '../../i18n/useTranslation'

type PlanFormState = {
  name: string
  description: string
  price_cents: string
  duration_days: string
  max_classes: string
  max_students_per_class: string
  max_task_groups: string
  max_study_packs: string
  can_use_ai: boolean
  is_active: boolean
  sort_order: string
}

function toPlanForm(plan: AdminMembershipPlanConfig): PlanFormState {
  return {
    name: plan.name ?? '',
    description: plan.description ?? '',
    price_cents: plan.price_cents != null ? String(plan.price_cents) : '',
    duration_days: plan.duration_days != null ? String(plan.duration_days) : '',
    max_classes: plan.max_classes != null ? String(plan.max_classes) : '',
    max_students_per_class: plan.max_students_per_class != null ? String(plan.max_students_per_class) : '',
    max_task_groups: plan.max_task_groups != null ? String(plan.max_task_groups) : '',
    max_study_packs: plan.max_study_packs != null ? String(plan.max_study_packs) : '',
    can_use_ai: Boolean(plan.can_use_ai),
    is_active: Boolean(plan.is_active),
    sort_order: plan.sort_order != null ? String(plan.sort_order) : '0',
  }
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export default function AdminMembershipSettings() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<AdminMembershipPlanConfig[]>([])
  const [planForms, setPlanForms] = useState<Record<string, PlanFormState>>({})
  const [wechatSettings, setWechatSettings] = useState<AdminWeChatPaySettingItem[]>([])
  const [wechatForm, setWechatForm] = useState<Record<string, string>>({})
  const [savingPlanCode, setSavingPlanCode] = useState<string | null>(null)
  const [savingWechat, setSavingWechat] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    void loadConfig()
  }, [])

  async function loadConfig() {
    try {
      setLoading(true)
      setErrorMessage('')
      const data = await adminService.getMembershipConfig()
      setPlans(data.plans)
      setPlanForms(
        Object.fromEntries(data.plans.map((plan) => [plan.code, toPlanForm(plan)])),
      )
      setWechatSettings(data.wechat_pay_settings)
      setWechatForm(
        Object.fromEntries(data.wechat_pay_settings.map((item) => [item.key, item.value ?? ''])),
      )
    } catch (error) {
      console.error('Failed to load admin membership config:', error)
      setErrorMessage(t('adminMembership.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  function updatePlanField(planCode: string, field: keyof PlanFormState, value: string | boolean) {
    setPlanForms((current) => ({
      ...current,
      [planCode]: {
        ...current[planCode],
        [field]: value,
      },
    }))
  }

  async function savePlan(planCode: string) {
    const form = planForms[planCode]
    if (!form) return

    try {
      setSavingPlanCode(planCode)
      setMessage('')
      setErrorMessage('')
      const updated = await adminService.updateMembershipPlan(planCode, {
        name: form.name.trim(),
        description: form.description.trim(),
        price_cents: Number(form.price_cents || 0),
        duration_days: toNullableNumber(form.duration_days),
        max_classes: toNullableNumber(form.max_classes),
        max_students_per_class: toNullableNumber(form.max_students_per_class),
        max_task_groups: toNullableNumber(form.max_task_groups),
        max_study_packs: toNullableNumber(form.max_study_packs),
        can_use_ai: form.can_use_ai,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
      })
      setPlans((current) => current.map((plan) => (plan.code === planCode ? updated : plan)))
      setPlanForms((current) => ({ ...current, [planCode]: toPlanForm(updated) }))
      setMessage(t('adminMembership.planSaved'))
    } catch (error) {
      console.error('Failed to save membership plan:', error)
      setErrorMessage(t('adminMembership.planSaveFailed'))
    } finally {
      setSavingPlanCode(null)
    }
  }

  async function saveWechatSettings() {
    try {
      setSavingWechat(true)
      setMessage('')
      setErrorMessage('')
      const result = await adminService.updateWeChatPaySettings(wechatForm)
      setWechatSettings(result.wechat_pay_settings)
      setWechatForm(
        Object.fromEntries(result.wechat_pay_settings.map((item) => [item.key, item.value ?? ''])),
      )
      setMessage(t('adminMembership.wechatSaved'))
    } catch (error) {
      console.error('Failed to save wechat pay settings:', error)
      setErrorMessage(t('adminMembership.wechatSaveFailed'))
    } finally {
      setSavingWechat(false)
    }
  }

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [plans],
  )

  if (loading) {
    return <div className="p-8 text-center text-slate-300">{t('adminMembership.loading')}</div>
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('adminMembership.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('adminMembership.subtitle')}</p>
        </div>
        <button
          className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          onClick={() => void loadConfig()}
        >
          {t('adminMembership.refresh')}
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{t('adminMembership.planSection')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('adminMembership.planSectionHint')}</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          {sortedPlans.map((plan) => {
            const form = planForms[plan.code]
            if (!form) return null
            const isSaving = savingPlanCode === plan.code
            return (
              <article key={plan.code} className="rounded-3xl border border-slate-700 bg-slate-800/80 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{plan.code}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{form.name || plan.code}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${form.is_active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-700 text-slate-300'}`}>
                    {form.is_active ? t('adminMembership.active') : t('adminMembership.inactive')}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.name')}</span>
                    <input
                      value={form.name}
                      onChange={(event) => updatePlanField(plan.code, 'name', event.target.value)}
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.description')}</span>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) => updatePlanField(plan.code, 'description', event.target.value)}
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.priceCents')}</span>
                      <input
                        value={form.price_cents}
                        onChange={(event) => updatePlanField(plan.code, 'price_cents', event.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.durationDays')}</span>
                      <input
                        value={form.duration_days}
                        onChange={(event) => updatePlanField(plan.code, 'duration_days', event.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                        placeholder={t('adminMembership.unlimitedPlaceholder')}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.maxClasses')}</span>
                      <input
                        value={form.max_classes}
                        onChange={(event) => updatePlanField(plan.code, 'max_classes', event.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                        placeholder={t('adminMembership.unlimitedPlaceholder')}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.maxStudentsPerClass')}</span>
                      <input
                        value={form.max_students_per_class}
                        onChange={(event) => updatePlanField(plan.code, 'max_students_per_class', event.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                        placeholder={t('adminMembership.unlimitedPlaceholder')}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.maxTaskGroups')}</span>
                      <input
                        value={form.max_task_groups}
                        onChange={(event) => updatePlanField(plan.code, 'max_task_groups', event.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                        placeholder={t('adminMembership.unlimitedPlaceholder')}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.maxStudyPacks')}</span>
                      <input
                        value={form.max_study_packs}
                        onChange={(event) => updatePlanField(plan.code, 'max_study_packs', event.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                        placeholder={t('adminMembership.unlimitedPlaceholder')}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-300">{t('adminMembership.fields.sortOrder')}</span>
                    <input
                      value={form.sort_order}
                      onChange={(event) => updatePlanField(plan.code, 'sort_order', event.target.value)}
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={form.can_use_ai}
                        onChange={(event) => updatePlanField(plan.code, 'can_use_ai', event.target.checked)}
                      />
                      <div>
                        <span>{t('adminMembership.fields.canUseAi')}</span>
                        <p className="text-xs text-slate-500 mt-0.5">胖鼠AI副班 + 胖鼠学习助手 + 大屏互动不限</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) => updatePlanField(plan.code, 'is_active', event.target.checked)}
                      />
                      <span>{t('adminMembership.fields.isActive')}</span>
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void savePlan(plan.code)}
                    disabled={isSaving}
                  >
                    {isSaving ? t('adminMembership.saving') : t('adminMembership.savePlan')}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-800/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{t('adminMembership.wechatSection')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('adminMembership.wechatSectionHint')}</p>
          </div>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void saveWechatSettings()}
            disabled={savingWechat}
          >
            {savingWechat ? t('adminMembership.saving') : t('adminMembership.saveWechat')}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {wechatSettings.map((item) => (
            <label key={item.key} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-200">{item.key}</span>
              <span className="mb-2 block text-xs text-slate-400">{item.description}</span>
              {item.key.includes('PRIVATE_KEY') || item.key.includes('PUBLIC_KEY') ? (
                <textarea
                  rows={4}
                  value={wechatForm[item.key] ?? ''}
                  onChange={(event) => setWechatForm((current) => ({ ...current, [item.key]: event.target.value }))}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                  placeholder={item.is_secret ? t('adminMembership.secretPlaceholder') : ''}
                />
              ) : (
                <input
                  type={item.is_secret ? 'password' : 'text'}
                  value={wechatForm[item.key] ?? ''}
                  onChange={(event) => setWechatForm((current) => ({ ...current, [item.key]: event.target.value }))}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                  placeholder={item.is_secret ? t('adminMembership.secretPlaceholder') : ''}
                />
              )}
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
