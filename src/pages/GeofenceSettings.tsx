import React, { useState, useEffect } from "react";
import { Save, RefreshCcw, MapPin, Navigation } from "lucide-react";
import { Geofence } from "../types";
import { Header } from "../components/Navigation";
import { GeofenceMap } from "../components/GeofenceMap";

export default function GeofenceSettings() {
  const [geofence, setGeofence] = useState<Geofence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/geofence")
      .then(res => res.json())
      .then(data => {
        setGeofence(data);
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
    }).then(() => {
      setSaving(false);
      alert("Configuration updated successfully");
    });
  };

  if (loading || !geofence) return <div className="p-12 text-center">Loading configuration...</div>;

  return (
    <div className="min-h-screen bg-surface">
      <Header title="Geofence Settings" />
      
      <main className="lg:pl-[312px] p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-on-surface tracking-tight">Geofence Configuration</h3>
            <p className="text-sm text-on-surface-variant">Define the physical perimeter for attendance verification.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
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
                <button className="text-sm font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors w-full flex items-center justify-center gap-2 py-2">
                  <RefreshCcw className="w-4 h-4" />
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="xl:col-span-2">
              <GeofenceMap 
                geofence={geofence} 
                onUpdate={(lat, lng) => setGeofence({ ...geofence, latitude: lat, longitude: lng })}
              />
              <div className="mt-4 flex items-center gap-4 text-xs text-on-surface-variant bg-white p-4 rounded-xl border border-outline-variant">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span>Click anywhere on the map to reposition the fence center.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
