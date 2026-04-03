import { useState } from 'react'
import Layout from '../../components/layout/Layout'
import { useTranslation } from '../../i18n/useTranslation'

const practiceItems = [
  { id: 'greetings', titleKey: 'miscUi.practice.greetingsTitle', description: 'Hello, How are you?', level: 'A1' },
  { id: 'introductions', titleKey: 'miscUi.practice.introductionsTitle', description: 'My name is...', level: 'A1' },
  { id: 'polite', titleKey: 'miscUi.practice.politeTitle', description: 'Could you please...?', level: 'A2' },
  { id: 'directions', titleKey: 'miscUi.practice.directionsTitle', description: 'Where is the...?', level: 'A1' },
]

export default function Practice() {
  const { t } = useTranslation()
  const [, setSelectedItem] = useState<string | null>(null)

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <h2 className="text-2xl font-display font-bold mb-2 text-center">{t('freePractice.title')}</h2>
          <p className="text-center text-gray-500 mb-6">{t('freePractice.subtitle')}</p>

          <div className="space-y-3">
            {practiceItems.map((item) => (
              <div
                key={item.id}
                className="student-card cursor-pointer"
                onClick={() => setSelectedItem(item.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{t(item.titleKey)}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <span className="level-badge">{item.level}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">{t('miscUi.practice.moreComingSoon')}</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
