/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import GeofenceSettings from "./pages/GeofenceSettings";
import MobileCheckIn from "./pages/MobileCheckIn";
import { Sidebar, BottomNav, Header } from "./components/Navigation";
import { Settings, MapPin } from "lucide-react";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <div className="flex">
              <Sidebar />
              <div className="flex-1">
                <AdminDashboard />
              </div>
              <BottomNav />
            </div>
          } 
        />
        <Route 
          path="/geofence" 
          element={
            <div className="flex">
              <Sidebar />
              <div className="flex-1">
                <GeofenceSettings />
              </div>
              <BottomNav />
            </div>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <div className="min-h-screen bg-surface">
              <Sidebar />
              <Header title="Settings" />
              <main className="lg:pl-[312px] p-8 pb-32">
                <div className="max-w-7xl mx-auto">
                  <div className="card max-w-2xl p-12 text-center mt-10">
                    <div className="bg-surface-container w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Settings className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-on-surface mb-2">System Configuration</h3>
                    <p className="text-on-surface-variant mb-8 opacity-70 font-medium">Unified enterprise settings for biometrics and identity providers.</p>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="p-4 border border-outline-variant rounded-xl opacity-50 bg-surface-container">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-on-surface-variant">Auth Method</p>
                        <p className="font-bold text-on-surface">Integrated SQL Auth</p>
                      </div>
                      <div className="p-4 border border-outline-variant rounded-xl opacity-50 bg-surface-container">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-on-surface-variant">Encryption</p>
                        <p className="font-bold text-on-surface">TLS 1.3 Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
              <BottomNav />
            </div>
          } 
        />
        
        {/* Mobile / Employee Routes */}
        <Route path="/check-in" element={<MobileCheckIn />} />
        
        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
