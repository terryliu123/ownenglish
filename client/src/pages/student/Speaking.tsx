import { useTranslation } from '../../i18n/useTranslation'

export default function Speaking() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">{t('packs.speakingTitle')}</h1>
      <div className="card p-12 text-center">
        <p className="text-muted text-lg">{t('freePractice.title')}</p>
      </div>
    </div>
  )
}
