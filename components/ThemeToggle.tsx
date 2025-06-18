'use client'

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Create overlay for smooth transition
    const overlay = document.createElement('div');
    overlay.className = 'theme-switch-overlay';
    document.body.appendChild(overlay);
    
    // Trigger ripple effect
    const button = document.querySelector('.theme-toggle-button');
    if (button) {
      const ripple = document.createElement('div');
      ripple.className = 'absolute inset-0 rounded-full bg-current opacity-20';
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 300);
    }
    
    // Change theme after a brief delay
    setTimeout(() => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
      overlay.classList.add('active');
      
      setTimeout(() => {
        overlay.remove();
        setIsAnimating(false);
      }, 300);
    }, 50);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      disabled={isAnimating}
      className="theme-toggle-button relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-5 h-5"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
} 