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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Verification mode state and timers
  const [isVerifyLocationMode, setIsVerifyLocationMode] = useState<boolean>(false);
  const [isVerifySingleMode, setIsVerifySingleMode] = useState<boolean>(false);
  const [verificationStep, setVerificationStep] = useState<'idle' | 'countdown' | 'ready_second' | 'saving'>('idle');
  const [countdown, setCountdown] = useState<number>(20);
  const [firstLocation, setFirstLocation] = useState<{ lat: number; lng: number; time: string } | null>(null);

  const handleLangChange = (l: Language) => {
    setLanguage(l);
    setShowLangMenu(false);
  };

  const fetchStatus = (userId: string, companyId?: string) => {
    fetch(`/api/attendance/status/${userId}`, {
      headers: { "X-Company-Id": companyId || "" }
    })
      .then(res => res.json())
      .then(data => {
        if (data.status) {
          setCurrentMode(data.status);
          setInZone(data.status === 'In');
        }
        if (data.assignedGeofenceId === "verify_location" || data.assignedGeofenceId === "verify_location_double") {
          setIsVerifyLocationMode(true);
          setIsVerifySingleMode(false);
        } else if (data.assignedGeofenceId === "verify_location_single") {
          setIsVerifyLocationMode(false);
          setIsVerifySingleMode(true);
        } else {
          setIsVerifyLocationMode(false);
          setIsVerifySingleMode(false);
        }
      })
      .catch(err => console.error("Status fetch failed:", err));
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    let companyId = "comp-default";
    if (savedUser) {
      const u = JSON.parse(savedUser);
      companyId = u.companyId || "comp-default";
      if (u.role === "admin") {
        navigate("/admin");
        return;
      }
      setUser(u);
      if (u.assignedGeofenceId === "verify_location" || u.assignedGeofenceId === "verify_location_double") {
        setIsVerifyLocationMode(true);
        setIsVerifySingleMode(false);
      } else if (u.assignedGeofenceId === "verify_location_single") {
        setIsVerifyLocationMode(false);
        setIsVerifySingleMode(true);
      }
      fetchStatus(u.id, u.companyId);
    } else {
      navigate("/login");
    }

    // Fetch Geofence config
    fetch("/api/geofence", {
      headers: { "X-Company-Id": companyId }
    })
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

  // Countdown Timer for two-point verification
  useEffect(() => {
    let timer: any;
    if (verificationStep === 'countdown' && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (verificationStep === 'countdown' && countdown === 0) {
      setVerificationStep('ready_second');
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [verificationStep, countdown]);

  const startTwoPointVerification = () => {
    if (!navigator.geolocation) {
      setLocationError(lang === "ar" ? "تحديد الموقع الجغرافي غير مدعوم في متصفحك" : "Geolocation discovery not supported by this browser");
      setStatus('error');
      return;
    }

    setStatus('checking');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFirstLocation({
          lat: latitude,
          lng: longitude,
          time: new Date().toISOString()
        });
        
        // Go to countdown step
        setStatus('idle');
        setCountdown(20);
        setVerificationStep('countdown');
      },
      (err) => {
        let errorMsg = err.message;
        if (lang === "ar") {
          if (err.code === 1) errorMsg = "تم رفض الوصول إلى الموقع";
          else if (err.code === 2) errorMsg = "الموقع غير متاح";
          else if (err.code === 3) errorMsg = "انتهت مهلة الحصول على الموقع";
        }
        setLocationError(errorMsg);
        setStatus('error');
        setVerificationStep('idle');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submitSecondPoint = () => {
    if (!firstLocation) {
      setVerificationStep('idle');
      return;
    }

    setVerificationStep('saving');
    setStatus('checking');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const secondPoint = {
          lat: latitude,
          lng: longitude,
          time: new Date().toISOString()
        };

        const endpoint = "/api/attendance/check-in";
        
        fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Company-Id": user?.companyId || ""
          },
          body: JSON.stringify({
            employeeId: user.id,
            lat: latitude,
            lng: longitude,
            isDoubleVerification: true,
            loc1: firstLocation,
            loc2: secondPoint
          })
        })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.success) {
            setStatus('success');
            setCurrentMode('In');
            setInZone(true);
            setVerificationStep('idle');
            setFirstLocation(null);
          } else {
            setStatus('error');
            setVerificationStep('idle');
            setLocationError(data.message || data.error || "Verification failed");
          }
        })
        .catch((err) => {
          console.error("Network error during double location attendance:", err);
          setStatus('error');
          setVerificationStep('idle');
          setLocationError(lang === "ar" ? "فشل الاتصال بالشبكة" : "Network connection error");
        });
      },
      (err) => {
        let errorMsg = err.message;
        if (lang === "ar") {
          if (err.code === 1) errorMsg = "تم رفض الوصول إلى الموقع";
          else if (err.code === 2) errorMsg = "الموقع غير متاح";
          else if (err.code === 3) errorMsg = "انتهت مهلة الحصول على الموقع";
        }
        setLocationError(errorMsg);
        setStatus('error');
        setVerificationStep('idle');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startVerification = () => {
    if (!user) return;
    if (isVerifyLocationMode && currentMode === 'Out') {
      if (verificationStep === 'ready_second') {
        submitSecondPoint();
      } else {
        startTwoPointVerification();
      }
    } else {
      handleAction();
    }
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
          headers: { 
            "Content-Type": "application/json",
            "X-Company-Id": user?.companyId || ""
          },
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
            let msg = data.message || data.error || "Request failed";
            if (msg.includes("بصمه خارج وقت العمل") || msg.includes("Outside working hours") || msg.includes("خارج وقت العمل")) {
              setLocationError(lang === "ar" ? "بصمه خارج وقت العمل" : "Attendance failed: Outside of working hours");
            } else if (msg.includes("Outside geofence area")) {
              const distanceMatch = msg.match(/\(Distance: (\d+)m\)/);
              if (distanceMatch) {
                const distance = distanceMatch[1];
                setLocationError(`${t.outsideFence} (${lang === "ar" ? "مسافة" : "Distance"}: ${distance}m)`);
              } else {
                setLocationError(t.outsideFence);
              }
            } else {
              setLocationError(msg);
            }
          }
        })
        .catch((err) => {
          console.error("Network error during attendance:", err);
          setStatus('error');
          setLocationError(lang === "ar" ? "فشل الاتصال بالشبكة. يرجى المحاولة مرة أخرى." : "Network connection failed. Please try again.");
        });
      },
      (err) => {
        // Localize browser geolocation errors if possible
        let errorMsg = err.message;
        if (lang === "ar") {
          if (err.code === 1) errorMsg = "تم رفض الوصول إلى الموقع";
          else if (err.code === 2) errorMsg = "الموقع غير متاح";
          else if (err.code === 3) errorMsg = "انتهت مهلة الحصول على الموقع";
        }
        setLocationError(errorMsg);
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-black bg-stars text-white flex flex-col items-center p-6 pb-24 overflow-x-hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Accuracy & Status */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 flex flex-col justify-between h-32 bg-pattern-wavy">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">{t.sessionStatus}</span>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", currentMode === 'In' ? "bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)]" : "bg-white/20")} />
            <span className="text-sm font-bold">{currentMode === 'In' ? (lang === "ar" ? "نشط" : "Active") : t.notActive}</span>
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
              disabled={isVerifyLocationMode && currentMode === "Out" && verificationStep === "countdown"}
              className={cn(
                "relative w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all group overflow-hidden",
                (isVerifyLocationMode || isVerifySingleMode) && currentMode === "Out"
                  ? verificationStep === "countdown"
                    ? "bg-amber-600/5 border-4 border-amber-500/20 shadow-amber-500/5 cursor-not-allowed opacity-80"
                    : verificationStep === "ready_second"
                      ? "bg-amber-500/20 border-4 border-amber-400/50 shadow-amber-400/20 animate-pulse border-dashed"
                      : "bg-amber-600/10 border-4 border-amber-500/20 shadow-amber-500/10"
                  : currentMode === 'Out' 
                    ? "bg-emerald-600/10 border-4 border-emerald-500/20 shadow-emerald-500/10" 
                    : "bg-amber-600/10 border-4 border-amber-500/20 shadow-amber-500/10"
              )}
            >
              <div className={cn(
                "absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-60",
                (isVerifyLocationMode || isVerifySingleMode) && currentMode === "Out"
                  ? "bg-[radial-gradient(circle_at_center,var(--color-amber-500)_0%,transparent_70%)]"
                  : currentMode === 'Out' 
                    ? "bg-[radial-gradient(circle_at_center,var(--color-emerald-500)_0%,transparent_70%)]" 
                    : "bg-[radial-gradient(circle_at_center,var(--color-amber-500)_0%,transparent_70%)]"
              )} />
              
              {(isVerifyLocationMode || isVerifySingleMode) && currentMode === "Out" ? (
                isVerifySingleMode ? (
                  <div className="flex flex-col items-center justify-center z-10 text-center px-4">
                    <div className="relative">
                      <Fingerprint className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
                      <MapPin className="w-6 h-6 text-amber-400 absolute -bottom-1 -right-1 animate-bounce" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-normal text-amber-300 mb-1 leading-snug max-w-[200px]">
                      {lang === "ar" ? "تسجيل حضور و سيتم ارسال موقعك للشركة" : "Check-in & send location to the company"}
                    </span>
                    <span className="text-[9px] text-white/40 tracking-wider">
                      {lang === "ar" ? "(تحقق أحادي الموقع)" : "(Single Point Verification)"}
                    </span>
                  </div>
                ) : verificationStep === "countdown" ? (
                  <div className="flex flex-col items-center justify-center z-10 animate-pulse text-center px-4">
                    <span className="text-4xl font-extrabold text-amber-400 font-mono mb-2">{countdown}s</span>
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2">
                      {lang === "ar" ? "تحرك على الطريق الآن" : "Move on the road now"}
                    </span>
                    <span className="text-[9px] text-white/50 leading-snug">
                      {lang === "ar" ? "الرجاء المضي قدماً للتأكد من خروجك للعمل" : "Keep moving to verify travel start"}
                    </span>
                  </div>
                ) : verificationStep === "ready_second" ? (
                  <div className="flex flex-col items-center justify-center z-10 text-center px-4">
                    <MapPin className="w-16 h-16 text-amber-400 animate-bounce mb-4" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1">
                      {lang === "ar" ? "اضغط لإرسال الموقع الثاني" : "Tap to send 2nd location"}
                    </span>
                    <span className="text-[9px] text-white/70">
                      {lang === "ar" ? "وتأكيد بدء الحضور والعمل" : "and confirm travel start"}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center z-10 text-center px-4">
                    <div className="relative">
                      <Fingerprint className="w-16 h-16 text-amber-500 mb-4" />
                      <MapPin className="w-6 h-6 text-amber-400 absolute -bottom-1 -right-1 animate-pulse" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 mb-1 leading-snug">
                      {lang === "ar" ? "إرسال الموقع الحالي والتحرك" : "Send current location & verify"}
                    </span>
                    <span className="text-[9px] text-white/50 tracking-wider">
                      {lang === "ar" ? "(تحقق ثنائي الموقع)" : "(Dual Point Verification)"}
                    </span>
                  </div>
                )
              ) : (
                <>
                  <Fingerprint className={cn(
                    "w-24 h-24 mb-6 transition-all duration-500",
                    currentMode === 'Out' ? "text-emerald-500" : "text-amber-500"
                  )} />
                  
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] z-10">
                    {currentMode === 'Out' ? t.tapToCheckIn : t.tapToCheckOut}
                  </span>
                </>
              )}
              
              {/* Animated rings */}
              <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-2 animate-ping",
                (isVerifyLocationMode || isVerifySingleMode) && currentMode === "Out"
                  ? "border-amber-500/20"
                  : currentMode === 'Out' 
                    ? "border-emerald-500/20" 
                    : "border-amber-500/20"
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
                  {t.authRestricted}
                </p>
              </div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-widest leading-loose">
                {t.actionFailed}
              </h3>
              <p className="text-white/60 mt-2 max-w-xs text-sm font-medium">
                {locationError}
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

      {isVerifyLocationMode ? (
        <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex items-center gap-4 mb-2 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-300">
              {lang === "ar" ? "التحقق من موقع الموظف ثنائيا" : "Travel Verification Active"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_var(--color-amber-400)]" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80">
                {lang === "ar" ? "مسار التحقق ثنائي الإحداثيات (20 ثانية)" : "Dual GPS Coordinate Track (20s)"}
              </p>
            </div>
          </div>
          <p className="text-xs font-bold text-amber-400">
            {lang === "ar" ? "مفعل" : "Active"}
          </p>
        </div>
      ) : isVerifySingleMode ? (
        <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex items-center gap-4 mb-2 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-300">
              {lang === "ar" ? "التحقق من موقع الموظف ببصمة واحدة" : "Single GPS Verification Active"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_var(--color-amber-400)]" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80">
                {lang === "ar" ? "تسجيل الموقع وإرسال البصمة للشركة مباشرة" : "Location logged with coordinate transmission"}
              </p>
            </div>
          </div>
          <p className="text-xs font-bold text-amber-400">
            {lang === "ar" ? "مفعل" : "Active"}
          </p>
        </div>
      ) : (
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
      )}

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-surface-container border border-outline-variant rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">{t.logout}</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">
                {t.logoutConfirm}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-6 py-3 rounded-2xl border border-outline-variant text-sm font-bold uppercase tracking-widest hover:bg-surface-container-high transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 rounded-2xl bg-error text-white text-sm font-bold uppercase tracking-widest hover:bg-error/90 shadow-lg shadow-error/20 transition-all"
                >
                  {t.confirm}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
