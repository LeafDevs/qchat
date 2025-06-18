'use client'

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setIsAnimating(true)
    
    // Create overlay for smooth transition
    const overlay = document.createElement('div')
    overlay.className = 'theme-switch-overlay'
    document.body.appendChild(overlay)
    
    // Trigger overlay animation
    requestAnimationFrame(() => {
      overlay.classList.add('active')
    })

    // Create ripple effect
    const button = document.querySelector('[data-theme-toggle]') as HTMLElement
    if (button) {
      const ripple = document.createElement('div')
      ripple.className = 'absolute inset-0 rounded-full bg-current opacity-20 animate-ping'
      button.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    }
    
    // Change theme after brief delay
    setTimeout(() => {
      setTheme(theme === "dark" ? "light" : "dark")
      
      // Remove overlay after theme change
      setTimeout(() => {
        overlay.classList.remove('active')
        setTimeout(() => {
          document.body.removeChild(overlay)
          setIsAnimating(false)
        }, 300)
      }, 100)
    }, 150)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-theme-toggle
      className="relative hover:bg-accent/50"
      disabled={isAnimating}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 180 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 