import { t, tWithParams, getLanguage, setLanguage, type Language } from './index'
import { useCallback, useState } from 'react'

export function useTranslation() {
  const [lang, setLang] = useState<Language>(getLanguage())

  const changeLanguage = useCallback((newLang: Language) => {
    setLanguage(newLang)
    setLang(newLang)
  }, [])

  const translate = useCallback((key: string, params?: Record<string, string | number>) => {
    if (params) {
      return tWithParams(key, params)
    }
    return t(key)
  }, [])

  const translateWithParams = useCallback((key: string, params: Record<string, string | number>) => {
    return tWithParams(key, params)
  }, [])

  return {
    t: translate,
    tWithParams: translateWithParams,
    lang,
    setLanguage: changeLanguage
  }
}
