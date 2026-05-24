/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import GeofenceSettings from "./pages/GeofenceSettings";
import PayrollDashboard from "./pages/PayrollDashboard";
import MobileCheckIn from "./pages/MobileCheckIn";
import DepartmentManagement from "./pages/DepartmentManagement";
import DeveloperPanel from "./pages/DeveloperPanel";
import MapView from "./pages/MapView";
import { Sidebar, Header, MobileMenu } from "./components/Navigation";
import { IdleTimer } from "./components/IdleTimer";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useLanguage } from "./contexts/LanguageContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { cn } from "./lib/utils";
import { SplashLoader } from "./components/SplashLoader";

function AppLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { lang } = useLanguage();

  return (
    <div className="flex bg-surface min-h-screen">
      <Sidebar />
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all",
        lang === "ar" ? "lg:pr-[280px]" : "lg:pl-[280px]"
      )}>
        <Header title={title} onMenuClick={() => setIsMenuOpen(true)} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isLaunching, setIsLaunching] = useState(true);

  return (
    <LanguageProvider>
      <AnimatePresence mode="wait">
        {isLaunching && (
          <SplashLoader onComplete={() => setIsLaunching(false)} />
        )}
      </AnimatePresence>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <IdleTimer />
            <Routes>
            {/* Auth Route */}
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout title="Employee Management">
                    <AdminDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
              <Route 
              path="/departments" 
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout title="Department Management">
                    <DepartmentManagement />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/geofence" 
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout title="Geofence Settings">
                    <GeofenceSettings />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payroll" 
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout title="Deductions & Payroll">
                    <PayrollDashboard />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Mobile / Employee Routes */}
            <Route 
              path="/check-in" 
              element={
                <ProtectedRoute>
                  <AppLayout title="Check In">
                    <MobileCheckIn />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Map View Route */}
            <Route path="/map-view" element={<MapView />} />
            
            {/* Fallback */}
            <Route path="/developer" element={<DeveloperPanel />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
