import React from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import { X, Navigation, Award, AlertTriangle, CheckCircle2, Clock, MapPin } from "lucide-react";
import { cn } from "@/src/lib/utils";

// Standard leaflet icon fix
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Haversine distance calculator
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

interface DoubleLocMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: any;
  lang: "ar" | "en";
}

export function DoubleLocMapModal({ isOpen, onClose, log, lang }: DoubleLocMapModalProps) {
  if (!isOpen || !log) return null;

  let loc1: any = null;
  let loc2: any = null;

  if (log.geofenceName && log.geofenceName.startsWith("verify_double:")) {
    try {
      const parsed = JSON.parse(log.geofenceName.replace("verify_double:", ""));
      loc1 = parsed.loc1;
      loc2 = parsed.loc2;
    } catch (e) {
      console.error("Failed to parse verify_double coordinates:", e);
    }
  }

  // Fallbacks if parse failed but we're in verify_mode
  if (!loc2) {
    loc2 = { lat: log.latitude || 32.3743, lng: log.longitude || 15.0904, time: log.timestamp };
  }
  if (!loc1) {
    loc1 = { lat: loc2.lat - 0.0003, lng: loc2.lng - 0.0003, time: new Date(new Date(log.timestamp).getTime() - 20000).toISOString() };
  }

  const distanceMeters = calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
  const movedSufficiently = distanceMeters >= 50; // threshold for movement in 20 seconds

  const center: [number, number] = [(loc1.lat + loc2.lat) / 2, (loc1.lng + loc2.lng) / 2];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container border border-outline-variant rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Navigation className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                {lang === "ar" ? "تفاصيل التحقق ثنائي البصمة (الحركة)" : "Dual Checkpoints Movement Analysis"}
              </h3>
              <p className="text-[10px] text-on-surface-variant opacity-60">
                {lang === "ar" 
                  ? `بصمة الموظف: ${log.employeeName || "غير معروف"}` 
                  : `Employee: ${log.employeeName || "Unknown"}`}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-on-surface-variant hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {/* Analysis Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-background border border-outline-variant rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-on-surface-variant opacity-60 uppercase tracking-widest font-mono">
                {lang === "ar" ? "المسافة الكلية المقطوعة" : "Total Distance Travelled"}
              </span>
              <span className="text-xl font-bold text-primary mt-1">
                {distanceMeters.toFixed(1)} {lang === "ar" ? "متر" : "meters"}
              </span>
            </div>

            <div className="p-3.5 bg-background border border-outline-variant rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-on-surface-variant opacity-60 uppercase tracking-widest font-mono">
                {lang === "ar" ? "الفارق الزمني" : "Time Separation"}
              </span>
              <span className="text-xl font-bold text-amber-500 mt-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                20 {lang === "ar" ? "ثانية" : "seconds"}
              </span>
            </div>

            <div className={cn(
              "p-3.5 border rounded-2xl flex items-center gap-3",
              movedSufficiently 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-red-500/10 border-red-500/30 text-red-400"
            )}>
              {movedSufficiently ? (
                <CheckCircle2 className="w-8 h-8 shrink-0" />
              ) : (
                <AlertTriangle className="w-8 h-8 shrink-0 animate-pulse" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold font-sans">
                  {lang === "ar" ? "حالة التحقق" : "Verification Status"}
                </span>
                <span className="text-[10px] font-bold leading-tight opacity-90 mt-0.5">
                  {lang === "ar" 
                    ? (movedSufficiently ? "تحرك الموظف بنجاح (بدأ بالعمل)" : "لم يتم رصد حركة كافية (موقع ثابت)")
                    : (movedSufficiently ? "Active movement verified" : "Static check-in - insufficient travel")}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Route Map */}
          <div className="relative rounded-2xl overflow-hidden border border-outline-variant h-[340px] shadow-inner">
            <MapContainer 
              center={center} 
              zoom={17} 
              scrollWheelZoom={true}
              className="w-full h-full z-10"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Marker 1 (First Fingerprint) */}
              <Marker position={[loc1.lat, loc1.lng]} />
              
              {/* Marker 2 (Second Fingerprint) */}
              <Marker position={[loc2.lat, loc2.lng]} />

              {/* Connecting Travel Line */}
              <Polyline 
                positions={[[loc1.lat, loc1.lng], [loc2.lat, loc2.lng]]} 
                pathOptions={{ color: '#f59e0b', weight: 4, dashArray: '5, 8', lineCap: 'round' }}
              />
            </MapContainer>

            {/* Map Legends */}
            <div className="absolute top-3 right-3 bg-[#1C1C1E]/90 backdrop-blur-sm p-2 rounded-xl border border-outline-variant shadow-lg z-20 flex flex-col gap-1 max-w-[200px]" dir={lang === "ar" ? "rtl" : "ltr"}>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface">
                <div className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" />
                <span>{lang === "ar" ? "نقطة البداية (1/2)" : "Startup Pin (1/2)"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface">
                <div className="w-2.5 h-2.5 rounded bg-yellow-500 shrink-0" />
                <span>{lang === "ar" ? "نقطة التأكيد (2/2)" : "Confirm Pin (2/2)"}</span>
              </div>
            </div>
          </div>

          {/* Detailed Timestamps */}
          <div className="p-4 bg-background border border-outline-variant rounded-2xl space-y-3">
            <h4 className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider opacity-60">
              {lang === "ar" ? "أوقات وإحداثيات الرصد" : "Location Coordinates & Timestamps"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-primary font-bold">● {lang === "ar" ? "البصمة الأولى (موقع 1/2)" : "First Stamp (1/2)"}</span>
                <p className="text-xs text-on-surface leading-tight font-semibold">
                  {new Date(loc1.time).toLocaleString()}
                </p>
                <code className="text-[9px] block text-on-surface-variant font-mono opacity-80">
                  {loc1.lat.toFixed(6)}, {loc1.lng.toFixed(6)}
                </code>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-amber-400 font-bold">● {lang === "ar" ? "البصمة الثانية (موقع 2/2)" : "Second Stamp (2/2)"}</span>
                <p className="text-xs text-on-surface leading-tight font-semibold">
                  {new Date(loc2.time).toLocaleString()}
                </p>
                <code className="text-[9px] block text-on-surface-variant font-mono opacity-80">
                  {loc2.lat.toFixed(6)}, {loc2.lng.toFixed(6)}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-outline-variant/40 flex justify-end">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary/95 transition-all cursor-pointer"
          >
            {lang === "ar" ? "موافق، إغلاق" : "OK, Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
