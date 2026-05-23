import React from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import { Navigation, Compass, Calendar, User, ArrowLeftRight, HelpCircle, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Helper to calculate Haversine distance
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // meters
}

export default function MapView() {
  const [searchParams] = useSearchParams();
  
  const lat1 = parseFloat(searchParams.get("lat1") || "32.3743");
  const lng1 = parseFloat(searchParams.get("lng1") || "15.0904");
  const lat2 = parseFloat(searchParams.get("lat2") || "32.3743");
  const lng2 = parseFloat(searchParams.get("lng2") || "15.0904");
  
  const label1 = searchParams.get("label1") || "Point 1";
  const label2 = searchParams.get("label2") || "Point 2";
  const employeeName = searchParams.get("emp") || "Employee";
  const lang = searchParams.get("lang") || "ar";
  const isDouble = searchParams.get("isDouble") === "true";

  // If isDouble is true, center is average of lat1/2, else center strictly on lat2, lng2 (the single fingerprint point)
  const center: [number, number] = isDouble 
    ? [(lat1 + lat2) / 2, (lat1 + lat2) / 2 ? (lng1 + lng2) / 2 : 15.0904]
    : [lat2, lng2];
  
  const distance = calculateDistance(lat1, lng1, lat2, lng2);

  // Custom DivIcon for Marker 1
  const icon1 = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="w-10 h-10 rounded-full bg-blue-600 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-base transition-transform hover:scale-110">1</div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // Custom DivIcon for Marker 2 (the actual field stamp marker)
  const icon2 = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-amber-500/30 animate-ping"></div>
        <div class="w-10 h-10 rounded-full bg-amber-500 border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-base transition-transform hover:scale-110">2</div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  return (
    <div 
      className="min-h-screen bg-background text-on-surface flex flex-col font-sans" 
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="bg-surface-container border-b border-outline-variant/40 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
            <Compass className="w-6 h-6 animate-spin-slow text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-on-surface">
              {lang === "ar" ? "رصد الخرائط والتحقق الميداني للأجهزة" : "GPS Location Verification Tracker"}
            </h1>
            <p className="text-xs text-on-surface-variant/80 flex items-center gap-1.5 mt-0.5">
              <User className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? `الموظف: ${employeeName}` : `Employee Name: ${employeeName}`}</span>
            </p>
          </div>
        </div>

        {/* Floating analytical info */}
        <div className="flex items-center gap-3">
          {isDouble ? (
            <div className="bg-surface p-3 border border-outline-variant rounded-2xl flex flex-col justify-center min-w-[140px] shadow-sm">
              <span className="text-[9px] uppercase font-bold tracking-wider text-on-surface-variant opacity-60">
                {lang === "ar" ? "المسافة الفاصلة" : "Distance Calculated"}
              </span>
              <span className="text-lg font-black text-primary mt-0.5">
                {distance.toFixed(1)} {lang === "ar" ? "متر" : "meters"}
              </span>
            </div>
          ) : (
            <div className="bg-surface p-3 border border-outline-variant rounded-2xl flex flex-col justify-center min-w-[140px] shadow-sm">
              <span className="text-[9px] uppercase font-bold tracking-wider text-on-surface-variant opacity-60">
                {lang === "ar" ? "نوع التحقق كلياً" : "Verification Type"}
              </span>
              <span className="text-sm font-black text-emerald-500 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {lang === "ar" ? "تحقق بصمة مفردة" : "Single GPS Stamp"}
              </span>
            </div>
          )}
          <button 
            type="button" 
            onClick={() => window.close()}
            className="px-5 py-3 bg-secondary-container hover:bg-secondary-container-high text-secondary rounded-2xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            {lang === "ar" ? "إغلاق الصفحة" : "Close Window"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative h-full">
          <MapContainer 
            center={[center[0] || 32.3743, center[1] || 15.0904]} 
            zoom={16} 
            className="w-full h-full z-10"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Start Pin 1 - Rendered ONLY if isDouble is true */}
            {isDouble && (
              <Marker position={[lat1, lng1]} icon={icon1} />
            )}
            
            {/* End Pin 2 (Actual stamp location) */}
            <Marker position={[lat2, lng2]} icon={icon2} />

            {/* Path - Rendered ONLY if isDouble is true */}
            {isDouble && (
              <Polyline 
                positions={[[lat1, lng1], [lat2, lng2]]}
                pathOptions={{ color: '#0ea5e9', weight: 4, dashArray: '10, 10', lineCap: 'round' }}
              />
            )}
          </MapContainer>

          {/* Quick UI Map Floating Legends */}
          <div className="absolute top-4 right-4 bg-surface/95 backdrop-blur-md p-3.5 rounded-2xl border border-outline-variant shadow-xl z-20 flex flex-col gap-2 max-w-[240px]">
            <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant opacity-60 mb-1">
              {lang === "ar" ? "دليل الخريطة" : "Map Legend"}
            </span>
            {isDouble ? (
              <>
                <div className="flex items-center gap-2.5 text-xs text-on-surface">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">1</div>
                  <span className="font-semibold">{label1}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-on-surface">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">2</div>
                  <span className="font-semibold">{label2}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2.5 text-xs text-on-surface">
                <div className="w-6 h-6 rounded-emerald bg-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-white animate-bounce" />
                </div>
                <span className="font-semibold">{label2}</span>
              </div>
            )}
            <div className="h-px bg-outline-variant/50 my-1" />
            <p className="text-[10px] text-on-surface-variant/80 italic leading-snug">
              {lang === "ar" 
                ? (isDouble 
                  ? "💡 يتم تتبع البصمة ومقارنة المسافة المباشرة للغلق والتأكيد بين البصمة الأولى والثانية للموظف."
                  : "💡 موقع الحضور الميداني الفعلي والمنفرد للجهاز المرصود عبر شريحة الـ GPS بدقة عالية.")
                : (isDouble
                  ? "💡 Interactive tracking measures exact geodesic space dynamic separation between Stamp #1 and #2."
                  : "💡 Real-time satellite GPS coordinates capturing raw location spot of the standalone verification transaction.")}
            </p>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="w-full md:w-80 bg-surface-container border-t md:border-t-0 md:border-s border-outline-variant/40 p-6 flex flex-col justify-between overflow-y-auto w-full">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-on-surface uppercase tracking-wider mb-2">
                {isDouble 
                  ? (lang === "ar" ? "تحليل النقطتين الإحصائي" : "Analytical Dual Checkpoints")
                  : (lang === "ar" ? "تحليل البصمة الميدانية" : "Field Stamp Analysis")
                }
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed opacity-90">
                {isDouble 
                  ? (lang === "ar" 
                    ? "قمنا برسم النقطتين المسجلتين لتبيان مسار الحركة بدقة تامة. النقطة 1 تمثل البصمة الأولى، بينما النقطة 2 هي البصمة الثانية المؤكدة للعملية."
                    : "We plotted the two reported coords to trace the transaction. Point 1 portrays the primary startup stamp, whereas Point 2 portrays confirmations.")
                  : (lang === "ar"
                    ? "تم تحديد موقع الحضور الفعلي للجهاز بدقة عالية للتحقق والتحليل الميداني والتقيد التام بدون مقارنة أو إشراك موقع الشركة المرجعي."
                    : "Plotted the precise coordinate reported by the device GPS chip to trace raw field transaction location without reference to HQ Base.")
                }
              </p>
            </div>

            {/* Point 1 Coordinates - Only shown if isDouble is true */}
            {isDouble && (
              <div className="p-4 bg-surface rounded-2xl border border-outline-variant/50 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">1</div>
                  <h4 className="text-xs font-bold text-on-surface">{label1}</h4>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-on-surface-variant block uppercase font-mono tracking-wider opacity-60">Latitude / Longitude</span>
                  <code className="text-xs bg-surface-container px-2 py-1 rounded block text-primary font-mono font-bold leading-none break-all">
                    {lat1.toFixed(6)}, {lng1.toFixed(6)}
                  </code>
                </div>
              </div>
            )}

            {/* Point 2 Coordinates */}
            <div className="p-4 bg-surface rounded-2xl border border-outline-variant/50 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
                  {isDouble ? "2" : "✓"}
                </div>
                <h4 className="text-xs font-bold text-on-surface">{label2}</h4>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-on-surface-variant block uppercase font-mono tracking-wider opacity-60">Latitude / Longitude</span>
                <code className="text-xs bg-surface-container px-2 py-1 rounded block text-amber-500 font-mono font-bold leading-none break-all">
                  {lat2.toFixed(6)}, {lng2.toFixed(6)}
                </code>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/30 text-center">
            <span className="text-[10px] text-on-surface-variant font-mono opacity-40">GPS Live Tracker v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
