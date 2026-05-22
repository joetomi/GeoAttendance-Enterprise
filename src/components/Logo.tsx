import React from "react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

export function Logo({ className }: { className?: string }) {
  return (
    <motion.div 
      whileHover={{ 
        scale: 1.15, 
        rotate: [0, -10, 15, -5, 0],
        filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.6))"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 12 
      }}
      className={cn("relative flex items-center justify-center overflow-visible bg-transparent cursor-pointer", className)}
    >
      <img 
        src="/logo.png" 
        alt="GeoAttendance Logo" 
        className="w-full h-full object-contain drop-shadow-md transition-transform"
        onError={(e) => {
          // If logo.png is missing, try logogeo.png as fallback
          const target = e.target as HTMLImageElement;
          if (!target.src.endsWith('logogeo.png')) {
            target.src = '/logogeo.png';
          } else {
            // Final fallback to a placeholder symbol
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.logo-placeholder')) {
              parent.classList.add('bg-emerald-600', 'rounded-xl');
              const icon = document.createElement('div');
              icon.className = 'logo-placeholder text-white font-bold text-xl drop-shadow-sm animate-pulse';
              icon.innerText = 'G';
              parent.appendChild(icon);
            }
          }
        }}
      />
    </motion.div>
  );
}
