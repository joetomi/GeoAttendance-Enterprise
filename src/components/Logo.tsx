import React from "react";
import { cn } from "../lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-transparent", className)}>
      <img 
        src="/logo.png" 
        alt="GeoAttendance Logo" 
        className="w-full h-full object-contain drop-shadow-md"
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
              icon.className = 'logo-placeholder text-white font-bold text-xl drop-shadow-sm';
              icon.innerText = 'G';
              parent.appendChild(icon);
            }
          }
        }}
      />
    </div>
  );
}
