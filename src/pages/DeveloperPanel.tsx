import React, { useState, useEffect } from "react";
import { Plus, Trash2, Shield, UserCheck, X, LogOut, Edit3 } from "lucide-react";
import { Employee } from "../types";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

export default function DeveloperPanel() {
  const [ceos, setCeos] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCeo, setNewCeo] = useState({
    username: "",
    password: "",
    name: "",
    department: "Executive Management",
    avatar: ""
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ceoToDelete, setCeoToDelete] = useState<Employee | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  
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

  const handleEditClick = (ceo: Employee) => {
    setEditingId(ceo.id);
    setNewCeo({
      username: ceo.username,
      password: "********",
      name: ceo.name,
      department: "Executive Management",
      avatar: ceo.avatar || ""
    });
    setShowModal(true);
  };

  const handleAddClick = () => {
    setEditingId(null);
    setNewCeo({ username: "", password: "", name: "", department: "Executive Management", avatar: "" });
    setShowModal(true);
  };

  const handleAddCeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const method = editingId ? "PUT" : "POST";
    const endpoint = editingId ? `/api/employees/${editingId}` : "/api/employees";
    
    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCeo,
          role: "ceo",
          requesterRole: "dev",
          status: "Active",
          email: `${newCeo.username}@ceo.enterprise.com`,
          currentUserId: editingId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (editingId) {
          setCeos(prev => prev.map(c => c.id === editingId ? data : c));
        } else {
          setCeos(prev => [...prev, data]);
        }
        setShowModal(false);
        setEditingId(null);
        setNewCeo({ username: "", password: "", name: "", department: "Executive Management", avatar: "" });
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to persist CEO" }));
        alert(err.error || "Failed to save CEO");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (ceo: Employee) => {
    setCeoToDelete(ceo);
    setOpError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!ceoToDelete) return;
    setLoading(true);
    setOpError(null);
    try {
      const res = await fetch(`/api/employees/${ceoToDelete.id}?requesterRole=dev`, { method: "DELETE" });
      if (res.ok) {
        setCeos(prev => prev.filter(c => c.id !== ceoToDelete.id));
        setShowConfirmModal(false);
        setCeoToDelete(null);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setOpError(errorData.error || (lang === "ar" ? "فشلت عملية الحذف." : "Delete failed."));
      }
    } catch (err) {
      setOpError(lang === "ar" ? "خصائص الشبكة غير مستقرة." : "Network error");
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
            <h1 className="text-2xl font-bold text-on-surface">
              {lang === "ar" ? "مركز تحكم المطور" : "Developer Control Center"}
            </h1>
            <p className="text-sm text-on-surface-variant opacity-60">
              {lang === "ar" ? "حماية النظام وإدارة الرؤساء التنفيذيين (CEO)" : "System Security & CEO Management"}
            </p>
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
              onClick={handleAddClick}
              className="btn bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {lang === "ar" ? "إضافة CEO جديد" : "Add New CEO"}
            </button>
          </div>

          <div className="space-y-4">
            {loading && ceos.length === 0 ? (
              <p className="text-center py-8 text-on-surface-variant animate-pulse">
                {lang === "ar" ? "جاري جرد السجلات المشفرة..." : "Scanning encrypted records..."}
              </p>
            ) : ceos.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-outline-variant rounded-3xl">
                <Shield className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
                <p className="text-on-surface-variant opacity-60">
                  {lang === "ar" ? "لا يوجد رؤساء تنفيذيين مسجلين حالياً." : "No CEO accounts registered."}
                </p>
              </div>
            ) : (
              ceos.map(ceo => (
                <div key={ceo.id} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant hover:border-primary/30 transition-all group shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <img 
                      src={ceo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ceo.name)}&background=3B82F6&color=fff`} 
                      alt={ceo.name} 
                      className="w-12 h-12 rounded-xl object-cover border border-outline-variant"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-bold text-on-surface">{ceo.name}</h3>
                      <p className="text-xs text-on-surface-variant opacity-60">{ceo.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button 
                      onClick={() => handleEditClick(ceo)}
                      className="px-4 py-2 text-sm text-secondary bg-secondary-container/20 hover:bg-secondary-container transition-all duration-200 rounded-xl flex items-center gap-1.5 font-bold cursor-pointer"
                      title={lang === "ar" ? "تعديل" : "Edit"}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="text-xs">{lang === "ar" ? "تعديل" : "Edit"}</span>
                    </button>
                    <button 
                      onClick={() => openDeleteConfirm(ceo)}
                      className="px-4 py-2 text-sm text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all duration-200 rounded-xl flex items-center gap-1.5 font-bold cursor-pointer"
                      title={lang === "ar" ? "حذف" : "Delete"}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs">{lang === "ar" ? "حذف" : "Delete"}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* New/Edit CEO Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl relative border border-primary/30">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold text-on-surface mb-6">
              {editingId 
                ? (lang === "ar" ? "تعديل هوية الـ CEO" : "Edit CEO Identity")
                : (lang === "ar" ? "إنشاء هوية الـ CEO" : "Create CEO Identity")}
            </h3>
            <form onSubmit={handleAddCeo} className="space-y-4">
              <div>
                <label className="input-label">{lang === "ar" ? "الاسم الظاهر" : "Real Display Name"}</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCeo.name}
                  onChange={(e) => setNewCeo({ ...newCeo, name: e.target.value })}
                  required 
                />
              </div>
              <div>
                <label className="input-label">{lang === "ar" ? "اسم المستخدم (Username)" : "Username"}</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newCeo.username}
                  onChange={(e) => setNewCeo({ ...newCeo, username: e.target.value })}
                  required 
                />
              </div>
              <div>
                <label className="input-label">{lang === "ar" ? "مفتاح الأمان (كلمة المرور)" : "Security Key (Password)"}</label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={newCeo.password}
                  onChange={(e) => setNewCeo({ ...newCeo, password: e.target.value })}
                  required={!editingId} 
                />
              </div>
              <div>
                <label className="input-label">{lang === "ar" ? "رابط الصورة (Avatar Photo URL)" : "Photo URL (Avatar)"}</label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    className="input-field flex-1" 
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newCeo.avatar}
                    onChange={(e) => setNewCeo({ ...newCeo, avatar: e.target.value })}
                  />
                  {newCeo.avatar && (
                    <img 
                      src={newCeo.avatar} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-xl object-cover border border-outline-variant"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="w-5 h-5" />}
                {editingId 
                  ? (lang === "ar" ? "تحديث هوية الـ CEO" : "Authorize Updates")
                  : (lang === "ar" ? "تخويل هوية الـ CEO" : "Authorize CEO Identity")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl relative border border-red-500/30">
            <button 
              onClick={() => { setShowConfirmModal(false); setCeoToDelete(null); }}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">
                {lang === "ar" ? "تأكيد حذف الـ CEO" : "Confirm CEO Deletion"}
              </h3>
              <p className="text-sm text-on-surface-variant opacity-80 mb-6 font-medium">
                {lang === "ar" 
                  ? `هل أنت متأكد من رغبتك في حذف حساب الرئيس التنفيذي: "${ceoToDelete?.name}"؟` 
                  : `Are you sure you want to delete the CEO account: "${ceoToDelete?.name}"?`
                }
              </p>
              
              {opError && (
                <div className="p-3 mb-6 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl font-semibold">
                  {opError}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowConfirmModal(false); setCeoToDelete(null); }}
                  className="flex-1 py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-xl"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {lang === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
