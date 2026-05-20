import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  Plus, 
  Users, 
  MoreHorizontal, 
  ChevronRight, 
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  ArrowLeft,
  Briefcase
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";

interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  count?: number;
}

interface Employee {
  id: string;
  name: string;
  username: string;
  department: string;
  avatar?: string;
  role: string;
}

export default function DepartmentManagement() {
  const { lang, t } = useLanguage();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptEmployees, setDeptEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingDeptEmployees, setEditingDeptEmployees] = useState<Employee[]>([]);
  const [checkingEmployees, setCheckingEmployees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [empLoading, setEmpLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6"
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchDeptEmployees(selectedDept.id);
    }
  }, [selectedDept]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error("Fetch depts failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeptEmployees = async (id: string) => {
    setEmpLoading(true);
    try {
      const res = await fetch(`/api/departments/${id}/employees`);
      if (res.ok) {
        const data = await res.json();
        setDeptEmployees(data);
      }
    } catch (err) {
      console.error("Fetch dept employees failed", err);
    } finally {
      setEmpLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDept ? { ...formData, id: editingDept.id } : formData)
      });
      if (res.ok) {
        fetchDepartments();
        setIsModalOpen(false);
        setEditingDept(null);
        setFormData({ name: "", description: "", color: "#3B82F6" });
      }
    } catch (err) {
      console.error("Save dept failed", err);
    }
  };

  const openDeleteConfirm = async () => {
    if (!editingDept) return;
    setCheckingEmployees(true);
    try {
      const res = await fetch(`/api/departments/${editingDept.id}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEditingDeptEmployees(data);
      }
      setShowDeleteConfirm(true);
    } catch (err) {
      console.error("Check employees failed", err);
      setShowDeleteConfirm(true);
    } finally {
      setCheckingEmployees(false);
    }
  };

  const handleDelete = async () => {
    if (!editingDept) return;
    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDepartments();
        setShowDeleteConfirm(false);
        setIsModalOpen(false);
        setEditingDept(null);
      }
    } catch (err) {
      console.error("Delete dept failed", err);
    }
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description,
      color: dept.color
    });
    setIsModalOpen(true);
  };

  const colors = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#6366F1", "#06B6D4"
  ];

  return (
    <div className="min-h-screen bg-surface bg-stars p-6 md:p-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              {selectedDept ? selectedDept.name : (lang === "ar" ? "إدارة الأقسام" : "Department Management")}
            </h1>
            <p className="text-on-surface-variant opacity-60 mt-2 flex items-center gap-2">
              {selectedDept 
                ? (lang === "ar" ? `يوجد ${deptEmployees.length} موظف في هذا القسم` : `${deptEmployees.length} employees currently assigned`)
                : (lang === "ar" ? "هيكل وتوزيع الفرق في المؤسسة" : "Organize and manage your organizational structure")}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedDept && (
              <button 
                onClick={() => setSelectedDept(null)}
                className="flex items-center gap-2 bg-surface-container-highest/50 border border-outline-variant px-4 py-2.5 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-surface-container-highest transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === "ar" ? "الرجوع" : "Back"}
              </button>
            )}
            {!selectedDept && (
              <button 
                onClick={() => { setEditingDept(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-2xl text-sm font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إضافة قسم" : "Add Department"}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-surface-container-high rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : !selectedDept ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <motion.div
                layoutId={dept.id}
                key={dept.id}
                className="group relative bg-surface-container border border-outline-variant rounded-[32px] p-6 hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
                onClick={() => setSelectedDept(dept)}
              >
                <div 
                  className="absolute top-0 right-0 left-0 h-1" 
                  style={{ backgroundColor: dept.color }} 
                />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEdit(dept); }}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-on-surface-variant"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-on-surface mb-2">{dept.name}</h3>
                <p className="text-sm text-on-surface-variant opacity-60 line-clamp-2 mb-6">
                  {dept.description || (lang === "ar" ? "لا يوجد وصف" : "No description provided")}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                       {[1,2,3].map(i => (
                         <div key={i} className="w-6 h-6 rounded-lg bg-surface-container-highest border-2 border-surface-container" />
                       ))}
                    </div>
                    <span className="text-xs font-bold text-primary ml-2">
                      {lang === "ar" ? "عرض الموظفين" : "View Team"}
                    </span>
                  </div>
                  <ChevronRight className={cn("w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform", lang === "ar" && "rotate-180 group-hover:-translate-x-1")} />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dept Employees List */}
            {empLoading ? (
               <div className="space-y-4">
                 {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-container rounded-2xl animate-pulse" />)}
               </div>
            ) : deptEmployees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deptEmployees.map((emp) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={emp.id}
                    className="flex items-center gap-4 p-5 bg-surface-container border border-outline-variant rounded-3xl"
                  >
                    <img 
                      src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}&background=random`} 
                      className="w-12 h-12 rounded-2xl object-cover" 
                      alt="" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-on-surface truncate">{emp.name}</h4>
                      <p className="text-xs text-on-surface-variant opacity-60">@{emp.username}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-wider">
                      {emp.role}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-surface-container/30 border border-dashed border-outline-variant rounded-[40px]">
                <Users className="w-16 h-16 text-on-surface-variant opacity-10 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-on-surface opacity-60">
                  {lang === "ar" ? "لا يوجد موظفين في هذا القسم" : "No employees in this department"}
                </h3>
                <p className="text-sm text-on-surface-variant opacity-40 mt-2">
                  {lang === "ar" ? "يمكنك نقل الموظفين لهذا القسم من شاشة الموظفين" : "You can assign employees to this department in the employee management screen"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#1E1E1E] border border-outline-variant rounded-[32px] p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-on-surface">
                    {editingDept ? (lang === "ar" ? "تعديل القسم" : "Edit Department") : (lang === "ar" ? "قسم جديد" : "New Department")}
                  </h3>
                  <div className="flex items-center gap-2">
                    {editingDept && (
                      <button 
                        type="button"
                        disabled={checkingEmployees}
                        onClick={openDeleteConfirm}
                        className="p-2 hover:bg-error/10 text-error rounded-full transition-colors disabled:opacity-50"
                      >
                        {checkingEmployees ? (
                          <div className="w-5 h-5 border-2 border-error border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                      <ArrowLeft className={cn("w-5 h-5", lang === "ar" ? "rotate-180" : "")} />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">
                      {lang === "ar" ? "اسم القسم" : "Department Name"}
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#1A1A1A] border border-outline-variant rounded-2xl px-5 py-3.5 text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
                      placeholder={lang === "ar" ? "مثل: الهندسة، التسويق..." : "e.g. Engineering, Product..."}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">
                      {lang === "ar" ? "وصف القسم" : "Description"}
                    </label>
                    <textarea
                      className="w-full bg-[#1A1A1A] border border-outline-variant rounded-2xl px-5 py-3.5 text-on-surface focus:outline-none focus:border-primary transition-all font-medium min-h-[100px] resize-none"
                      placeholder={lang === "ar" ? "ماذا يفعل هذا القسم؟" : "What does this team do?"}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 opacity-60">
                      {lang === "ar" ? "لون التمييز" : "Brand Color"}
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {colors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c })}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all border-2",
                            formData.color === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 rounded-2xl border border-outline-variant text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                    >
                      {lang === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
                    >
                      {editingDept ? (lang === "ar" ? "تعديل" : "Update") : (lang === "ar" ? "إضافة" : "Add")}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-[#1E1E1E] border border-outline-variant rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">{t.deleteDept}</h3>
                
                {editingDeptEmployees.length > 0 ? (
                  <div className="mb-8">
                    <p className="text-error text-sm font-bold mb-4 px-2 py-1 bg-error/10 rounded-lg">
                      {lang === "ar" 
                        ? `هناك ${editingDeptEmployees.length} موظف في هذا القسم. هل أنت متأكد؟` 
                        : `There are ${editingDeptEmployees.length} employees in this department. Are you sure?`}
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-2 bg-surface-container-highest/30 p-3 rounded-2xl border border-outline-variant/30 text-start">
                      {editingDeptEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-error" />
                          <span className="text-xs text-on-surface-variant font-medium">{emp.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant mb-8 leading-relaxed opacity-60">
                    {t.deleteDeptConfirm}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-6 py-3 rounded-2xl border border-outline-variant text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-3 rounded-2xl bg-error text-white text-[10px] font-bold uppercase tracking-widest hover:bg-error/90 shadow-lg shadow-error/20 transition-all"
                  >
                    {t.delete}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
