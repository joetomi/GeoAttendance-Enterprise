import React, { useState, useEffect } from "react";
import { Save, RefreshCcw, MapPin, Navigation, Plus, Trash2, Clock, Map, Crown } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Geofence } from "../types";
import { Header } from "../components/Navigation";
import { GeofenceMap } from "../components/GeofenceMap";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Language, translations } from "../constants/translations";
import { useLanguage } from "../contexts/LanguageContext";

export default function GeofenceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | number | null>(null);

  const featuresList = user?.features ? user.features.split(",") : ["Geofences", "Departments", "Employees"];
  const hasMultiGeofence = user?.role === "dev" || featuresList.includes("Multi_Geofence");

  useEffect(() => {
    if (user && user.role !== "ceo" && user.role !== "dev") {
      navigate("/admin");
      return;
    }

    fetchGeofences();
  }, [user, navigate]);

  const fetchGeofences = () => {
    setLoading(true);
    fetch("/api/geofence/list", {
      headers: { "X-Company-Id": user?.companyId || "" }
    })
      .then(res => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setGeofences(data);
          setSelectedId(data[0].id);
        } else {
          setGeofences([
            { id: 1, latitude: 32.374332461501005, longitude: 15.090419235262685, radius: 200, name: "HQ Main Entrance", startTime: "08:00", endTime: "17:00" }
          ]);
          setSelectedId(1);
        }
      })
      .catch(() => {
        const fallback = [
          { id: 1, latitude: 32.374332461501005, longitude: 15.090419235262685, radius: 200, name: "HQ Main Entrance", startTime: "08:00", endTime: "17:00" }
        ];
        setGeofences(fallback);
        setSelectedId(1);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getActiveGeofence = (): Geofence | null => {
    return geofences.find(gf => gf.id === selectedId) || null;
  };

  const updateActiveGeofenceState = (updates: Partial<Geofence>) => {
    setGeofences(prev => prev.map(gf => {
      if (gf.id === selectedId) {
        return { ...gf, ...updates };
      }
      return gf;
    }));
  };

  const addNewGeofence = () => {
    if (!hasMultiGeofence && geofences.length >= 1) {
      toast((t) => (
        <span className="flex items-center gap-2 font-semibold text-xs leading-5">
          <Crown className="w-5 h-5 text-amber-500 shrink-0" />
          <span>
            {lang === "ar" 
              ? "طور باقتك واشترك في باقة تفتح هذه الميزة" 
              : "Upgrade your subscription and subscribe to a plan that unlocks this feature"}
          </span>
        </span>
      ), {
        duration: 4000,
        style: {
          borderRadius: '16px',
          background: '#1e293b',
          color: '#fff',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }
      });
      return;
    }

    const newId = `temp_${Date.now()}`;
    const newFence: Geofence = {
      id: newId,
      name: lang === "ar" ? `نطاق جديد ${geofences.length + 1}` : `Scope Range ${geofences.length + 1}`,
      latitude: 32.374332461501005,
      longitude: 15.090419235262685,
      radius: 200,
      startTime: "08:00",
      endTime: "17:00"
    };

    setGeofences(prev => [...prev, newFence]);
    setSelectedId(newId);
    toast.success(lang === "ar" ? "تمت إضافة النطاق مؤقتاً! عدل الإحداثيات ثم احفظ." : "Scope added temporarily! Fine-tune and click Save.");
  };

  const handleDeleteClick = (idToDelete: string | number) => {
    if (geofences.length <= 1) {
      toast.error(lang === "ar" ? "يجب أن يكون هنالك نطاق بصمة واحد على الأقل" : "At least one fingerprint scope must exist.");
      return;
    }
    setTargetDeleteId(idToDelete);
    setShowConfirmModal(true);
  };

  const confirmDeleteGeofence = (idToDelete: string | number) => {
    if (String(idToDelete).startsWith("temp_")) {
      setGeofences(prev => {
        const filtered = prev.filter(gf => gf.id !== idToDelete);
        if (selectedId === idToDelete) {
          setSelectedId(filtered[0]?.id || null);
        }
        return filtered;
      });
      toast.success(lang === "ar" ? "تم حذف النطاق بنجاح" : "Scope removed successfully");
      return;
    }

    fetch(`/api/geofence/${idToDelete}`, {
      method: "DELETE",
      headers: {
        "X-Company-Id": user?.companyId || ""
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Delete failed");
        setGeofences(prev => {
          const filtered = prev.filter(gf => gf.id !== idToDelete);
          if (selectedId === idToDelete) {
            setSelectedId(filtered[0]?.id || null);
          }
          return filtered;
        });
        toast.success(lang === "ar" ? "تم حذف نطاق البصمة من الداتابيس بنجاح." : "Scope deleted from database successfully.");
      })
      .catch((err) => {
        toast.error(lang === "ar" ? "فشل حذف النطاق" : err.message);
      });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === "ar" ? "المتصفح لا يدعم تحديد الموقع." : "Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateActiveGeofenceState({
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6))
        });
        toast.success(lang === "ar" ? "تم تحديد موقعك الحالي تلقائياً" : "Current location detected successfully");
      },
      (err) => {
        alert(lang === "ar" ? "فشل تحديد الموقع. يرجى السماح بالوصول للموقع في إعدادات المتصفح." : "Failed to obtain location. Please grant permission in browser settings.");
      }
    );
  };

  const handleSaveActive = () => {
    const active = getActiveGeofence();
    if (!active) return;

    if (!active.name || active.name.trim() === "") {
      toast.error(lang === "ar" ? "اسم النطاق مطلوب" : "Scope name is required");
      return;
    }

    setSaving(true);
    fetch("/api/geofence", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Company-Id": user?.companyId || ""
      },
      body: JSON.stringify({ ...active, companyId: user?.companyId })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Update failed");
        toast.success(lang === "ar" ? "تم حفظ النطاق بنجاح" : "Scope configuration saved successfully");
        // Re-fetch to sync actual ids from server
        fetch("/api/geofence/list", {
          headers: { "X-Company-Id": user?.companyId || "" }
        })
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              setGeofences(data);
              // Find the saved one (maybe matches name and close lat coords)
              const saved = data.find(x => x.name === active.name) || data[0];
              setSelectedId(saved.id);
            }
          });
      })
      .catch(err => {
        const errorMsg = lang === "ar" ? "فشل التحديث" : err.message;
        toast.error(errorMsg);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  if (loading) return <div className="p-12 text-center text-sm font-bold text-outline">Loading configuration...</div>;

  const activeFence = getActiveGeofence();

  return (
    <div className="min-h-screen bg-surface bg-stars" dir={lang === "ar" ? "rtl" : "ltr"}>
      
      <main className="p-8 pb-32 transition-all">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-on-surface tracking-tight">
                {lang === "ar" ? "إعدادات النطاقات الجغرافية للبصمة" : t.geofenceTitle}
              </h3>
              <p className="text-sm text-on-surface-variant">
                {lang === "ar" ? "تحديد وإدارة النطاقات الجغرافية المتعددة التي يمكن للموظفين تسجيل بصماتهم بداخلها" : t.geofenceSub}
              </p>
            </div>
            
            <button
              onClick={addNewGeofence}
              className={cn(
                "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.98]",
                (!hasMultiGeofence && geofences.length >= 1)
                  ? "bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700 shadow-amber-500/5"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10"
              )}
            >
              {(!hasMultiGeofence && geofences.length >= 1) ? (
                <>
                  <Crown className="w-4 h-4 text-amber-400" />
                  {lang === "ar" ? "ترقية الباقة لمزيد من النطاقات" : "Upgrade Plan for More Scopes"}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {lang === "ar" ? "إضافة نطاق جديد" : "Add New Scope"}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mb-12">
            
            {/* Left Sidebar: Geofences List */}
            <div className="flex flex-col gap-6">
              <div className="card p-5 bg-surface-container border border-outline-variant/30 flex flex-col gap-4 bg-pattern-wavy">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-80 flex items-center gap-2">
                    <Map className="w-4 h-4 text-emerald-500" />
                    {lang === "ar" ? "نطاقات البصمة المتوفرة" : "Available Scopes"}
                  </h4>
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold">
                    {geofences.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {geofences.map((gf) => {
                    const isSelected = selectedId === gf.id;
                    const isTemp = String(gf.id).startsWith("temp_");
                    return (
                      <div
                        key={gf.id}
                        onClick={() => setSelectedId(gf.id)}
                        className={cn(
                          "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left rtl:text-right group relative",
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-md shadow-emerald-500/5"
                            : "bg-surface-container-high border-outline-variant/50 text-on-surface hover:bg-surface-container-highest"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-normal truncate flex items-center gap-2">
                            {gf.name || "HQ Scope"}
                            {isTemp && (
                              <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                {lang === "ar" ? "جديد" : "TEMP"}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-on-surface-variant opacity-70 mt-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-outline" />
                            <span>{gf.startTime || "08:00"} {lang === "ar" ? "إلى" : "to"} {gf.endTime || "17:00"}</span>
                            <span>•</span>
                            <span>{gf.radius}m</span>
                          </p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(gf.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all active:scale-90"
                          title={lang === "ar" ? "حذف النطاق" : "Delete Scope"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scope Editor Panel */}
              {activeFence && (
                <div className="card p-6 flex flex-col gap-6 bg-surface-container-high border border-outline-variant/40 bg-pattern-wavy">
                  <div className="space-y-4">
                    <div>
                      <label className="input-label">{t.fenceName}</label>
                      <input 
                        type="text" 
                        className="input-field py-2.5" 
                        value={activeFence.name}
                        onChange={(e) => updateActiveGeofenceState({ name: e.target.value })}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">{t.latitude}</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.000001" 
                            className={cn("input-field py-2.5", lang === "ar" ? "pl-10" : "pr-10")} 
                            value={activeFence.latitude}
                            onChange={(e) => updateActiveGeofenceState({ latitude: parseFloat(e.target.value) })}
                          />
                          <Navigation className={cn("absolute top-3.5 w-4 h-4 text-outline", lang === "ar" ? "left-3" : "right-3")} />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">{t.longitude}</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.000001" 
                            className={cn("input-field py-2.5", lang === "ar" ? "pl-10" : "pr-10")} 
                            value={activeFence.longitude}
                            onChange={(e) => updateActiveGeofenceState({ longitude: parseFloat(e.target.value) })}
                          />
                          <MapPin className={cn("absolute top-3.5 w-4 h-4 text-outline", lang === "ar" ? "left-3" : "right-3")} />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={detectLocation}
                      className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all duration-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold cursor-pointer border border-emerald-500/20"
                    >
                      <MapPin className="w-4 h-4 animate-pulse text-emerald-500" />
                      {lang === "ar" ? "تحديد إحداثياتي الحالية" : "Detect Current Location"}
                    </button>

                    <div>
                      <label className="input-label">{t.radius}</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          className={cn("input-field py-2.5", lang === "ar" ? "pl-14" : "pr-14")} 
                          value={activeFence.radius}
                          onChange={(e) => updateActiveGeofenceState({ radius: parseInt(e.target.value) || 200 })}
                        />
                        <span className={cn("absolute top-3.5 text-[10px] font-bold text-outline", lang === "ar" ? "left-3" : "right-3")}>
                          {lang === "ar" ? "متر" : "Meters"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">{lang === "ar" ? "وقت بدء الدوام" : "Work Start Time"}</label>
                        <input 
                          type="time" 
                          className="input-field text-center font-bold font-mono py-2.5" 
                          value={activeFence.startTime || "08:00"}
                          onChange={(e) => updateActiveGeofenceState({ startTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="input-label">{lang === "ar" ? "وقت انتهاء الدوام" : "Work End Time"}</label>
                        <input 
                          type="time" 
                          className="input-field text-center font-bold font-mono py-2.5" 
                          value={activeFence.endTime || "17:00"}
                          onChange={(e) => updateActiveGeofenceState({ endTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-outline-variant/30 space-y-3">
                    <button 
                      onClick={handleSaveActive}
                      disabled={saving}
                      className="w-full h-[45px] flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ إعدادات النطاق" : "Save Scope Properties")}
                    </button>
                    <button 
                      onClick={() => updateActiveGeofenceState({ radius: 200 })}
                      className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#ef4444] hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <RefreshCcw className="w-3 h-3 inline mr-1" />
                      {lang === "ar" ? "إعادة تعيين القطر الافتراضي (200 متر)" : "Reset Scope Radius (200m)"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Map Panel */}
            <div className="xl:col-span-2">
              {activeFence ? (
                <>
                  <GeofenceMap 
                    geofence={activeFence} 
                    onUpdate={(lat, lng) => updateActiveGeofenceState({ latitude: lat, longitude: lng })}
                  />
                  <div className="mt-4 flex items-center gap-4 text-xs text-on-surface-variant bg-surface-container p-4 rounded-xl border border-outline-variant">
                    <div className="flex items-center gap-2">
                      <div className="w-2, w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-on-surface">
                        {lang === "ar" 
                          ? `رؤية الخريطة لنطاق [${activeFence.name}]. يمكنك الضغط على أي مكان لتغيير مركز البصمة ولتسهيل تحديد النطاق الجديد.` 
                          : `Map showing current scope [${activeFence.name}]. Click anywhere on the map to re-center this scope range.`
                        }
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-sm font-bold border border-dashed border-outline-variant/50 rounded-xl text-outline-variant">
                  {lang === "ar" ? "اختر أو أنشئ نطاق بصمة لبدء الإدارة" : "Select or create a geofence scope to begin management."}
                </div>
              )}
            </div>
          </div>

          {/* New Informational Note banner for location verification features */}
          <div className="mt-6 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start gap-4" dir={lang === "ar" ? "rtl" : "ltr"}>
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <Navigation className="w-6 h-6 rotate-45" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-amber-400 text-sm">
                {lang === "ar" ? "تلميح إداري هام: التحقق الميداني والتحقق من الحركة" : "Important Administrator Note: Travel & Location Verification"}
              </h4>
              <p className="text-xs text-on-surface-variant/90 leading-relaxed">
                {lang === "ar" 
                  ? "يمكنك إلغاء النطاقات الجغرافية التقليدية للفروع بالكامل وجعل البصمة مفتوحة للموظفين الميدانيين أو المسوقين. حيث يرسل الموظف موقعه الحالي بنقرة واحدة مباشرة، أو يتحقق المدير من بدء حركته وخروجه على الطريق عبر البصمة المزدوجة (تأخذ بصمتين تفصل بينهما 20 ثانية لتتبع قطع المسافة)." 
                  : "You can completely bypass traditional geofences for field, sales, or marketing staff. This allows employees to either submit their current GPS coordinates instantly via a single stamp, or perform a double-stamp movement verification (two coordinates gathered 20s apart) to verify active travel."}
              </p>
              <p className="text-[11px] text-amber-500/90 font-semibold pt-1">
                {lang === "ar"
                  ? "💡 للوصول إليها وتفعيلها: اذهب إلى شاشة إدارة الموظفين (أضف/عدل موظف)، أو اذهب إلى شاشة الأقسام لتطبيق ميزة التحقق بالبصمة الواحدة أو المزدوجة على القسم بالكامل."
                  : "💡 How to access: Go to Employees (Add/Edit Employee), or go to Departments to configure single/double location verification settings for the entire department."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-high border border-outline-variant/60 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-up" dir={lang === "ar" ? "rtl" : "ltr"}>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/15 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">
                {lang === "ar" ? "تأكيد حذف النطاق" : "Confirm Deletion"}
              </h3>
              <p className="text-xs text-on-surface-variant/95 mb-6 leading-relaxed">
                {lang === "ar" ? "هل أنت متأكد من حذف النطاق؟" : "Are you sure you want to delete the geofence?"}
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (targetDeleteId !== null) {
                      confirmDeleteGeofence(targetDeleteId);
                    }
                    setShowConfirmModal(false);
                    setTargetDeleteId(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 shadow-md shadow-red-600/15 cursor-pointer"
                >
                  {lang === "ar" ? "نعم، احذف" : "Yes, Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setTargetDeleteId(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-on-surface text-xs font-bold rounded-xl transition-all duration-200 border border-outline-variant active:scale-95 cursor-pointer"
                >
                  {lang === "ar" ? "تراجع" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
