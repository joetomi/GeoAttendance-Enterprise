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
import { Sidebar } from "./components/Navigation";

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
