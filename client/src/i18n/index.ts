import zhCN from './zh-CN.json'
import studyPackZhCN from './study-pack-zh-CN.json'
import studyPackResultsZhCN from './study-pack-results-zh-CN.json'
import studyPackUiOverrideZhCN from './study-pack-ui-override-zh-CN.json'
import classZhCN from './class-zh-CN.json'
import contentMediaZhCN from './content-media-zh-CN.json'
import taskGroupReadingZhCN from './task-group-reading-zh-CN.json'
import taskLiveUiZhCN from './task-live-ui-zh-CN.json'
import taskSortingZhCN from './task-sorting-zh-CN.json'
import taskChallengeZhCN from './task-challenge-zh-CN.json'
import taskUiOverrideZhCN from './task-ui-override-zh-CN.json'
import sharedUiZhCN from './shared-ui-zh-CN.json'
import adminHomeZhCN from './admin-home-zh-CN.json'
import adminMembershipZhCN from './admin-membership-zh-CN.json'
import miscUiZhCN from './misc-ui-zh-CN.json'
import coreUiZhCN from './core-ui-zh-CN.json'
import membershipZhCN from './membership-zh-CN.json'
import teachingAidsZhCN from './teaching-aids-zh-CN.json'
import bigscreenActivitiesZhCN from './bigscreen-activities-zh-CN.json'
import classroomZhCN from './classroom-zh-CN.json'

export type Language = 'zh-CN'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result: Record<string, unknown> = { ...base }

  Object.entries(override).forEach(([key, value]) => {
    const currentValue = result[key]
    if (isPlainObject(currentValue) && isPlainObject(value)) {
      result[key] = deepMerge(currentValue, value)
      return
    }
    result[key] = value
  })

  return result as T
}

const resources = {
  'zh-CN': [zhCN, studyPackZhCN, studyPackResultsZhCN, studyPackUiOverrideZhCN, classZhCN, contentMediaZhCN, taskGroupReadingZhCN, taskLiveUiZhCN, taskSortingZhCN, taskChallengeZhCN, taskUiOverrideZhCN, sharedUiZhCN, adminHomeZhCN, adminMembershipZhCN, miscUiZhCN, coreUiZhCN, membershipZhCN, teachingAidsZhCN, bigscreenActivitiesZhCN, classroomZhCN].reduce(
    (accumulator, resource) => deepMerge(accumulator, resource as Record<string, unknown>),
    {} as Record<string, unknown>,
  ),
}

let currentLang: Language = 'zh-CN'

export function setLanguage(lang: Language) {
  currentLang = lang
}

export function getLanguage(): Language {
  return currentLang
}

export function t(key: string): string {
  const keys = key.split('.')
  let value: unknown = resources[currentLang]

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return key // Return key if translation not found
    }
  }

  return typeof value === 'string' ? value : key
}

export function tWithParams(key: string, params: Record<string, string | number>): string {
  let text = t(key)
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue))
  })
  return text
}
