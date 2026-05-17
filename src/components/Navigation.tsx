import React, { useState, useEffect } from "react";
import { 
  Users, 
  MapPin, 
  Settings, 
  LogOut, 
  HelpCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Wallet,
  Globe,
  ChevronDown,
  Check
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { translations, Language } from "../constants/translations";
import { useLanguage } from "../contexts/LanguageContext";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const navItems = [
    { icon: Users, label: t.navEmployees, path: "/admin" },
    { icon: MapPin, label: t.navGeofence, path: "/geofence" },
    { icon: Wallet, label: t.navPayroll, path: "/payroll" },
  ];

  return (
    <aside className={cn(
      "fixed top-0 h-full w-[280px] bg-primary-container hidden lg:flex flex-col z-40 transition-all",
      lang === "ar" ? "right-0 border-l border-white/10" : "left-0 border-r border-white/10",
      className
    )}>
      <div className="px-6 py-8">
        <h1 className="text-xl text-white font-bold tracking-tight">GeoAttendance</h1>
        <p className="text-xs text-on-primary-container mt-1 uppercase tracking-widest font-medium opacity-70">
          {lang === "ar" ? "إدارة المؤسسة" : "Enterprise Admin"}
        </p>
      </div>

      <nav className="flex-1 flex flex-col mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-6 py-4 transition-all duration-200 border-primary",
                isActive 
                  ? cn("bg-white/10 text-white", lang === "ar" ? "border-r-4" : "border-l-4")
                  : "border-transparent text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 text-white/60 px-6 py-6 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">{t.logout}</span>
        </button>
        <div className="px-6 pb-8 flex items-center gap-3">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop" 
            alt="Admin" 
            className="w-10 h-10 rounded-full border-2 border-secondary-container"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{t.adminSupport}</p>
            <a 
              href="https://wa.me/218910078707" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] uppercase text-white font-bold tracking-wider hover:underline block opacity-80 hover:opacity-100 transition-opacity"
            >
              {t.contactCorporate}
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Header({ title }: { title: string }) {
  const { lang, t, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleLangChange = (l: Language) => {
    setLanguage(l);
    setShowLangMenu(false);
  };

  return (
    <header className={cn(
      "flex justify-between items-center w-full px-8 py-4 transition-all z-30 border-b border-outline-variant bg-surface-container sticky top-0",
      lang === "ar" ? "lg:pr-[312px] lg:pl-8" : "lg:pl-[312px] lg:pr-8"
    )}>
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-primary">
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Language Selector */}
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-surface-container-high border border-outline-variant/30 px-3 py-1.5 rounded-xl hover:bg-surface-container-highest transition-colors"
          >
            <span className="text-sm">{t.langFlag}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface hidden sm:inline">{t.langName}</span>
            <ChevronDown className={cn("w-3 h-3 text-on-surface-variant transition-transform", showLangMenu && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showLangMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute mt-2 w-40 bg-surface-container-highest border border-outline-variant rounded-xl shadow-2xl p-1 z-50",
                  lang === "ar" ? "left-0" : "right-0"
                )}
              >
                {(["en", "ar"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLangChange(l)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all",
                      lang === l ? "bg-primary text-white" : "hover:bg-surface-container-high text-on-surface-variant"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{translations[l].langFlag}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{translations[l].langName}</span>
                    </div>
                    {lang === l && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden md:flex items-center bg-surface-container-high rounded-full px-4 py-2 w-64 border border-outline-variant">
          <Search className={cn("w-4 h-4 text-on-surface-variant", lang === "ar" ? "ml-2" : "mr-2")} />
          <input 
            type="text" 
            placeholder={lang === "ar" ? "بحث..." : "Search directory..."} 
            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;
  const isAdmin = user?.role === "admin";

  const items = [
    { icon: MapPin, label: lang === "ar" ? "تسجيل الحضور" : "Check In", path: "/check-in" },
    ...(isAdmin ? [
      { icon: Users, label: t.navEmployees, path: "/admin" }
    ] : [])
  ];

  return (
    <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center bg-primary-container p-2 rounded-2xl shadow-2xl" dir={lang === "ar" ? "rtl" : "ltr"}>
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
              isActive ? "bg-secondary-container text-on-secondary-container" : "text-white/60"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </Link>
        );
      })}
      {!isAdmin && (
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-white/60 hover:text-white transition-all"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{t.logout}</span>
        </button>
      )}
    </nav>
  );
}
