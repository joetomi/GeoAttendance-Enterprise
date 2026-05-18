import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute Component
 * Intercepts unauthorized access and redirects to login.
 * Prevents "flicker" by checking loading state.
 */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show nothing or a clean loader while checking auth state
  // This prevents the "flash" of protected content
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but keep the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user?.role !== "admin" && user?.role !== "ceo") {
    // If user is logged in but not an admin, redirect to their default portal
    return <Navigate to="/check-in" replace />;
  }

  return <>{children}</>;
}
