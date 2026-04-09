import { TourProvider } from '@reactour/tour'
import TourPopover from './TourPopover'

interface ProductTourProviderProps {
  children: React.ReactNode
}

export function ProductTourProvider({ children }: ProductTourProviderProps) {
  return (
    <TourProvider
      steps={[]}
      ContentComponent={TourPopover}
      showBadge={false}
      showCloseButton={false}
      showDots={false}
      showNavigation={false}
      scrollSmooth
      padding={{ mask: 6, popover: 10 }}
      styles={{
        popover: (base) => ({
          ...base,
          padding: 0,
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
        }),
        maskArea: (base) => ({
          ...base,
          rx: 18,
        }),
        highlightedArea: (base) => ({
          ...base,
          stroke: '#6366f1',
          strokeWidth: 2,
        }),
        maskWrapper: (base) => ({
          ...base,
          color: 'rgba(15, 23, 42, 0.52)',
        }),
      }}
      accessibilityOptions={{
        closeButtonAriaLabel: '关闭引导',
        showNavigationScreenReaders: true,
      }}
    >
      {children}
    </TourProvider>
  )
}
