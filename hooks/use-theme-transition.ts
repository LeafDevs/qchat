'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function useThemeTransition() {
  const { theme, setTheme } = useTheme()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const smoothThemeTransition = (newTheme: string) => {
    setIsTransitioning(true)

    // Create a full-screen overlay for smooth transition
    const overlay = document.createElement('div')
    overlay.className = `
      fixed inset-0 z-[9999] pointer-events-none
      transition-opacity duration-300 ease-in-out
      ${theme === 'dark' ? 'bg-white' : 'bg-black'}
    `
    overlay.style.opacity = '0'
    document.body.appendChild(overlay)

    // Fade in overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '0.1'
    })

    // Change theme after brief delay
    setTimeout(() => {
      setTheme(newTheme)
      
      // Fade out overlay
      setTimeout(() => {
        overlay.style.opacity = '0'
        setTimeout(() => {
          document.body.removeChild(overlay)
          setIsTransitioning(false)
        }, 300)
      }, 100)
    }, 150)
  }

  const createRippleEffect = (element: HTMLElement, color: string) => {
    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const ripple = document.createElement('div')
    
    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = rect.left + rect.width / 2 - size / 2 + 'px'
    ripple.style.top = rect.top + rect.height / 2 - size / 2 + 'px'
    ripple.className = `
      fixed rounded-full pointer-events-none z-[9998]
      animate-ping opacity-20
    `
    ripple.style.backgroundColor = color
    
    document.body.appendChild(ripple)
    setTimeout(() => document.body.removeChild(ripple), 1000)
  }

  const morphTransition = (newTheme: string, triggerElement?: HTMLElement) => {
    if (triggerElement) {
      const color = newTheme === 'dark' ? '#1f2937' : '#f9fafb'
      createRippleEffect(triggerElement, color)
    }
    
    smoothThemeTransition(newTheme)
  }

  return {
    theme,
    isTransitioning,
    smoothThemeTransition,
    morphTransition,
    toggleTheme: () => morphTransition(theme === 'dark' ? 'light' : 'dark')
  }
} 