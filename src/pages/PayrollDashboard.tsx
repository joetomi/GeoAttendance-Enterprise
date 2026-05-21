import React, { useState, useEffect } from "react";
import { 
  Banknote, 
  Settings2, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet,
  Download,
  Users,
  FileText,
  Laptop,
  Star,
  Award,
  Trash2,
  Plus,
  PenSquare,
  Check,
  X,
  ShieldAlert,
  AlertTriangle
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Header } from "../components/Navigation";
import { cn } from "../lib/utils";
import { Employee } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

// HR Enterprise Interfaces
interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "Annual" | "Sick" | "Emergency" | "Maternity" | "Unpaid";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

interface PerformanceRating {
  employeeId: string;
  attendanceScore: number; // 1-5
  qualityScore: number;    // 1-5
  teamScore: number;       // 1-5
  goalsScore: number;      // 1-5
  comments: string;
  lastUpdated: string;
}

interface EmployeeDocument {
  id: string;
  employeeId: string;
  name: string;
  docNum: string;
  expiryDate: string;
  status: "Active" | "ExpiringSoon" | "Expired";
}

interface CustodyAsset {
  id: string;
  employeeId: string;
  name: string;
  serialNumber: string;
  assignedDate: string;
  status: "Custody" | "Returned" | "Damaged";
}

interface DisciplinaryWarning {
  id: string;
  employeeId: string;
  type: "Verbal" | "Written" | "Suspension" | "Deduction";
  reason: string;
  date: string;
  severity: "Low" | "Medium" | "High";
}

export default function PayrollDashboard() {
  const { lang, t } = useLanguage();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const featuresList = currentUser.features ? currentUser.features.split(",") : ["Geofences", "Departments", "Employees"];
  const isHRAllowed = currentUser.role === "dev" || featuresList.includes("HR_Management");

  if (!isHRAllowed) {
    return (
      <div className="min-h-screen bg-surface bg-stars p-8 flex items-center justify-center animate-fade-in" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="card max-w-lg w-full p-10 bg-surface-container border border-outline-variant rounded-3xl text-center shadow-2xl relative">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
            <ShieldAlert className="w-10 h-10 animate-pulse text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-on-surface mb-4">
            {lang === "ar" ? "إدارة الموارد البشرية غير متوفرة" : "HR Management Not Available"}
          </h2>
          <p className="text-on-surface-variant mb-8 leading-relaxed text-sm">
            {lang === "ar" 
              ? "مزايا إدارة الموارد البشرية والرواتب والعهد والتقييمات تقتصر على الباقة البريميوم (Premium Plan). الرجاء التواصل مع مدير النظام لترقية اشتراك شركتك." 
              : "Human Resource management, payroll deductions, company asset tracking, and ratings are premium-tier features. Please contact your system administrator to upgrade your subscription plan."}
          </p>
          <div className="mt-2 text-xs text-on-surface-variant font-mono opacity-60">
            {lang === "ar" ? "الباقة الحالية: باقة أساسية" : `Current Plan: ${currentUser.planName || "Standard Plan"}`}
          </div>
        </div>
      </div>
    );
  }

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Active HR Management Tab
  const [activeTab, setActiveTab] = useState<"payroll" | "leaves" | "performance" | "documents" | "assets" | "warnings">("payroll");

  // Original Payroll Configurations
  const [payrollConfig, setPayrollConfig] = useState({
    baseSalary: 0,
    gracePeriodMinutes: 15,
    halfDayThresholdMinutes: 30,
    fullDayThresholdMinutes: 60,
    weekends: "5,6", // Fri, Sat
    holidays: "[]"
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Custom HR Tab States
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, PerformanceRating>>({});
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [assets, setAssets] = useState<CustodyAsset[]>([]);
  const [warnings, setWarnings] = useState<DisciplinaryWarning[]>([]);

  // Creation forms states
  const [newLeave, setNewLeave] = useState({ type: "Annual", startDate: "", endDate: "", reason: "" });
  const [newDoc, setNewDoc] = useState({ name: "Contract", docNum: "", expiryDate: "" });
  const [newAsset, setNewAsset] = useState({ name: "", serialNumber: "", assignedDate: "" });
  const [newWarning, setNewWarning] = useState({ type: "Written", reason: "", severity: "Medium" });
  const [userEval, setUserEval] = useState<PerformanceRating>({
    employeeId: "", attendanceScore: 5, qualityScore: 5, teamScore: 5, goalsScore: 5, comments: "", lastUpdated: ""
  });

  // Load Employees and HR Data
  useEffect(() => {
    fetchEmployees();
    initializeHRStorage();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchPayrollConfig(selectedEmployeeId);
      loadEmployeeEvaluation(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees", {
        headers: { "X-Company-Id": currentUser.companyId || "" }
      });
      const data = await res.json();
      setEmployees(data);
      if (data.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const fetchPayrollConfig = async (empId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/config/${empId}`, {
        headers: { "X-Company-Id": currentUser.companyId || "" }
      });
      const data = await res.json();
      setPayrollConfig({
        ...data,
        baseSalary: parseFloat(data.baseSalary) || 0
      });
    } catch (err) {
      console.error("Failed to fetch payroll config", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payroll/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Company-Id": currentUser.companyId || ""
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          ...payrollConfig
        }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: lang === "ar" ? "تم حفظ إعدادات الرواتب بنجاح." : "Payroll configuration saved successfully." });
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      setMsg({ type: "error", text: lang === "ar" ? "حدث خطأ أثناء حفظ الإعدادات." : "Error saving configuration." });
    } finally {
      setSaving(false);
    }
  };

  // Excel Payroll exporter
  const exportPayrollReport = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      const fromDate = `${selectedMonth}-01`;
      const toDate = new Date(new Date(fromDate).getFullYear(), new Date(fromDate).getMonth() + 1, 0).toISOString().split('T')[0];
      
      const queryParams = new URLSearchParams({
        from: fromDate,
        to: toDate,
        employeeId: selectedEmployeeId
      });
      
      const res = await fetch(`/api/attendance/report?${queryParams.toString()}`, {
        headers: { "X-Company-Id": currentUser.companyId || "" }
      });
      const logs = await res.json();
      const employee = employees.find(e => e.id === selectedEmployeeId);
      const daysInMonth = new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).getDate();
      const dailyRate = payrollConfig.baseSalary / 30;

      const daysReport: any[] = [];
      let totalDeductions = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${selectedMonth}-${String(i).padStart(2, '0')}`;
        const dayDate = new Date(dateStr);
        const dayOfWeek = dayDate.getDay();
        const isWeekend = payrollConfig.weekends.split(',').includes(dayOfWeek.toString());
        
        const dayLogs = logs.filter((l: any) => new Date(l.timestamp).toDateString() === dayDate.toDateString());
        const checkInLog = dayLogs.find((l: any) => l.status === "In");
        
        let status = "Absent";
        let checkInTime = "--:--";
        let lateMinutes = 0;
        let deduction = 0;
        let dailyEarnings = dailyRate;

        if (isWeekend) {
          status = "Weekend";
          checkInTime = "N/A";
          dailyEarnings = dailyRate;
        } else if (checkInLog) {
          status = checkInLog.geofenceStatus === "Success" ? "In Zone" : "Out Zone";
          const time = new Date(checkInLog.timestamp);
          checkInTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          
          const startBase = new Date(time);
          startBase.setHours(9, 0, 0, 0); 
          lateMinutes = Math.max(0, Math.floor((time.getTime() - startBase.getTime()) / (1000 * 60)));

          if (lateMinutes > payrollConfig.fullDayThresholdMinutes) {
            deduction = dailyRate;
            dailyEarnings = 0;
          } else if (lateMinutes > payrollConfig.halfDayThresholdMinutes) {
            deduction = dailyRate * 0.5;
            dailyEarnings = dailyRate * 0.5;
          }
        } else {
          deduction = dailyRate;
          dailyEarnings = 0;
        }

        totalDeductions += deduction;
        daysReport.push({
          date: dateStr,
          name: employee?.name || "Unknown",
          checkIn: checkInTime,
          status: status,
          late: lateMinutes + " min",
          deduction: deduction.toFixed(2),
          earnings: dailyEarnings.toFixed(2)
        });
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Payroll Report");

      ws.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Employee Name", key: "name", width: 25 },
        { header: "Check-In Time", key: "checkIn", width: 15 },
        { header: "Geofence Status", key: "status", width: 20 },
        { header: "Late Minutes", key: "late", width: 15 },
        { header: "Applied Deduction (LYD)", key: "deduction", width: 22 },
        { header: "Final Daily Earnings (LYD)", key: "earnings", width: 22 },
      ];

      ws.addRows(daysReport);
      ws.addRow([]);
      ws.addRow(["Total Base Salary:", "", "", "", "", "", payrollConfig.baseSalary.toFixed(2)]);
      ws.addRow(["Total Deductions Accumulated:", "", "", "", "", "", totalDeductions.toFixed(2)]);
      ws.addRow(["Net Payable Salary for Month:", "", "", "", "", "", (payrollConfig.baseSalary - totalDeductions).toFixed(2)]);

      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "059669" } };
      
      const lastRow = ws.rowCount;
      [lastRow, lastRow - 1, lastRow - 2].forEach(num => {
        ws.getRow(num).font = { bold: true };
        ws.getCell(`G${num}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F3F4F6" } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Payroll_${employee?.username || "Staff"}_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to generate payroll report.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize HR Storage
  const initializeHRStorage = () => {
    // Leaves storage
    const storedLeaves = localStorage.getItem("geo_hr_leaves");
    if (storedLeaves) {
      setLeaves(JSON.parse(storedLeaves));
    } else {
      const initialLeaves: LeaveRequest[] = [
        { id: "L-1", employeeId: "emp_1", type: "Annual", startDate: "2026-06-01", endDate: "2026-06-05", days: 5, reason: "Annual Summer Vacation", status: "Approved" },
        { id: "L-2", employeeId: "emp_2", type: "Sick", startDate: "2026-05-18", endDate: "2026-05-19", days: 2, reason: "Seasonal flu", status: "Pending" }
      ];
      localStorage.setItem("geo_hr_leaves", JSON.stringify(initialLeaves));
      setLeaves(initialLeaves);
    }

    // Performance evaluations storage
    const storedEvals = localStorage.getItem("geo_hr_evals");
    if (storedEvals) {
      setEvaluations(JSON.parse(storedEvals));
    } else {
      const initialEvals: Record<string, PerformanceRating> = {
        "emp_1": { employeeId: "emp_1", attendanceScore: 5, qualityScore: 5, teamScore: 5, goalsScore: 4, comments: "Exceptional output and attendance regularity.", lastUpdated: "2026-05-15" }
      };
      localStorage.setItem("geo_hr_evals", JSON.stringify(initialEvals));
      setEvaluations(initialEvals);
    }

    // Employee identity / corp documents expiry
    const storedDocs = localStorage.getItem("geo_hr_docs");
    if (storedDocs) {
      setDocuments(JSON.parse(storedDocs));
    } else {
      const initialDocs: EmployeeDocument[] = [
        { id: "D-1", employeeId: "emp_1", name: "Work Contract", docNum: "WC-99881", expiryDate: "2027-12-31", status: "Active" },
        { id: "D-2", employeeId: "emp_1", name: "National ID Card", docNum: "NIC-88229", expiryDate: "2026-06-15", status: "ExpiringSoon" },
        { id: "D-3", employeeId: "emp_2", name: "Corporate Security Badge", docNum: "CSB-2291", expiryDate: "2025-11-20", status: "Expired" }
      ];
      localStorage.setItem("geo_hr_docs", JSON.stringify(initialDocs));
      setDocuments(initialDocs);
    }

    // Corporate Devices, laptop custody
    const storedAssets = localStorage.getItem("geo_hr_assets");
    if (storedAssets) {
      setAssets(JSON.parse(storedAssets));
    } else {
      const initialAssets: CustodyAsset[] = [
        { id: "A-1", employeeId: "emp_1", name: "Lenovo ThinkPad X1 Carbon M2", serialNumber: "TP-992182-X", assignedDate: "2024-05-10", status: "Custody" },
        { id: "A-2", employeeId: "emp_2", name: "iPhone 15 Enterprise", serialNumber: "IPH-1002931-B", assignedDate: "2025-01-15", status: "Custody" }
      ];
      localStorage.setItem("geo_hr_assets", JSON.stringify(initialAssets));
      setAssets(initialAssets);
    }

    // Warnings and disciplinary measures
    const storedWarnings = localStorage.getItem("geo_hr_warnings");
    if (storedWarnings) {
      setWarnings(JSON.parse(storedWarnings));
    } else {
      const initialWarnings: DisciplinaryWarning[] = [
        { id: "W-1", employeeId: "emp_2", type: "Written", reason: "Excessive late check-ins outside Tripoli complex boundary.", date: "2026-05-12", severity: "Medium" }
      ];
      localStorage.setItem("geo_hr_warnings", JSON.stringify(initialWarnings));
      setWarnings(initialWarnings);
    }
  };

  const loadEmployeeEvaluation = (empId: string) => {
    const storedEvals = JSON.parse(localStorage.getItem("geo_hr_evals") || "{}");
    if (storedEvals[empId]) {
      setUserEval(storedEvals[empId]);
    } else {
      setUserEval({
        employeeId: empId,
        attendanceScore: 5,
        qualityScore: 5,
        teamScore: 5,
        goalsScore: 5,
        comments: "",
        lastUpdated: ""
      });
    }
  };

  // HR Add Action Handlers
  const handleLogLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !newLeave.startDate || !newLeave.endDate) return;
    
    const start = new Date(newLeave.startDate);
    const end = new Date(newLeave.endDate);
    if (start > end) {
      alert(lang === "ar" ? "تاريخ البداية لا يمكن أن يتخطى تاريخ النهاية" : "Start date cannot exceed end date");
      return;
    }

    const durationDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const leaveObj: LeaveRequest = {
      id: "L-" + Date.now(),
      employeeId: selectedEmployeeId,
      type: newLeave.type as any,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      days: durationDays,
      reason: newLeave.reason || (lang === "ar" ? "طلب إجازة اعتيادية" : "General leave log"),
      status: "Pending"
    };

    const updated = [leaveObj, ...leaves];
    setLeaves(updated);
    localStorage.setItem("geo_hr_leaves", JSON.stringify(updated));
    setNewLeave({ type: "Annual", startDate: "", endDate: "", reason: "" });
  };

  const handleToggleLeaveStatus = (id: string, status: "Approved" | "Rejected") => {
    const updated = leaves.map(l => l.id === id ? { ...l, status } : l);
    setLeaves(updated);
    localStorage.setItem("geo_hr_leaves", JSON.stringify(updated));
  };

  const handleDeleteLeave = (id: string) => {
    const updated = leaves.filter(l => l.id !== id);
    setLeaves(updated);
    localStorage.setItem("geo_hr_leaves", JSON.stringify(updated));
  };

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    const storedEvals = JSON.parse(localStorage.getItem("geo_hr_evals") || "{}");
    const updatedObj = {
      ...userEval,
      employeeId: selectedEmployeeId,
      lastUpdated: new Date().toISOString().split("T")[0]
    };
    storedEvals[selectedEmployeeId] = updatedObj;
    setEvaluations(storedEvals);
    localStorage.setItem("geo_hr_evals", JSON.stringify(storedEvals));
    alert(lang === "ar" ? "تم حفظ تقييم المهارات والمؤشرات بنجاح." : "KPI score sheet updated successfully.");
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !newDoc.expiryDate) return;

    const expiry = new Date(newDoc.expiryDate);
    const today = new Date();
    const alertLimit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    let docStatus: "Active" | "ExpiringSoon" | "Expired" = "Active";
    if (expiry < today) docStatus = "Expired";
    else if (expiry <= alertLimit) docStatus = "ExpiringSoon";

    const docObj: EmployeeDocument = {
      id: "D-" + Date.now(),
      employeeId: selectedEmployeeId,
      name: newDoc.name,
      docNum: newDoc.docNum || "DOC-" + Math.floor(1000 + Math.random() * 9000),
      expiryDate: newDoc.expiryDate,
      status: docStatus
    };

    const updated = [docObj, ...documents];
    setDocuments(updated);
    localStorage.setItem("geo_hr_docs", JSON.stringify(updated));
    setNewDoc({ name: "Contract", docNum: "", expiryDate: "" });
  };

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    localStorage.setItem("geo_hr_docs", JSON.stringify(updated));
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !newAsset.name) return;

    const assetObj: CustodyAsset = {
      id: "A-" + Date.now(),
      employeeId: selectedEmployeeId,
      name: newAsset.name,
      serialNumber: newAsset.serialNumber || "SN-" + Math.floor(100000 + Math.random() * 900000),
      assignedDate: newAsset.assignedDate || new Date().toISOString().split("T")[0],
      status: "Custody"
    };

    const updated = [assetObj, ...assets];
    setAssets(updated);
    localStorage.setItem("geo_hr_assets", JSON.stringify(updated));
    setNewAsset({ name: "", serialNumber: "", assignedDate: "" });
  };

  const handleUpdateAssetStatus = (id: string, status: "Custody" | "Returned" | "Damaged") => {
    const updated = assets.map(a => a.id === id ? { ...a, status } : a);
    setAssets(updated);
    localStorage.setItem("geo_hr_assets", JSON.stringify(updated));
  };

  const handleDeleteAsset = (id: string) => {
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated);
    localStorage.setItem("geo_hr_assets", JSON.stringify(updated));
  };

  const handleAddWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !newWarning.reason) return;

    const warningObj: DisciplinaryWarning = {
      id: "W-" + Date.now(),
      employeeId: selectedEmployeeId,
      type: newWarning.type as any,
      reason: newWarning.reason,
      date: new Date().toISOString().split("T")[0],
      severity: newWarning.severity as any
    };

    const updated = [warningObj, ...warnings];
    setWarnings(updated);
    localStorage.setItem("geo_hr_warnings", JSON.stringify(updated));
    setNewWarning({ type: "Written", reason: "", severity: "Medium" });
  };

  const handleDeleteWarning = (id: string) => {
    const updated = warnings.filter(w => w.id !== id);
    setWarnings(updated);
    localStorage.setItem("geo_hr_warnings", JSON.stringify(updated));
  };

  const toggleWeekend = (day: number) => {
    const current = payrollConfig.weekends.split(',').filter(x => x !== "").map(Number);
    let updated;
    if (current.includes(day)) {
      updated = current.filter(d => d !== day);
    } else {
      updated = [...current, day].sort();
    }
    setPayrollConfig({ ...payrollConfig, weekends: updated.join(',') });
  };

  const dayMapping = [
    { id: 6, label: t.days[0] }, // Sat
    { id: 0, label: t.days[1] }, // Sun
    { id: 1, label: t.days[2] }, // Mon
    { id: 2, label: t.days[3] }, // Tue
    { id: 3, label: t.days[4] }, // Wed
    { id: 4, label: t.days[5] }, // Thu
    { id: 5, label: t.days[6] }, // Fri
  ];

  // Selected state filters
  const currentEmpLeaves = leaves.filter(l => l.employeeId === selectedEmployeeId);
  const currentEmpDocs = documents.filter(d => d.employeeId === selectedEmployeeId);
  const currentEmpAssets = assets.filter(a => a.employeeId === selectedEmployeeId);
  const currentEmpWarnings = warnings.filter(w => w.employeeId === selectedEmployeeId);

  return (
    <div className="min-h-screen bg-surface bg-stars" dir={lang === "ar" ? "rtl" : "ltr"}>
      <main className="p-8 pb-32 transition-all">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Dashboard & Selector */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-black text-on-surface tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {lang === "ar" ? "إدارة الموارد البشرية والرواتب (HR)" : "Human Resources & Payroll Office"}
              </h2>
              <p className="text-on-surface-variant opacity-70 mt-1">
                {lang === "ar" 
                  ? "تحكم متكامل بالهيكل الوظيفي، الإجازات، تقييم الأداء والممتلكات الخاصة بالمستضافين." 
                  : "Central control for localized corporate personnel logic, KPI ratings, and staff records."}
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-surface-container-high p-1.5 rounded-2xl border border-outline-variant/30">
              <Users className={cn("w-4 h-4 text-primary", lang === "ar" ? "mr-3" : "ml-3")} />
              <select 
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className={cn(
                  "bg-transparent border-none focus:ring-0 text-sm font-bold text-primary py-2 cursor-pointer outline-none",
                  lang === "ar" ? "pl-8 pr-2" : "pr-8 pl-2"
                )}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id} className="bg-surface font-sans text-on-surface">
                    {emp.name} (@{emp.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* HR Core Modules Nav Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { id: "payroll", labelAr: "الرواتب والخصومات", labelEn: "Payroll Settings", icon: Banknote },
              { id: "leaves", labelAr: "الإجازات والطلبات", labelEn: "Leaves Registry", icon: Calendar, badge: currentEmpLeaves.filter(l => l.status === "Pending").length, color: "bg-danger" },
              { id: "performance", labelAr: "تقييم الأداء", labelEn: "KPIs & Reviews", icon: Star },
              { id: "documents", labelAr: "مستندات الموظف", labelEn: "Documents Logs", icon: FileText, badge: currentEmpDocs.filter(d => d.status === "Expired").length, color: "bg-red-500" },
              { id: "assets", labelAr: "العهد والممتلكات", labelEn: "Custody Assets", icon: Laptop, badge: currentEmpAssets.filter(a => a.status === "Custody").length, color: "bg-primary" },
              { id: "warnings", labelAr: "الجزاءات والتنبيهات", labelEn: "Violations Notice", icon: ShieldAlert, badge: currentEmpWarnings.length, color: "bg-amber-500" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-4 rounded-2xl border cursor-pointer transition-all gap-2 text-center",
                  activeTab === tab.id 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/2" 
                    : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[11px] font-bold block">
                  {lang === "ar" ? tab.labelAr : tab.labelEn}
                </span>

                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn("absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] text-white font-black", tab.color || "bg-primary")}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Shared Employee Overview Profile Bar */}
          <div className="p-6 bg-surface-container-low border border-outline-variant/30 rounded-3xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                {employees.find(e => e.id === selectedEmployeeId)?.name?.charAt(0) || "U"}
              </div>
              <div>
                <h4 className="font-bold text-on-surface text-base">
                  {employees.find(e => e.id === selectedEmployeeId)?.name}
                </h4>
                <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">
                  {lang === "ar" ? "القسم المعين إليه: " : "Department Scope: "}
                  <span className="font-bold text-primary">{employees.find(e => e.id === selectedEmployeeId)?.department || "Executive"}</span>
                  <span className="mx-2">•</span>
                   @{employees.find(e => e.id === selectedEmployeeId)?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-50 block">{lang === "ar" ? "سماحية التأخير" : "Grace Window"}</span>
                <span className="text-sm font-black text-on-surface">{payrollConfig.gracePeriodMinutes} {lang === "ar" ? "دقيقة" : "min"}</span>
              </div>
              <div className="w-[1px] h-8 bg-outline-variant/40" />
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-50 block">{lang === "ar" ? "متوسط تقييم الأداء" : "Avg KPI Rank"}</span>
                <span className="text-sm font-black text-amber-500">
                  {((userEval.attendanceScore + userEval.qualityScore + userEval.teamScore + userEval.goalsScore) / 4).toFixed(1)} / 5.0
                </span>
              </div>
              <div className="w-[1px] h-8 bg-outline-variant/40" />
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-50 block">{lang === "ar" ? "إجمالي العهد المقيدة" : "Active Custodies"}</span>
                <span className="text-sm font-black text-on-surface">{currentEmpAssets.filter(a => a.status === "Custody").length}</span>
              </div>
            </div>
          </div>

          {/* Tab Panel contents */}
          <div className="animate-fade-in">
            
            {/* 1. PAYROLL TAB */}
            {activeTab === "payroll" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                  <form onSubmit={handleSaveConfig} className="card p-8 bg-surface-container border border-outline-variant/20 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="bg-primary/10 p-2.5 rounded-xl">
                        <Settings2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-on-surface">{lang === "ar" ? "تعديل رواتب وهيكل البدلات" : "Employee Salary & Deduction parameters"}</h3>
                        <p className="text-xs text-on-surface-variant opacity-60 font-medium uppercase tracking-widest mt-1">{lang === "ar" ? "الراتب والعتبات" : "Salary & Thresholds"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">{t.baseSalary}</label>
                        <div className="relative">
                          <Banknote className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40", lang === "ar" ? "right-4" : "left-4")} />
                          <input 
                            type="number" 
                            value={payrollConfig.baseSalary}
                            onChange={(e) => setPayrollConfig(prev => ({ ...prev, baseSalary: parseFloat(e.target.value) || 0 }))}
                            className={cn(
                              "w-full bg-surface-container-high border border-outline-variant rounded-xl py-3 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                              lang === "ar" ? "pr-12 pl-4" : "pl-12 pr-4"
                            )}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">{t.gracePeriod}</label>
                        <div className="relative">
                          <Clock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40", lang === "ar" ? "right-4" : "left-4")} />
                          <input 
                            type="number" 
                            value={payrollConfig.gracePeriodMinutes}
                            onChange={(e) => setPayrollConfig(prev => ({ ...prev, gracePeriodMinutes: parseInt(e.target.value) || 0 }))}
                            className={cn(
                              "w-full bg-surface-container-high border border-outline-variant rounded-xl py-3 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                              lang === "ar" ? "pr-12 pl-4" : "pl-12 pr-4"
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 p-6 bg-surface-container-high rounded-2xl border border-outline-variant/30 mb-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">{t.weekends}</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                          {dayMapping.map((day) => (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleWeekend(day.id)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border",
                                payrollConfig.weekends.split(',').includes(day.id.toString())
                                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                  : "bg-surface border-outline-variant text-on-surface-variant hover:border-primary/50"
                              )}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">{t.halfDayThreshold}</label>
                          <input 
                            type="number" 
                            value={payrollConfig.halfDayThresholdMinutes}
                            onChange={(e) => setPayrollConfig(prev => ({ ...prev, halfDayThresholdMinutes: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">{t.fullDayThreshold}</label>
                          <input 
                            type="number" 
                            value={payrollConfig.fullDayThresholdMinutes}
                            onChange={(e) => setPayrollConfig(prev => ({ ...prev, fullDayThresholdMinutes: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {msg && (
                        <p className={cn("text-xs font-bold", msg.type === "success" ? "text-emerald-500" : "text-red-500")}>
                          {msg.text}
                        </p>
                      )}
                      <button 
                        type="submit" 
                        className={cn(
                          "flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all",
                          lang === "ar" ? "mr-auto" : "ml-auto"
                        )}
                      >
                        {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : t.saveConfig}
                      </button>
                    </div>
                  </form>

                  <div className="card p-8 bg-surface-container border border-outline-variant/30 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <h4 className="font-bold text-on-surface">{t.conditionA}</h4>
                      </div>
                      <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
                        {lang === "ar" ? "إذا تجاوز تسجيل الحضور فترة السماح بمقدار " : "If checking exceeds grace by "}
                        <span className="text-primary font-bold">{payrollConfig.halfDayThresholdMinutes} {lang === "ar" ? "دقيقة" : "minutes"}</span>,
                        {lang === "ar" ? " يقوم النظام بخصم نصف يوم من الأجر اليومي." : " system deducts 50% of the daily rate."}
                      </p>
                    </div>
                    <div className="w-[1px] bg-outline-variant/30 hidden md:block" />
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <h4 className="font-bold text-on-surface">{t.conditionB}</h4>
                      </div>
                      <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
                        {lang === "ar" ? "إذا تجاوز تسجيل الحضور " : "If check-in exceeds "}
                        <span className="text-primary font-bold">{payrollConfig.fullDayThresholdMinutes} {lang === "ar" ? "دقيقة" : "minutes"}</span>
                        {lang === "ar" ? " أو كان في حالة غياب، يخصم أجر اليوم كاملاً." : " or state is \"Absent\", 100% deduction applies."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-1 space-y-8">
                  <div className="card p-8 bg-surface-container border border-outline-variant/20 shadow-xl overflow-hidden relative">
                    <h3 className="text-xl font-bold text-on-surface mb-6">{lang === "ar" ? "تصدير التقارير المالية" : "Financial Export Center"}</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">{t.targetMonth}</label>
                        <input 
                          type="month" 
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant rounded-xl py-3 px-4 text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="p-6 bg-surface-container-high rounded-2xl border border-outline-variant/30 space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-on-surface-variant font-medium">{lang === "ar" ? "الفترة المحددة" : "Target Cycle"}</span>
                          <span className="font-bold text-on-surface">{selectedMonth}</span>
                        </div>
                      </div>

                      <button 
                        onClick={exportPayrollReport}
                        disabled={loading || !selectedEmployeeId}
                        className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        {loading ? (lang === "ar" ? "جاري المعالجة..." : "Processing...") : t.payrollReport}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LEAVES & VACATIONS TAB */}
            {activeTab === "leaves" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Col */}
                <div className="lg:col-span-1">
                  <form onSubmit={handleLogLeave} className="card p-6 bg-surface-container border border-outline-variant rounded-2xl space-y-4">
                    <h3 className="font-bold text-on-surface flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      {lang === "ar" ? "تسجيل طلب إجازة جديد" : "Log New Leave Request"}
                    </h3>
                    
                    <div className="space-y-2">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "نوع الإجازة" : "Leave Type"}</label>
                      <select
                        value={newLeave.type}
                        onChange={(e) => setNewLeave(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm text-on-surface outline-none"
                      >
                        <option value="Annual">{lang === "ar" ? "إجازة سنوية" : "Annual Leave"}</option>
                        <option value="Sick">{lang === "ar" ? "إجازة مرضية" : "Sick Leave"}</option>
                        <option value="Emergency">{lang === "ar" ? "إجازة طارئة" : "Emergency leave"}</option>
                        <option value="Maternity">{lang === "ar" ? "إجازة أمومة" : "Maternity Leave"}</option>
                        <option value="Unpaid">{lang === "ar" ? "بدون راتب" : "Unpaid"}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "البداية" : "Start"}</label>
                        <input
                          type="date"
                          required
                          value={newLeave.startDate}
                          onChange={(e) => setNewLeave(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "النهاية" : "End"}</label>
                        <input
                          type="date"
                          required
                          value={newLeave.endDate}
                          onChange={(e) => setNewLeave(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "السبب المبرر" : "Justified Reason"}</label>
                      <textarea
                        value={newLeave.reason}
                        onChange={(e) => setNewLeave(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm text-on-surface min-h-[80px]"
                        placeholder={lang === "ar" ? "أدخل سبب تقديم الإجازة..." : "Enter reason for this request..."}
                      />
                    </div>

                    <button type="submit" className="w-full py-3 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/10 cursor-pointer">
                      {lang === "ar" ? "تقييد وحفظ طلب الإجازة" : "Save Leave Request"}
                    </button>
                  </form>
                </div>

                {/* Table List Col */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="card p-6 bg-surface-container border border-outline-variant rounded-2xl">
                    <h3 className="font-bold text-on-surface mb-4">
                      {lang === "ar" ? "تاريخ طلبات الإجازة للموظف" : "Logged Leave Historical Logs"}
                    </h3>

                    {currentEmpLeaves.length === 0 ? (
                      <p className="text-xs text-on-surface-variant opacity-60 py-8 text-center bg-surface rounded-xl border border-dashed border-outline-variant/30">
                        {lang === "ar" ? "لم يتم تقييد أي إجازة للموظف المختار بعد." : "No leave requests found for selected employee."}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                          <thead>
                            <tr className="border-b border-outline-variant pb-2 text-[10px] uppercase font-bold text-on-surface-variant opacity-60">
                              <th className="py-2 text-start">{lang === "ar" ? "المبرر" : "Reason"}</th>
                              <th className="py-2 text-start">{lang === "ar" ? "التناوب" : "Duration"}</th>
                              <th className="py-2 text-center">{lang === "ar" ? "الأيام" : "Days"}</th>
                              <th className="py-2 text-center">{lang === "ar" ? "الحالة" : "Status"}</th>
                              <th className="py-2 text-end">{lang === "ar" ? "إجراءات" : "Actions"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20">
                            {currentEmpLeaves.map(l => (
                              <tr key={l.id} className="hover:bg-primary/5">
                                <td className="py-3 font-bold text-on-surface">
                                  <span className="block">{l.reason}</span>
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary mt-1">{l.type}</span>
                                </td>
                                <td className="py-3 text-on-surface-variant font-mono">
                                  {l.startDate} ~ {l.endDate}
                                </td>
                                <td className="py-3 text-center font-bold text-on-surface">
                                  {l.days} {lang === "ar" ? "أيام" : "Days"}
                                </td>
                                <td className="py-3 text-center">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                    l.status === "Approved" ? "bg-success/15 text-success" :
                                    l.status === "Rejected" ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"
                                  )}>
                                    {l.status}
                                  </span>
                                </td>
                                <td className="py-3 text-end">
                                  <div className="flex justify-end items-center gap-1.5">
                                    {l.status === "Pending" && (
                                      <>
                                        <button onClick={() => handleToggleLeaveStatus(l.id, "Approved")} className="p-1.5 bg-success/20 hover:bg-success hover:text-white rounded text-success transition-all cursor-pointer">
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleToggleLeaveStatus(l.id, "Rejected")} className="p-1.5 bg-red-500/20 hover:bg-red-500 hover:text-white rounded text-red hover:text-white transition-all cursor-pointer">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    <button onClick={() => handleDeleteLeave(l.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded text-red-400 transition-all cursor-pointer">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. PERFORMANCE EVALUATION TAB */}
            {activeTab === "performance" && (
              <div className="card p-8 bg-surface-container border border-outline-variant rounded-2xl max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                    <Award className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">{lang === "ar" ? "رصد مصفوفة وتقييم مهارات الموظف" : "Performance Review & Personnel KPIs"}</h3>
                    <p className="text-xs text-on-surface-variant opacity-60 mt-0.5">{lang === "ar" ? "تحديد المؤشرات القيادية والتزام الوردية" : "Configure direct operational parameters for HRIS index mapping"}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveEvaluation} className="space-y-6">
                  {[
                    { id: "attendanceScore", labelAr: "الانضباط ومواعيد الحضور والمحيط الجغرافي", labelEn: "Attendance & Geofence Adherence" },
                    { id: "qualityScore", labelAr: "جودة المخرجات والإنتاجية المهنية بالشركة", labelEn: "Work Quality & Corporate Value" },
                    { id: "teamScore", labelAr: "العمل الجماعي، المرونة والتواصل الفعال", labelEn: "Team Punctuality & Adaptation" },
                    { id: "goalsScore", labelAr: "تحقيق المستهدفات المرسومة والإنتاج الإجمالي", labelEn: "Goal Achievement Score Metrics" },
                  ].map(scoreItem => (
                    <div key={scoreItem.id} className="p-4 bg-surface rounded-xl border border-outline-variant/20">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-on-surface">{lang === "ar" ? scoreItem.labelAr : scoreItem.labelEn}</label>
                        <span className="text-xs px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold">
                          {(userEval as any)[scoreItem.id]} / 5
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={(userEval as any)[scoreItem.id]}
                        onChange={(e) => setUserEval(prev => ({ ...prev, [scoreItem.id]: parseInt(e.target.value) }))}
                        className="w-full accent-amber-500 bg-surface-container h-2 rounded-lg cursor-pointer"
                      />
                    </div>
                  ))}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant block">{lang === "ar" ? "توصيات وملاحظات الإدارة العليا" : "Global Executive Recommendation Notes"}</label>
                    <textarea
                      value={userEval.comments}
                      onChange={(e) => setUserEval(prev => ({ ...prev, comments: e.target.value }))}
                      className="w-full bg-surface border border-outline-variant rounded-xl p-4 text-sm text-on-surface min-h-[100px]"
                      placeholder={lang === "ar" ? "اكتب تفاصيل التقييم الربع سنوي أو التوجيهات العامة للمندوب..." : "Professional development roadmap directions..."}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-outline-variant/30">
                    <span className="text-xs text-on-surface-variant italic">
                      {lang === "ar" ? "آخر تقييم تم رصده: " : "Last certified evaluation change: "}
                      <span className="font-bold text-primary">{userEval.lastUpdated || "N/A"}</span>
                    </span>
                    <button type="submit" className="px-8 py-3 rounded-xl bg-amber-500 font-bold hover:bg-amber-600 text-surface font-sans text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-amber-500/10">
                      {lang === "ar" ? "حفظ التقييم والمؤشرات" : "Save Appraisal Indicators"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. DOCUMENTS EXPIRY TAB */}
            {activeTab === "documents" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <form onSubmit={handleAddDocument} className="card p-6 bg-surface-container border border-outline-variant rounded-2xl space-y-4">
                    <h3 className="font-bold text-on-surface flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {lang === "ar" ? "تقييد مستند ملف ثبوتي جديد" : "Log New Vital Certificate"}
                    </h3>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "اسم المستند" : "Document Label"}</label>
                      <select
                        value={newDoc.name}
                        onChange={(e) => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
                      >
                        <option value="Work Contract">{lang === "ar" ? "عقد العمل المؤسسي" : "Work Contract Agreement"}</option>
                        <option value="National Passport">{lang === "ar" ? "جواز السفر" : "National Passport Record"}</option>
                        <option value="ID Card">{lang === "ar" ? "البطاقة الشخصية" : "Identity Document"}</option>
                        <option value="Driving License">{lang === "ar" ? "رخصة القيادة" : "Driving License Record"}</option>
                        <option value="Health Insurance">{lang === "ar" ? "مستند التأمين الطبي" : "Medical Insurance Certificate"}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "رقم المستند / المعرف" : "Certificate ID Number"}</label>
                      <input
                        type="text"
                        required
                        value={newDoc.docNum}
                        onChange={(e) => setNewDoc(prev => ({ ...prev, docNum: e.target.value }))}
                        placeholder="e.g. CON-88219"
                        className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "تاريخ انتهاء الصلاحية" : "Official Expiry Date"}</label>
                      <input
                        type="date"
                        required
                        value={newDoc.expiryDate}
                        onChange={(e) => setNewDoc(prev => ({ ...prev, expiryDate: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface"
                      />
                    </div>

                    <button type="submit" className="w-full py-3 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-hover cursor-pointer">
                      {lang === "ar" ? "تقييد المستند" : "Log File Expiration"}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="card p-6 bg-surface-container border border-outline-variant rounded-2xl">
                    <h3 className="font-bold text-on-surface mb-4">
                      {lang === "ar" ? "مستندات الموظف والإنذارات" : "Active Staff Documents & Expiry Alerts"}
                    </h3>

                    {currentEmpDocs.length === 0 ? (
                      <p className="text-xs text-on-surface-variant opacity-60 py-8 text-center bg-surface rounded-xl border border-dashed border-outline-variant/30">
                        {lang === "ar" ? "ليس للموظف أي ملفات في السجل حالياً." : "No documents added yet to directory."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentEmpDocs.map(d => (
                          <div key={d.id} className="p-4 bg-surface border border-outline-variant/30 rounded-2xl flex flex-col justify-between relative overflow-hidden feedback-warning-outline">
                            <div>
                              <div className="flex justify-between items-start gap-4 mb-2">
                                <span className="font-bold text-sm text-on-surface truncate">{d.name}</span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                  d.status === "Active" ? "bg-success/10 text-success" :
                                  d.status === "ExpiringSoon" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse" : "bg-red-500/10 text-red-500 border border-red-500/20 font-black"
                                )}>
                                  {d.status}
                                </span>
                              </div>
                              <span className="text-[10px] text-on-surface-variant font-mono block opacity-60">ID: {d.docNum}</span>
                            </div>

                            <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3 mt-4">
                              <div>
                                <span className="text-[9px] text-on-surface-variant opacity-50 block uppercase font-bold">{lang === "ar" ? "تاريخ لانتهاء" : "Expiry Date"}</span>
                                <span className="text-xs font-bold text-on-surface font-mono">{d.expiryDate}</span>
                              </div>
                              <button onClick={() => handleDeleteDocument(d.id)} className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl text-red-400 transition-all cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. CUSTODY ASSETS TAB */}
            {activeTab === "assets" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <form onSubmit={handleAddAsset} className="card p-6 bg-surface-container border border-outline-variant rounded-2xl space-y-4">
                    <h3 className="font-bold text-on-surface flex items-center gap-2">
                      <Laptop className="w-5 h-5 text-primary" />
                      {lang === "ar" ? "قيد عهدة ممتلكات جديدة" : "Record Custody handout"}
                    </h3>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "اسم الأصل / الوصف" : "Asset Description name"}</label>
                      <input
                        type="text"
                        required
                        value={newAsset.name}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. HP EliteBook Laptop"
                        className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "الرقم التسلسلي (S/N)" : "Serial Code"}</label>
                      <input
                        type="text"
                        value={newAsset.serialNumber}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, serialNumber: e.target.value }))}
                        placeholder="e.g. SN-XYZ99081"
                        className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "تاريخ تسليم العهدة" : "Handout Assignment Date"}</label>
                      <input
                        type="date"
                        value={newAsset.assignedDate}
                        onChange={(e) => setNewAsset(prev => ({ ...prev, assignedDate: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs text-on-surface"
                      />
                    </div>

                    <button type="submit" className="w-full py-3 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-hover cursor-pointer">
                      {lang === "ar" ? "تسجيل العهدة كمعلقة" : "Assign Corporate Custody"}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="card p-6 bg-surface-container border border-outline-variant rounded-2xl">
                    <h3 className="font-bold text-on-surface mb-4">
                      {lang === "ar" ? "الأصول المقيدة تحت عهدة الموظف" : "Corporate Custody Ledger"}
                    </h3>

                    {currentEmpAssets.length === 0 ? (
                      <p className="text-xs text-on-surface-variant opacity-60 py-8 text-center bg-surface rounded-xl border border-dashed border-outline-variant/30">
                        {lang === "ar" ? "الموظف لا يمتلك أي ممتلكات في عهدته حالياً." : "No custody assets logged under this profile."}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                          <thead>
                            <tr className="border-b border-outline-variant/40 pb-2 text-[10px] uppercase font-bold text-on-surface-variant opacity-60">
                              <th className="py-2 text-start">{lang === "ar" ? "الأصل" : "Asset"}</th>
                              <th className="py-2 text-start">{lang === "ar" ? "تاريخ التسليم" : "Assigned"}</th>
                              <th className="py-2 text-center">{lang === "ar" ? "الحالة" : "Status"}</th>
                              <th className="py-2 text-end">{lang === "ar" ? "تحكم ومراجعة" : "Action Control"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20">
                            {currentEmpAssets.map(a => (
                              <tr key={a.id} className="hover:bg-primary/5">
                                <td className="py-3 font-bold text-on-surface">
                                  <span className="block">{a.name}</span>
                                  <span className="text-[10px] text-on-surface-variant font-mono opacity-60">S/N: {a.serialNumber}</span>
                                </td>
                                <td className="py-3 text-on-surface-variant font-mono">{a.assignedDate}</td>
                                <td className="py-3 text-center">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                    a.status === "Custody" ? "bg-primary/10 text-primary" :
                                    a.status === "Returned" ? "bg-success/15 text-success" : "bg-red-500/10 text-red-500"
                                  )}>
                                    {a.status}
                                  </span>
                                </td>
                                <td className="py-3 text-end">
                                  <div className="flex justify-end items-center gap-1.5">
                                    {a.status === "Custody" ? (
                                      <>
                                        <button onClick={() => handleUpdateAssetStatus(a.id, "Returned")} className="px-2 py-1 text-[9px] font-bold bg-success/20 text-success border border-success/30 rounded cursor-pointer">
                                          {lang === "ar" ? "إرجاع" : "Returned"}
                                        </button>
                                        <button onClick={() => handleUpdateAssetStatus(a.id, "Damaged")} className="px-2 py-1 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded cursor-pointer">
                                          {lang === "ar" ? "تالف" : "Damaged"}
                                        </button>
                                      </>
                                    ) : (
                                      <button onClick={() => handleUpdateAssetStatus(a.id, "Custody")} className="px-2 py-1 text-[9px] font-bold bg-primary/15 text-primary rounded cursor-pointer">
                                        {lang === "ar" ? "تسليم" : "Re-issue"}
                                      </button>
                                    )}
                                    <button onClick={() => handleDeleteAsset(a.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded text-red-400 cursor-pointer">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. DISCIPLINARY WARNINGS TAB */}
            {activeTab === "warnings" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <form onSubmit={handleAddWarning} className="card p-6 bg-surface-container border border-outline-variant rounded-2xl space-y-4">
                    <h3 className="font-bold text-on-surface flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
                      {lang === "ar" ? "تسجيل تنبيه تأديبي رسمي" : "Log Disciplinary Action"}
                    </h3>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "نوع الإجراء التأديبي" : "Notification Category"}</label>
                      <select
                        value={newWarning.type}
                        onChange={(e) => setNewWarning(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
                      >
                        <option value="Verbal">{lang === "ar" ? "تنبيه شفهي مسجّل" : "Recorded Verbal warning"}</option>
                        <option value="Written">{lang === "ar" ? "إنذار كتابي رسمي" : "Official Written warning"}</option>
                        <option value="Suspension">{lang === "ar" ? "إيقاف مؤقت عن العمل" : "Suspension Notice"}</option>
                        <option value="Deduction">{lang === "ar" ? "خصم بنود الراتب كجزاء" : "Payroll Deduction Fine"}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "مستوى الخطورة" : "Severity Scale"}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Low", "Medium", "High"].map(sev => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setNewWarning(prev => ({ ...prev, severity: sev }))}
                            className={cn(
                              "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer text-center",
                              newWarning.severity === sev 
                                ? "bg-amber-500 text-surface border-amber-600 shadow" 
                                : "bg-surface border-outline-variant text-on-surface-variant"
                            )}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-on-surface-variant font-bold">{lang === "ar" ? "سبب المخالفة / المذكرة" : "Infraction Statement Details"}</label>
                      <textarea
                        required
                        value={newWarning.reason}
                        onChange={(e) => setNewWarning(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm text-on-surface min-h-[90px]"
                        placeholder={lang === "ar" ? "رصد مسببات الإنذار، مثل تجاوز النطاق الجغرافي أو تكرار الغياب..." : "Detail the protocol rules violated..."}
                      />
                    </div>

                    <button type="submit" className="w-full py-3 bg-amber-500 font-bold hover:bg-amber-600 text-surface font-sans text-xs uppercase tracking-widest rounded-xl cursor-pointer">
                      {lang === "ar" ? "حفظ الإنذار وتسجيله" : "Log Disciplinary Warning"}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="card p-6 bg-surface-container border border-outline-variant rounded-2xl">
                    <h3 className="font-bold text-on-surface mb-4">
                      {lang === "ar" ? "مذكرة المخالفات والجزاءات التراكمية" : "Historical Disciplinary Timelines"}
                    </h3>

                    {currentEmpWarnings.length === 0 ? (
                      <div className="p-8 text-center bg-surface rounded-xl border border-dashed border-outline-variant/30">
                        <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3 opacity-30" />
                        <p className="text-xs text-on-surface-variant opacity-60">
                          {lang === "ar" ? "سجل الموظف نظيف وخالي من المخلفات والتنبيهات." : "No violations or active disciplinary logs found. Perfect profile."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentEmpWarnings.map(w => (
                          <div key={w.id} className="p-5 bg-surface border border-outline-variant/30 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-amber-500 to-red-500" />
                            
                            <div>
                              <div className="flex justify-between items-start gap-3 mb-2">
                                <span className="font-black text-sm text-on-surface">{w.type}</span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                                  w.severity === "High" ? "bg-red-500/15 text-red-500" :
                                  w.severity === "Medium" ? "bg-amber-500/15 text-amber-500" : "bg-primary/10 text-primary"
                                )}>
                                  {w.severity} {lang === "ar" ? "قصوى" : "Severity"}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">{w.reason}</p>
                            </div>

                            <div className="flex justify-between items-center border-t border-outline-variant/20 pt-3">
                              <span className="text-[10px] text-on-surface-variant font-mono opacity-50">Logged date: {w.date}</span>
                              <button onClick={() => handleDeleteWarning(w.id)} className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl text-red-400 transition-all cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
