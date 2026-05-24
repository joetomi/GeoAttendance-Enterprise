import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Laptop, Compass, Locate, MapPin, Shield } from "lucide-react";
import { Logo } from "./Logo";
import { useLanguage } from "../contexts/LanguageContext";

export function SplashLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const { lang } = useLanguage();

  useEffect(() => {
    // Smooth progress loading animation from 0 to 100 over 4.8 seconds
    const duration = 4800; // Leave 200ms out of 5s for premium exit transition
    const intervalTime = 20;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, intervalTime);

    // Completely trigger complete state after exactly 5 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Dual-language descriptive texts for professional feel
  const subtitleAr = "جاري تفعيل الحوسبة الجغرافية الذكية والاتصال الآمن...";
  const subtitleEn = "Initializing secure smart geofencing systems...";

  return (
    <motion.div 
      id="splash-screen-container" 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#09090b] bg-stars overflow-hidden"
    >
      {/* Absolute high-tech glowing background effects */}
      <div className="absolute inset-0 bg-radial-[circle_800px_at_center,rgba(16,185,129,0.08),transparent]" />
      
      {/* Main Container */}
      <div className="relative flex flex-col items-center max-w-md px-6 text-center z-10 select-none">
        
        {/* Animated Geofence Orbital Rings */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Pulsing smart outer grid */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ 
              opacity: [0.15, 0.45, 0.15], 
              scale: [0.85, 1.15, 0.85] 
            }}
            transition={{ 
              duration: 2.2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute w-44 h-44 rounded-full border border-primary/20 pointer-events-none"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.2, 0.5, 0.2], 
              scale: [0.95, 1.05, 0.95],
              rotate: 360
            }}
            transition={{ 
              duration: 3.5, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute w-36 h-36 rounded-full border border-dashed border-primary/30 pointer-events-none"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3], 
              scale: [0.98, 1.02, 0.98] 
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute w-28 h-28 rounded-full border-2 border-primary/10 bg-primary/5 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.06)]"
          />

          {/* Actual Logo in Center */}
          <motion.div
            initial={{ scale: 0, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 80,
              damping: 12,
              delay: 0.1 
            }}
            className="relative z-10 bg-surface/80 p-4 rounded-3xl border border-outline-variant/50 backdrop-blur shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          >
            <Logo className="w-16 h-16 md:w-20 md:h-20" />
            
            {/* Spinning radar scan overlay bar */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
              className="absolute inset-0 rounded-3xl border border-primary/30 origin-center pointer-events-none"
              style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 30%)" }}
            />
          </motion.div>

          {/* Glowing pin icon reflecting location context */}
          <motion.div
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: [0, -6, 0], opacity: 1 }}
            transition={{ 
              y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
              opacity: { delay: 0.4, duration: 0.4 } 
            }}
            className="absolute -top-3 z-20 text-primary shadow-lg bg-surface-container border border-outline-variant/60 p-1.5 rounded-full"
          >
            <MapPin className="w-4 h-4 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </motion.div>
        </div>

        {/* Text Area */}
        <div className="space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl md:text-3xl font-extrabold text-[#f4f4f5] tracking-tight bg-gradient-to-r from-white via-[#dedede] to-[#10b981] bg-clip-text text-transparent"
          >
            GeoAttendance
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[12px] md:text-xs font-semibold uppercase tracking-[0.25em] text-primary/95"
          >
            Enterprise Solution
          </motion.p>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="pt-2 max-w-sm"
          >
            <p className="text-sm font-medium text-on-surface-variant/90 leading-relaxed">
              {lang === "ar" 
                ? "مرحباً بكم في نظام التحقق الجغرافي والذكي للمؤسسة" 
                : "Welcome to the smart geo-verification system"}
            </p>
            <div className="h-5 flex items-center justify-center mt-1">
              <span className="text-[11px] text-on-surface-variant/60 font-mono tracking-wide animate-pulse">
                {lang === "ar" ? subtitleAr : subtitleEn}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Beautiful Modern Progress bar at bottom */}
        <div className="w-56 mt-10 md:mt-12 bg-white/5 border border-white/5 rounded-full p-[3px] overflow-hidden">
          <div className="h-[3px] bg-primary rounded-full transition-all duration-75 relative" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_12px_rgba(16,185,129,1)]" />
          </div>
        </div>

        {/* Dynamic loading count */}
        <div className="mt-2 font-mono text-[10px] text-on-surface-variant/40 tracking-wider">
          SYSTEM ACTIVE // {Math.round(progress)}%
        </div>

        {/* Professional badge features at footer of splash */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-14 flex items-center gap-6 justify-center text-[10px] text-on-surface-variant/80 font-medium bg-[#131316] border border-outline-variant/30 px-4 py-2.5 rounded-full"
        >
          <div className="flex items-center gap-1.5 border-r border-outline-variant/60 pr-3.5 rtl:border-r-0 rtl:border-l rtl:pr-0 rtl:pl-3.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>GEO-SECURE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Locate className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span>LIVE GEOFENCE</span>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
