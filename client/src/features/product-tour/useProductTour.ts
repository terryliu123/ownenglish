import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { StepType } from '@reactour/tour'

type ProductTourContextValue = {
  setSteps: Dispatch<SetStateAction<StepType[]>>
}

export const ProductTourContext = createContext<ProductTourContextValue | null>(null)

export function useProductTour() {
  const context = useContext(ProductTourContext)
  if (!context) {
    throw new Error('useProductTour must be used within ProductTourProvider')
  }
  return context
}

