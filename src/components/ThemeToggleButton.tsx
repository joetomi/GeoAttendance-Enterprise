import React from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";

interface ThemeToggleButtonProps {
  className?: string;
  isFloating?: boolean;
}

export function ThemeToggleButton({ className, isFloating = false }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLanguage();

  return (
    <button
      id="theme-toggle-button"
      onClick={toggleTheme}
      type="button"
      title={theme === "dark" ? "الوضع الفاتح / Light Mode" : "الوضع الداكن / Dark Mode"}
      className={cn(
        "flex items-center justify-center rounded-xl transition-all duration-200 outline-none select-none cursor-pointer",
        isFloating 
          ? "bg-surface-container-high border border-outline-variant/30 hover:bg-surface-container-highest p-3 shadow-lg hover:scale-105 active:scale-95" 
          : "p-2 hover:bg-surface-container text-on-surface-variant hover:text-on-surface hover:ring-2 hover:ring-outline-variant/50",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex items-center justify-center text-amber-400"
          >
            <Moon className="w-5 h-5 fill-amber-400/20" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex items-center justify-center text-amber-500"
          >
            <Sun className="w-5 h-5 fill-amber-500/20" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
