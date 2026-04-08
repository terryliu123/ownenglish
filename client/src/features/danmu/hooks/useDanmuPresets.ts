import { useState, useCallback } from 'react'

export interface DanmuPresetCategory {
  id: string
  label: string
  phrases: string[]
}

const STORAGE_KEY = 'danmu_presets'

const DEFAULT_PRESETS: DanmuPresetCategory[] = [
  {
    id: 'encourage',
    label: '鼓励',
    phrases: ['太棒了！', '加油！', '答对了！', '真厉害！'],
  },
  {
    id: '互动',
    label: '互动',
    phrases: ['准备好了吗？', '来看下一题！', '注意听讲！'],
  },
  {
    id: 'praise',
    label: '表扬',
    phrases: ['全对！', '继续保持！', '太优秀了！'],
  },
]

function loadPresets(): DanmuPresetCategory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore
  }
  return DEFAULT_PRESETS
}

function savePresets(presets: DanmuPresetCategory[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function useDanmuPresets() {
  const [presets, setPresets] = useState<DanmuPresetCategory[]>(loadPresets)

  const addPhrase = useCallback((categoryId: string, phrase: string) => {
    setPresets(prev => {
      const updated = prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, phrases: [...cat.phrases, phrase] }
          : cat
      )
      savePresets(updated)
      return updated
    })
  }, [])

  const removePhrase = useCallback((categoryId: string, phrase: string) => {
    setPresets(prev => {
      const updated = prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, phrases: cat.phrases.filter(p => p !== phrase) }
          : cat
      )
      savePresets(updated)
      return updated
    })
  }, [])

  const addCategory = useCallback((label: string) => {
    const id = `custom-${Date.now()}`
    setPresets(prev => {
      const updated = [...prev, { id, label, phrases: [] }]
      savePresets(updated)
      return updated
    })
    return id
  }, [])

  const removeCategory = useCallback((categoryId: string) => {
    setPresets(prev => {
      const updated = prev.filter(cat => cat.id !== categoryId)
      savePresets(updated)
      return updated
    })
  }, [])

  const renameCategory = useCallback((categoryId: string, label: string) => {
    setPresets(prev => {
      const updated = prev.map(cat =>
        cat.id === categoryId ? { ...cat, label } : cat
      )
      savePresets(updated)
      return updated
    })
  }, [])

  return {
    presets,
    addPhrase,
    removePhrase,
    addCategory,
    removeCategory,
    renameCategory,
  }
}
