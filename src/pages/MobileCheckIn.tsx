import React, { useState, useEffect } from "react";
import { Fingerprint, MapPin, CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/Navigation";
import { cn } from "@/src/lib/utils";

export default function MobileCheckIn() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [inZone, setInZone] = useState<boolean | null>(null);

  const handleCheckIn = () => {
    setStatus('checking');
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        fetch("/api/attendance/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: "1", // Hardcoded for demo
            lat: latitude,
            lng: longitude
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus('success');
            setInZone(true);
          } else {
            setStatus('error');
            setInZone(false);
          }
        })
        .catch(() => {
          setStatus('error');
        });
      },
      (err) => {
        setLocationError(err.message);
        setStatus('error');
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F3F9] p-6 pb-24 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-primary">GeoAttendance</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-outline-variant flex items-center justify-center">
          <Fingerprint className="w-5 h-5 text-on-surface-variant" />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center mt-4"
      >
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Welcome, Sarah Chen</h2>
        <p className="text-on-surface-variant font-medium mt-1">Enterprise HQ • Floor 4</p>
      </motion.div>

      <div className="w-full mt-10 p-6 bg-white rounded-3xl shadow-xl shadow-black/5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Current Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", inZone === true ? "bg-secondary" : "bg-on-surface-variant/20")} />
            <p className={cn("text-lg font-bold", inZone === true ? "text-secondary" : "text-on-surface")}>
              {inZone === true ? "Inside Zone" : "Awaiting Verification"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Accuracy</p>
          <p className="text-lg font-bold text-on-surface">+/- 2.4m</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full py-12">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.button
              key="idle"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              onClick={handleCheckIn}
              className="relative w-64 h-64 bg-primary-container rounded-full flex flex-col items-center justify-center shadow-2xl shadow-primary-container/40 active:scale-95 transition-all group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Fingerprint className="w-24 h-24 text-secondary-container mb-4" />
              <span className="text-xs font-bold text-white uppercase tracking-[0.2em]">Tap to Check In</span>
              
              {/* Animated rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-2 border-primary-container/20 animate-ping" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-primary-container/10 animate-ping" style={{ animationDelay: '0.5s' }} />
            </motion.button>
          )}

          {status === 'checking' && (
            <motion.div
              key="checking"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-24 h-24 text-secondary animate-spin mb-6" />
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">Verifying Geofence...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-48 h-48 bg-secondary-container rounded-full flex items-center justify-center mb-8 shadow-xl shadow-secondary/10">
                <CheckCircle2 className="w-24 h-24 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-on-surface">Checked In!</h3>
              <p className="text-on-surface-variant mt-2">Time: {new Date().toLocaleTimeString()}</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-8 text-xs font-bold uppercase tracking-widest text-secondary hover:underline"
              >
                Done
              </button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center p-6 text-center"
            >
              <div className="w-48 h-48 bg-error-container rounded-full flex items-center justify-center mb-8 shadow-xl shadow-error/10">
                <XCircle className="w-24 h-24 text-error" />
              </div>
              <h3 className="text-2xl font-bold text-on-surface">Check In Failed</h3>
              <p className="text-on-surface-variant mt-2 max-w-xs">{locationError || "You must be within the designated HQ Main Entrance zone to check in."}</p>
              <button 
                onClick={() => setStatus('idle')}
                className="btn-primary mt-8 py-3 px-8"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full text-center max-w-xs mb-8">
        <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed opacity-60">
          Biometric verification active. Position your device within the geofence to register attendance.
        </p>
      </div>

      <div className="w-full bg-white rounded-3xl p-4 flex items-center gap-4 mb-2 shadow-sm border border-outline-variant">
        <div className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop" 
            alt="HQ" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-on-surface">Headquarters Main Entrance</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <p className="text-[10px] uppercase font-bold tracking-wider text-secondary">Active Region</p>
          </div>
        </div>
        <p className="text-xs font-bold text-secondary">200m Radius</p>
      </div>

      <BottomNav />
    </div>
  );
}
