import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTour, type StepType } from '@reactour/tour'
import { WHITEBOARD_TOUR_STORAGE_KEY } from './tour-keys'

interface UseWhiteboardTourOptions {
  steps: StepType[]
  canAutoStart: boolean
  beforeOpen?: () => void
}

export function useWhiteboardTour({ steps, canAutoStart, beforeOpen }: UseWhiteboardTourOptions) {
  const { isOpen, setIsOpen, setCurrentStep, setSteps: rawSetSteps } = useTour()
  const setSteps = rawSetSteps ?? (() => undefined)
  const [hasSeen, setHasSeen] = useState(() => localStorage.getItem(WHITEBOARD_TOUR_STORAGE_KEY) === '1')
  const autoSessionRef = useRef(false)
  const prevOpenRef = useRef(false)
  const pendingOpenRef = useRef<number | null>(null)

  useEffect(() => {
    setSteps(steps)
  }, [setSteps, steps])

  const selectorsReady = useCallback(() => {
    return steps.every((step) => {
      if (typeof step.selector !== 'string') return true
      return Boolean(document.querySelector(step.selector))
    })
  }, [steps])

  const getAvailableSteps = useCallback(() => {
    return steps.filter((step) => {
      if (typeof step.selector !== 'string') return true
      return Boolean(document.querySelector(step.selector))
    })
  }, [steps])

  const markSeen = useCallback(() => {
    localStorage.setItem(WHITEBOARD_TOUR_STORAGE_KEY, '1')
    setHasSeen(true)
  }, [])

  const clearPendingOpen = useCallback(() => {
    if (pendingOpenRef.current !== null) {
      window.clearTimeout(pendingOpenRef.current)
      pendingOpenRef.current = null
    }
  }, [])

  const openTour = useCallback((manual = false) => {
    clearPendingOpen()
    beforeOpen?.()
    setCurrentStep(0)
    autoSessionRef.current = !manual

    let attempts = 0
    const tryOpen = () => {
      beforeOpen?.()
      const availableSteps = getAvailableSteps()
      if (selectorsReady() || (attempts >= 6 && availableSteps.length > 0)) {
        setSteps(availableSteps.length > 0 ? availableSteps : steps)
        pendingOpenRef.current = null
        setIsOpen(true)
        return
      }
      attempts += 1
      if (attempts >= 12) {
        pendingOpenRef.current = null
        return
      }
      pendingOpenRef.current = window.setTimeout(tryOpen, 150)
    }

    pendingOpenRef.current = window.setTimeout(tryOpen, 0)
  }, [beforeOpen, clearPendingOpen, getAvailableSteps, selectorsReady, setCurrentStep, setIsOpen, setSteps, steps])

  useEffect(() => {
    if (!canAutoStart || hasSeen || isOpen) return

    openTour(false)

    return clearPendingOpen
  }, [canAutoStart, clearPendingOpen, hasSeen, isOpen, openTour])

  useEffect(() => {
    if (prevOpenRef.current && !isOpen && autoSessionRef.current) {
      markSeen()
      autoSessionRef.current = false
    }
    prevOpenRef.current = isOpen
  }, [isOpen, markSeen])

  useEffect(() => clearPendingOpen, [clearPendingOpen])

  return useMemo(() => ({
    hasSeen,
    openTour: () => openTour(true),
  }), [hasSeen, openTour])
}
