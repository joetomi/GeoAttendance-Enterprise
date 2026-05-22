import React, { useState, useEffect } from "react";
import { Plus, Trash2, MoreVertical, ShieldCheck, UserMinus, Users, ChevronLeft, ChevronRight, X, Edit3, Download, FileSpreadsheet, Eye, EyeOff, RefreshCcw, Loader2, Check } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Employee } from "../types";
import { cn } from "@/src/lib/utils";
import { Header } from "../components/Navigation";

import { Language, translations } from "../constants/translations";
import { useLanguage } from "../contexts/LanguageContext";

export default function AdminDashboard() {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Employee[]>([]);
  const [stats, setStats] = useState({ totalEmployees: 0, activeToday: 0, onlineNow: 0, totalLogs: 0 });
  const [loading, setLoading] = useState(true);
  
  const { lang, t } = useLanguage();

  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    assignedGeofenceId: ""
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
        }
        setShowModal(false);
        setEditingId(null);
        setNewEmployee({ username: "", password: "", role: "user", name: "", department: "Operations", avatar: "", assignedGeofenceId: "" });
      })
      .catch(err => {
        console.error("Operation failed:", err);
        alert(`${lang === "ar" ? "خطأ:" : "Error:"} ${err.message}`);
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
      assignedGeofenceId: employee.assignedGeofenceId ? String(employee.assignedGeofenceId) : ""
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
  
  const exportToExcel = async () => {
    try {
      setLoading(true);
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
        alert("No activity logs found for the selected filters.");
        return;
      }
      
      // Group by employee and date
      const reportMap: Record<string, any> = {};
      
      logs.forEach((log: any) => {
        const dateObj = new Date(log.timestamp);
        const dateKey = dateObj.toLocaleDateString();
        const empKey = log.employeeId;
        const groupKey = `${empKey}_${dateKey}`;
        
        if (!reportMap[groupKey]) {
          reportMap[groupKey] = {
            name: log.employeeName || "Unknown",
            dept: log.department || "N/A",
            date: dateKey,
            checkIn: null,
            checkOut: null,
            checkInRange: null,
            checkOutRange: null,
            _inTime: Infinity,
            _outTime: -Infinity
          };
        }
        
        const timeMs = dateObj.getTime();
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        
        if (log.status === "In") {
          if (timeMs < reportMap[groupKey]._inTime) {
            reportMap[groupKey]._inTime = timeMs;
            reportMap[groupKey].checkIn = timeStr;
            reportMap[groupKey].checkInRange = log.geofenceName ? `${log.geofenceName} (${log.latitude ? log.latitude.toFixed(4) : ''}, ${log.longitude ? log.longitude.toFixed(4) : ''})` : "--";
          }
        } else if (log.status === "Out") {
          if (timeMs > reportMap[groupKey]._outTime) {
            reportMap[groupKey]._outTime = timeMs;
            reportMap[groupKey].checkOut = timeStr;
            reportMap[groupKey].checkOutRange = log.geofenceName ? `${log.geofenceName} (${log.latitude ? log.latitude.toFixed(4) : ''}, ${log.longitude ? log.longitude.toFixed(4) : ''})` : "--";
          }
        }
      });
      
      const finalData = Object.values(reportMap).map((item) => {
        let hours = "0.00";
        if (item._inTime !== Infinity && item._outTime !== -Infinity && item._outTime > item._inTime) {
          hours = ((item._outTime - item._inTime) / (1000 * 60 * 60)).toFixed(2);
        }
        return {
          "Staff Name": item.name,
          "Department": item.dept,
          "Date": item.date,
          "Check In": item.checkIn || "--:--",
          "Check In Range": item.checkInRange || "--",
          "Check Out": item.checkOut || "--:--",
          "Check Out Range": item.checkOutRange || "--",
          "Work Hours": hours
        };
      });

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Attendance Report");

      // Add Headers
      worksheet.columns = [
        { header: "Staff Name", key: "Staff Name", width: 25 },
        { header: "Department", key: "Department", width: 20 },
        { header: "Date", key: "Date", width: 15 },
        { header: "Check In", key: "Check In", width: 12 },
        { header: "Check In Range", key: "Check In Range", width: 25 },
        { header: "Check Out", key: "Check Out", width: 12 },
        { header: "Check Out Range", key: "Check Out Range", width: 25 },
        { header: "Work Hours", key: "Work Hours", width: 15 },
      ];

      // Add Data
      worksheet.addRows(finalData);

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
      const fileName = `Attendance_${filterEmployeeId === 'all' ? 'Company' : 'Staff'}_${filterStartDate}_to_${filterEndDate}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
      
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to generate professional Excel report.");
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column: Employee Directory */}
            <div className="xl:col-span-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-on-surface tracking-tight">{t.navEmployees}</h3>
                  <p className="text-sm text-on-surface-variant">{lang === "ar" ? "إدارة وتفويض موظفي الشركة." : "Manage and authorize corporate staff."}</p>
                </div>
                <button id="add-employee-btn" onClick={() => { setEditingId(null); setNewEmployee({ username: "", password: "", role: "user", name: "", department: "Operations", avatar: "", assignedGeofenceId: "" }); setShowModal(true); }} className="btn-primary">
                  <Plus className="w-5 h-5" />
                  {lang === "ar" ? "إضافة موظف" : "Add Employee"}
                </button>
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
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
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

            {/* Right Column: Attendance Logs */}
            <div className="xl:col-span-1">
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-on-surface tracking-tight">{t.activityLogs}</h3>
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
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {attendance.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-40">{t.noActivity}</p>
                    </div>
                  ) : (
                    attendance.map((log, idx) => (
                      <div key={`${log.id || 'log'}-${idx}`} className="relative pl-6 pb-6 border-l-2 border-outline-variant last:pb-0 rtl:pl-0 rtl:pr-6 rtl:border-l-0 rtl:border-r-2">
                        <div className={cn(
                          "absolute -left-[9px] rtl:-right-[9px] top-0 w-4 h-4 rounded-full border-4 border-surface shadow-sm transition-transform group-hover:scale-125",
                          log.status === 'In' ? "bg-secondary" : "bg-red-500"
                        )} />
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              log.status === 'In' ? "text-secondary" : "text-red-500"
                            )}>
                              {log.status === 'In' ? (lang === "ar" ? "تم تسجيل الحضور" : "Checked In") : (lang === "ar" ? "تم تسجيل الانصراف" : "Checked Out")}
                            </span>
                            <span className="text-[10px] font-mono text-on-surface-variant opacity-60">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1">
                            <img src={log.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.employeeName || 'U')}&background=random`} className="w-8 h-8 rounded-lg object-cover border border-outline-variant" alt="" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-on-surface">{log.employeeName || 'Unknown Employee'}</p>
                                {log.role === 'admin' && (
                                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>
                                )}
                              </div>
                              <p className="text-[10px] text-on-surface-variant opacity-60">{log.department}</p>
                              {log.geofenceName && (
                                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>{lang === "ar" ? "النطاق:" : "Range:"} {log.geofenceName}</span>
                                  {log.latitude && (
                                    <span className="text-[9px] font-mono opacity-60">({log.latitude.toFixed(4)}, {log.longitude.toFixed(4)})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
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
              <div className="card w-full max-w-md p-8 bg-surface-container shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-on-surface">
                    {editingId ? t.editEmployee : t.newEmployee}
                  </h3>
                  <button onClick={() => { setShowModal(false); setEditingId(null); }} className="text-on-surface-variant hover:text-on-surface">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddEmployee} className="space-y-4">
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
                        departments.map(dept => (
                          <option key={dept.id} value={dept.name} className="text-on-surface">{dept.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="input-label mb-0">{lang === "ar" ? "النطاقات الجغرافية المعينة للموظف" : "Assigned Geofences"}</label>
                      
                      {/* All Geofences selection toggle */}
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
                        {lang === "ar" ? "✓ جميع النطاقات (الفروع بالكامل)" : "✓ All Geofences (All Branches)"}
                      </button>
                    </div>

                    {/* Location Verification Option - bypasses standard geofences completely */}
                    <div className="mb-2">
                      <label 
                        className={cn(
                          "flex items-start gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer select-none text-xs font-semibold",
                          newEmployee.assignedGeofenceId === "verify_location"
                            ? "bg-amber-500/15 border-amber-500/50 text-white shadow-lg shadow-amber-500/5" 
                            : "bg-surface border-outline-variant hover:bg-white/5 text-on-surface-variant"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 rounded border-outline accent-amber-500 cursor-pointer text-amber-500 bg-[#1C1C1E]"
                          checked={newEmployee.assignedGeofenceId === "verify_location"}
                          onChange={() => {
                            setNewEmployee(prev => ({
                              ...prev,
                              assignedGeofenceId: prev.assignedGeofenceId === "verify_location" ? "" : "verify_location"
                            }));
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-amber-400">
                            {lang === "ar" ? "التحقق من موقع الموظف (ميداني/تسويق)" : "Verify Employee Location (Field/Marketing)"}
                          </span>
                          <span className="text-[10px] leading-relaxed opacity-75 mt-0.5 text-on-surface-variant">
                            {lang === "ar" 
                              ? "يلغي النطاقات الجغرافية بالكامل. يطلب من الموظف إرسال موقعه الحالي مع التحقق من حركته (نقطتين خلال 20 ثانية) للتأكد من خروجه للعمل" 
                              : "Disables standard geofences. Employee sends dual-coordinates (two points 20 seconds apart) to verify actual travel."}
                          </span>
                        </div>
                      </label>
                    </div>

                    {geofences.length === 0 ? (
                      <p className="text-xs text-on-surface-variant/60 italic p-3 bg-[#1A1A1A] border border-outline-variant rounded-xl">
                        {lang === "ar" ? "الرجاء إضافة نطاقات أولاً" : "Please add geofences first"}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[160px] overflow-y-auto p-2 bg-[#1A1A1A] border border-outline-variant rounded-2xl">
                        {geofences.map((gf) => {
                          const currentSelected = newEmployee.assignedGeofenceId 
                            ? String(newEmployee.assignedGeofenceId).split(",").map(x => x.trim()).filter(Boolean) 
                            : [];
                          const isChecked = currentSelected.includes(String(gf.id));
                          return (
                            <label 
                              key={gf.id} 
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
                                    updated = [...currentSelected.filter(id => id !== "verify_location"), String(gf.id)];
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
    </div>
  );
}
