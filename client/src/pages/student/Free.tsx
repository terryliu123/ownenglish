import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { useTranslation } from '../../i18n/useTranslation'
import { freePracticeService } from '../../services/api'

interface Category {
  id: string
  name: string
  name_en: string
  level: string
  icon: string
  description: string
  exercise_count: number
}

interface Exercise {
  id: string
  type: 'vocabulary' | 'sentence'
  question: string
  options?: string[]
  correct?: number
  answer?: string
  translation?: string
}

type View = 'categories' | 'category' | 'exercise'

export default function Free() {
  const { t, tWithParams } = useTranslation()
  const [view, setView] = useState<View>('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [sentenceAnswer, setSentenceAnswer] = useState('')
  const [result, setResult] = useState<{ is_correct: boolean; correct_answer?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const data = await freePracticeService.getCategories()
      setCategories(data)
    } catch (e) {
      console.error('Failed to load categories:', e)
    } finally {
      setLoading(false)
    }
  }

  async function selectCategory(categoryId: string) {
    try {
      const data = await freePracticeService.getCategory(categoryId)
      setSelectedCategory(data)
      setView('category')
      setCurrentExerciseIndex(0)
      setSelectedAnswer(null)
      setSentenceAnswer('')
      setResult(null)
    } catch (e) {
      console.error('Failed to load category:', e)
    }
  }

  async function submitAnswer() {
    if (!selectedCategory) return

    const exercise = selectedCategory.exercises[currentExerciseIndex]
    const answer = exercise.type === 'vocabulary' ? (selectedAnswer || '') : sentenceAnswer
    if (!answer) return

    try {
      const data = await freePracticeService.submitAnswer(selectedCategory.id, exercise.id, answer)
      setResult(data)
    } catch (e) {
      console.error('Failed to submit answer:', e)
    }
  }

  function nextExercise() {
    if (currentExerciseIndex < selectedCategory.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setSelectedAnswer(null)
      setSentenceAnswer('')
      setResult(null)
    } else {
      setView('categories')
      setSelectedCategory(null)
    }
  }

  function backToCategories() {
    setView('categories')
    setSelectedCategory(null)
  }

  function backToCategory() {
    setView('category')
    setCurrentExerciseIndex(0)
    setSelectedAnswer(null)
    setSentenceAnswer('')
    setResult(null)
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted">{t('common.loading')}</p>
        </div>
      </Layout>
    )
  }

  if (view === 'categories') {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white">
          <div className="max-w-lg mx-auto px-4 py-6">
            <h1 className="text-2xl font-display font-bold mb-2">{t('freePractice.title')}</h1>
            <p className="text-gray-500 mb-6">{t('freePractice.subtitle')}</p>

            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="student-card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => selectCategory(cat.id)}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="text-xs text-gray-500">{cat.name_en}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="level-badge">{cat.level}</span>
                    <span className="text-xs text-gray-400">{tWithParams('miscUi.freePractice.countSuffix', { count: cat.exercise_count })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (view === 'category' && selectedCategory) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white">
          <div className="max-w-lg mx-auto px-4 py-6">
            <button className="ghost-button mb-4" onClick={backToCategories}>
              {tWithParams('miscUi.freePractice.backWithArrow', { label: t('common.back') })}
            </button>

            <div className="text-center mb-6">
              <span className="text-5xl">{selectedCategory.icon}</span>
              <h1 className="text-2xl font-display font-bold mt-2">{selectedCategory.name}</h1>
              <p className="text-gray-500">{selectedCategory.description}</p>
              <span className="level-badge mt-2">{selectedCategory.level}</span>
            </div>

            <div className="space-y-3">
              <p className="font-semibold">{tWithParams('miscUi.freePractice.startWithCount', { label: t('freePractice.start'), count: selectedCategory.exercises.length })}</p>
              {selectedCategory.exercises.map((ex: Exercise, idx: number) => (
                <div key={ex.id} className="student-card">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-500 mr-2">{idx + 1}.</span>
                      <span>{ex.type === 'vocabulary' ? t('freePractice.vocabulary') : t('freePractice.sentence')}</span>
                    </div>
                    {ex.type === 'vocabulary' && ex.options && <span className="text-sm text-gray-500">{t('packs.selectTranslation')}</span>}
                    {ex.type === 'sentence' && <span className="text-sm text-gray-500">{t('packs.translationPractice')}</span>}
                  </div>
                </div>
              ))}
            </div>

            <button className="solid-button wide-button mt-6" onClick={() => setView('exercise')}>
              {t('freePractice.start')}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (view === 'exercise' && selectedCategory) {
    const exercise = selectedCategory.exercises[currentExerciseIndex]
    const totalExercises = selectedCategory.exercises.length

    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white">
          <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-4">
              <button className="ghost-button" onClick={backToCategory}>
                {tWithParams('miscUi.freePractice.exitWithArrow', { label: t('freePractice.exit') })}
              </button>
              <span className="text-sm text-gray-500">{currentExerciseIndex + 1} / {totalExercises}</span>
            </div>

            <div className="progress-bar mb-6">
              <div className="progress-fill" style={{ width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%` }} />
            </div>

            <div className="student-card mb-4">
              <div className="text-center mb-4">
                <span className="text-4xl">{selectedCategory.icon}</span>
                <p className="text-sm text-gray-500 mt-2">{selectedCategory.name}</p>
              </div>

              <div className="callout-card mb-4">
                <p className="text-lg font-medium">{exercise.question}</p>
                {exercise.translation && <p className="text-sm text-gray-500 mt-1">{exercise.translation}</p>}
              </div>

              {exercise.type === 'vocabulary' && exercise.options && (
                <div className="space-y-2">
                  {exercise.options.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      className={`option-btn ${selectedAnswer === String(idx) ? 'selected' : ''}`}
                      onClick={() => !result && setSelectedAnswer(String(idx))}
                      disabled={!!result}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {exercise.type === 'sentence' && (
                <div>
                  <textarea
                    className="input w-full"
                    placeholder={t('freePractice.inputPlaceholder')}
                    value={sentenceAnswer}
                    onChange={(e) => !result && setSentenceAnswer(e.target.value)}
                    disabled={!!result}
                    rows={3}
                  />
                </div>
              )}

              {result && (
                <div className={`result-card ${result.is_correct ? 'correct' : 'incorrect'}`}>
                  <div className="text-center">
                    {result.is_correct ? (
                      <span className="text-green-600 text-2xl">{t('freePractice.correct')}</span>
                    ) : (
                      <>
                        <span className="text-red-600 text-2xl">{t('freePractice.tryAgain')}</span>
                        {result.correct_answer && <p className="mt-2">{t('freePractice.correctAnswer').replace('{{answer}}', result.correct_answer)}</p>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center">
              {!result ? (
                <button
                  className="solid-button wide-button"
                  onClick={submitAnswer}
                  disabled={exercise.type === 'vocabulary' ? !selectedAnswer : !sentenceAnswer.trim()}
                >
                  {t('packs.submitAnswer')}
                </button>
              ) : (
                <button className="solid-button wide-button" onClick={nextExercise}>
                  {currentExerciseIndex < totalExercises - 1 ? t('freePractice.next') : t('freePractice.complete')}
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return null
}
