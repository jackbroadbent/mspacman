'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface UseOverscrollDetectionOptions {
  threshold?: number      // pixels past bottom to trigger (default: 75)
  holdDuration?: number   // ms to hold at threshold (default: 400)
  onTrigger?: () => void  // callback when triggered
}

export function useOverscrollDetection(options: UseOverscrollDetectionOptions = {}) {
  const { threshold = 75, holdDuration = 400, onTrigger } = options

  const [isTriggered, setIsTriggered] = useState(false)
  const isTouchingRef = useRef(false)
  const overscrollStartRef = useRef<number | null>(null)

  const resetTrigger = useCallback(() => setIsTriggered(false), [])

  useEffect(() => {
    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchMove = () => {
      if (!isTouchingRef.current) return

      const scrollTop = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight

      // Calculate how far past the bottom we are
      // When at bottom: scrollTop + clientHeight = scrollHeight, so overscroll = 0
      // When past bottom: scrollTop + clientHeight > scrollHeight, so overscroll > 0
      const overscroll = Math.max(0, scrollTop + clientHeight - scrollHeight)

      if (overscroll >= threshold) {
        if (!overscrollStartRef.current) {
          overscrollStartRef.current = Date.now()
        } else if (Date.now() - overscrollStartRef.current >= holdDuration) {
          setIsTriggered(prev => {
            if (!prev) {
              onTrigger?.()
              // Haptic feedback if available
              if (navigator.vibrate) {
                navigator.vibrate(50)
              }
            }
            return true
          })
        }
      } else {
        overscrollStartRef.current = null
      }
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      overscrollStartRef.current = null
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [threshold, holdDuration, onTrigger])

  return { isTriggered, resetTrigger }
}
