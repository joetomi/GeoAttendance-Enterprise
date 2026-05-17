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
import { Sidebar, BottomNav } from "./components/Navigation";
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
            <div className="flex">
              <Sidebar />
              <div className="flex-1 p-8 lg:pl-[312px]">
                <div className="card max-w-2xl mx-auto p-12 text-center">
                  <div className="bg-surface-container w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Settings className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold text-on-surface mb-2">System Configuration</h3>
                  <p className="text-on-surface-variant mb-8 opacity-70">Unified enterprise settings for biometrics and identity providers.</p>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="p-4 border border-outline-variant rounded-xl opacity-50 bg-surface-container">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Auth Method</p>
                      <p className="font-bold">SmarterASP.NET SQL</p>
                    </div>
                    <div className="p-4 border border-outline-variant rounded-xl opacity-50 bg-surface-container">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Encryption</p>
                      <p className="font-bold">TLS 1.3 Active</p>
                    </div>
                  </div>
                </div>
              </div>
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
