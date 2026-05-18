import React, { useState, useEffect } from "react";
import { 
  Users, 
  MapPin, 
  Settings, 
  LogOut, 
  HelpCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Wallet,
  Globe,
  ChevronDown,
  Check,
  Building2
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { translations, Language } from "../constants/translations";
import { Logo } from "./Logo";

interface SidebarProps {
  className?: string;
}

export function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isAdmin = user?.role === "admin" || user?.role === "ceo";

  const navItems = [
    ...(isAdmin ? [
      { icon: Users, label: t.navEmployees, path: "/admin" },
      { icon: Building2, label: t.navDepartments, path: "/departments" },
      { icon: MapPin, label: t.navGeofence, path: "/geofence" },
      { icon: Wallet, label: t.navPayroll, path: "/payroll" },
    ] : [
      { icon: MapPin, label: lang === "ar" ? "تسجيل الحضور" : "Check In", path: "/check-in" },
    ]),
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: lang === "ar" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: lang === "ar" ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "absolute top-0 bottom-0 w-[280px] bg-primary-container flex flex-col",
                lang === "ar" ? "right-0 rounded-l-3xl" : "left-0 rounded-r-3xl"
              )}
            >
              <div className="px-6 py-8 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Logo className="w-10 h-10 text-emerald-400" />
                  <div>
                    <h1 className="text-xl text-white font-bold tracking-tight">GeoAttendance</h1>
                    <p className="text-xs text-on-primary-container mt-1 uppercase tracking-widest font-medium opacity-70">
                      {isAdmin ? (lang === "ar" ? "إدارة المؤسسة" : "Enterprise Admin") : (lang === "ar" ? "بوابة الموظف" : "Employee Portal")}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 flex flex-col mt-4">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
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
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center gap-3 text-white/60 px-6 py-6 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">{t.logout}</span>
                </button>
                <div className="px-6 pb-8 flex items-center gap-3">
                  <img 
                    src={user?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop"} 
                    alt="User" 
                    className="w-10 h-10 rounded-xl object-cover border-2 border-secondary-container"
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user?.name || t.adminSupport}</p>
                    <p className="text-[10px] uppercase text-white font-bold tracking-wider opacity-60">
                      {user?.department || "Corporate"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-inner"
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
    </>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isAdmin = user?.role === "admin" || user?.role === "ceo";

  const navItems = [
    ...(isAdmin ? [
      { icon: Users, label: t.navEmployees, path: "/admin" },
      { icon: Building2, label: t.navDepartments, path: "/departments" },
      { icon: MapPin, label: t.navGeofence, path: "/geofence" },
      { icon: Wallet, label: t.navPayroll, path: "/payroll" },
    ] : [
      { icon: MapPin, label: lang === "ar" ? "تسجيل الحضور" : "Check In", path: "/check-in" },
    ]),
  ];

  return (
    <>
      <aside className={cn(
        "fixed top-0 h-full w-[280px] bg-primary-container hidden lg:flex flex-col z-40 transition-all",
        lang === "ar" ? "right-0 border-l border-white/10" : "left-0 border-r border-white/10",
        className
      )}>
        <div className="px-6 py-8 flex items-center gap-3">
          <Logo className="w-10 h-10 text-emerald-400" />
          <div>
            <h1 className="text-xl text-white font-bold tracking-tight">GeoAttendance</h1>
            <p className="text-xs text-on-primary-container mt-1 uppercase tracking-widest font-medium opacity-70">
              {lang === "ar" ? "إدارة المؤسسة" : "Enterprise Admin"}
            </p>
          </div>
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
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 text-white/60 px-6 py-6 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">{t.logout}</span>
          </button>
          <div className="px-6 pb-8 flex items-center gap-3">
            <img 
              src={user?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop"} 
              alt="Admin" 
              className="w-10 h-10 rounded-xl object-cover border-2 border-secondary-container"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name || t.adminSupport}</p>
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
    </>
  );
}

export function Header({ title, onMenuClick }: { title: string; onMenuClick?: () => void }) {
  const { lang, t, setLanguage } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "ceo";

  const handleLangChange = (l: Language) => {
    setLanguage(l);
    setShowLangMenu(false);
  };

  const handleToggleNotif = () => {
    setShowNotifMenu(!showNotifMenu);
    if (showLangMenu) setShowLangMenu(false);
  };

  return (
    <header className={cn(
      "flex justify-between items-center w-full px-6 py-4 transition-all z-30 border-b border-outline-variant bg-surface-container sticky top-0",
      lang === "ar" ? "lg:pr-[312px] lg:pl-8" : "lg:pl-[312px] lg:pr-8"
    )}>
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Language Selector */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowLangMenu(!showLangMenu);
              if (showNotifMenu) setShowNotifMenu(false);
            }}
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
          {/* Notification Bell */}
          {isAdmin && (
            <div className="relative">
              <button 
                onClick={handleToggleNotif}
                className={cn(
                  "p-2 transition-colors rounded-full relative",
                  showNotifMenu ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-[10px] text-white font-bold flex items-center justify-center rounded-full border-2 border-surface-container">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifMenu && (
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                )}
                {showNotifMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      "absolute mt-2 w-80 bg-[#1E1E1E] border border-outline-variant rounded-2xl shadow-2xl overflow-hidden z-50",
                      lang === "ar" ? "left-0" : "right-0"
                    )}
                    dir={lang === "ar" ? "rtl" : "ltr"}
                  >
                    <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-[#1A1A1A]">
                      <h3 className="text-sm font-bold text-on-surface">{t.notifications}</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                          className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline"
                        >
                          {t.markAllRead}
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="flex flex-col">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => !notif.isRead && markAsRead(notif.id)}
                              className={cn(
                                "p-4 border-b border-outline-variant/30 transition-colors cursor-pointer flex gap-4",
                                notif.isRead ? "opacity-60 bg-transparent" : "bg-primary/5 hover:bg-primary/10"
                              )}
                            >
                              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                                <span className="text-sm font-bold">{notif.employeeName.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface truncate">
                                  {notif.employeeName}
                                </p>
                                <p className="text-xs text-on-surface-variant line-clamp-1">
                                  {lang === "ar" ? `${notif.action} - ${notif.department}` : `${notif.action} - ${notif.department}`}
                                </p>
                                <p className="text-[10px] text-primary font-medium mt-1">
                                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {!notif.isRead && (
                                <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-on-surface-variant mx-auto mb-3 opacity-20" />
                          <p className="text-sm text-on-surface-variant opacity-60">{t.noNotifications}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Help / About Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface-container border border-outline-variant rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <button 
                onClick={() => setShowHelpModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>

              <div className="mb-8">
                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 p-4 border border-outline-variant/30 text-emerald-500">
                  <Logo className="w-full h-full" />
                </div>
                <h3 className="text-2xl font-bold text-on-surface">{t.aboutTitle}</h3>
                <p className="text-sm text-primary font-bold uppercase tracking-widest mt-1">
                  {t.aboutSub}
                </p>
              </div>

              <div className="space-y-6 pt-6 border-t border-outline-variant/30 text-start">
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1 opacity-60">
                    {t.developerInfo}
                  </label>
                  <p className="text-lg font-bold text-on-surface">{t.developerName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1 opacity-60">
                      {t.systemVersion}
                    </label>
                    <p className="text-sm font-medium text-on-surface">v2.4.0-Enterprise</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1 opacity-60">
                      {t.releaseDate}
                    </label>
                    <p className="text-sm font-medium text-on-surface">{t.may2024}</p>
                  </div>
                </div>
              </div>

              <p className="mt-10 text-[10px] text-on-surface-variant opacity-40 text-center">
                {t.copyright}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
