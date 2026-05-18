/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import GeofenceSettings from "./pages/GeofenceSettings";
import PayrollDashboard from "./pages/PayrollDashboard";
import MobileCheckIn from "./pages/MobileCheckIn";
import DepartmentManagement from "./pages/DepartmentManagement";
import { Sidebar, Header, MobileMenu } from "./components/Navigation";
import { LanguageProvider } from "./contexts/LanguageContext";
import { useLanguage } from "./contexts/LanguageContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { cn } from "./lib/utils";

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
  return (
    <LanguageProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <AppLayout title="Employee Management">
                <AdminDashboard />
              </AppLayout>
            } 
          />
            <Route 
            path="/departments" 
            element={
              <AppLayout title="Department Management">
                <DepartmentManagement />
              </AppLayout>
            } 
          />
          <Route 
            path="/geofence" 
            element={
              <AppLayout title="Geofence Settings">
                <GeofenceSettings />
              </AppLayout>
            } 
          />
          <Route 
            path="/payroll" 
            element={
              <AppLayout title="Deductions & Payroll">
                <PayrollDashboard />
              </AppLayout>
            } 
          />
          
          {/* Mobile / Employee Routes */}
          <Route 
            path="/check-in" 
            element={
              <AppLayout title="Check In">
                <MobileCheckIn />
              </AppLayout>
            } 
          />
          
          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </LanguageProvider>
  );
}
