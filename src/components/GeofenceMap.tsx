import React from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Geofence } from "../types";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

interface GeofenceMapProps {
  geofence: Geofence;
  onUpdate?: (lat: number, lng: number) => void;
}

export function GeofenceMap({ geofence, onUpdate }: GeofenceMapProps) {
  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-surface-container rounded-xl border-2 border-dashed border-outline-variant p-12 text-center text-on-surface-variant">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
          <MapPin className="w-8 h-8 text-secondary" />
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-2">Google Maps API Key Required</h3>
        <p className="text-sm max-w-sm mb-6 opacity-80 leading-relaxed">
          Please add your Google Maps API key to your system secrets to enable the precise geofencing visualization.
        </p>
        <div className="text-left text-xs bg-white p-4 rounded-lg border border-outline-variant w-full max-w-sm">
          <p className="font-bold mb-2">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Settings (Gear icon)</li>
            <li>Go to Secrets</li>
            <li>Add <code className="bg-surface px-1">GOOGLE_MAPS_PLATFORM_KEY</code></li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden shadow-sm border border-outline-variant h-[500px]">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={{ lat: geofence.latitude, lng: geofence.longitude }}
          defaultZoom={15}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => {
            if (e.detail.latLng && onUpdate) {
              onUpdate(e.detail.latLng.lat, e.detail.latLng.lng);
            }
          }}
        >
          <AdvancedMarker position={{ lat: geofence.latitude, lng: geofence.longitude }}>
            <Pin background={"#006b5f"} glyphColor={"#fff"} borderColor={"#006b5f"} />
          </AdvancedMarker>

          {/* Simple Geofence Visual Overlay using a circle-like marker (Advanced markers can be custom HTML) */}
          <AdvancedMarker 
            position={{ lat: geofence.latitude, lng: geofence.longitude }}
            zIndex={-1}
          >
            <div 
              style={{
                width: '100px', // This would ideally scale with radius, for demo we'll use a fixed visual
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 107, 95, 0.1)',
                border: '2px solid #006b5f',
                transform: 'translate(-50%, -50%)',
                animation: 'pulse 2s infinite ease-in-out'
              }}
            />
          </AdvancedMarker>
        </Map>
      </APIProvider>
      
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-outline-variant shadow-lg flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Active Fence: {geofence.name}</span>
      </div>
      
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <button className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container transition-colors">
          <ChevronUp className="w-5 h-5 text-on-surface" />
        </button>
        <button className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container transition-colors">
          <ChevronDown className="w-5 h-5 text-on-surface" />
        </button>
      </div>
    </div>
  );
}

// Icons needed for the map placeholder and UI
import { ChevronUp, ChevronDown, MapPin } from "lucide-react";
