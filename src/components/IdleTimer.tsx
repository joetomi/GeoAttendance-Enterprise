import React, { useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function IdleTimer() {
  const navigate = useNavigate();
  const location = useLocation();
  const getTimeoutMs = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return 0;
    try {
      const user = JSON.parse(userStr);
      // Admin, CEO, and Dev get 10 minutes
      if (['admin', 'ceo', 'dev'].includes(user.role)) {
        return 10 * 60 * 1000;
      }
      // Standard users get 5 minutes
      return 5 * 60 * 1000;
    } catch (e) {
      return 5 * 60 * 1000;
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("user");
    // Only redirect if not already on login page
    if (location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    const timeoutMs = getTimeoutMs();
    
    // If no timeout or zero, don't start
    if (timeoutMs === 0) return;

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(handleLogout, timeoutMs);
    };

    const user = localStorage.getItem("user");
    
    // If no user, don't start the timer
    if (!user) return;

    // Events to track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click"
    ];

    // Initial timer start
    resetTimer();

    // Add listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [handleLogout]);

  return null; // This component doesn't render anything
}
