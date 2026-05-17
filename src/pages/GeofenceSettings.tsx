import React, { useState, useEffect } from "react";
import { Save, RefreshCcw, MapPin, Navigation, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Geofence } from "../types";
import { Header } from "../components/Navigation";
import { GeofenceMap } from "../components/GeofenceMap";

export default function GeofenceSettings() {
  const [geofence, setGeofence] = useState<Geofence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Password change state
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
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
  }, []);

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
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      })
      .catch(err => {
        alert(err.message);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("Passwords do not match");
      return;
    }

    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    setPassLoading(true);
    fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminId: user.id,
        currentPassword: passwords.current,
        newPassword: passwords.new
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          alert("Password updated successfully");
          setPasswords({ current: "", new: "", confirm: "" });
        } else {
          alert(data.error || "Failed to update password");
        }
      })
      .catch(() => alert("Connection error"))
      .finally(() => setPassLoading(false));
  };

  if (loading || !geofence) return <div className="p-12 text-center">Loading configuration...</div>;

  return (
    <div className="min-h-screen bg-surface relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[100] flex items-center gap-3 bg-secondary text-white px-6 py-3 rounded-2xl shadow-2xl shadow-secondary/20 border border-white/10"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Update Success</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Header title="Geofence Settings" />
      
      <main className="lg:pl-[312px] p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-on-surface tracking-tight">Geofence Configuration</h3>
            <p className="text-sm text-on-surface-variant">Define the physical perimeter for attendance verification.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start mb-12">
            <div className="card p-6 flex flex-col gap-6">
              <div className="space-y-4">
                <div>
                  <label className="input-label">Fence Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={geofence.name}
                    onChange={(e) => setGeofence({ ...geofence, name: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Latitude</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.000001" 
                        className="input-field pr-10" 
                        value={geofence.latitude}
                        onChange={(e) => setGeofence({ ...geofence, latitude: parseFloat(e.target.value) })}
                      />
                      <Navigation className="absolute right-3 top-3.5 w-4 h-4 text-outline" />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Longitude</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.000001" 
                        className="input-field pr-10" 
                        value={geofence.longitude}
                        onChange={(e) => setGeofence({ ...geofence, longitude: parseFloat(e.target.value) })}
                      />
                      <MapPin className="absolute right-3 top-3.5 w-4 h-4 text-outline" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="input-label">Radius (Meters)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="input-field pr-10" 
                      value={geofence.radius}
                      onChange={(e) => setGeofence({ ...geofence, radius: parseInt(e.target.value) })}
                    />
                    <span className="absolute right-3 top-3.5 text-xs font-bold text-outline">Meters</span>
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
                  {saving ? "Updating..." : "Update Configuration"}
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
                  <span>Click anywhere on the map to reposition the fence center.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 pt-8 border-t border-outline-variant">
            <h3 className="text-2xl font-bold text-on-surface tracking-tight">Security Access</h3>
            <p className="text-sm text-on-surface-variant">Manage your administrative credentials.</p>
          </div>

          <div className="card p-8 max-w-2xl bg-surface-container">
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="input-label">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-outline" />
                      <input 
                        type="password" 
                        className="input-field pl-12 bg-surface" 
                        placeholder="Required to verify"
                        value={passwords.current}
                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="input-label">New Password</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-3.5 w-4 h-4 text-outline" />
                      <input 
                        type="password" 
                        className="input-field pl-12 bg-surface" 
                        placeholder="Complex string recommended"
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Confirm New Password</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-3.5 w-4 h-4 text-outline" />
                      <input 
                        type="password" 
                        className="input-field pl-12 bg-surface" 
                        placeholder="Re-enter password"
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={passLoading}
                  className="btn-primary w-full md:w-auto px-12"
                >
                  {passLoading ? "Processing..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
