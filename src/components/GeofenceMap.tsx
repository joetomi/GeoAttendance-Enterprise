import React from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { Geofence } from "../types";

// Fix leaflet icon issue in dynamic environments
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GeofenceMapProps {
  geofence: Geofence;
  onUpdate?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onUpdate }: { onUpdate: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onUpdate(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  map.setView(center);
  return null;
}

export function GeofenceMap({ geofence, onUpdate }: GeofenceMapProps) {
  const center: [number, number] = [geofence.latitude, geofence.longitude];

  return (
    <div className="relative rounded-xl overflow-hidden shadow-sm border border-outline-variant h-[500px]">
      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={false}
        className="w-full h-full z-10"
      >
        <ChangeView center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} />
        <Circle 
          center={center}
          radius={geofence.radius}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
        />
        {onUpdate && <MapClickHandler onUpdate={onUpdate} />}
      </MapContainer>
      
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-outline-variant shadow-lg flex items-center gap-3 z-20">
        <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Active Fence: {geofence.name}</span>
      </div>
      
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-20">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-outline-variant shadow-lg flex items-center gap-2">
          <MapPin className="w-4 h-4 text-secondary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Interactive Mode</span>
        </div>
      </div>
    </div>
  );
}
