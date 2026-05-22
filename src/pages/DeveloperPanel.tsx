import React, { useState, useEffect } from "react";
import { Plus, Trash2, Shield, UserCheck, X, LogOut, Edit3, Building2, Globe, Sparkles, Search, Calendar, Users, TrendingUp, Activity, BarChart3, Clock, Loader2, Check } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Employee } from "../types";
import { cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  domain: string;
  logo: string;
  planName?: string;
  maxEmployees?: number;
  features?: string;
  subDurationMonths?: number;
  subStartDate?: string;
  subEndDate?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  durationMonths: number;
  maxEmployees: number;
  features: string;
}

export default function DeveloperPanel() {
  const [ceos, setCeos] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "companies" | "ceos" | "plans">("dashboard");

  // Subscription Plans Management State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    durationMonths: 12,
    maxEmployees: 15,
    features: "Geofences,Departments,Employees"
  });

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<{
    employeeCounts: { companyId: string; companyName: string; count: number }[];
    attendanceHistory: any[];
    recentLogs: any[];
    employeesList: Employee[];
  } | null>(null);

  // Company Details Modal State
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<Company | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSearchQuery, setDetailsSearchQuery] = useState("");
  const [detailsDateFilter, setDetailsDateFilter] = useState("");

  // CEO Modal State
  const [showCeoModal, setShowCeoModal] = useState(false);
  const [editingCeoId, setEditingCeoId] = useState<string | null>(null);
  const [newCeo, setNewCeo] = useState({
    username: "",
    password: "",
    name: "",
    department: "Executive Management",
    avatar: "",
    companyId: ""
  });

  const [ceoUsernameChecking, setCeoUsernameChecking] = useState(false);
  const [isCeoUsernameAvailable, setIsCeoUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const rawUser = newCeo.username.trim();
    if (rawUser.length === 0) {
      setIsCeoUsernameAvailable(null);
      setCeoUsernameChecking(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCeoUsernameChecking(true);
      try {
        const url = `/api/employees/check-username?username=${encodeURIComponent(rawUser)}${editingCeoId ? `&excludeId=${encodeURIComponent(editingCeoId)}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setIsCeoUsernameAvailable(data.available);
        } else {
          setIsCeoUsernameAvailable(false);
        }
      } catch (err) {
        console.error("Checking CEO username failed:", err);
        setIsCeoUsernameAvailable(false);
      } finally {
        setCeoUsernameChecking(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [newCeo.username, editingCeoId]);

  // Company Modal State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: "",
    domain: "",
    logo: "",
    planName: "Standard",
    maxEmployees: 15,
    features: "Geofences,Departments,Employees",
    subDurationMonths: 12,
    subStartDate: new Date().toISOString().split("T")[0],
    subEndDate: ""
  });

  // Delete State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteType, setDeleteType] = useState<"company" | "ceo">("ceo");
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  
  const { lang, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/subscription-plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Companies
      const compRes = await fetch("/api/companies");
      let comps: Company[] = [];
      if (compRes.ok) {
        comps = await compRes.json();
        setCompanies(comps);
      }

      // 2. Fetch CEOs
      const ceoRes = await fetch("/api/employees");
      if (ceoRes.ok) {
        const data = await ceoRes.json();
        setCeos(data.filter((e: Employee) => e.role === "ceo"));
      }

      // 3. Fetch developer dashboard data
      const dashRes = await fetch("/api/dev/dashboard");
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboardData(dashData);
      }

      // 4. Fetch subscription plans
      await fetchPlans();
    } catch (err) {
      console.error("Fetch data failed in developer panel", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role !== "dev") {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user.role, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // --- Company CRUD handlers ---
  const handleAddCompanyClick = () => {
    setEditingCompanyId(null);
    setNewCompany({ 
      name: "", 
      domain: "", 
      logo: "",
      planName: "Standard",
      maxEmployees: 15,
      features: "Geofences,Departments,Employees",
      subDurationMonths: 12,
      subStartDate: new Date().toISOString().split("T")[0],
      subEndDate: ""
    });
    setShowCompanyModal(true);
  };

  const handleEditCompanyClick = (comp: Company) => {
    setEditingCompanyId(comp.id);
    setNewCompany({ 
      name: comp.name, 
      domain: comp.domain, 
      logo: comp.logo || "",
      planName: comp.planName || "Standard",
      maxEmployees: comp.maxEmployees || 15,
      features: comp.features || "Geofences,Departments,Employees",
      subDurationMonths: comp.subDurationMonths || 12,
      subStartDate: comp.subStartDate ? comp.subStartDate.split("T")[0] : new Date().toISOString().split("T")[0],
      subEndDate: comp.subEndDate ? comp.subEndDate.split("T")[0] : ""
    });
    setShowCompanyModal(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const method = editingCompanyId ? "PUT" : "POST";
    const endpoint = editingCompanyId ? `/api/companies/${editingCompanyId}` : "/api/companies";

    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCompany)
      });

      if (res.ok) {
        setShowCompanyModal(false);
        setEditingCompanyId(null);
        setNewCompany({ 
          name: "", 
          domain: "", 
          logo: "",
          planName: "Standard",
          maxEmployees: 15,
          features: "Geofences,Departments,Employees",
          subDurationMonths: 12,
          subStartDate: new Date().toISOString().split("T")[0],
          subEndDate: ""
        });
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to save company" }));
        alert(err.error || "Failed to save company");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  // --- Subscription Plan CRUD handlers ---
  const handleAddPlanClick = () => {
    setEditingPlanId(null);
    setNewPlan({
      name: "",
      durationMonths: 12,
      maxEmployees: 15,
      features: "Geofences,Departments,Employees"
    });
    setShowPlanModal(true);
  };

  const handleEditPlanClick = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setNewPlan({
      name: plan.name,
      durationMonths: plan.durationMonths,
      maxEmployees: plan.maxEmployees,
      features: plan.features
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const method = editingPlanId ? "PUT" : "POST";
    const endpoint = editingPlanId ? `/api/subscription-plans/${editingPlanId}` : "/api/subscription-plans";

    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan)
      });

      if (res.ok) {
        setShowPlanModal(false);
        setEditingPlanId(null);
        setNewPlan({
          name: "",
          durationMonths: 12,
          maxEmployees: 15,
          features: "Geofences,Departments,Employees"
        });
        await fetchPlans();
      } else {
        alert("Failed to save subscription plan");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm(lang === "ar" ? "هل أنت متأكد من حذف هذه الباقة؟ الحذف لا يؤثر على الشركات المشتركة مسبقاً." : "Are you sure you want to delete this subscription plan? Existing subscribed companies will not be affected.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/subscription-plans/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchPlans();
      } else {
        alert("Failed to delete subscription plan");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  // --- CEO CRUD handlers ---
  const handleAddCeoClick = () => {
    setEditingCeoId(null);
    const defaultCompanyId = companies.length > 0 ? companies[0].id : "comp-default";
    setNewCeo({
      username: "",
      password: "",
      name: "",
      department: "Executive Management",
      avatar: "",
      companyId: defaultCompanyId
    });
    setShowCeoModal(true);
  };

  const handleEditCeoClick = (ceo: Employee) => {
    setEditingCeoId(ceo.id);
    setNewCeo({
      username: ceo.username,
      password: "********",
      name: ceo.name,
      department: "Executive Management",
      avatar: ceo.avatar || "",
      companyId: ceo.companyId || (companies.length > 0 ? companies[0].id : "comp-default")
    });
    setShowCeoModal(true);
  };

  const handleSaveCeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCeo.companyId) {
      alert(lang === "ar" ? "الرجاء اختيار شرطة للـ CEO" : "Please select a company for this CEO");
      return;
    }
    setLoading(true);
    
    const method = editingCeoId ? "PUT" : "POST";
    const endpoint = editingCeoId ? `/api/employees/${editingCeoId}` : "/api/employees";
    
    try {
      const selectedCompany = companies.find(c => c.id === newCeo.companyId);
      const hostDomain = selectedCompany ? selectedCompany.domain : "enterprise";

      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCeo,
          role: "ceo",
          requesterRole: "dev",
          status: "Active",
          email: `${newCeo.username}@${hostDomain}.com`,
          currentUserId: editingCeoId,
          companyId: newCeo.companyId
        })
      });

      if (res.ok) {
        setShowCeoModal(false);
        setEditingCeoId(null);
        setNewCeo({ username: "", password: "", name: "", department: "Executive Management", avatar: "", companyId: "" });
        await fetchData();
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

  // --- Delete flow ---
  const triggerDelete = (type: "company" | "ceo", item: any) => {
    setDeleteType(type);
    setItemToDelete(item);
    setOpError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    setOpError(null);
    try {
      let endpoint = "";
      if (deleteType === "ceo") {
        endpoint = `/api/employees/${itemToDelete.id}?requesterRole=dev`;
      } else {
        endpoint = `/api/companies/${itemToDelete.id}`;
      }

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        setShowConfirmModal(false);
        setItemToDelete(null);
        await fetchData();
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

  const handleViewCompanyDetails = (comp: Company) => {
    setSelectedCompanyDetails(comp);
    setDetailsSearchQuery("");
    setDetailsDateFilter("");
    setShowDetailsModal(true);
  };

  return (
    <div className="min-h-screen bg-surface bg-stars p-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              {lang === "ar" ? "بوابة المطور السحابية" : "Developer Cloud Gateway"}
            </h1>
            <p className="text-sm text-on-surface-variant opacity-60">
              {lang === "ar" ? "إعداد وإدارة الشركات المتعددة (Multi-tenant Systems) والرؤساء التنفيذيين" : "Provision Multi-tenant Companies & CEOs"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLanguage(lang === "ar" ? "en" : "ar")}
            className="p-3 text-on-surface hover:bg-surface-container-high rounded-2xl transition-all flex items-center gap-2 border border-outline-variant cursor-pointer text-xs font-bold leading-none"
          >
            <Globe className="w-4 h-4 text-emerald-500" />
            <span>{lang === "ar" ? "English" : "العربية"}</span>
          </button>

          <button 
            onClick={handleLogout}
            className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-widest">{lang === "ar" ? "خروج" : "Logout"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex bg-surface-container border border-outline-variant p-1 rounded-2xl mb-8 max-w-xl flex-wrap">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[100px]",
              activeTab === "dashboard" 
                ? "bg-primary text-white shadow-sm" 
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Activity className="w-4 h-4" />
            {lang === "ar" ? "لوحة الإحصائيات" : "Dashboard"}
          </button>
          <button
            onClick={() => setActiveTab("companies")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[100px]",
              activeTab === "companies" 
                ? "bg-primary text-white shadow-sm" 
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Building2 className="w-4 h-4" />
            {lang === "ar" ? "المنشآت والشركات" : "Companies"}
          </button>
          <button
            onClick={() => setActiveTab("ceos")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[100px]",
              activeTab === "ceos" 
                ? "bg-primary text-white shadow-sm" 
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <UserCheck className="w-4 h-4" />
            {lang === "ar" ? "المدراء التنفيذيين" : "CEOs"}
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-w-[100px]",
              activeTab === "plans" 
                ? "bg-primary text-white shadow-sm" 
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            {lang === "ar" ? "الباقات والاشتراكات" : "Plans & Packages"}
          </button>
        </div>

        {/* --- Tab Content: Dashboard --- */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in mb-8">
            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-4 p-6 bg-surface-container border border-outline-variant rounded-3xl shadow-sm">
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant opacity-60 font-bold block">
                    {lang === "ar" ? "عدد المنشآت المستضافة" : "Total Tenanted Companies"}
                  </span>
                  <span className="text-2xl font-black text-on-surface">{companies.length}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-surface-container border border-outline-variant rounded-3xl shadow-sm">
                <div className="p-3.5 rounded-2xl bg-secondary-container/30 text-secondary">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant opacity-60 font-bold block">
                    {lang === "ar" ? "إجمالي الكوادر البشرية" : "Total Registered Staff"}
                  </span>
                  <span className="text-2xl font-black text-on-surface">
                    {dashboardData ? dashboardData.employeesList.length : ceos.length * 5}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-surface-container border border-outline-variant rounded-3xl shadow-sm">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant opacity-60 font-bold block">
                    {lang === "ar" ? "مجموع تسجيلات الحضور" : "Total Attendance Logs"}
                  </span>
                  <span className="text-2xl font-black text-on-surface">
                    {dashboardData ? dashboardData.recentLogs.length : 45}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-surface-container border border-outline-variant rounded-3xl shadow-sm">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500">
                  <Activity className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant opacity-60 font-bold block">
                    {lang === "ar" ? "نشط الآن بالنظام" : "Active Right Now"}
                  </span>
                  <span className="text-2xl font-black text-amber-500">
                    {dashboardData ? dashboardData.recentLogs.filter(l => l.status === "In").length : 3}
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Bar Chart - Employees Per Company */}
              <div className="bg-surface-container border border-outline-variant p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-on-surface text-base">
                      {lang === "ar" ? "قوة الكوادر لكل شركة" : "Staff Distribution per Corporate Space"}
                    </h3>
                  </div>
                  <p className="text-xs text-on-surface-variant opacity-60 mb-6">
                    {lang === "ar" ? "مقارنة حية لعدد الموظفين المسجلين في كل نطاق شركة" : "Simultaneous count of active staff registered under each corporation space"}
                  </p>
                </div>
                
                <div className="h-64 w-full">
                  {dashboardData && dashboardData.employeeCounts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.employeeCounts} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis 
                          dataKey="companyName" 
                          stroke="#888888" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ background: "#2D3748", border: "none", borderRadius: "12px", color: "#fff" }}
                          itemStyle={{ color: "#3B82F6" }}
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#3B82F6" 
                          radius={[8, 8, 0, 0]} 
                          name={lang === "ar" ? "الكوادر" : "Employees"} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-on-surface-variant opacity-60">
                      {lang === "ar" ? "لا تتوفر بيانات للتمثيل البياني" : "No active datasets found for representation"}
                    </div>
                  )}
                </div>
              </div>

              {/* Area Chart - Logins Timeline */}
              <div className="bg-surface-container border border-outline-variant p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-on-surface text-base">
                      {lang === "ar" ? "تاريخ تسجيلات الدخول والنشاط" : "Tenancy Daily Sign-Ins Activity timeline"}
                    </h3>
                  </div>
                  <p className="text-xs text-on-surface-variant opacity-60 mb-6">
                    {lang === "ar" ? "معدل الحضور اليومي لكافة الشركات ومطابقة تسجيل الدخول" : "Growth indicators representing employee sign-ins mapped across day logs"}
                  </p>
                </div>

                <div className="h-64 w-full">
                  {dashboardData && dashboardData.attendanceHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.attendanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorLoginDev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#888888" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ background: "#2D3748", border: "none", borderRadius: "12px", color: "#fff" }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        {companies.map((comp, idx) => {
                          const colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899"];
                          const curColor = colors[idx % colors.length];
                          return (
                            <Area
                              key={comp.id}
                              type="monotone"
                              dataKey={comp.name}
                              stroke={curColor}
                              fillOpacity={0.1}
                              fill={curColor}
                              strokeWidth={2}
                            />
                          );
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-on-surface-variant opacity-60">
                      {lang === "ar" ? "سجل النشاط اليومي فارغ حالياً" : "Chronology metrics empty at current cycle"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* List of Latest Sign-Ins & Quick Actions */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded-3xl shadow-sm">
              <h3 className="font-bold text-on-surface mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {lang === "ar" ? "أحدث حركات الحضور في جميع النطاقات" : "Consolidated Latest Sign-In Protocols"}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-[10px] uppercase font-bold text-on-surface-variant opacity-60 tracking-wider">
                      <th className="py-3 text-start">{lang === "ar" ? "الموظف" : "Employee"}</th>
                      <th className="py-3 text-start">{lang === "ar" ? "المؤسسة المنتمي إليها" : "Assigned Corporation"}</th>
                      <th className="py-3 text-start">{lang === "ar" ? "القسم" : "Department"}</th>
                      <th className="py-3 text-start">{lang === "ar" ? "الوقت والتاريخ" : "Timestamp"}</th>
                      <th className="py-3 text-center">{lang === "ar" ? "الحالة" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {(dashboardData ? dashboardData.recentLogs : []).slice(0, 15).map((log: any) => {
                      const comp = companies.find(c => c.id === log.companyId);
                      return (
                        <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={log.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.employeeName || "User")}&background=3B82F6&color=fff`}
                                className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="font-bold text-on-surface block text-xs">{log.employeeName || `@${log.employeeId}`}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            {comp ? (
                              <button
                                onClick={() => handleViewCompanyDetails(comp)}
                                className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary hover:text-white text-primary text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>{comp.name}</span>
                                <Building2 className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-xs text-on-surface-variant opacity-40 italic">-</span>
                            )}
                          </td>
                          <td className="py-3.5 text-xs font-semibold text-on-surface-variant">
                            {log.department || "Executive"}
                          </td>
                          <td className="py-3.5 text-xs font-mono text-on-surface-variant">
                            {new Date(log.timestamp).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                              log.status === "In" 
                                ? "bg-success/15 text-success border border-success/20" 
                                : "bg-red-500/15 text-red-500 border border-red-500/20"
                            )}>
                              {log.status === "In" ? (lang === "ar" ? "دخول" : "In") : (lang === "ar" ? "خروج" : "Out")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab Content: Companies --- */}
        {activeTab === "companies" && (
          <div className="card p-8 bg-surface-container border border-outline-variant rounded-3xl">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-on-surface">
                  {lang === "ar" ? "الشركات والمؤسسات المستضافة" : "Provisioned Corporations"}
                </h2>
              </div>
              <button
                onClick={handleAddCompanyClick}
                className="btn bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2 font-bold text-sm"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إضافة شركة جديدة" : "Create Company"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading && companies.length === 0 ? (
                <p className="col-span-2 text-center py-12 text-on-surface-variant animate-pulse">
                  {lang === "ar" ? "جاري جرد السيرفرات السحابية..." : "Scanning isolated partitions..."}
                </p>
              ) : companies.length === 0 ? (
                <div className="col-span-2 text-center py-16 border-2 border-dashed border-outline-variant rounded-3xl">
                  <Building2 className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
                  <p className="text-on-surface-variant opacity-60">
                    {lang === "ar" ? "لا توجد شركات مستضافة حالياً. أنشئ واحدة للبدأ!" : "No registered companies yet. Create one to begin!"}
                  </p>
                </div>
              ) : (
                companies.map(comp => {
                  const compCeos = ceos.filter(c => c.companyId === comp.id);
                  return (
                    <div key={comp.id} className="p-6 bg-surface rounded-3xl border border-outline-variant hover:border-primary/40 transition-all duration-300 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <img 
                            src={comp.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(comp.name)}&background=3B82F6&color=fff&size=128&bold=true`} 
                            alt={comp.name} 
                            className="w-14 h-14 rounded-2xl object-cover border border-outline-variant bg-white p-1"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="text-lg font-bold text-on-surface">{comp.name}</h3>
                            <div className="text-xs text-on-surface-variant opacity-60 flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5" />
                              <span>@{comp.domain}.com</span>
                            </div>
                          </div>
                        </div>

                        {/* Showing CEO assigned */}
                        <div className="p-3 bg-surface-container rounded-2xl mb-3">
                          <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60 tracking-wider">
                            {lang === "ar" ? "المدير التنفيذي المعيّن" : "Assigned CEO Identifier"}
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            {compCeos.length > 0 ? (
                              <>
                                <img
                                  src={compCeos[0].avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(compCeos[0].name)}&background=10B981&color=fff`}
                                  className="w-6 h-6 rounded-full object-cover"
                                  alt={compCeos[0].name}
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-xs font-bold text-success">{compCeos[0].name}</span>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-on-surface-variant opacity-40">
                                {lang === "ar" ? "شاغر (لا يوجد مدير حالياً)" : "None assigned"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subscription details badge */}
                        <div className="p-4 bg-surface-container-high rounded-2xl mb-6 border border-outline-variant/30 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-black text-on-surface-variant opacity-60 tracking-wider">
                              {lang === "ar" ? "باقة الاشتراك الفعالة" : "Active Subscription Plan"}
                            </span>
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                              comp.features?.includes("HR_Management") 
                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/20" 
                                : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            )}>
                              {comp.planName || "Standard"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant opacity-80">
                              {lang === "ar" ? "الموظفون المسجلون:" : "Enrolled Employees:"}
                            </span>
                            <span className="font-bold text-on-surface">
                              {(() => {
                                const currentCount = dashboardData?.employeeCounts?.find(ec => ec.companyId === comp.id)?.count || 0;
                                return `${currentCount} / ${comp.maxEmployees || 15}`;
                              })()}
                            </span>
                          </div>

                          <div className="text-xs">
                            <span className="text-on-surface-variant opacity-80 block mb-1">
                              {lang === "ar" ? "المزايا والخيارات المفعلة:" : "Activated Utilities & Features:"}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {comp.features ? comp.features.split(",").map(feat => (
                                <span key={feat} className="text-[9px] font-semibold bg-surface px-2 py-0.5 rounded border border-outline-variant text-on-surface opacity-85">
                                  {feat === "HR_Management" ? (lang === "ar" ? "إدارة الموارد البشرية والرواتب 💼" : "HR & Payroll 💼") : feat}
                                </span>
                              )) : (
                                <span className="text-[9px] italic text-on-surface-variant">{lang === "ar" ? "لا توجد مزايا" : "No utilities enabled"}</span>
                              )}
                            </div>
                          </div>

                          {comp.subStartDate && (
                            <div className="text-[10px] text-on-surface-variant opacity-50 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {lang === "ar" ? "تنتهي في: " : "Expires: "}
                                {comp.subEndDate ? new Date(comp.subEndDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US") : "N/A"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                       <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-outline-variant flex-wrap">
                        <button
                          onClick={() => handleViewCompanyDetails(comp)}
                          className="px-3.5 py-2 text-xs text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "تفاصيل الشركة" : "Details"}</span>
                        </button>
                        <button
                          onClick={() => handleEditCompanyClick(comp)}
                          className="px-3.5 py-2 text-xs text-secondary bg-secondary-container/20 hover:bg-secondary-container transition-all rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                        </button>
                        <button
                          onClick={() => triggerDelete("company", comp)}
                          className="px-3.5 py-2 text-xs text-red-500 bg-red-500/15 hover:bg-red-500 hover:text-white transition-all rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "حذف والبيانات كاملاً" : "Purge data"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- Tab Content: CEOs --- */}
        {activeTab === "ceos" && (
          <div className="card p-8 bg-surface-container border border-outline-variant rounded-3xl">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-on-surface">
                  {lang === "ar" ? "مدراء الفروع والمؤسسات" : "Authorized Tenant Presidents"}
                </h2>
              </div>
              <button
                onClick={handleAddCeoClick}
                disabled={companies.length === 0}
                className="btn bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2 font-bold text-sm disabled:opacity-40"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "تعيين CEO جديد" : "Appoint CEO"}
              </button>
            </div>

            {companies.length === 0 && (
              <div className="p-4 mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl text-xs font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {lang === "ar" ? "يرجى إنشاء شركة أولاً للتمكن من تعيين مدير تنفيذي لها." : "Please create a company first before appointing a CEO."}
              </div>
            )}

            <div className="space-y-4">
              {loading && ceos.length === 0 ? (
                <p className="text-center py-10 text-on-surface-variant animate-pulse">
                  {lang === "ar" ? "جاري استرداد هويات المدراء..." : "Scanning encrypted authorization lists..."}
                </p>
              ) : ceos.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-3xl">
                  <UserCheck className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
                  <p className="text-on-surface-variant opacity-60">
                    {lang === "ar" ? "لا يوجد رؤساء تنفيذيين مسجلين حالياً." : "No active CEO credentials."}
                  </p>
                </div>
              ) : (
                ceos.map(ceo => {
                  const belongComp = companies.find(c => c.id === ceo.companyId);
                  return (
                    <div key={ceo.id} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-outline-variant hover:border-primary/30 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <img 
                          src={ceo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ceo.name)}&background=10B981&color=fff`} 
                          alt={ceo.name} 
                          className="w-11 h-11 rounded-xl object-cover border border-outline-variant bg-slate-100"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-on-surface text-sm">{ceo.name}</h3>
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">
                              {belongComp ? belongComp.name : "Unassigned Company"}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant opacity-60">@{ceo.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEditCeoClick(ceo)}
                          className="px-3.5 py-2 text-xs text-secondary bg-secondary-container/20 hover:bg-secondary-container transition-all rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                        </button>
                        <button 
                          onClick={() => triggerDelete("ceo", ceo)}
                          className="px-3.5 py-2 text-xs text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "حذف" : "Remove"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- Tab Content: Subscription Plans --- */}
        {activeTab === "plans" && (
          <div className="card p-8 bg-surface-container border border-outline-variant rounded-3xl animate-fade-in text-on-surface">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
                <div>
                  <h2 className="text-xl font-bold text-on-surface">
                    {lang === "ar" ? "إدارة باقات الخدمة والاشتراكات" : "System Subscription Packages"}
                  </h2>
                  <p className="text-xs text-on-surface-variant opacity-65 mt-0.5">
                    {lang === "ar" ? "تحديد الباقات الافتراضية، حدود الموظفين، والميزات النشطة لكل باقة" : "Define default packages, employee sizes, and allowed features for subscriptions"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleAddPlanClick}
                className="btn bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center gap-2 font-bold text-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                {lang === "ar" ? "إضافة باقة جديدة" : "Create Package"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.length === 0 ? (
                <div className="col-span-2 text-center py-16 border-2 border-dashed border-outline-variant rounded-3xl">
                  <Sparkles className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
                  <p className="text-on-surface-variant opacity-60">
                    {lang === "ar" ? "لا توجد باقات خدمة معرفة حالياً. أنشئ باقة لتسهيل التعيين!" : "No subscription packages defined. Create one now!"}
                  </p>
                </div>
              ) : (
                plans.map(plan => {
                  const hasHR = plan.features?.split(",").includes("HR_Management");
                  return (
                    <div key={plan.id} className="p-6 bg-surface rounded-3xl border border-outline-variant hover:border-emerald-500/40 transition-all duration-300 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 block mb-1">
                              {lang === "ar" ? "تعريف باقة الخدمة" : "Service Module Level"}
                            </span>
                            <h3 className="text-lg font-bold text-on-surface">{plan.name}</h3>
                          </div>
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            hasHR ? "bg-purple-500/15 text-purple-400 border border-purple-500/20" : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          )}>
                            {hasHR ? (lang === "ar" ? "شامل الموارد البشرية ✨" : "HR Premium Included ✨") : (lang === "ar" ? "أساسية (بدون شؤون موظفين)" : "Standard Features")}
                          </span>
                        </div>

                        <div className="space-y-3 my-6 text-sm">
                          <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                            <span className="text-on-surface-variant opacity-70">{lang === "ar" ? "مدة الاشتراك:" : "Duration Months:"}</span>
                            <span className="font-bold">{plan.durationMonths} {lang === "ar" ? "شهر" : "Months"}</span>
                          </div>
                          <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                            <span className="text-on-surface-variant opacity-70">{lang === "ar" ? "الحد الأقصى للموظفين:" : "Allowed Employee Cap:"}</span>
                            <span className="font-bold text-emerald-400">{plan.maxEmployees} {lang === "ar" ? "موظف" : "Employees"}</span>
                          </div>
                          <div>
                            <span className="text-xs text-on-surface-variant opacity-70 block mb-2">{lang === "ar" ? "الميزات والخيارات المرفقة بالباقة:" : "Permitted Module Features:"}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {plan.features?.split(",").map(feat => (
                                <span key={feat} className="text-[10px] font-semibold bg-surface-container px-2 py-0.5 rounded border border-outline-variant text-on-surface">
                                  {feat === "HR_Management" ? (lang === "ar" ? "الموارد البشرية والرواتب 💼" : "HR & Payroll 💼") : feat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-outline-variant/30 mt-4">
                        <button
                          onClick={() => handleEditPlanClick(plan)}
                          className="px-3 py-1.5 text-xs text-secondary bg-secondary-container/20 hover:bg-secondary-container transition-all rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="px-3 py-1.5 text-xs text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === "ar" ? "حذف" : "Remove"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL 1: Company Creation / Edit --- */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl relative border border-primary/30 max-h-[90vh] overflow-y-auto text-on-surface">
            <button 
              onClick={() => setShowCompanyModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-on-surface mb-6">
              {editingCompanyId 
                ? (lang === "ar" ? "تحديث بيانات المنشأة" : "Configure Corporation Space")
                : (lang === "ar" ? "إنشاء مساحة منشأة جديدة" : "Provision Corporation Space")}
            </h3>
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "اسم الشركة / المنشأة" : "Company / Corporation Name"}</label>
                <input 
                  type="text" 
                  className="input-field mt-1.5" 
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder={lang === "ar" ? "شركة السلام القابضة" : "Peace Enterprise"}
                  required 
                />
              </div>
              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "نطاق الإسناد الإلكتروني (Domain)" : "Authorization Domain Prefix"}</label>
                <div className="flex items-center mt-1.5 border border-outline rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                  <span className="bg-surface-container-high px-3 py-2.5 text-xs font-semibold text-on-surface-variant">@</span>
                  <input 
                    type="text" 
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none font-bold text-on-surface" 
                    value={newCompany.domain}
                    onChange={(e) => setNewCompany({ ...newCompany, domain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="peace"
                    required 
                  />
                  <span className="bg-surface-container-high px-3 py-2.5 text-xs font-semibold text-on-surface-variant">.com</span>
                </div>
              </div>
              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "رابط شعار الشركة" : "Company Logo URL"}</label>
                <div className="flex gap-2 mt-1.5">
                  <input 
                    type="url" 
                    className="input-field flex-1" 
                    placeholder="https://..."
                    value={newCompany.logo}
                    onChange={(e) => setNewCompany({ ...newCompany, logo: e.target.value })}
                  />
                  {newCompany.logo && (
                    <img 
                      src={newCompany.logo} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-xl object-cover border border-outline-variant bg-white"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </div>

              {/* Package and Subscription Selections */}
              <div className="border-t border-outline-variant/30 pt-4 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">
                  {lang === "ar" ? "بيانات وقنوات الاشتراك" : "Subscription Panel Credentials"}
                </h4>

                <div>
                  <label className="input-label font-bold text-xs">{lang === "ar" ? "اختر باقة اشتراك جاهزة" : "Pre-defined Plan Preset"}</label>
                  <select
                    value={newCompany.planName}
                    onChange={(e) => {
                      const selectedPlan = plans.find(p => p.name === e.target.value);
                      if (selectedPlan) {
                        setNewCompany({
                          ...newCompany,
                          planName: selectedPlan.name,
                          maxEmployees: selectedPlan.maxEmployees,
                          features: selectedPlan.features,
                          subDurationMonths: selectedPlan.durationMonths
                        });
                      } else {
                        setNewCompany({ ...newCompany, planName: e.target.value });
                      }
                    }}
                    className="input-field mt-1.5 font-bold text-sm bg-surface-container-high border border-outline rounded-xl py-2 px-3 text-on-surface w-full"
                  >
                    <option value="">{lang === "ar" ? "اختر باقة..." : "Select plan..."}</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.name}>{p.name} ({p.maxEmployees} slots, {p.durationMonths}M)</option>
                    ))}
                    <option value="Custom">{lang === "ar" ? "مخصصة / Custom" : "Custom Plan..."}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label font-bold text-xs">{lang === "ar" ? "الحد الأقصى للموظفين" : "Employee Capacity"}</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field mt-1.5"
                      value={newCompany.maxEmployees}
                      onChange={(e) => setNewCompany({ ...newCompany, maxEmployees: parseInt(e.target.value) || 15 })}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label font-bold text-xs">{lang === "ar" ? "فترة الاشتراك (شهور)" : "Duration (Months)"}</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field mt-1.5"
                      value={newCompany.subDurationMonths}
                      onChange={(e) => setNewCompany({ ...newCompany, subDurationMonths: parseInt(e.target.value) || 12 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label font-bold text-xs">{lang === "ar" ? "تاريخ بدء الاشتراك" : "Subscription Start Date"}</label>
                  <input
                    type="date"
                    className="input-field mt-1.5"
                    value={newCompany.subStartDate}
                    onChange={(e) => setNewCompany({ ...newCompany, subStartDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="input-label font-bold text-xs block mb-2">{lang === "ar" ? "ميزات الباقة المسموح بها" : "Enabled Features List"}</label>
                  <div className="space-y-2 border border-outline-variant p-3.5 rounded-2xl bg-surface-container-high/60">
                    {[
                      { id: "Employees", label: lang === "ar" ? "إدارة الموظفين والملفات" : "Employee Management" },
                      { id: "Departments", label: lang === "ar" ? "إدارة الأقسام والمدراء" : "Department Management" },
                      { id: "Geofences", label: lang === "ar" ? "الحواجز الجغرافية (Geofences)" : "Geofencing Control" },
                      { id: "Multi_Geofence", label: lang === "ar" ? "تعدد نطاقات البصمة الجغرافية (Premium)" : "Multi-Geofence Scope (Enterprise)" },
                      { id: "HR_Management", label: lang === "ar" ? "إدارة الموارد البشرية والرواتب (بريميوم)" : "HR Payroll Management (Premium)" }
                    ].map(feat => {
                      const isChecked = newCompany.features?.split(",").includes(feat.id);
                      return (
                        <label key={feat.id} className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-on-surface">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const list = newCompany.features ? newCompany.features.split(",") : [];
                              const newList = list.includes(feat.id) ? list.filter(x => x !== feat.id) : [...list, feat.id];
                              setNewCompany({ ...newCompany, features: newList.join(",") });
                            }}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span>{feat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full mt-6 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Building2 className="w-5 h-5" />}
                {editingCompanyId 
                  ? (lang === "ar" ? "تحديث بيانات الشركة" : "Apply Configurations")
                  : (lang === "ar" ? "تأكيد إطلاق المنشأة" : "Provision Workspace")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CEO Appointment --- */}
      {showCeoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl relative border border-primary/30">
            <button 
              onClick={() => setShowCeoModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-on-surface mb-6">
              {editingCeoId 
                ? (lang === "ar" ? "تعديل هوية الـ CEO" : "Modify President Credentials")
                : (lang === "ar" ? "تنصيب رئيس تنفيذي (CEO)" : "Appoint President & CEO")}
            </h3>
            <form onSubmit={handleSaveCeo} className="space-y-4">
              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "الاسم الكامل المعيّن" : "Full Display Name"}</label>
                <input 
                  type="text" 
                  className="input-field mt-1.5" 
                  value={newCeo.name}
                  onChange={(e) => setNewCeo({ ...newCeo, name: e.target.value })}
                  required 
                />
              </div>

              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "الشركة / المؤسسة المذيلة" : "Belongs to Tenant space"}</label>
                <select
                  value={newCeo.companyId}
                  onChange={(e) => setNewCeo({ ...newCeo, companyId: e.target.value })}
                  className="input-field mt-1.5 font-bold text-sm bg-surface-container-high border border-outline border-radius-xl py-2 px-3 text-on-surface"
                  required
                >
                  <option value="">{lang === "ar" ? "اختر شركة لمنح الإذن" : "Select corporation workspace..."}</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (@{c.domain})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "اسم مدير الحساب للتشغيل" : "Username"}</label>
                <div className="relative animate-fade-in">
                  <input 
                    type="text" 
                    className={cn(
                      "input-field mt-1.5",
                      lang === "ar" ? "pl-24" : "pr-24"
                    )} 
                    value={newCeo.username}
                    onChange={(e) => setNewCeo({ ...newCeo, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })}
                    placeholder={lang === "ar" ? "مثال: saleh_ceo" : "e.g., saleh_ceo"}
                    required 
                  />
                  <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1.5",
                    lang === "ar" ? "left-3 flex-row-reverse" : "right-3"
                  )}>
                    {ceoUsernameChecking && (
                      <div className="flex items-center gap-1 text-primary text-[10px] font-bold bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{lang === "ar" ? "جاري الفحص..." : "Checking..."}</span>
                      </div>
                    )}
                    {!ceoUsernameChecking && isCeoUsernameAvailable === true && newCeo.username.trim() !== "" && (
                      <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" />
                        <span>{lang === "ar" ? "صالح ✓" : "Valid ✓"}</span>
                      </div>
                    )}
                    {!ceoUsernameChecking && isCeoUsernameAvailable === false && newCeo.username.trim() !== "" && (
                      <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                        <X className="w-3.5 h-3.5 text-red-500" />
                        <span>{lang === "ar" ? "مأخوذ ✗" : "Taken ✗"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "مفتاح الأمان (كلمة المرور)" : "Security Key (Password)"}</label>
                <input 
                  type="password" 
                  className="input-field mt-1.5" 
                  value={newCeo.password}
                  onChange={(e) => setNewCeo({ ...newCeo, password: e.target.value })}
                  required={!editingCeoId} 
                />
              </div>
              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "رابط الصورة الشخصية" : "President's Avatar Photo URL"}</label>
                <div className="flex gap-2 mt-1.5">
                  <input 
                    type="url" 
                    className="input-field flex-1" 
                    placeholder="https://images.unsplash.com/..."
                    value={newCeo.avatar}
                    onChange={(e) => setNewCeo({ ...newCeo, avatar: e.target.value })}
                  />
                  {newCeo.avatar && (
                    <img 
                      src={newCeo.avatar} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-xl object-cover border border-outline-variant bg-slate-100"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || ceoUsernameChecking || (newCeo.username.trim() !== "" && isCeoUsernameAvailable === false)}
                className={cn(
                  "btn-primary w-full mt-6 flex items-center justify-center gap-2 cursor-pointer",
                  (loading || ceoUsernameChecking || (newCeo.username.trim() !== "" && isCeoUsernameAvailable === false))
                    ? "bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-50"
                    : ""
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : ceoUsernameChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>{lang === "ar" ? "جاري التحقق من اسم المستخدم..." : "Verifying username..."}</span>
                  </>
                ) : (newCeo.username.trim() !== "" && isCeoUsernameAvailable === false) ? (
                  <>
                    <X className="w-4 h-4 text-red-400" />
                    <span>{lang === "ar" ? "اسم المستخدم مأخوذ كلياً" : "Username is taken"}</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    <span>
                      {editingCeoId 
                        ? (lang === "ar" ? "تحديث التخويل" : "Apply Credentials")
                        : (lang === "ar" ? "تأكيد التخويل والتعيين" : "Authorize President credentials")}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl relative border border-red-500/30">
            <button 
              onClick={() => { setShowConfirmModal(false); setItemToDelete(null); }}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">
                {deleteType === "ceo" 
                  ? (lang === "ar" ? "تأكيد إلغاء تخويل الـ CEO" : "Unassign President Credentials")
                  : (lang === "ar" ? "حذف والبيانات كاملاً للمنشأة" : "Purge Corporation Data")}
              </h3>
              <p className="text-sm text-on-surface-variant opacity-80 mb-6 font-medium">
                {deleteType === "ceo" ? (
                  lang === "ar" 
                    ? `هل أنت متأكد من رغبتك في سحب تخويل وكتابة حذف حساب الرئيس التنفيذي: "${itemToDelete?.name}"؟` 
                    : `Permanently delete authorization tokens for President "${itemToDelete?.name}"?`
                ) : (
                  lang === "ar" 
                    ? `تحذير: سيتم حذف المنشأة "${itemToDelete?.name}" ومعها كافة حسابات موظفيها، تقارير الحضور، الفروع، والمواقع المرتبطة نهائياً بدون إمكانية الاستعادة!` 
                    : `CRITICAL DETACHMENT: Removing "${itemToDelete?.name}" will instantly purge all stored records, geofence scopes, registered logs, and associated user accounts from this database cluster. Proceed with caution!`
                )}
              </p>
              
              {opError && (
                <div className="p-3 mb-6 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl font-semibold">
                  {opError}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowConfirmModal(false); setItemToDelete(null); }}
                  className="flex-1 py-3 text-sm font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-xl"
                >
                  {lang === "ar" ? "إلغاء الأمر" : "Cancel"}
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
                      {lang === "ar" ? "تأكيد الحذف النهائي" : "Purge Forever"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Company Details & Logs/Charts Panel --- */}
      {showDetailsModal && selectedCompanyDetails && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-surface-container border border-outline-variant w-full max-w-5xl rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-6 right-6 p-2 text-on-surface hover:bg-white/10 rounded-full transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-outline-variant mb-8">
              <div className="flex items-center gap-5">
                <img 
                  src={selectedCompanyDetails.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCompanyDetails.name)}&background=3B82F6&color=fff&size=128&bold=true`} 
                  alt={selectedCompanyDetails.name} 
                  className="w-16 h-16 rounded-2xl object-cover border border-outline-variant shadow-sm bg-white p-1"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-on-surface">{selectedCompanyDetails.name}</h2>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                      {lang === "ar" ? "مساحة معزولة" : "Isolated Tenant"}
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant opacity-60 flex items-center gap-1 mt-1">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="font-mono">@{selectedCompanyDetails.domain}.com</span>
                    <span className="mx-2">•</span>
                    <span className="font-mono">ID: {selectedCompanyDetails.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics cards & Company Specific Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1 space-y-4">
                <div className="p-5 bg-surface border border-outline-variant rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-65 tracking-wider block">
                      {lang === "ar" ? "كوادر المنشأة" : "Company Personnel"}
                    </span>
                    <span className="text-xl font-bold text-on-surface">
                      {dashboardData ? dashboardData.employeesList.filter(e => e.companyId === selectedCompanyDetails.id).length : 0}
                    </span>
                  </div>
                </div>

                <div className="p-5 bg-surface border border-outline-variant rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-65 tracking-wider block">
                      {lang === "ar" ? "تسجيلات دخول المنشأة" : "Company Login Signs"}
                    </span>
                    <span className="text-xl font-bold text-on-surface">
                      {dashboardData ? dashboardData.recentLogs.filter(l => l.companyId === selectedCompanyDetails.id).length : 0}
                    </span>
                  </div>
                </div>

                {/* Assigned CEO Card in Details */}
                <div className="p-5 bg-surface border border-outline-variant rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-65 tracking-wider block mb-2">
                    {lang === "ar" ? "المدير التنفيذي المسؤول" : "Accredited Tenant CEO"}
                  </span>
                  {(() => {
                    const companyCeo = ceos.find(c => c.companyId === selectedCompanyDetails.id);
                    return companyCeo ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={companyCeo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyCeo.name)}&background=10B981&color=fff`} 
                          alt="" 
                          className="w-8 h-8 rounded-full object-cover border border-outline"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="font-bold text-on-surface text-xs block">{companyCeo.name}</span>
                          <span className="text-[10px] text-on-surface-variant opacity-50 block">@{companyCeo.username}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-on-surface-variant opacity-40 italic">
                        {lang === "ar" ? "لم يتم تعيين مدير تنفيذي بعد" : "No President assigned"}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Company Login Timeline Chart */}
              <div className="lg:col-span-2 p-5 bg-surface border border-outline-variant rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-on-surface text-sm mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    {lang === "ar" ? "مؤشر نشاط الحضور اليومي للمنشأة" : "Tenant Chronological Activity Curve"}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant opacity-60">
                    {lang === "ar" ? "تتبع بياني لوتيرة تسجيل الدخول اليومية لهذه الشركة تحديداً" : "Focused metric representation for logins belonging purely to this environment"}
                  </p>
                </div>

                <div className="h-40 w-full mt-4">
                  {dashboardData && dashboardData.attendanceHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.attendanceHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`colorCompanyDetailsGrad`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis dataKey="date" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "#2D3748", border: "none", borderRadius: "10px", color: "#fff", fontSize: "11px" }} />
                        <Area 
                          type="monotone" 
                          dataKey={selectedCompanyDetails.name} 
                          stroke="#3B82F6" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill={`url(#colorCompanyDetailsGrad)`} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-on-surface-variant opacity-60">
                      {lang === "ar" ? "لا توجد حركات حضور لتمثيلها مبدئياً" : "Environment telemetry not yet recorded"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs for details tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-outline-variant/30 pt-8">
              {/* Left Column: Staff Directory */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                    <Users className="w-4.5 h-4.5 text-primary" />
                    {lang === "ar" ? "قائمة موظفي المنشأة" : "Registered Staff Directory"}
                  </h4>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full">
                    {dashboardData ? dashboardData.employeesList.filter(e => e.companyId === selectedCompanyDetails.id).length : 0}
                  </span>
                </div>

                {/* List of personnel */}
                <div className="border border-outline-variant rounded-2xl overflow-hidden bg-surface">
                  <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/30">
                    {(() => {
                      const companyEmployees = dashboardData 
                        ? dashboardData.employeesList.filter(e => e.companyId === selectedCompanyDetails.id)
                        : [];
                      
                      return companyEmployees.length === 0 ? (
                        <div className="p-8 text-center text-xs text-on-surface-variant opacity-60">
                          {lang === "ar" ? "لا يوجد موظفين مسجلين حالياً" : "Directory workspace is empty"}
                        </div>
                      ) : (
                        companyEmployees.map(emp => (
                          <div key={emp.id} className="p-3 flex items-center justify-between hover:bg-primary/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <img
                                src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=3B82F6&color=fff`}
                                className="w-8 h-8 rounded-xl object-cover"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="font-bold text-xs text-on-surface block">{emp.name}</span>
                                <span className="text-[10px] text-on-surface-variant opacity-50 block">{emp.email}</span>
                              </div>
                            </div>
                            <div className="text-end">
                              <span className="px-1.5 py-0.5 text-[9px] bg-secondary-container/20 text-secondary font-bold rounded">
                                {emp.department}
                              </span>
                            </div>
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Historical registry files */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                    <Clock className="w-4.5 h-4.5 text-emerald-500" />
                    {lang === "ar" ? "سجل الحضور الأخير للمنشأة" : "Latest Login Sign Records"}
                  </h4>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2.5 py-0.5 rounded-full">
                    {dashboardData ? dashboardData.recentLogs.filter(l => l.companyId === selectedCompanyDetails.id).length : 0}
                  </span>
                </div>

                {/* List of sign-ins */}
                <div className="border border-outline-variant rounded-2xl overflow-hidden bg-surface">
                  <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/30">
                    {(() => {
                      const companyLogs = dashboardData
                        ? dashboardData.recentLogs.filter(l => l.companyId === selectedCompanyDetails.id)
                        : [];
                      
                      return companyLogs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-on-surface-variant opacity-60">
                          {lang === "ar" ? "لم تسجل أي حركة دخول/خروج لهذه المنشأة" : "No login cycles loaded yet"}
                        </div>
                      ) : (
                        companyLogs.map(log => (
                          <div key={log.id} className="p-3 flex items-center justify-between hover:bg-primary/5 transition-all text-xs">
                            <div className="flex items-center gap-3">
                              <img
                                src={log.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.employeeName || "User")}&background=10B981&color=fff`}
                                className="w-7 h-7 rounded-lg object-cover"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="font-bold text-on-surface block text-xs">{log.employeeName || `@${log.employeeId}`}</span>
                                <span className="text-[10px] font-mono text-on-surface-variant opacity-60 block">
                                  {new Date(log.timestamp).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                            <div className="text-end flex items-center gap-2">
                              <span className="text-[9px] font-mono text-on-surface-variant opacity-40">
                                {new Date(log.timestamp).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}
                              </span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                log.status === "In" 
                                  ? "bg-success/15 text-success border border-success/10" 
                                  : "bg-red-500/15 text-red-500 border border-red-500/10"
                              )}>
                                {log.status === "In" ? (lang === "ar" ? "دخول" : "In") : (lang === "ar" ? "خروج" : "Out")}
                              </span>
                            </div>
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/30 mt-8">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
              >
                {lang === "ar" ? "إغلاق التفاصيل" : "Close Portal Details"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: Subscription Plan Creation / Edit --- */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl relative border border-emerald-500/30 text-on-surface max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowPlanModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              {editingPlanId 
                ? (lang === "ar" ? "تعديل باقة الاشتراك" : "Edit Subscription Preset")
                : (lang === "ar" ? "تأسيس باقة اشتراك جديدة" : "Provision New Preset")}
            </h3>
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="input-label font-bold text-xs">{lang === "ar" ? "اسم الباقة / التسمية الترويجية" : "Package & Plan Name"}</label>
                <input 
                  type="text" 
                  className="input-field mt-1.5" 
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder={lang === "ar" ? "الباقة الذهبية / بريميوم" : "Enterprise Premium"}
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label font-bold text-xs">{lang === "ar" ? "فترة الباقة بالشهور" : "Duration (Months)"}</label>
                  <input 
                    type="number" 
                    min="1"
                    className="input-field mt-1.5" 
                    value={newPlan.durationMonths}
                    onChange={(e) => setNewPlan({ ...newPlan, durationMonths: parseInt(e.target.value) || 12 })}
                    required 
                  />
                </div>
                <div>
                  <label className="input-label font-bold text-xs">{lang === "ar" ? "سعة الموظفين للمنشأة" : "Employee Slots"}</label>
                  <input 
                    type="number" 
                    min="1"
                    className="input-field mt-1.5" 
                    value={newPlan.maxEmployees}
                    onChange={(e) => setNewPlan({ ...newPlan, maxEmployees: parseInt(e.target.value) || 15 })}
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="input-label font-bold text-xs block mb-2">{lang === "ar" ? "ميزات الباقة المدمجة" : "Bundled Module Features"}</label>
                <div className="space-y-2.5 border border-outline-variant p-3.5 rounded-2xl bg-surface-container-high/60">
                  {[
                    { id: "Employees", label: lang === "ar" ? "إدارة الموظفين والملفات" : "Employee Management" },
                    { id: "Departments", label: lang === "ar" ? "إدارة الأقسام والمدراء" : "Department Management" },
                    { id: "Geofences", label: lang === "ar" ? "الحواجز الجغرافية (Geofences)" : "Geofencing Control" },
                    { id: "Multi_Geofence", label: lang === "ar" ? "تعدد نطاقات البصمة الجغرافية (Premium)" : "Multi-Geofence Scope (Enterprise)" },
                    { id: "HR_Management", label: lang === "ar" ? "إدارة الموارد البشرية والرواتب (شؤون الموظفين)" : "HR Payroll Management (Premium)" }
                  ].map(feat => {
                    const isChecked = newPlan.features?.split(",").includes(feat.id);
                    return (
                      <label key={feat.id} className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer text-on-surface">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const list = newPlan.features ? newPlan.features.split(",") : [];
                            const newList = list.includes(feat.id) ? list.filter(x => x !== feat.id) : [...list, feat.id];
                            setNewPlan({ ...newPlan, features: newList.join(",") });
                          }}
                          className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        />
                        <span>{feat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full mt-6 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-white border-none"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {editingPlanId 
                  ? (lang === "ar" ? "حفظ تعديلات الباقة" : "Save Plan configurations")
                  : (lang === "ar" ? "تأسيس الباقة وتعميمها" : "Publish Package Preset")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
