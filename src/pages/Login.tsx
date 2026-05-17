import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, User, MapPin } from "lucide-react";
import { motion } from "motion/react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data));
        if (data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/check-in");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Connection error. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-surface">
      <div className="flex flex-col items-center justify-center p-8 md:p-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px]"
        >
          <div className="flex flex-col items-center mb-12 text-center">
            <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary-container/20">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">GeoAttendance</h1>
            <p className="text-on-surface-variant mt-2 font-medium opacity-70">Enterprise Security & Precision</p>
          </div>

          <div className="card p-8 md:p-10 shadow-xl shadow-black/5">
            <h2 className="text-xl font-bold text-on-surface mb-8 text-center tracking-tight">Welcome Back</h2>
            
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-error-container text-on-error-container p-3 rounded-lg text-xs font-bold text-center border border-error/20">
                  {error}
                </div>
              )}
              <div>
                <label className="input-label">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-outline" />
                  <input 
                    type="text" 
                    placeholder="Enter your username" 
                    className="input-field pl-12"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="input-label">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-outline" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="input-field pl-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-secondary w-full py-4 text-xs font-bold uppercase tracking-widest mt-4 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Access System"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[10px] text-on-surface-variant opacity-50 uppercase tracking-[0.3em] font-bold">Secure Biometric Gateway</p>
            </div>
          </div>

          <footer className="mt-12 flex flex-col items-center gap-4">
            <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <span className="opacity-30">•</span>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <span className="opacity-30">•</span>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
            <p className="text-[10px] font-medium text-outline">© 2024 GeoAttendance Solutions Inc.</p>
          </footer>
        </motion.div>
      </div>

      {/* Decorative Side Panel */}
      <div className="hidden lg:block relative bg-primary-container overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop" 
            alt="Office" 
            className="w-full h-full object-cover grayscale"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-primary-container/60 to-transparent flex items-end p-20 z-10">
          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-4xl font-bold text-white mb-4 tracking-tight">Precise Geofencing</h3>
              <p className="text-on-primary-container text-lg leading-relaxed font-medium">
                Ensuring institutional compliance with mathematical accuracy across every global office location.
              </p>
              <div className="mt-8 flex gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-12 h-1 bg-secondary rounded-full opacity-30" />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
