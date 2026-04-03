import { ReactNode } from 'react'
import { TipTapEditor } from '../../components/editor/TipTapEditor'
import { LiveTaskData } from '../../services/api'
import {
  isReadingType,
  isExperimentTask,
  taskSupportsAnswerRequiredToggle,
  taskSupportsBlanks,
  taskSupportsExternalUrl,
  taskSupportsPairs,
  taskSupportsPassage,
  taskSupportsSorting,
  taskUsesBooleanAnswer,
} from './task-config'
import { getTaskTypeLabel, getTaskTypesForMode, shouldShowChoiceOptions } from './task-helpers'
import { EMPTY_TIPTAP_DOC } from './task-editing'

export function ManualTaskComposer({
  t,
  taskMode,
  manualType,
  setManualType,
  manualText,
  setManualText,
  manualPassage,
  setManualPassage,
  manualPrompt,
  setManualPrompt,
  manualAnswerRequired,
  setManualAnswerRequired,
  manualOptions,
  setManualOptions,
  manualAnswer,
  setManualAnswer,
  manualHtmlUrl,
  setManualHtmlUrl,
  manualBlanks,
  setManualBlanks,
  manualPairs,
  setManualPairs,
  loading,
  onSubmit,
  moveManualOption,
}: {
  t: (key: string) => string
  taskMode: 'objective' | 'reading'
  manualType: string
  setManualType: (value: string) => void
  manualText: Record<string, unknown>
  setManualText: (value: Record<string, unknown>) => void
  manualPassage: Record<string, unknown>
  setManualPassage: (value: Record<string, unknown>) => void
  manualPrompt: Record<string, unknown>
  setManualPrompt: (value: Record<string, unknown>) => void
  manualAnswerRequired: boolean
  setManualAnswerRequired: (value: boolean) => void
  manualOptions: string[]
  setManualOptions: (value: string[]) => void
  manualAnswer: string
  setManualAnswer: (value: string) => void
  manualHtmlUrl: string
  setManualHtmlUrl: (value: string) => void
  manualBlanks: string[]
  setManualBlanks: (value: string[]) => void
  manualPairs: Array<{ left: string; right: string }>
  setManualPairs: (value: Array<{ left: string; right: string }>) => void
  loading: boolean
  onSubmit: () => void
  moveManualOption: (index: number, direction: 'up' | 'down') => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroup.taskType')}</label>
        <div className="flex gap-2 flex-wrap">
          {getTaskTypesForMode(taskMode).map((item) => (
            <button
              key={item.id}
              onClick={() => setManualType(item.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                manualType === item.id ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200 hover:border-blue-300'
              }`}
            >
              {item.icon} {getTaskTypeLabel(item.id, t)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {isReadingType(manualType) ? t('taskGroupReading.readingTitleLabel') : t('taskGroup.question')}
        </label>
        <TipTapEditor
          content={manualText}
          onChange={(content) => setManualText(content)}
          placeholder={isReadingType(manualType) ? t('taskGroupReading.readingTitlePlaceholder') : t('taskEditor.questionContentPlaceholder')}
        />
      </div>

      {taskSupportsPassage(manualType) && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroupReading.readingPassageLabel')}</label>
            <TipTapEditor
              content={manualPassage}
              onChange={(content) => setManualPassage(content)}
              placeholder={t('taskGroupReading.readingPassagePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroupReading.readingPromptLabel')}</label>
            <TipTapEditor
              content={manualPrompt}
              onChange={(content) => setManualPrompt(content)}
              placeholder={t('taskGroupReading.readingPromptPlaceholder')}
            />
          </div>
          {taskSupportsAnswerRequiredToggle(manualType) && (
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={manualAnswerRequired}
                onChange={(event) => setManualAnswerRequired(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-200"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">{t('taskGroupReading.readingAnswerRequiredLabel')}</p>
                <p className="text-xs text-slate-500">{t('taskGroupReading.readingAnswerOptionalHint')}</p>
              </div>
            </label>
          )}
        </>
      )}

      {taskSupportsExternalUrl(manualType) && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroupReading.experimentUrlLabel')}</label>
            <input
              type="url"
              value={manualHtmlUrl}
              onChange={(event) => setManualHtmlUrl(event.target.value)}
              placeholder={t('taskGroupReading.experimentUrlPlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
            />
            {manualHtmlUrl && (
              <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                <iframe
                  src={manualHtmlUrl}
                  className="w-full"
                  style={{ minHeight: 300, border: 'none' }}
                  title="Experiment preview"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                />
              </div>
            )}
          </div>
          {taskSupportsAnswerRequiredToggle(manualType) && (
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={manualAnswerRequired}
                onChange={(event) => setManualAnswerRequired(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-200"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">{t('taskGroupReading.experimentAnswerRequiredLabel')}</p>
                <p className="text-xs text-slate-500">{t('taskGroupReading.experimentAnswerOptionalHint')}</p>
              </div>
            </label>
          )}
        </>
      )}

      {shouldShowChoiceOptions(manualType) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskGroup.options')}</label>
          {taskSupportsSorting(manualType) && (
            <p className="text-xs text-slate-500 mb-2">{t('taskSorting.orderHint')}</p>
          )}
          <div className="space-y-2">
            {manualOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-sm font-medium">
                  {taskSupportsSorting(manualType) ? index + 1 : String.fromCharCode(65 + index)}
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(event) => {
                    const nextOptions = [...manualOptions]
                    nextOptions[index] = event.target.value
                    setManualOptions(nextOptions)
                  }}
                  placeholder={taskSupportsSorting(manualType)
                    ? t('taskEditor.sortingItemPlaceholder').replace('{{index}}', String(index + 1))
                    : t('taskGroup.optionPlaceholder').replace('{{index}}', String.fromCharCode(65 + index))}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                />
                {taskSupportsSorting(manualType) && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveManualOption(index, 'up')}
                      disabled={index === 0}
                      className="px-2 py-2 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                    >
                      {t('taskSorting.moveUp')}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveManualOption(index, 'down')}
                      disabled={index === manualOptions.length - 1}
                      className="px-2 py-2 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                    >
                      {t('taskSorting.moveDown')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {taskSupportsBlanks(manualType) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskLiveUI.fillBlankAnswers')}</label>
          <div className="space-y-2">
            {manualBlanks.map((blank, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={blank}
                  onChange={(event) => {
                    const next = [...manualBlanks]
                    next[index] = event.target.value
                    setManualBlanks(next)
                  }}
                  placeholder={t('taskLiveUI.enterAnswer')}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                />
                {manualBlanks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setManualBlanks(manualBlanks.filter((_, i) => i !== index))}
                    className="px-2 py-2 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setManualBlanks([...manualBlanks, ''])}
            className="mt-2 px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg border border-blue-200"
          >
            + {t('taskEditor.addBlank') || '添加空格'}
          </button>
        </div>
      )}

      {taskSupportsPairs(manualType) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('taskLiveUI.matchingResult') || '配对项'}</label>
          <div className="space-y-2">
            {manualPairs.map((pair, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={pair.left}
                  onChange={(event) => {
                    const next = [...manualPairs]
                    next[index] = { ...next[index], left: event.target.value }
                    setManualPairs(next)
                  }}
                  placeholder={t('taskLiveUI.leftSide') || '左侧'}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                />
                <span className="text-slate-400">↔</span>
                <input
                  type="text"
                  value={pair.right}
                  onChange={(event) => {
                    const next = [...manualPairs]
                    next[index] = { ...next[index], right: event.target.value }
                    setManualPairs(next)
                  }}
                  placeholder={t('taskLiveUI.rightSideMatch') || '右侧'}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                />
                {manualPairs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setManualPairs(manualPairs.filter((_, i) => i !== index))}
                    className="px-2 py-2 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setManualPairs([...manualPairs, { left: '', right: '' }])}
            className="mt-2 px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg border border-blue-200"
          >
            + {t('taskEditor.addPair') || '添加配对'}
          </button>
        </div>
      )}

      {!taskSupportsSorting(manualType) && !taskSupportsBlanks(manualType) && !taskSupportsPairs(manualType) && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {isReadingType(manualType) ? t('taskGroupReading.readingReferenceAnswerLabel') : t('taskGroup.correctAnswer_label')}
            </label>
            {taskUsesBooleanAnswer(manualType) ? (
              <select
                value={manualAnswer}
                onChange={(event) => setManualAnswer(event.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="true">{t('taskEditor.trueOption')}</option>
                <option value="false">{t('taskEditor.falseOption')}</option>
              </select>
            ) : (
              <input
                type="text"
                value={manualAnswer}
                onChange={(event) => setManualAnswer(event.target.value)}
                placeholder={isReadingType(manualType) ? t('taskGroupReading.readingReferenceAnswerPlaceholder') : t('taskEditor.exampleAnswer')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                disabled={isReadingType(manualType) && !manualAnswerRequired}
              />
            )}
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {loading ? t('taskEditor.saving') : t('taskEditor.addAndNext')}
      </button>
    </div>
  )
}

export function TaskPreviewEditForm({
  t,
  editTask,
  setEditTask,
  renderReadingEditor,
  renderMatchingEditor,
  renderFillBlankEditor,
  renderGenericAnswerEditor,
  hasOptions,
  isReading,
  updateOption,
  moveOption,
  onSave,
  onCancel,
}: {
  t: (key: string) => string
  editTask: LiveTaskData | null
  setEditTask: (value: LiveTaskData | null) => void
  renderReadingEditor: () => ReactNode
  renderMatchingEditor: () => ReactNode
  renderFillBlankEditor: () => ReactNode
  renderGenericAnswerEditor: () => ReactNode
  hasOptions: boolean
  isReading: boolean
  updateOption: (index: number, value: string) => void
  moveOption: (index: number, direction: 'up' | 'down') => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <TipTapEditor
        content={((editTask?.question as any)?.text && typeof (editTask?.question as any)?.text === 'object')
          ? (editTask?.question as any).text as Record<string, unknown>
          : EMPTY_TIPTAP_DOC}
        onChange={(content) => setEditTask(editTask ? {
          ...editTask,
          question: { ...editTask.question, text: content },
        } : null)}
        placeholder={t('taskEditor.questionContentPlaceholder')}
      />

      {isReading && renderReadingEditor()}

      {isExperimentTask(editTask) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('taskGroupReading.experimentUrlLabel')}</label>
          <input
            type="url"
            value={String((editTask?.question as any)?.html_url || '')}
            onChange={(event) => setEditTask(editTask ? {
              ...editTask,
              question: { ...editTask.question, html_url: event.target.value },
            } : null)}
            placeholder={t('taskGroupReading.experimentUrlPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-sm"
          />
        </div>
      )}

      {hasOptions && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">{t('taskGroup.options')}</label>
          {taskSupportsSorting(editTask?.type || '') && (
            <p className="text-xs text-slate-500">{t('taskSorting.orderHint')}</p>
          )}
          {(editTask?.question as any)?.options?.map((option: any, optionIndex: number) => (
            <div key={option.key} className="flex items-center gap-2">
              <span className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs font-medium">
                {taskSupportsSorting(editTask?.type || '') ? optionIndex + 1 : option.key}
              </span>
              <input
                type="text"
                value={option.text}
                onChange={(event) => updateOption(optionIndex, event.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
              />
              {taskSupportsSorting(editTask?.type || '') && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveOption(optionIndex, 'up')}
                    disabled={optionIndex === 0}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                  >
                    {t('taskSorting.moveUp')}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOption(optionIndex, 'down')}
                    disabled={optionIndex === ((editTask?.question as any)?.options?.length || 1) - 1}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                  >
                    {t('taskSorting.moveDown')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {renderMatchingEditor()}
      {renderFillBlankEditor()}
      {renderGenericAnswerEditor()}

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
        >
          {t('common.save')}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-slate-600 text-sm hover:bg-slate-200 rounded-lg"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
