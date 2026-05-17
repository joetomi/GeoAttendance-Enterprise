import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, User, MapPin, Globe, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { Language, translations } from "../constants/translations";
import { useLanguage } from "../contexts/LanguageContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { lang, t, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data));
        if (data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/check-in");
        }
      } else {
        setError(data.error || t.errorFailed);
      }
    } catch (err) {
      setError(t.errorConnection);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-surface bg-stars" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Language Selector */}
      <div className={cn(
        "absolute top-6 z-50",
        lang === "ar" ? "left-6" : "right-6"
      )}>
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-3 bg-surface-container-high border border-outline-variant/30 px-4 py-2 rounded-2xl hover:bg-surface-container-highest transition-colors shadow-lg"
          >
            <span className="text-lg">{t.langFlag}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface">{t.langName}</span>
            <ChevronDown className={cn("w-4 h-4 text-on-surface-variant transition-transform", showLangMenu && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute mt-3 w-48 bg-surface-container-highest border border-outline-variant rounded-2xl shadow-2xl p-2 overflow-hidden",
                  lang === "ar" ? "left-0" : "right-0"
                )}
              >
                {(["en", "ar"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLanguage(l);
                      setShowLangMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all",
                      lang === l ? "bg-primary text-white" : "hover:bg-surface-container-high text-on-surface-variant"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{translations[l].langFlag}</span>
                      <span className="text-xs font-bold uppercase tracking-widest">{translations[l].langName}</span>
                    </div>
                    {lang === l && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-8 md:p-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="flex flex-col items-center mb-12 text-center">
            <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-container/20">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">GeoAttendance</h1>
            <p className="text-on-surface-variant mt-2 font-medium opacity-70">{t.subtitle}</p>
          </div>

          <div className="card p-8 md:p-10 shadow-xl shadow-black/5 bg-pattern-wavy">
            <h2 className="text-xl font-bold text-on-surface mb-8 text-center tracking-tight">{t.welcome}</h2>
            
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-error-container text-on-error-container p-3 rounded-lg text-xs font-bold text-center border border-error/20">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="input-label block">{t.username}</label>
                <div className="relative">
                  <User className={cn(
                    "absolute top-3.5 w-5 h-5 text-outline",
                    lang === "ar" ? "right-4" : "left-4"
                  )} />
                  <input 
                    type="text" 
                    placeholder={t.usernamePlaceholder} 
                    className={cn(
                      "input-field",
                      lang === "ar" ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
                    )}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="input-label block">{t.password}</label>
                </div>
                <div className="relative">
                  <Lock className={cn(
                    "absolute top-3.5 w-5 h-5 text-outline",
                    lang === "ar" ? "right-4" : "left-4"
                  )} />
                  <input 
                    type="password" 
                    placeholder={t.passwordPlaceholder} 
                    className={cn(
                      "input-field",
                      lang === "ar" ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
                    )}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-secondary w-full py-4 text-xs font-bold uppercase tracking-widest mt-4 disabled:opacity-50"
              >
                {loading ? t.verifying : t.login}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[10px] text-on-surface-variant opacity-50 uppercase tracking-[0.3em] font-bold">{t.secureGateway}</p>
            </div>
          </div>

          <footer className="mt-12 flex flex-col items-center gap-4">
            <p className="text-[10px] font-medium text-outline">{t.copyright}</p>
          </footer>
        </motion.div>
      </div>

      {/* Decorative Side Panel */}
      <div className="hidden lg:block relative bg-primary-container overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop" 
            alt="Office" 
            className="w-full h-full object-cover grayscale"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-primary-container/60 to-transparent flex items-end p-20 z-10">
          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, x: lang === "ar" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-4xl font-bold text-white mb-4 tracking-tight">{t.promoTitle}</h3>
              <p className="text-on-primary-container text-lg leading-relaxed font-medium">
                {t.promoText}
              </p>
              <div className="mt-8 flex gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-12 h-1 bg-secondary rounded-full opacity-30" />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
