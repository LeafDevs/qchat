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
    
    // Create a ripple effect
    const button = document.querySelector('[data-theme-toggle]') as HTMLElement
    if (button) {
      const ripple = document.createElement('div')
      ripple.className = 'absolute inset-0 rounded-full bg-current opacity-20 animate-ping'
      button.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    }

    // Enhanced body transition
    document.documentElement.style.transition = 'background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    
    setTheme(theme === "dark" ? "light" : "dark")
    
    setTimeout(() => setIsAnimating(false), 400)
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
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 