import React, { useState, useEffect } from "react";
import { Fingerprint, MapPin, CheckCircle2, XCircle, Loader2, LogOut, Globe, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { Language, translations } from "../constants/translations";
import { useLanguage } from "../contexts/LanguageContext";

export default function MobileCheckIn() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [currentMode, setCurrentMode] = useState<'In' | 'Out'>('Out');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [inZone, setInZone] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [geofence, setGeofence] = useState<any>(null);
  const navigate = useNavigate();

  const { lang, t, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleLangChange = (l: Language) => {
    setLanguage(l);
    setShowLangMenu(false);
  };

  const fetchStatus = (userId: string) => {
    fetch(`/api/attendance/status/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status) {
          setCurrentMode(data.status);
          setInZone(data.status === 'In');
        }
      })
      .catch(err => console.error("Status fetch failed:", err));
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      fetchStatus(u.id);
    }

    // Fetch Geofence config
    fetch("/api/geofence")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setGeofence(data))
      .catch(err => {
        console.error("Failed to load geofence", err);
        setGeofence({ name: "Demo HQ", radius: 200 }); // Minimal fallback
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const startVerification = () => {
    if (!user) return;
    handleAction();
  };

  const handleAction = () => {
    setStatus('checking');
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const endpoint = currentMode === 'Out' ? "/api/attendance/check-in" : "/api/attendance/check-out";
        
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: user.id,
            lat: latitude,
            lng: longitude
          })
        })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success) {
            setStatus('success');
            const newMode = currentMode === 'Out' ? 'In' : 'Out';
            setCurrentMode(newMode);
            setInZone(newMode === 'In');
          } else {
            setStatus('error');
            setLocationError(data.message || data.error || "Request failed");
          }
        })
        .catch((err) => {
          console.error("Network error during attendance:", err);
          setStatus('error');
          setLocationError("Network connection failed. Please try again.");
        });
      },
      (err) => {
        setLocationError(err.message);
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-black bg-stars text-white flex flex-col items-center p-6 pb-24 overflow-x-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header with Language Selector */}
      <header className="w-full max-w-lg flex justify-between items-center mb-10 pt-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest"
            >
              <span>{t.langFlag}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showLangMenu && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className={cn(
                    "absolute mt-2 w-32 bg-surface-container-highest border border-white/10 rounded-xl shadow-2xl p-1 z-[100]",
                    lang === "ar" ? "right-0" : "left-0"
                  )}
                >
                  {(["en", "ar"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLangChange(l)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                        lang === l ? "bg-primary text-white" : "hover:bg-white/5 text-white/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span>{translations[l].langFlag}</span>
                        <span>{translations[l].langName}</span>
                      </div>
                      {lang === l && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-none">{t.welcomeUser}, {user?.name || user?.username}</h2>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mt-1.5 flex items-center gap-2">
              Enterprise HQ • Personnel
            </p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-95 transition-all text-white/40"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Accuracy & Status */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 flex flex-col justify-between h-32 bg-pattern-wavy">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{t.sessionStatus}</span>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", currentMode === 'In' ? "bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)]" : "bg-white/20")} />
            <span className="text-sm font-bold">{currentMode === 'In' ? 'Active' : t.notActive}</span>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 flex flex-col justify-between h-32 bg-pattern-wavy">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{t.accuracy}</span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold">+/- 2.4m</span>
          </div>
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
              onClick={startVerification}
              className={cn(
                "relative w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all group overflow-hidden",
                currentMode === 'Out' 
                  ? "bg-emerald-600/10 border-4 border-emerald-500/20 shadow-emerald-500/10" 
                  : "bg-amber-600/10 border-4 border-amber-500/20 shadow-amber-500/10"
              )}
            >
              <div className={cn(
                "absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-60",
                currentMode === 'Out' 
                  ? "bg-[radial-gradient(circle_at_center,var(--color-emerald-500)_0%,transparent_70%)]" 
                  : "bg-[radial-gradient(circle_at_center,var(--color-amber-500)_0%,transparent_70%)]"
              )} />
              
              <Fingerprint className={cn(
                "w-24 h-24 mb-6 transition-all duration-500",
                currentMode === 'Out' ? "text-emerald-500" : "text-amber-500"
              )} />
              
              <span className="text-[10px] font-black uppercase tracking-[0.3em] z-10">
                {currentMode === 'Out' ? t.tapToCheckIn : t.tapToCheckOut}
              </span>
              
              {/* Animated rings */}
              <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-2 animate-ping",
                currentMode === 'Out' ? "border-emerald-500/20" : "border-amber-500/20"
              )} />
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
              <Loader2 className="w-24 h-24 text-primary animate-spin mb-6" />
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
                {t.checkingLocation}
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className={cn(
                "w-48 h-48 rounded-full flex items-center justify-center mb-8 shadow-xl",
                currentMode === 'In' ? "bg-emerald-900/40 shadow-emerald-500/10" : "bg-amber-900/40 shadow-amber-500/10"
              )}>
                <CheckCircle2 className={cn("w-24 h-24", currentMode === 'In' ? "text-emerald-500" : "text-amber-500")} />
              </div>
              <h3 className="text-2xl font-bold text-on-surface uppercase tracking-widest leading-loose">
                {currentMode === 'In' ? t.checkInSuccess : t.checkOutSuccess}
              </h3>
              <p className="text-on-surface-variant mt-2 font-mono">{new Date().toLocaleTimeString()}</p>
              
              <button 
                onClick={() => {
                  setStatus('idle');
                  if (user) fetchStatus(user.id);
                }}
                className="mt-8 px-16 py-4 bg-primary text-white rounded-2xl text-sm font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
              >
                {lang === "ar" ? "موافق" : "OK"}
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
              <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-red-500">
                  Authentication Restricted
                </p>
              </div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-widest leading-loose">
                {t.actionFailed}
              </h3>
              <p className="text-white/60 mt-2 max-w-xs text-sm font-medium">
                {locationError || t.outsideFence}
              </p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-10 px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                {t.tryAgain}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full text-center max-w-xs mb-8">
        <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed opacity-60">
          Location-based authentication active. Your coordinates are verified against the secure enterprise perimeter.
        </p>
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-4 mb-2 shadow-sm bg-pattern-wavy">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden grayscale">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop" 
            alt="HQ" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-on-surface">{geofence?.name || "Loading..."}</p>
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", currentMode === 'In' ? "bg-emerald-500" : "bg-white/20")} />
            <p className={cn("text-[10px] uppercase font-bold tracking-wider", currentMode === 'In' ? "text-emerald-500" : "text-on-surface-variant")}>{t.activePerimeter}</p>
          </div>
        </div>
        <p className="text-xs font-bold">{geofence?.radius || 0}m Radius</p>
      </div>
    </div>
  );
}
