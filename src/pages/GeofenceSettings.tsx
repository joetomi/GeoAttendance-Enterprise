import React, { useState, useEffect } from "react";
import { Save, RefreshCcw, MapPin, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  const [geofence, setGeofence] = useState<Geofence | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { lang, t } = useLanguage();

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== "ceo" && user.role !== "dev") {
      navigate("/admin");
      return;
    }

    fetch("/api/geofence")
      .then(res => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then(data => {
        setGeofence(data);
      })
      .catch(() => {
        // Fallback for demo
        setGeofence({ latitude: 34.0522, longitude: -118.2437, radius: 200, name: "HQ Main Entrance" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, navigate]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === "ar" ? "المتصفح لا يدعم تحديد الموقع." : "Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeofence(prev => prev ? {
          ...prev,
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6))
        } : null);
      },
      (err) => {
        alert(lang === "ar" ? "فشل تحديد الموقع. يرجى السماح بالوصول للموقع." : "Failed to obtain location. Please grant permission.");
      }
    );
  };

  const handleSave = () => {
    if (!geofence) return;
    setSaving(true);
    fetch("/api/geofence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geofence)
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Update failed");
        const msg = lang === "ar" ? "تم التحديث بنجاح" : "Configuration updated successfully";
        toast.success(msg);
      })
      .catch(err => {
        const errorMsg = lang === "ar" ? "فشل التحديث" : err.message;
        toast.error(errorMsg);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  if (loading || !geofence) return <div className="p-12 text-center">Loading configuration...</div>;

  return (
    <div className="min-h-screen bg-surface bg-stars" dir={lang === "ar" ? "rtl" : "ltr"}>
      
      <main className="p-8 pb-32 transition-all">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-on-surface tracking-tight">{t.geofenceTitle}</h3>
            <p className="text-sm text-on-surface-variant">{t.geofenceSub}</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mb-12">
            <div className="card p-6 flex flex-col gap-6 bg-pattern-wavy">
              <div className="space-y-4">
                <div>
                  <label className="input-label">{t.fenceName}</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={geofence.name}
                    onChange={(e) => setGeofence({ ...geofence, name: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">{t.latitude}</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.000001" 
                        className={cn("input-field", lang === "ar" ? "pl-10" : "pr-10")} 
                        value={geofence.latitude}
                        onChange={(e) => setGeofence({ ...geofence, latitude: parseFloat(e.target.value) })}
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
                        className={cn("input-field", lang === "ar" ? "pl-10" : "pr-10")} 
                        value={geofence.longitude}
                        onChange={(e) => setGeofence({ ...geofence, longitude: parseFloat(e.target.value) })}
                      />
                      <MapPin className={cn("absolute top-3.5 w-4 h-4 text-outline", lang === "ar" ? "left-3" : "right-3")} />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={detectLocation}
                  className="w-full py-3 px-4 bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container border border-outline-variant hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300 rounded-xl flex items-center justify-center gap-2 text-xs font-bold font-sans cursor-pointer"
                >
                  <MapPin className="w-4 h-4 animate-pulse text-secondary" />
                  {lang === "ar" ? "حدد موقعي تلقائي" : "Auto Detect Location"}
                </button>

                <div>
                  <label className="input-label">{t.radius}</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className={cn("input-field", lang === "ar" ? "pl-10" : "pr-10")} 
                      value={geofence.radius}
                      onChange={(e) => setGeofence({ ...geofence, radius: parseInt(e.target.value) })}
                    />
                    <span className={cn("absolute top-3.5 text-[10px] font-bold text-outline", lang === "ar" ? "left-3" : "right-3")}>
                      {lang === "ar" ? "متر" : "Meters"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">{lang === "ar" ? "وقت بدء العمل" : "Work Start Time"}</label>
                    <input 
                      type="time" 
                      className="input-field text-center font-bold font-mono" 
                      value={geofence.startTime || "08:00"}
                      onChange={(e) => setGeofence({ ...geofence, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="input-label">{lang === "ar" ? "وقت نهاية العمل" : "Work End Time"}</label>
                    <input 
                      type="time" 
                      className="input-field text-center font-bold font-mono" 
                      value={geofence.endTime || "17:00"}
                      onChange={(e) => setGeofence({ ...geofence, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-secondary w-full"
                >
                  <Save className="w-5 h-5" />
                  {saving ? (lang === "ar" ? "جاري التحديث..." : "Updating...") : t.updateConfig}
                </button>
                <button 
                  onClick={() => setGeofence({ ...geofence, radius: 200 })}
                  className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <RefreshCcw className="w-3 h-3 inline mr-2" />
                  {t.resetDefault}
                </button>
              </div>
            </div>

            <div className="xl:col-span-2">
              <GeofenceMap 
                geofence={geofence} 
                onUpdate={(lat, lng) => setGeofence({ ...geofence, latitude: lat, longitude: lng })}
              />
              <div className="mt-4 flex items-center gap-4 text-xs text-on-surface-variant bg-surface-container p-4 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span>{t.mapInstruction}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
