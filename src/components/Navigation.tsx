import React from "react";
import { 
  Users, 
  MapPin, 
  Settings, 
  LogOut, 
  HelpCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/src/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { icon: Users, label: "Manage Employees", path: "/admin" },
    { icon: MapPin, label: "Geofence Settings", path: "/geofence" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <aside className={cn("fixed left-0 top-0 h-full w-[280px] bg-primary-container hidden lg:flex flex-col z-40", className)}>
      <div className="px-6 py-8">
        <h1 className="text-xl text-white font-bold tracking-tight">GeoAttendance</h1>
        <p className="text-xs text-on-primary-container mt-1 uppercase tracking-widest font-medium opacity-70">Enterprise Admin</p>
      </div>

      <nav className="flex-1 flex flex-col mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-6 py-4 transition-all duration-200 border-l-4",
                isActive 
                  ? "border-secondary-container bg-white/10 text-secondary-container" 
                  : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10">
        <Link
          to="/logout"
          className="flex items-center gap-3 text-white/60 px-6 py-6 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </Link>
        <div className="px-6 pb-8 flex items-center gap-3">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop" 
            alt="Admin" 
            className="w-10 h-10 rounded-full border-2 border-secondary-container"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Admin Support</p>
            <button className="text-[10px] uppercase text-secondary-container font-bold tracking-wider">Contact Corporate</button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Header({ title }: { title: string }) {
  return (
    <header className="flex justify-between items-center w-full px-8 py-4 lg:pl-[312px] bg-white shadow-sm z-30 border-b border-outline-variant transition-all">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-primary">
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold text-primary">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center bg-surface-container rounded-full px-4 py-2 w-64 border border-outline-variant">
          <Search className="w-4 h-4 text-on-surface-variant mr-2" />
          <input 
            type="text" 
            placeholder="Search directory..." 
            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const location = useLocation();
  const items = [
    { icon: MapPin, label: "Check In", path: "/check-in" },
    { icon: Users, label: "History", path: "/history" },
    { icon: Settings, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50 flex justify-around items-center bg-primary-container p-2 rounded-2xl shadow-2xl">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
              isActive ? "bg-secondary-container text-on-secondary-container" : "text-white/60"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
