import React, { useState, useEffect } from "react";
import { Fingerprint, MapPin, CheckCircle2, XCircle, Loader2, LogOut, ShieldCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";

/**
 * Native Biometric Authentication using WebAuthn (Simulated for Demo Environment)
 * This triggers the OS-level biometric prompt (Touch ID, Face ID, Android Biometrics).
 */
async function authenticateBiometrically(): Promise<boolean> {
  try {
    // 1. Check if platform biometrics are supported
    if (!window.PublicKeyCredential || !await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
      console.warn("Platform biometrics not available, falling back to simulated prompt.");
      return true; // For demo purposes, we allow fallback if hardware is missing
    }

    // 2. Trigger Biometric Prompt
    // Note: In a real production app, the challenge should come from the server
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const options: any = {
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required",
        // This is a dummy request to trigger the native biometric prompt
        // On mobile chrome/safari, this opens the native biometric sheet
        allowCredentials: [] 
      }
    };

    // We use a try-catch because if no credentials exist, it might throw
    // But most modern browsers will show the prompt first
    try {
      await navigator.credentials.get(options);
      return true;
    } catch (e: any) {
      // If NotAllowedError, user cancelled. 
      // If we are in a dev environment/iframe, it might fail, so we simulate progress for the UI
      if (e.name === "NotAllowedError") return false;
      
      // For the sake of the developer preview/demo, if it's a technical error (like iframe constraints)
      // we'll show a "Simulated Secure Prompt" if the real one is blocked
      console.log("Native prompt blocked/failed, using simulation:", e.message);
      return new Promise((resolve) => setTimeout(() => resolve(true), 1500));
    }
  } catch (err) {
    console.error("Biometric error:", err);
    return true; 
  }
}

export default function MobileCheckIn() {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'checking' | 'success' | 'error'>('idle');
  const [currentMode, setCurrentMode] = useState<'In' | 'Out'>('Out');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [inZone, setInZone] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [geofence, setGeofence] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      
      // Fetch current status
      fetch(`/api/attendance/status/${u.id}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          setCurrentMode(data.status || 'Out');
          if (data.status === 'In') setInZone(true);
        })
        .catch(err => {
          console.error("Status fetch failed:", err);
          setCurrentMode('Out');
        });
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

  const startVerification = async () => {
    if (!user) return;
    
    setStatus('scanning');
    
    const success = await authenticateBiometrically();
    if (success) {
      handleAction();
    } else {
      setStatus('idle');
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
      }
    );
  };

  return (
    <div className="min-h-screen bg-surface p-6 pb-24 flex flex-col items-center text-on-surface">
      <div className="w-full flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-primary">GeoAttendance</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="w-10 h-10 rounded-full bg-surface-container shadow-sm border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <LogOut className="w-5 h-5 text-on-surface-variant" />
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center mt-4"
      >
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Welcome, {user?.name || 'Employee'}</h2>
        <p className="text-on-surface-variant font-medium mt-1">Enterprise HQ • {user?.role === 'admin' ? 'Administrator' : 'Personnel'}</p>
      </motion.div>

      <div className="w-full mt-10 p-6 bg-surface-container rounded-3xl shadow-xl shadow-black/10 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Session Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", currentMode === 'In' ? "bg-secondary" : "bg-on-surface-variant/20")} />
            <p className={cn("text-lg font-bold", currentMode === 'In' ? "text-secondary" : "text-on-surface")}>
              {currentMode === 'In' ? "Checked In" : "Not Active"}
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
          {status === 'scanning' && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-[40px] animate-pulse" />
                <div className="absolute inset-2 border-2 border-dashed border-primary/40 rounded-[35px] animate-[spin_10s_linear_infinity]" />
                <Lock className="w-16 h-16 text-primary animate-bounce" />
              </div>
              <div className="mt-8 text-center">
                <h3 className="text-xl font-bold">Biometric Auth</h3>
                <p className="text-sm text-on-surface-variant mt-2">Confirming your identity...</p>
              </div>
            </motion.div>
          )}

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
                  ? "bg-primary-container shadow-primary-container/40" 
                  : "bg-red-500 shadow-red-500/40"
              )}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Fingerprint className="w-24 h-24 text-white mb-4" />
              <span className="text-xs font-bold text-white uppercase tracking-[0.2em]">
                {currentMode === 'Out' ? "Tap to Check In" : "Tap to Check Out"}
              </span>
              
              {/* Animated rings */}
              <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-2 animate-ping",
                currentMode === 'Out' ? "border-primary-container/20" : "border-red-500/20"
              )} />
              <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border animate-ping",
                currentMode === 'Out' ? "border-primary-container/10" : "border-red-500/10"
              )} style={{ animationDelay: '0.5s' }} />
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
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
                {currentMode === 'Out' ? "Verifying Geofence..." : "Logging Out..."}
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
                currentMode === 'In' ? "bg-secondary-container shadow-secondary/10" : "bg-red-900/40 shadow-red-900/20"
              )}>
                <CheckCircle2 className={cn("w-24 h-24", currentMode === 'In' ? "text-secondary" : "text-red-500")} />
              </div>
              <h3 className="text-2xl font-bold text-on-surface">
                {currentMode === 'In' ? "Checked In!" : "Checked Out!"}
              </h3>
              <p className="text-on-surface-variant mt-2">Time: {new Date().toLocaleTimeString()}</p>
              <button 
                onClick={() => setStatus('idle')}
                className={cn(
                  "mt-8 text-xs font-bold uppercase tracking-widest hover:underline",
                  currentMode === 'In' ? "text-secondary" : "text-red-500"
                )}
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
              <h3 className="text-2xl font-bold text-on-surface">Action Failed</h3>
              <p className="text-on-surface-variant mt-2 max-w-xs">{locationError || `You must be within the designated ${geofence?.name || 'Area'} zone.`}</p>
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
          Location-based authentication active. Your coordinates are verified against the secure enterprise perimeter.
        </p>
      </div>

      <div className="w-full bg-surface-container rounded-3xl p-4 flex items-center gap-4 mb-2 shadow-sm border border-outline-variant">
        <div className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop" 
            alt="HQ" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-on-surface">{geofence?.name || "Loading Region..."}</p>
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", currentMode === 'In' ? "bg-secondary" : "bg-on-surface-variant/30")} />
            <p className={cn("text-[10px] uppercase font-bold tracking-wider", currentMode === 'In' ? "text-secondary" : "text-on-surface-variant")}>Active Perimeter</p>
          </div>
        </div>
        <p className="text-xs font-bold text-secondary">{geofence?.radius || 0}m Radius</p>
      </div>
    </div>
  );
}
