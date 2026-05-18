import React, { useState, useEffect } from "react";
import { Plus, Trash2, Shield, UserCheck, X, LogOut } from "lucide-react";
import { Employee } from "../types";
import { cn } from "@/src/lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

export default function DeveloperPanel() {
  const [ceos, setCeos] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCeo, setNewCeo] = useState({
    username: "",
    password: "",
    name: "",
    department: "Executive Management",
    avatar: ""
  });
  
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (user.role !== "dev") {
      navigate("/login");
      return;
    }

    const fetchCeos = async () => {
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const data = await res.json();
          setCeos(data.filter((e: Employee) => e.role === "ceo"));
        }
      } catch (err) {
        console.error("Fetch CEO failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCeos();
  }, [user.role, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleAddCeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCeo,
          role: "ceo",
          requesterRole: "dev",
          status: "Active",
          email: `${newCeo.username}@ceo.enterprise.com`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCeos(prev => [...prev, data]);
        setShowModal(false);
        setNewCeo({ username: "", password: "", name: "", department: "Executive Management", avatar: "" });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create CEO");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const deleteCeo = async (id: string) => {
    if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف حساب الرئيس التنفيذي؟" : "Are you sure you want to delete this CEO account?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}?requesterRole=dev`, { method: "DELETE" });
      if (res.ok) {
        setCeos(prev => prev.filter(c => c.id !== id));
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface bg-stars p-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Developer Control Center</h1>
            <p className="text-sm text-on-surface-variant opacity-60">System Security & CEO Management</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors flex items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold text-xs uppercase tracking-widest">{lang === "ar" ? "خروج" : "Logout"}</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="card p-8 bg-surface-container bg-pattern-wavy mb-8 border border-primary/20">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-primary outline-primary" />
              <h2 className="text-xl font-bold text-on-surface">{lang === "ar" ? "إدارة الرؤساء التنفيذيين (CEO)" : "CEO Management"}</h2>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="btn bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              {lang === "ar" ? "إضافة CEO جديد" : "Add New CEO"}
            </button>
          </div>

          <div className="space-y-4">
            {loading && ceos.length === 0 ? (
              <p className="text-center py-8 text-on-surface-variant animate-pulse">Scanning encrypted records...</p>
            ) : ceos.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-outline-variant rounded-3xl">
                <Shield className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
                <p className="text-on-surface-variant opacity-60">No CEO accounts registered.</p>
              </div>
            ) : (
              ceos.map(ceo => (
                <div key={ceo.id} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">{ceo.name}</h3>
                      <p className="text-xs text-on-surface-variant opacity-60">{ceo.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteCeo(ceo.id)}
                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* New CEO Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl relative border border-primary/30">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold text-on-surface mb-6">Create CEO Identity</h3>
            <form onSubmit={handleAddCeo} className="space-y-4">
              <div>
                <label className="input-label">Real Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCeo.name}
                  onChange={(e) => setNewCeo({ ...newCeo, name: e.target.value })}
                  required 
                />
              </div>
              <div>
                <label className="input-label">Username</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCeo.username}
                  onChange={(e) => setNewCeo({ ...newCeo, username: e.target.value })}
                  required 
                />
              </div>
              <div>
                <label className="input-label">Security Key (Password)</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={newCeo.password}
                  onChange={(e) => setNewCeo({ ...newCeo, password: e.target.value })}
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="w-5 h-5" />}
                Authorize CEO Identity
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
