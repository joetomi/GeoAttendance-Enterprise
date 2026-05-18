import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage } from './LanguageContext';

export interface Notification {
  id: string;
  employeeName: string;
  username: string;
  department: string;
  action: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { lang } = useLanguage();

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          const newNotif = data.payload;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Show toast
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-[#1E1E1E] border border-outline-variant shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <span className="text-xl font-bold">{newNotif.employeeName.charAt(0)}</span>
                    </div>
                  </div>
                  <div className={lang === "ar" ? "mr-3 flex-1" : "ml-3 flex-1"}>
                    <p className="text-sm font-bold text-on-surface">
                      {newNotif.employeeName}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {lang === "ar" ? `سجل الدخول - ${newNotif.department}` : `Logged in - ${newNotif.department}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-outline-variant">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 focus:outline-none"
                >
                  {lang === "ar" ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          ), { duration: 5000 });
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    };

    return () => socket.close();
  }, [fetchNotifications, lang]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'all' }),
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
      <Toaster position="top-right" />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
