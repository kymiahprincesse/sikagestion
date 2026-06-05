import { useState, useEffect } from 'react'

/**
 * Hook pour détecter le breakpoint actuel et les capacités de l'appareil
 */
export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState('desktop')
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [isTouch, setIsTouch] = useState(false)
  const [isPortrait, setIsPortrait] = useState(true)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Détection des breakpoints
      if (width < 640) {
        setBreakpoint('mobile')
        setIsMobile(true)
        setIsTablet(false)
        setIsDesktop(false)
      } else if (width < 1024) {
        setBreakpoint('tablet')
        setIsMobile(false)
        setIsTablet(true)
        setIsDesktop(false)
      } else {
        setBreakpoint('desktop')
        setIsMobile(false)
        setIsTablet(false)
        setIsDesktop(true)
      }
      
      // Orientation
      setIsPortrait(height > width)
    }

    // Détection tactile
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      )
    }

    checkDevice()
    checkTouch()

    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isPortrait,
    isLandscape: !isPortrait
  }
}
