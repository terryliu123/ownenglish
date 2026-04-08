import { useState, useCallback } from 'react'
import { useTranslation } from '../../../i18n/useTranslation'
import { useDanmuPresets } from '../hooks/useDanmuPresets'
import type { DanmuConfig } from '../types/danmu'

interface DanmuControlProps {
  config: DanmuConfig
  onConfigChange: (config: DanmuConfig) => void
  onTrigger: (content: string) => void
  onClear: () => void
}

export function DanmuControl({ config, onConfigChange, onTrigger, onClear }: DanmuControlProps) {
  const { t } = useTranslation()
  const { presets, addPhrase, removePhrase, addCategory, removeCategory } = useDanmuPresets()
  const [customContent, setCustomContent] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [newPhrase, setNewPhrase] = useState<Record<string, string>>({})
  const [showAddPhrase, setShowAddPhrase] = useState<string | null>(null)

  const handleToggle = useCallback(() => {
    onConfigChange({ ...config, enabled: !config.enabled })
  }, [config, onConfigChange])

  const handleShowStudentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, showStudent: e.target.checked })
  }, [config, onConfigChange])

  const handleShowSourceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, showSource: e.target.checked })
  }, [config, onConfigChange])

  const handleSpeedChange = useCallback((speed: 'slow' | 'medium' | 'fast') => {
    onConfigChange({ ...config, speed })
  }, [config, onConfigChange])

  const handleDensityChange = useCallback((density: 'low' | 'medium' | 'high') => {
    onConfigChange({ ...config, density })
  }, [config, onConfigChange])

  const handleAreaChange = useCallback((area: 'full' | 'bottom' | 'middle') => {
    onConfigChange({ ...config, area })
  }, [config, onConfigChange])

  const handleTriggerCustom = useCallback(() => {
    if (customContent.trim()) {
      onTrigger(customContent.trim())
      setCustomContent('')
    }
  }, [customContent, onTrigger])

  const handlePresetClick = useCallback((phrase: string) => {
    onTrigger(phrase)
  }, [onTrigger])

  const handleAddPhrase = useCallback((categoryId: string) => {
    const phrase = newPhrase[categoryId]?.trim()
    if (phrase) {
      addPhrase(categoryId, phrase)
      setNewPhrase(prev => ({ ...prev, [categoryId]: '' }))
      setShowAddPhrase(null)
    }
  }, [newPhrase, addPhrase])

  const handleAddCategory = useCallback(() => {
    const label = prompt(t('danmu.newCategoryPlaceholder') || '新分类')
    if (label?.trim()) {
      addCategory(label.trim())
    }
  }, [addCategory, t])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-pink-50 to-rose-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎆</span>
          <span className="font-semibold text-gray-800">{t('danmu.control')}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={e => { e.stopPropagation(); handleToggle() }}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.enabled ? 'bg-pink-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                config.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${config.enabled ? 'text-pink-600' : 'text-gray-400'}`}>
            {config.enabled ? t('danmu.enabled') : t('danmu.disabled')}
          </span>
          <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Source filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{t('danmu.source')}:</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.showStudent}
                onChange={handleShowStudentChange}
                className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
              />
              {t('danmu.showStudent')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.showSource}
                onChange={handleShowSourceChange}
                className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
              />
              {t('danmu.showSource')}
            </label>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{t('danmu.speed')}:</span>
            <div className="flex gap-2">
              {(['slow', 'medium', 'fast'] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    config.speed === speed
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t(`danmu.speed_${speed}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{t('danmu.density')}:</span>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(density => (
                <button
                  key={density}
                  onClick={() => handleDensityChange(density)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    config.density === density
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t(`danmu.density_${density}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Area */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{t('danmu.area')}:</span>
            <div className="flex gap-2">
              {(['full', 'bottom', 'middle'] as const).map(area => (
                <button
                  key={area}
                  onClick={() => handleAreaChange(area)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    config.area === area
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t(`danmu.area_${area}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Preset phrases - managed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{t('danmu.presets')}:</span>
              <button
                onClick={handleAddCategory}
                className="text-xs text-pink-500 hover:text-pink-600"
              >
                + {t('danmu.addCategory')}
              </button>
            </div>
            <div className="space-y-3">
              {presets.map(cat => (
                <div key={cat.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                    <button
                      onClick={() => removeCategory(cat.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.phrases.map(phrase => (
                      <div key={phrase} className="group relative">
                        <button
                          onClick={() => handlePresetClick(phrase)}
                          className="px-2 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-600 text-xs hover:bg-pink-100 transition-colors"
                        >
                          {phrase}
                        </button>
                        <button
                          onClick={() => removePhrase(cat.id, phrase)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {showAddPhrase === cat.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newPhrase[cat.id] || ''}
                          onChange={e => setNewPhrase(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddPhrase(cat.id)
                            if (e.key === 'Escape') setShowAddPhrase(null)
                          }}
                          placeholder={t('danmu.phrasePlaceholder') || '输入短语'}
                          className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-pink-400"
                          autoFocus
                        />
                        <button onClick={() => handleAddPhrase(cat.id)} className="text-pink-500 text-xs">✓</button>
                        <button onClick={() => setShowAddPhrase(null)} className="text-gray-400 text-xs">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddPhrase(cat.id)}
                        className="px-2 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 text-xs hover:border-pink-300 hover:text-pink-500 transition-colors"
                      >
                        + {t('danmu.add')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customContent}
              onChange={e => setCustomContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTriggerCustom()
              }}
              placeholder={t('danmu.customPlaceholder')}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400"
            />
            <button
              onClick={handleTriggerCustom}
              disabled={!customContent.trim()}
              className="px-4 py-2 bg-pink-500 text-white text-sm rounded-xl hover:bg-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('danmu.sendToScreen')}
            </button>
          </div>

          {/* Clear button */}
          <div className="flex justify-end">
            <button
              onClick={onClear}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-100 transition-colors"
            >
              {t('danmu.clearAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
