import React, { useState, useEffect } from "react";
import { Plus, Trash2, MoreVertical, ShieldCheck, UserMinus, Users, ChevronLeft, ChevronRight, X, Edit3, Download, FileSpreadsheet, Eye, EyeOff, RefreshCcw, Loader2, Check, Crown, Smartphone } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Employee } from "../types";
import { cn } from "@/src/lib/utils";
import { Header } from "../components/Navigation";
import { DoubleLocMapModal } from "../components/DoubleLocMapModal";

import { Language, translations } from "../constants/translations";
import { useLanguage } from "../contexts/LanguageContext";

export default function AdminDashboard() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Employee[]>([]);
  const [stats, setStats] = useState({ totalEmployees: 0, activeToday: 0, onlineNow: 0, totalLogs: 0, maxEmployees: Number(currentUser.maxEmployees) || 15 });
  const [loading, setLoading] = useState(true);
  
  const { lang, t } = useLanguage();

  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeErrorMsg, setUpgradeErrorMsg] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDoubleLocLog, setSelectedDoubleLocLog] = useState<any>(null);
  const [showDoubleLocModal, setShowDoubleLocModal] = useState(false);
  const [macDetailsEmployee, setMacDetailsEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEmployeeId, setFilterEmployeeId] = useState("all");
  const [newEmployee, setNewEmployee] = useState({ 
    username: "", 
    password: "", 
    role: "user",
    name: "",
    department: "Operations",
    avatar: "",
    assignedGeofenceId: "",
    checkMacAddress: false
  });

  const [usernameChecking, setUsernameChecking] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const rawUser = newEmployee.username.trim();
    if (rawUser.length === 0) {
      setIsUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const url = `/api/employees/check-username?username=${encodeURIComponent(rawUser)}${editingId ? `&excludeId=${encodeURIComponent(editingId)}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setIsUsernameAvailable(data.available);
        } else {
          setIsUsernameAvailable(false);
        }
      } catch (err) {
        console.error("Checking username failed:", err);
        setIsUsernameAvailable(false);
      } finally {
        setUsernameChecking(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [newEmployee.username, editingId]);

  const refreshAttendance = async () => {
    try {
      setLoading(true);
      const [empRes, attRes, onlineRes, statsRes] = await Promise.all([
        fetch("/api/employees", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
        fetch("/api/attendance", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
        fetch("/api/employees/online", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
        fetch("/api/stats", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null)
      ]);

      if (empRes && empRes.ok) {
        const data = await empRes.json();
        setEmployees(Array.isArray(data) ? data.filter((e: Employee) => ['ceo', 'dev'].includes(currentUser.role) || e.role !== "ceo") : []);
      }

      if (attRes && attRes.ok) {
        const data = await attRes.json();
        setAttendance(Array.isArray(data) ? data : []);
      }

      if (onlineRes && onlineRes.ok) {
        const data = await onlineRes.json();
        setOnlineUsers(Array.isArray(data) ? data : []);
      }

      if (statsRes && statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Dashboard refresh failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert(lang === "ar" ? "حجم الصورة كبير جداً (الأقصى 2 ميجابايت)" : "Image size too large (max 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, attRes, onlineRes, statsRes, deptRes, gfRes] = await Promise.all([
          fetch("/api/employees", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
          fetch("/api/attendance", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
          fetch("/api/employees/online", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
          fetch("/api/stats", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
          fetch("/api/departments", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null),
          fetch("/api/geofence/list", { headers: { "X-Company-Id": currentUser.companyId || "" } }).catch(() => null)
        ]);

        if (empRes && empRes.ok) {
          const data = await empRes.json();
          // Hide CEO accounts from standard admins, CEOs see everyone
          setEmployees(Array.isArray(data) ? data.filter((e: Employee) => ['ceo', 'dev'].includes(currentUser.role) || e.role !== "ceo") : []);
        }

        if (deptRes && deptRes.ok) {
          const data = await deptRes.json();
          setDepartments(Array.isArray(data) ? data : []);
          
          // Set default department if not already set or if creating new
          if (!editingId && data.length > 0) {
            setNewEmployee(prev => ({ ...prev, department: data[0].name }));
          }
        }

        if (gfRes && gfRes.ok) {
          const data = await gfRes.json();
          setGeofences(Array.isArray(data) ? data : []);
        }
        
        if (attRes && attRes.ok) {
          const data = await attRes.json();
          setAttendance(Array.isArray(data) ? data : []);
        }

        if (onlineRes && onlineRes.ok) {
          const data = await onlineRes.json();
          setOnlineUsers(Array.isArray(data) ? data : []);
        }

        if (statsRes && statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    
    const method = editingId ? "PUT" : "POST";
    const endpoint = editingId ? `/api/employees/${editingId}` : "/api/employees";
    
    const currentRequester = JSON.parse(localStorage.getItem("user") || "{}");
    
    // Safety check for role creation
    if (!editingId && newEmployee.role === 'ceo' && currentRequester.role !== 'dev') {
      alert(lang === "ar" ? "لا يسمح إلا للمطور بإنشاء دور المدير التنفيذي" : "Only developers are allowed to create a CEO role");
      setLoading(false);
      return;
    }

    fetch(endpoint, {
      method: method,
      headers: { 
        "Content-Type": "application/json",
        "X-Company-Id": currentRequester.companyId || ""
      },
      body: JSON.stringify({ 
        ...newEmployee, 
        name: newEmployee.name || newEmployee.username, 
        email: `${newEmployee.username}@enterprise.com`, 
        status: 'Active',
        requesterRole: currentRequester.role,
        currentUserId: currentRequester.id,
        companyId: currentRequester.companyId || ""
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Failed to ${editingId ? 'update' : 'add'} employee`);
        }
        return data;
      })
      .then(data => {
        if (editingId) {
          // Use data from server for persistence confirmation
          setEmployees(prev => prev.map(em => em.id === editingId ? data : em));

          // Update local storage if current user edited themselves
          if (editingId === currentRequester.id) {
            localStorage.setItem("user", JSON.stringify(data));
            alert(lang === "ar" ? "تم تحديث هويتك بنجاح! سيتم إعادة تحميل الصفحة." : "Identity updated successfully! Page will reload.");
            setTimeout(() => window.location.reload(), 500);
          } else {
            alert(lang === "ar" ? "تم حفظ التغييرات بنجاح!" : "Changes saved successfully!");
          }
        } else {
          setEmployees(prev => [...prev, data]);
          alert(lang === "ar" ? "تم إضافة الموظف بنجاح!" : "Employee added successfully!");
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }
        setShowModal(false);
        setEditingId(null);
        setNewEmployee({ username: "", password: "", role: "user", name: "", department: "Operations", avatar: "", assignedGeofenceId: "", checkMacAddress: false });
      })
      .catch(err => {
        console.error("Operation failed:", err);
        const errMsg = err.message || "";
        if (
          errMsg.includes("الحد الأقصى للموظفين") || 
          errMsg.includes("الحد الاقصى للموضفين") || 
          errMsg.includes("maximum employee limit") ||
          errMsg.includes("limit")
        ) {
          setUpgradeErrorMsg(errMsg);
          setShowUpgradeModal(true);
        } else {
          alert(`${lang === "ar" ? "خطأ:" : "Error:"} ${errMsg}`);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleEditClick = (employee: Employee) => {
    setEditingId(employee.id);
    setNewEmployee({
      username: employee.username,
      password: "********", 
      role: employee.role,
      name: employee.name,
      department: employee.department || "Operations",
      avatar: employee.avatar || "",
      assignedGeofenceId: employee.assignedGeofenceId ? String(employee.assignedGeofenceId) : "",
      checkMacAddress: !!employee.checkMacAddress
    });
    setShowModal(true);
  };

  const deleteEmployee = (id: string) => {
    const currentUserStr = localStorage.getItem("user");
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      if (currentUser.id === id) {
        alert("You cannot delete your own account for security reasons.");
        return;
      }
    }
    setConfirmingDeleteId(id);
  };

  const performDelete = async () => {
    if (!confirmingDeleteId) return;
    
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`/api/employees/${confirmingDeleteId}?requesterRole=${currentUser.role}`, { 
        method: "DELETE",
        headers: { "X-Company-Id": currentUser.companyId || "" }
      });
      if (!res.ok) throw new Error("Delete failed on server");
      
      const id = confirmingDeleteId;
      setEmployees(prev => prev.filter(e => e.id !== id));
      setOnlineUsers(prev => prev.filter(e => e.id !== id));
      
      // If admin deletes themselves, log them out
      const currentUserStr = localStorage.getItem("user");
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.id === id) {
          localStorage.removeItem("user");
          window.location.href = "/";
          return;
        }
      }
      
      // Refresh stats
      const statsRes = await fetch("/api/stats", {
        headers: { "X-Company-Id": currentUser.companyId || "" }
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      setConfirmingDeleteId(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetEmployeeMac = async (employeeId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employees/${employeeId}/reset-mac`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to reset IMEI number");
      
      alert(lang === "ar" ? "تم إعادة تعيين الـ IMEI للهاتف بنجاح! يمكن للموظف الآن التسجيل من أي هاتف آخر في أول مرة يسجل بها حضور." : "Device IMEI reset successfully! The employee can now register on another phone during their next attendance action.");
      
      // Update employee in local list
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, macAddress: undefined } : e));
      setMacDetailsEmployee(null);
    } catch (err) {
      console.error("Failed to reset IMEI number:", err);
      alert(lang === "ar" ? "فشل في إعادة ضبط الـ IMEI" : "Failed to reset IMEI number");
    } finally {
      setLoading(false);
    }
  };
  
  const exportToExcel = async () => {
    try {
      setLoading(true);
      const isAr = lang === "ar";
      
      const queryParams = new URLSearchParams({
        from: filterStartDate,
        to: filterEndDate,
        employeeId: filterEmployeeId
      });
      
      const res = await fetch(`/api/attendance/report?${queryParams.toString()}`, {
        headers: { "X-Company-Id": currentUser.companyId || "" }
      });
      if (!res.ok) throw new Error("Failed to fetch report data");
      const logs = await res.json();
      
      if (logs.length === 0) {
        alert(isAr ? "لا توجد سجلات حضور بالمعايير المحددة للتصدير." : "No activity logs found for the selected filters.");
        return;
      }
      
      // Helper to verify if it's a real geofence (not a field stamp indicator)
      const isRealGeofenceName = (name: string | null | undefined): boolean => {
        if (!name) return false;
        const n = name.toLowerCase();
        if (
          n.startsWith("verify_double:") ||
          n.includes("verify single") ||
          n.includes("verify_location") ||
          n.includes("بصمة واحدة") ||
          n.includes("direct checkout") ||
          n.includes("الخروج المباشر")
        ) {
          return false;
        }
        return true;
      };

      // Group by employee and date
      const reportMap: Record<string, any> = {};
      
      logs.forEach((log: any) => {
        const dateObj = new Date(log.timestamp);
        const dateKey = dateObj.toLocaleDateString();
        const empKey = log.employeeId;
        const groupKey = `${empKey}_${dateKey}`;
        
        if (!reportMap[groupKey]) {
          reportMap[groupKey] = {
            name: log.employeeName || (isAr ? "غير معروف" : "Unknown"),
            dept: log.department || (isAr ? "غير محدد" : "N/A"),
            date: dateKey,
            checkIn: null,
            checkOut: null,
            checkInLocation: null,
            checkOutLocation: null,
            _inTime: Infinity,
            _outTime: -Infinity
          };
        }
        
        const timeMs = dateObj.getTime();
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        
        const isInside = isRealGeofenceName(log.geofenceName);
        const locData = {
          isInside,
          label: isInside ? log.geofenceName : `${log.latitude?.toFixed(6) || ''}, ${log.longitude?.toFixed(6) || ''}`,
          lat: log.latitude,
          lng: log.longitude
        };

        if (log.status === "In") {
          if (timeMs < reportMap[groupKey]._inTime) {
            reportMap[groupKey]._inTime = timeMs;
            reportMap[groupKey].checkIn = timeStr;
            reportMap[groupKey].checkInLocation = locData;
          }
        } else if (log.status === "Out") {
          if (timeMs > reportMap[groupKey]._outTime) {
            reportMap[groupKey]._outTime = timeMs;
            reportMap[groupKey].checkOut = timeStr;
            reportMap[groupKey].checkOutLocation = locData;
          }
        }
      });
      
      const finalData = Object.values(reportMap).map((item) => {
        let hours = "0.00";
        if (item._inTime !== Infinity && item._outTime !== -Infinity && item._outTime > item._inTime) {
          hours = ((item._outTime - item._inTime) / (1000 * 60 * 60)).toFixed(2);
        }
        return {
          name: item.name,
          dept: item.dept,
          date: item.date,
          checkIn: item.checkIn || (isAr ? "غير مسجل" : "--:--"),
          checkInLocation: item.checkInLocation,
          checkOut: item.checkOut || (isAr ? "غير مسجل" : "--:--"),
          checkOutLocation: item.checkOutLocation,
          workHours: hours
        };
      });

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const sheetTitle = isAr ? "تقرير الحضور والتحقق الميداني" : "Attendance & Field Verification Report";
      const worksheet = workbook.addWorksheet(sheetTitle);

      // Add Headers dynamically based on language
      const bColumns = isAr ? [
        { header: "اسم الموظف", key: "staffName", width: 25 },
        { header: "القسم", key: "department", width: 20 },
        { header: "التاريخ", key: "date", width: 15 },
        { header: "وقت الحضور", key: "checkIn", width: 15 },
        { header: "موقع الحضور", key: "checkInLocation", width: 35 },
        { header: "وقت الانصراف", key: "checkOut", width: 15 },
        { header: "موقع الانصراف", key: "checkOutLocation", width: 35 },
        { header: "ساعات العمل", key: "workHours", width: 15 },
      ] : [
        { header: "Staff Name", key: "staffName", width: 25 },
        { header: "Department", key: "department", width: 20 },
        { header: "Date", key: "date", width: 15 },
        { header: "Check In", key: "checkIn", width: 15 },
        { header: "Check In Location", key: "checkInLocation", width: 35 },
        { header: "Check Out", key: "checkOut", width: 15 },
        { header: "Check Out Location", key: "checkOutLocation", width: 35 },
        { header: "Work Hours", key: "workHours", width: 15 },
      ];

      worksheet.columns = bColumns;

      // Add Rows manually to insert active lat / lng hyperlinks
      finalData.forEach((item) => {
        const row = worksheet.addRow({
          staffName: item.name,
          department: item.dept,
          date: item.date,
          checkIn: item.checkIn,
          checkInLocation: "", // set below
          checkOut: item.checkOut,
          checkOutLocation: "", // set below
          workHours: item.workHours
        });

        const handleLocCell = (cell: any, loc: any) => {
          if (loc) {
            if (loc.isInside) {
              cell.value = loc.label;
            } else if (loc.lat && loc.lng) {
              cell.value = {
                text: `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`,
                hyperlink: `https://www.google.com/maps?q=${loc.lat},${loc.lng}`,
                tooltip: isAr ? "انقر لفتح الموقع على خرائط جوجل" : "Click to view on Google Maps"
              };
              cell.font = { color: { argb: "0284C7" }, underline: true, bold: true };
            } else {
              cell.value = isAr ? "بلا إحداثيات" : "No Coordinates";
            }
          } else {
            cell.value = "--";
          }
        };

        handleLocCell(row.getCell("checkInLocation"), item.checkInLocation);
        handleLocCell(row.getCell("checkOutLocation"), item.checkOutLocation);
      });

      // Make headers bold and styled
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "059669" } // Emerald-600
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Apply borders to all current cells
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          // Keep font properties if it's already customized with link/underline color, else set defaults
          if (!cell.font || !cell.font.underline) {
            cell.font = {
              color: { argb: rowNumber === 1 ? "FFFFFF" : "000000" },
              bold: rowNumber === 1
            };
          }
          
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          };
          
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            // Zebra striping
            if (rowNumber % 2 === 0) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "F9FAFB" }
              };
            }
          }
        });
      });

      // Convert to buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = isAr
        ? `تقرير_حضور_${filterEmployeeId === 'all' ? 'الشركة' : 'الموظف'}_من_${filterStartDate}_إلى_${filterEndDate}.xlsx`
        : `Attendance_${filterEmployeeId === 'all' ? 'Company' : 'Staff'}_${filterStartDate}_to_${filterEndDate}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
      
    } catch (err) {
      console.error("Export failed:", err);
      alert(lang === "ar" ? "فشل تصدير التقرير الاحترافي لرصد الحضور الحركي والميداني." : "Failed to generate professional Excel report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface bg-stars" dir={lang === "ar" ? "rtl" : "ltr"}>
      
      <main className="p-8 pb-32 transition-all">
        <div className="max-w-7xl mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: t.statsTotalEmployees, value: stats.totalEmployees, color: "bg-primary-container", icon: <Users className="w-6 h-6" /> },
              { label: t.statsAttendanceRate, value: stats.activeToday, color: "bg-secondary", icon: <ShieldCheck className="w-6 h-6" /> },
              { label: "Online Now", value: stats.onlineNow, color: "bg-emerald-500", icon: <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> },
              { label: "Archived Logs", value: stats.totalLogs, color: "bg-primary", icon: <ShieldCheck className="w-6 h-6" /> }
            ].map((stat, i) => (
              <div key={i} className="card p-6 flex items-center justify-between bg-pattern-wavy">
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">{stat.value}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", stat.color)}>
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
            <div className="xl:col-span-12">
              <div className="card p-6 bg-surface-container bg-pattern-wavy">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface">{t.liveStatus}</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                   {onlineUsers.length === 0 ? (
                     <p className="text-xs text-on-surface-variant opacity-60 italic">{t.noPersonnel}</p>
                   ) : (
                     onlineUsers.map((user, idx) => (
                        <div key={`${user.id || 'user'}-${idx}`} className="flex items-center gap-3 bg-surface p-2 pr-4 rounded-2xl border border-outline-variant transition-transform hover:scale-105">
                          <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} className="w-10 h-10 rounded-xl border border-secondary/30 object-cover" alt="" />
                          <div>
                           <p className="text-xs font-bold text-on-surface leading-tight">{user.name}</p>
                           <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">{t.liveNow}</p>
                         </div>
                       </div>
                     ))
                   )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {/* Employee Directory Block (Now Full-Width of the page) */}
            <div className="w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-on-surface tracking-tight">{t.navEmployees}</h3>
                  <p className="text-sm text-on-surface-variant">{lang === "ar" ? "إدارة وتفويض موظفي الشركة." : "Manage and authorize corporate staff."}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end text-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">
                      {lang === "ar" ? "سعة الموظفين" : "Employee Capacity"}
                    </span>
                    <span className="text-xs font-mono font-bold text-on-surface flex items-center gap-1.5 font-sans">
                      <span className={cn((stats.totalEmployees || employees.length) >= (stats.maxEmployees || 15) ? "text-error" : "text-emerald-400")}>
                        {stats.totalEmployees || employees.length}
                      </span>
                      <span className="text-on-surface-variant/40">/</span>
                      <span className="opacity-90">{stats.maxEmployees || 15}</span>
                    </span>
                  </div>

                  {(stats.totalEmployees || employees.length) >= (stats.maxEmployees || 15) ? (
                    <button
                      id="upgrade-capacity-btn"
                      onClick={() => {
                        setUpgradeErrorMsg("");
                        setShowUpgradeModal(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
                    >
                      <Crown className="w-4 h-4 text-black animate-bounce" />
                      {lang === "ar" ? "ترقية الباقة 👑" : "Upgrade Plan 👑"}
                    </button>
                  ) : (
                    <button id="add-employee-btn" onClick={() => { setEditingId(null); setNewEmployee({ username: "", password: "", role: "user", name: "", department: "Operations", avatar: "", assignedGeofenceId: "", checkMacAddress: false }); setShowModal(true); }} className="btn-primary">
                      <Plus className="w-5 h-5" />
                      {lang === "ar" ? "إضافة موظف" : "Add Employee"}
                    </button>
                  )}
                </div>
              </div>

              <div className="card overflow-hidden bg-pattern-wavy">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse rtl:text-right">
                    <thead className="bg-surface-container-high border-b border-outline-variant">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t.employee}</th>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t.department}</th>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">{lang === "ar" ? "الإجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {initialLoading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant italic text-sm">Synchronizing ledger...</td>
                        </tr>
                      ) : employees.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant italic">No records.</td>
                        </tr>
                      ) : (
                        employees.map((employee, idx) => {
                          const assignedGf = geofences.find(g => String(g.id) === String(employee.assignedGeofenceId));
                          return (
                            <tr key={`${employee.id || 'emp'}-${idx}`} className="hover:bg-surface-container transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={employee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random`} 
                                    alt={employee.name} 
                                    className="w-10 h-10 rounded-xl object-cover border border-outline-variant"
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-on-surface">{employee.name}</p>
                                      <span className={cn(
                                        "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                                        employee.role === 'admin' ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
                                      )}>
                                        {employee.role}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter opacity-70">{employee.username}</p>
                                      {assignedGf && (
                                        <span className={cn(
                                          "text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-0.5",
                                          employee.assignedGeofenceId === "verify_location_single" || employee.assignedGeofenceId === "verify_location" || employee.assignedGeofenceId === "verify_location_double"
                                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        )}>
                                          📍 {assignedGf.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-secondary uppercase tracking-widest">{employee.department}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {employee.macAddress && (
                                  <button 
                                    type="button"
                                    onClick={() => setMacDetailsEmployee(employee)}
                                    className="relative p-2 text-emerald-400 hover:bg-emerald-500/10 transition-colors rounded-full flex items-center justify-center cursor-pointer group"
                                    title={lang === "ar" ? "تفاصيل هاتف الموظف ورقمه (IMEI)" : "Employee Phone IMEI Details"}
                                  >
                                    <Smartphone className="w-5 h-5 pointer-events-none" />
                                    <span className="absolute bottom-1 right-1 bg-emerald-500 text-[#121214] rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black border border-[#121214] pointer-events-none shadow">
                                      ✓
                                    </span>
                                  </button>
                                )}
                                {(currentUser.role === 'ceo' || currentUser.role === 'dev' || (currentUser.role === 'admin' && (employee.role !== 'admin' || employee.id === currentUser.id))) && (
                                  <button 
                                    type="button"
                                    onClick={() => handleEditClick(employee)}
                                    className="p-2 text-secondary hover:bg-secondary-container transition-colors rounded-full flex items-center justify-center"
                                    title="Edit Employee"
                                  >
                                    <Edit3 className="w-4 h-4 pointer-events-none" />
                                  </button>
                                )}
                                {employee.id !== currentUser.id && (currentUser.role === 'ceo' || currentUser.role === 'dev' || (currentUser.role === 'admin' && employee.role !== 'admin')) && (
                                  <button 
                                    type="button"
                                    onClick={() => deleteEmployee(employee.id)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 transition-colors rounded-full group/del flex items-center justify-center"
                                    title={`Remove ${employee.name}`}
                                  >
                                    <Trash2 className="w-5 h-5 pointer-events-none transition-transform group-active/del:scale-75" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Attendance & Activity Logs Underneath Employee Directory (Now Full-Width of the page) */}
            <div className="w-full">
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight">{t.activityLogs}</h3>
                    <p className="text-sm text-on-surface-variant">{t.activitySub}</p>
                  </div>
                  <button 
                    onClick={refreshAttendance}
                    disabled={loading}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95 disabled:opacity-50 group"
                    title={lang === "ar" ? "تحديث السجلات" : "Refresh Logs"}
                  >
                    <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
                  </button>
                </div>

                <div className="card p-5 bg-surface-container-high border border-outline-variant/30 bg-pattern-wavy">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t.fromDate}</label>
                      <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t.toDate}</label>
                      <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">{t.employee}</label>
                      <select 
                        value={filterEmployeeId}
                        onChange={(e) => setFilterEmployeeId(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                      >
                        <option value="all">{t.allEmployees}</option>
                        {employees.map((emp, idx) => (
                          <option key={`${emp.id || 'emp'}-${idx}`} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={exportToExcel} 
                      disabled={loading}
                      className="w-full h-[44px] flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/15 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {t.export}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card p-6 bg-surface-container overflow-hidden bg-pattern-wavy">
                <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {attendance.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-40">{t.noActivity}</p>
                    </div>
                  ) : (
                    attendance.map((log, idx) => {
                      // Determine if log is a location verification stamp
                      const isVerificationLog = log.geofenceName && (
                        log.geofenceName.startsWith("verify_double:") ||
                        log.geofenceName.toLowerCase().includes("verify single") ||
                        log.geofenceName.toLowerCase().includes("verify_location") ||
                        log.geofenceName.includes("بصمة واحدة") ||
                        log.geofenceName.toLowerCase().includes("direct checkout") ||
                        log.geofenceName.includes("الخروج المباشر")
                      );

                      // Parse start & confirm coordinates for double stamp, or fallback for single stamp
                      let loc1 = null, loc2 = null;
                      const isDouble = !!(log.geofenceName && log.geofenceName.startsWith("verify_double:"));
                      
                      if (log.geofenceName && log.geofenceName.startsWith("verify_double:")) {
                        try {
                          const parsed = JSON.parse(log.geofenceName.replace("verify_double:", ""));
                          loc1 = parsed.loc1;
                          loc2 = parsed.loc2;
                        } catch (e) {
                          console.error("Failed to parse verify_double coordinates:", e);
                        }
                      }
                      
                      if (!loc2) {
                        loc2 = { lat: log.latitude || 32.3743, lng: log.longitude || 15.0904 };
                      }
                      
                      const mapUrl = `/map-view?lat1=${loc1 ? loc1.lat : ""}&lng1=${loc1 ? loc1.lng : ""}&lat2=${loc2.lat}&lng2=${loc2.lng}&label1=${encodeURIComponent(isDouble ? (lang === "ar" ? "البصمة الأولى (بدء)" : "First Stamp (1/2)") : "")}&label2=${encodeURIComponent(lang === "ar" ? (isDouble ? "البصمة الثانية (تأكيد)" : "موقع البصمة الميدانية") : (isDouble ? "Second Stamp (2/2)" : "Field Stamp Coordinate"))}&emp=${encodeURIComponent(log.employeeName || "")}&lang=${lang}&isDouble=${isDouble}`;

                      return (
                        <div key={`${log.id || 'log'}-${idx}`} className="relative pl-6 pb-6 border-l-2 border-outline-variant last:pb-0 rtl:pl-0 rtl:pr-6 rtl:border-l-0 rtl:border-r-2 group">
                          <div className={cn(
                            "absolute -left-[9px] rtl:-right-[9px] top-0 w-4 h-4 rounded-full border-4 border-surface shadow-sm transition-transform group-hover:scale-125",
                            log.status === 'In' ? "bg-secondary" : "bg-red-500"
                          )} />
                          
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-xs font-black uppercase tracking-wider",
                                log.status === 'In' ? "text-secondary" : "text-red-500"
                              )}>
                                {log.status === 'In' ? (lang === "ar" ? "تم تسجيل الحضور" : "Checked In") : (lang === "ar" ? "تم تسجيل الانصراف" : "Checked Out")}
                              </span>
                              <span className="text-xs font-mono font-medium text-on-surface-variant opacity-80 bg-surface px-2.5 py-1 rounded-lg border border-outline-variant/40">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(log.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="flex items-start gap-4 mt-1.5">
                              <img src={log.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.employeeName || 'U')}&background=random`} className="w-12 h-12 rounded-2xl object-cover border border-outline-variant/60 shadow-inner shrink-0" alt="" />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-black text-on-surface leading-tight truncate">{log.employeeName || 'Unknown Employee'}</p>
                                  {log.role === 'admin' && (
                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-on-surface-variant/80 mt-1">{log.department}</p>
                                
                                {isVerificationLog ? (
                                  <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <span className="text-amber-500 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                      {lang === "ar" 
                                        ? (isDouble ? "تحقق الأقمار الصناعية (بصمة ثنائية متتالية)" : "تحقق الأقمار الصناعية (بصمة ميدانية منفردة)")
                                        : (isDouble ? "Satellite GPS (Dual Stamp Verification)" : "Satellite GPS (Single Field Stamp)")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDoubleLocLog(log);
                                        setShowDoubleLocModal(true);
                                      }}
                                      className="text-xs text-primary font-black underline hover:text-primary-high transition-all flex items-center gap-2 bg-primary/15 hover:bg-primary/25 px-3 py-1.5 rounded-xl border border-primary/20 hover:scale-[1.02] shadow-sm select-none cursor-pointer"
                                      title={lang === "ar" 
                                        ? (isDouble ? "اضغط لفتح الخريطة بالبصمتين والمسافة الفاصلة" : "اضغط لمشاهدة موقع البصمة الميدانية بدون مقارنة")
                                        : (isDouble ? "Click to view dynamic path between stamps" : "Click to view standalone field stamp on map")}
                                    >
                                      <span>🗺️</span>
                                      <span>
                                        {lang === "ar" 
                                          ? (isDouble ? "فتح خريطة الحركة ومقارنة البصمتين (1 و 2)" : "عرض خريطة البصمة الميدانية الحالية") 
                                          : (isDouble ? "Open dual stamps comparative-path view" : "View active standalone stamp coordinate")}
                                      </span>
                                      <span className="text-[10px] font-mono opacity-80 font-bold bg-primary/20 px-1.5 py-0.5 rounded-lg">
                                        ({log.latitude?.toFixed(5)}, {log.longitude?.toFixed(5)})
                                      </span>
                                    </button>
                                  </div>
                                ) : log.geofenceName ? (
                                  <div className="text-emerald-500 text-xs font-bold mt-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl inline-flex items-center gap-2 select-none">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>{lang === "ar" ? "نطاق الفرع المعتمد:" : "Branch Area Zone:"} {log.geofenceName}</span>
                                    {log.latitude && (
                                      <span className="text-[10px] font-mono opacity-85 font-normal">
                                        ({log.latitude.toFixed(4)}, {log.longitude.toFixed(4)})
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {confirmingDeleteId && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="card w-full max-w-sm p-8 bg-surface-container shadow-2xl border border-red-500/20">
                <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-on-surface text-center mb-2">{t.deleteAccount}</h3>
                <p className="text-sm text-on-surface-variant text-center mb-8 opacity-70">
                  {t.areYouSureDelete}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setConfirmingDeleteId(null)}
                    className="btn border border-outline-variant hover:bg-surface-container-high transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={performDelete}
                    disabled={loading}
                    className="btn bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? (lang === "ar" ? "جاري الحذف..." : "Deleting...") : t.delete}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Employee Modal */}
          {showModal && (
            <div id="add-employee-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="card w-full max-w-md p-6 bg-surface-container shadow-2xl max-h-[90vh] flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl font-bold text-on-surface">
                    {editingId ? t.editEmployee : t.newEmployee}
                  </h3>
                  <button onClick={() => { setShowModal(false); setEditingId(null); setNewEmployee({ username: "", password: "", role: "user", name: "", department: "Operations", avatar: "", assignedGeofenceId: "", checkMacAddress: false }); }} className="text-on-surface-variant hover:text-on-surface p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddEmployee} className="space-y-4 overflow-y-auto flex-1 pr-1.5 custom-scrollbar pb-2">
                  <div className="flex flex-col items-center mb-6">
                    <label className="input-label mb-2 text-center w-full">{lang === "ar" ? "صورة الموظف" : "Employee Photo"}</label>
                    <label className="relative w-32 h-32 rounded-3xl border-2 border-dashed border-outline-variant hover:border-primary flex items-center justify-center cursor-pointer hover:bg-primary/5 transition-all group overflow-hidden shadow-inner">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      {newEmployee.avatar ? (
                        <>
                          <img src={newEmployee.avatar} className="w-full h-full object-cover" alt="Custom Avatar" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                            <Plus className="w-8 h-8 mb-1" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{lang === "ar" ? "تغيير" : "Change"}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-on-surface-variant group-hover:text-primary">
                          <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center border border-outline-variant group-hover:border-primary/30 transition-colors">
                            <Plus className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest">{lang === "ar" ? "إضافة من الهاتف" : "Upload From Phone"}</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="input-label">{t.username}</label>
                    <div className="relative animate-fade-in">
                      <input 
                        type="text" 
                        className={cn(
                          "input-field",
                          lang === "ar" ? "pl-24" : "pr-24"
                        )} 
                        value={newEmployee.username}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, username: e.target.value.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, "") }))}
                        placeholder={lang === "ar" ? "مثال: ahmad_hq" : "e.g., ahmad_hq"}
                        required 
                      />
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5",
                        lang === "ar" ? "left-3 flex-row-reverse" : "right-3"
                      )}>
                        {usernameChecking && (
                          <div className="flex items-center gap-1 text-primary text-[10px] font-bold bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{lang === "ar" ? "جاري الفحص..." : "Checking..."}</span>
                          </div>
                        )}
                        {!usernameChecking && isUsernameAvailable === true && newEmployee.username.trim() !== "" && (
                          <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === "ar" ? "صالح ✓" : "Valid ✓"}</span>
                          </div>
                        )}
                        {!usernameChecking && isUsernameAvailable === false && newEmployee.username.trim() !== "" && (
                          <div className="flex items-center gap-1 text-red-500 text-[10px] font-bold bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                            <X className="w-3.5 h-3.5 text-red-500" />
                            <span>{lang === "ar" ? "مأخوذ ✗" : "Taken ✗"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">{t.password} {editingId && <span className="text-[10px] text-on-surface-variant opacity-60">({lang === "ar" ? "اتركه فارغاً للاحتفاظ بالحالي" : "Leave blank to keep current"})</span>}</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className={cn(
                          "input-field",
                          lang === "ar" ? "pl-10" : "pr-10"
                        )}
                        value={newEmployee.password}
                        onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                        required={!editingId} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn(
                          "absolute top-3 text-on-surface-variant hover:text-primary transition-colors",
                          lang === "ar" ? "left-3" : "right-3"
                        )}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">{t.role || (lang === "ar" ? "دور المستخدم" : "User Role")}</label>
                    <select 
                      className="input-field appearance-none bg-no-repeat bg-right pr-10 rtl:bg-left rtl:pl-10 rtl:pr-4 text-primary font-bold" 
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value as Employee['role'] }))}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.5em' }}
                    >
                      <option value="user" className="text-on-surface">{lang === "ar" ? "مستخدم عادي" : "Normal User"}</option>
                      <option value="admin" className="text-on-surface">{lang === "ar" ? "مسؤول النظام" : "System Admin"}</option>
                      {currentUser.role === 'dev' && (
                        <option value="ceo" className="text-on-surface">CEO</option>
                      )}
                      {currentUser.role === 'dev' && (
                        <option value="dev" className="text-on-surface">Developer</option>
                      )}
                    </select>
                  </div>

                  {newEmployee.role === "user" && (
                    <div className="p-3.5 rounded-2xl border border-outline-variant/30 bg-[#1A1A1A] space-y-2 animate-fade-in">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-outline accent-primary cursor-pointer text-primary bg-[#1C1C1E]"
                          checked={newEmployee.checkMacAddress}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, checkMacAddress: e.target.checked }))}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">
                            {lang === "ar" ? "التحقق من هاتف الموظف بواسطة IMEI الخاص بالجهاز" : "Verify employee phone by Device IMEI"}
                          </span>
                        </div>
                      </label>
                      <p className="text-[10px] leading-normal text-on-surface-variant/75 text-left rtl:text-right">
                        {lang === "ar" 
                          ? "ملاحظة: عند تفعيل هذا الخيار، فإن أول مرة يسجل فيها الموظف الدخول لحسابه المعطى له بواسطة المدير، يحفظ النظام معرف الـ IMEI الخاص بالهاتف ليسجل بعد ذلك باسم الحساب ولا يمكنه أن يبصم إلا به. يسري هذا الإجراء على المستخدمين العاديين فقط ولا ينطبق على المسؤولين أو مالكي الشركة." 
                          : "Note: When enabled, the first time the employee logs in with their assigned account, the system saves the phone's IMEI identifier to link it with the account. Subsequent attendance logins/punches will only be allowed from this device. Sparing admins and company owners."}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="input-label">{t.displayName}</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">{t.department}</label>
                    <select 
                      className="input-field appearance-none bg-no-repeat bg-right pr-10 rtl:bg-left rtl:pl-10 rtl:pr-4 text-primary font-bold" 
                      value={newEmployee.department}
                      onChange={(e) => {
                        const deptName = e.target.value;
                        const matchedDept = departments.find(d => d.name === deptName);
                        const deptGeofences = matchedDept && matchedDept.assignedGeofenceId ? String(matchedDept.assignedGeofenceId) : "";
                        setNewEmployee(prev => ({ 
                          ...prev, 
                          department: deptName,
                          assignedGeofenceId: deptGeofences
                        }));
                      }}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.5em' }}
                    >
                      {departments.length === 0 ? (
                        <option value="General Admin" className="text-on-surface">General Admin</option>
                      ) : (
                        departments.map((dept, idx) => (
                          <option key={`${dept.id || 'dept'}-${idx}`} value={dept.name} className="text-on-surface">{dept.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-3">
                    {/* Location Settings Mode */}
                    <div className="mb-3 space-y-2">
                      <p className="text-xs font-bold text-on-surface">
                        {lang === "ar" ? "طريقة التحقق من الحضور وموقع الموظف" : "Attendance & Location Verification Method"}
                      </p>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {/* Option 1: Standard Geofences */}
                        <label 
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none text-xs font-semibold",
                            (!newEmployee.assignedGeofenceId || (newEmployee.assignedGeofenceId !== "verify_location_single" && newEmployee.assignedGeofenceId !== "verify_location" && newEmployee.assignedGeofenceId !== "verify_location_double"))
                              ? "bg-primary/10 border-primary/50 text-white shadow-lg shadow-primary/5" 
                              : "bg-surface border-outline-variant hover:bg-white/5 text-on-surface-variant"
                          )}
                        >
                          <input
                            type="radio"
                            name="verification_mode"
                            className="mt-0.5 w-4 h-4 border-outline accent-primary cursor-pointer text-primary bg-[#1C1C1E] focus:ring-0 focus:ring-offset-0"
                            checked={!newEmployee.assignedGeofenceId || (newEmployee.assignedGeofenceId !== "verify_location_single" && newEmployee.assignedGeofenceId !== "verify_location" && newEmployee.assignedGeofenceId !== "verify_location_double")}
                            onChange={() => {
                              setNewEmployee(prev => ({
                                ...prev,
                                assignedGeofenceId: ""
                              }));
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-primary">
                              {lang === "ar" ? "النطاقات الجغرافية الافتراضية للفروع" : "Standard Branch Geofences"}
                            </span>
                            <span className="text-[10px] leading-relaxed opacity-75 mt-0.5 text-on-surface-variant">
                              {lang === "ar" 
                                ? "يجب على الموظف التواجد داخل حدود النطاق الجغرافي المحدد لأحد الفروع للبصمة." 
                                : "Employee must be physically located within defined branch perimeters to check in."}
                            </span>
                          </div>
                        </label>

                        {/* Option 2: Single location tracking (Single fingerprint) */}
                        <label 
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none text-xs font-semibold",
                            newEmployee.assignedGeofenceId === "verify_location_single"
                              ? "bg-amber-500/15 border-amber-500/50 text-white shadow-lg shadow-amber-500/5" 
                              : "bg-surface border-outline-variant hover:bg-white/5 text-on-surface-variant"
                          )}
                        >
                          <input
                            type="radio"
                            name="verification_mode"
                            className="mt-0.5 w-4 h-4 border-outline accent-amber-500 cursor-pointer text-amber-500 bg-[#1C1C1E] focus:ring-0 focus:ring-offset-0"
                            checked={newEmployee.assignedGeofenceId === "verify_location_single"}
                            onChange={() => {
                              setNewEmployee(prev => ({
                                ...prev,
                                assignedGeofenceId: "verify_location_single"
                              }));
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-amber-400">
                              {lang === "ar" ? "التحقق من موقع الموظف ببصمة واحدة" : "Verify Location (Single check-in)"}
                            </span>
                            <span className="text-[10px] leading-relaxed opacity-75 mt-0.5 text-on-surface-variant">
                              {lang === "ar" 
                                ? "يلغي النطاقات بالكامل. يبصم الموظف بصمة واحدة ترسل موقعه الحالي على الخريطة مباشرة للمدير من أي مكان تواجده." 
                                : "Disables geofence perimeters. Employee does a single check-in that sends their current GPS coordinates immediately."}
                            </span>
                          </div>
                        </label>

                        {/* Option 3: Double location verification (Double fingerprint) */}
                        <label 
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none text-xs font-semibold",
                            (newEmployee.assignedGeofenceId === "verify_location" || newEmployee.assignedGeofenceId === "verify_location_double")
                              ? "bg-amber-500/15 border-amber-500/50 text-white shadow-lg shadow-amber-500/5" 
                              : "bg-surface border-outline-variant hover:bg-white/5 text-on-surface-variant"
                          )}
                        >
                          <input
                            type="radio"
                            name="verification_mode"
                            className="mt-0.5 w-4 h-4 border-outline accent-amber-500 cursor-pointer text-amber-500 bg-[#1C1C1E] focus:ring-0 focus:ring-offset-0"
                            checked={newEmployee.assignedGeofenceId === "verify_location" || newEmployee.assignedGeofenceId === "verify_location_double"}
                            onChange={() => {
                              setNewEmployee(prev => ({
                                ...prev,
                                assignedGeofenceId: "verify_location"
                              }));
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-amber-400">
                              {lang === "ar" ? "التحقق من الحركة ببصمتين (بينهم 20 ثانية)" : "Verify Movement (Double check-ins, 20s apart)"}
                            </span>
                            <span className="text-[10px] leading-relaxed opacity-75 mt-0.5 text-on-surface-variant">
                              {lang === "ar" 
                                ? "يلغي النطاقات بالكامل. يطلب قطعتين من الموقع بفارق 20 ثانية للتأكد من خروج الموظف للميدان/التسويق وبدء تحركه." 
                                : "Disables geofences. Takes two location coordinates 20s apart to verify active travel and movement start."}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {(!newEmployee.assignedGeofenceId || (newEmployee.assignedGeofenceId !== "verify_location_single" && newEmployee.assignedGeofenceId !== "verify_location" && newEmployee.assignedGeofenceId !== "verify_location_double")) && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="input-label mb-0">{lang === "ar" ? "حدد النطاقات الجغرافية المعتمدة للبصمة" : "Assigned Branch Geofences"}</label>
                          <button
                            type="button"
                            onClick={() => {
                              const allGeofenceIds = geofences.map(gf => String(gf.id));
                              const currentSelected = newEmployee.assignedGeofenceId ? String(newEmployee.assignedGeofenceId).split(",") : [];
                              const isAllSelected = geofences.length > 0 && geofences.every(gf => currentSelected.includes(String(gf.id)));
                              
                              setNewEmployee(prev => ({
                                ...prev,
                                assignedGeofenceId: isAllSelected ? "" : allGeofenceIds.join(",")
                              }));
                            }}
                            className={cn(
                              "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer",
                              (geofences.length > 0 && (newEmployee.assignedGeofenceId ? String(newEmployee.assignedGeofenceId).split(",") : []).filter(Boolean).length === geofences.length)
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                                : "bg-white/5 border-outline hover:bg-white/10 text-on-surface/80"
                            )}
                          >
                            {lang === "ar" ? "✓ تحديد جميع النطاقات" : "✓ Select All Geofences"}
                          </button>
                        </div>

                        {geofences.length === 0 ? (
                          <p className="text-xs text-on-surface-variant/60 italic p-3 bg-[#1A1A1A] border border-outline-variant rounded-xl">
                            {lang === "ar" ? "الرجاء إضافة نطاقات أولاً" : "Please add geofences first"}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[160px] overflow-y-auto p-2 bg-[#1A1A1A] border border-outline-variant rounded-2xl">
                            {geofences.map((gf, idx) => {
                              const currentSelected = newEmployee.assignedGeofenceId 
                                ? String(newEmployee.assignedGeofenceId).split(",").map(x => x.trim()).filter(Boolean) 
                                : [];
                              const isChecked = currentSelected.includes(String(gf.id));
                              return (
                                <label 
                                  key={`${gf.id || 'gf'}-${idx}`} 
                                  className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-xs font-semibold",
                                    isChecked 
                                      ? "bg-primary/15 border-primary/50 text-white" 
                                      : "bg-surface border-outline-variant hover:bg-white/5 text-on-surface-variant"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-outline accent-primary cursor-pointer text-primary bg-[#1C1C1E]"
                                    checked={isChecked}
                                    onChange={() => {
                                      let updated: string[] = [];
                                      if (isChecked) {
                                        updated = currentSelected.filter(id => id !== String(gf.id));
                                      } else {
                                        updated = [...currentSelected.filter(id => id !== "verify_location" && id !== "verify_location_single" && id !== "verify_location_double"), String(gf.id)];
                                      }
                                      const filtered = updated.map(x => x.trim()).filter(Boolean);
                                      setNewEmployee(prev => ({
                                        ...prev,
                                        assignedGeofenceId: filtered.join(",")
                                      }));
                                    }}
                                  />
                                  <div className="truncate flex flex-col">
                                    <span className="font-bold text-on-surface">{gf.name}</span>
                                    <span className="text-[10px] opacity-60 text-on-surface-variant font-mono">
                                      {gf.latitude.toFixed(3)}, {gf.longitude.toFixed(3)}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    id="submit-identity-btn"
                    type="submit" 
                    disabled={loading || usernameChecking || (newEmployee.username.trim() !== "" && isUsernameAvailable === false)} 
                    className={cn(
                      "w-full mt-6 py-4 px-6 rounded-xl font-bold uppercase tracking-widest text-sm transition-all duration-300 shadow-xl",
                      "flex items-center justify-center gap-3",
                      (loading || usernameChecking || (newEmployee.username.trim() !== "" && isUsernameAvailable === false))
                        ? "bg-outline-variant text-on-surface-variant cursor-not-allowed opacity-50" 
                        : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{lang === "ar" ? "جاري الحفظ..." : "Processing..."}</span>
                      </>
                    ) : usernameChecking ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                        <span>{lang === "ar" ? "جاري التحقق من اسم المستخدم..." : "Verifying username..."}</span>
                      </>
                    ) : (newEmployee.username.trim() !== "" && isUsernameAvailable === false) ? (
                      <>
                        <X className="w-5 h-5 text-red-400" />
                        <span>{lang === "ar" ? "اسم المستخدم مأخوذ كلياً" : "Username is taken"}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>{editingId ? (lang === "ar" ? "حفظ التغييرات" : "Save Changes") : (lang === "ar" ? "إنشاء هوية" : "Create Identity")}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
      {/* Interactive double stamp verification map modal */}
      <DoubleLocMapModal 
        isOpen={showDoubleLocModal} 
        onClose={() => setShowDoubleLocModal(false)} 
        log={selectedDoubleLocLog} 
        lang={lang} 
      />

      {/* Dynamic Instant Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1e1e1e] border border-outline-variant rounded-3xl p-6 max-w-sm w-full text-center relative overflow-hidden shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
              <Crown className="w-7 h-7 text-amber-500 animate-pulse" />
            </div>

            <h3 className="text-lg font-extrabold text-on-surface mb-2">
              {lang === "ar" ? "ترقية سعة الموظفين 👑" : "Upgrade Employee Capacity 👑"}
            </h3>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              {lang === "ar" 
                ? "نعتذر، لقد وصلت للحد الأقصى للموظفين في المؤسسة. إذا كنت تريد ترقية باقة اشتراكك وزيادة سعة الموظفين، يرجى التواصل مع الدعم الفني." 
                : "We apologize, you have reached the maximum employee capacity in the organization. If you would like to upgrade your subscription package and increase capacity, please contact technical support."}
            </p>

            {upgradeErrorMsg && (
              <div className="mb-5 p-2.5 rounded-xl bg-error/10 border border-error/20 text-[10px] font-semibold text-error/90">
                {upgradeErrorMsg}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <a
                href="https://api.whatsapp.com/send/?phone=218921827916&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-primary bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 border-none text-black font-extrabold flex items-center justify-center gap-2 h-11 rounded-xl shadow-lg shadow-amber-500/10 active:scale-95 transition-all duration-200 text-xs"
              >
                <span>{lang === "ar" ? "الاتصال بالدعم الفني" : "Contact Technical Support"}</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  setUpgradeErrorMsg("");
                }}
                className="w-full py-2.5 rounded-xl hover:bg-neutral-800 text-xs font-bold text-on-surface-variant border border-outline-variant/30 flex items-center justify-center transition-all cursor-pointer"
              >
                {lang === "ar" ? "إلغاء الأمر" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAC Device Verification Details & Reset Modal */}
      {macDetailsEmployee && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#1e1e1e] border border-outline-variant rounded-3xl p-6 max-w-sm w-full text-center relative overflow-hidden shadow-2xl">
            <button 
              onClick={() => setMacDetailsEmployee(null)} 
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <Smartphone className="w-7 h-7 text-emerald-400" />
            </div>

            <h3 className="text-lg font-extrabold text-on-surface mb-2">
              {lang === "ar" ? "رقم الـ IMEI المسجل للموظف" : "Employee Registered Device IMEI"}
            </h3>

            <p className="text-xs text-on-surface-variant/90 leading-relaxed mb-4">
              {lang === "ar" 
                ? `هوية الهاتف الخاصة بالموظف: ${macDetailsEmployee.name || macDetailsEmployee.username}`
                : `Device identifier for: ${macDetailsEmployee.name || macDetailsEmployee.username}`}
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 font-mono text-xs text-emerald-400 select-all tracking-wider mb-6 flex items-center justify-center gap-2">
              <span>{macDetailsEmployee.macAddress}</span>
            </div>

            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed mb-6 text-center">
              {lang === "ar"
                ? "إذا قام الموظف بتغيير هاتفه، أو تلف جهازه القديم، يمكنك مسح الـ IMEI المسجل الحالي لطلب التحقق من هاتفه الجديد مجدداً عند أول بصمة."
                : "If the employee changed or lost their phone, you can reset this IMEI registration to let them register their new phone on their first next check-in."}
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => resetEmployeeMac(macDetailsEmployee.id)}
                disabled={loading}
                className="w-full btn-primary bg-red-600 hover:bg-red-700 hover:shadow-red-600/10 border-none text-white font-extrabold flex items-center justify-center gap-2 h-11 rounded-xl shadow-lg active:scale-95 transition-all duration-200 text-xs cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (lang === "ar" ? "إعادة ضبط الـ IMEI (ريست)" : "Reset Registered IMEI (Reset)")}
              </button>

              <button
                type="button"
                onClick={() => setMacDetailsEmployee(null)}
                className="w-full py-2.5 rounded-xl hover:bg-neutral-800 text-xs font-bold text-on-surface-variant border border-outline-variant/30 flex items-center justify-center transition-all cursor-pointer"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
