import React, { useState, useEffect } from "react";
import { Plus, Trash2, MoreVertical, ShieldCheck, UserMinus, Users, ChevronLeft, ChevronRight, X, Edit3, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Employee } from "../types";
import { cn } from "@/src/lib/utils";
import { Header } from "../components/Navigation";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Employee[]>([]);
  const [stats, setStats] = useState({ totalEmployees: 0, activeToday: 0, onlineNow: 0, totalLogs: 0 });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({ 
    username: "", 
    password: "", 
    role: "user",
    name: "",
    department: "Operations" 
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, attRes, onlineRes, statsRes] = await Promise.all([
          fetch("/api/employees").catch(() => null),
          fetch("/api/attendance").catch(() => null),
          fetch("/api/employees/online").catch(() => null),
          fetch("/api/stats").catch(() => null)
        ]);

        if (empRes && empRes.ok) {
          const data = await empRes.json();
          setEmployees(Array.isArray(data) ? data : []);
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
    
    fetch(endpoint, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...newEmployee, 
        name: newEmployee.name || newEmployee.username, 
        email: `${newEmployee.username}@enterprise.com`, 
        status: 'Active', 
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop' 
      })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to ${editingId ? 'update' : 'add'} employee`);
        return res.json();
      })
      .then(data => {
        if (editingId) {
          setEmployees(prev => prev.map(em => em.id === editingId ? { ...em, ...newEmployee, name: newEmployee.name || newEmployee.username } : em));
        } else {
          setEmployees(prev => [...prev, data]);
        }
        setShowModal(false);
        setEditingId(null);
        setNewEmployee({ username: "", password: "", role: "user", name: "", department: "Operations" });
      })
      .catch(err => {
        alert(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleEditClick = (employee: Employee) => {
    setEditingId(employee.id);
    setNewEmployee({
      username: employee.username,
      password: "", // Don't show password for security, only if they want to change it
      role: employee.role,
      name: employee.name,
      department: employee.department
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
      const res = await fetch(`/api/employees/${confirmingDeleteId}`, { method: "DELETE" });
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
      const statsRes = await fetch("/api/stats");
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
      const res = await fetch("/api/attendance/report");
      if (!res.ok) throw new Error("Failed to fetch report data");
      const logs = await res.json();
      
      // Process logs into rows: { Name, Date, Check In, Check Out }
      // We group by employee and date
      const reportMap: Record<string, any> = {};
      
      logs.forEach((log: any) => {
        const dateObj = new Date(log.timestamp);
        const dateKey = dateObj.toLocaleDateString();
        const empKey = log.employeeId;
        const groupKey = `${empKey}_${dateKey}`;
        
        if (!reportMap[groupKey]) {
          reportMap[groupKey] = {
            "Employee Name": log.employeeName || "Unknown",
            "Department": log.department || "N/A",
            "Date": dateKey,
            "Check In": null,
            "Check Out": null,
            _inTime: Infinity,
            _outTime: -Infinity
          };
        }
        
        const timeMs = dateObj.getTime();
        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (log.status === "In") {
          if (timeMs < reportMap[groupKey]._inTime) {
            reportMap[groupKey]._inTime = timeMs;
            reportMap[groupKey]["Check In"] = timeStr;
          }
        } else if (log.status === "Out") {
          if (timeMs > reportMap[groupKey]._outTime) {
            reportMap[groupKey]._outTime = timeMs;
            reportMap[groupKey]["Check Out"] = timeStr;
          }
        }
      });
      
      const finalData = Object.values(reportMap).map(({ _inTime, _outTime, ...rest }) => rest);
      
      const ws = XLSX.utils.json_to_sheet(finalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
      
      // Generate filename with date
      const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to generate Excel report.");
    } finally {
      setLoading(false);
    }
  };

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="min-h-screen bg-surface">
      <Header title="Manage Employees" />
      
      <main className="lg:pl-[312px] p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Accounts", value: stats.totalEmployees, color: "bg-primary-container", icon: <Users className="w-6 h-6" /> },
              { label: "Active Today", value: stats.activeToday, color: "bg-secondary", icon: <ShieldCheck className="w-6 h-6" /> },
              { label: "Online Now", value: stats.onlineNow, color: "bg-emerald-500", icon: <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> },
              { label: "Archived Logs", value: stats.totalLogs, color: "bg-primary", icon: <ShieldCheck className="w-6 h-6" /> }
            ].map((stat, i) => (
              <div key={i} className="card p-6 flex items-center justify-between">
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
              <div className="card p-6 bg-surface-container">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface">Personnel Live Status</h4>
                </div>
                <div className="flex flex-wrap gap-4">
                  {onlineUsers.length === 0 ? (
                    <p className="text-xs text-on-surface-variant opacity-60 italic">No personnel currently on-site.</p>
                  ) : (
                    onlineUsers.map(user => (
                      <div key={user.id} className="flex items-center gap-3 bg-surface p-2 pr-4 rounded-2xl border border-outline-variant transition-transform hover:scale-105">
                        <img src={user.avatar} className="w-8 h-8 rounded-full border border-secondary/30" alt="" />
                        <div>
                          <p className="text-xs font-bold text-on-surface leading-tight">{user.name}</p>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Live Now</p>
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
                  <h3 className="text-2xl font-bold text-on-surface tracking-tight">Employee Directory</h3>
                  <p className="text-sm text-on-surface-variant">Manage and authorize corporate staff.</p>
                </div>
                <button id="add-employee-btn" onClick={() => setShowModal(true)} className="btn-primary">
                  <Plus className="w-5 h-5" />
                  Add Employee
                </button>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-high border-b border-outline-variant">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Actions</th>
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
                        employees.map((employee) => (
                          <tr key={employee.id} className="hover:bg-surface-container transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={employee.avatar} 
                                  alt={employee.name} 
                                  className="w-10 h-10 rounded-full object-cover border border-outline-variant"
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
                                  <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter opacity-70">{employee.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-secondary uppercase tracking-widest">{employee.department}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  type="button"
                                  onClick={() => handleEditClick(employee)}
                                  className="p-2 text-secondary hover:bg-secondary-container transition-colors rounded-full flex items-center justify-center"
                                  title="Edit Employee"
                                >
                                  <Edit3 className="w-4 h-4 pointer-events-none" />
                                </button>
                                {employee.id !== currentUser.id && (
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Attendance Logs */}
            <div className="xl:col-span-1">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-on-surface tracking-tight">Activity Logs</h3>
                  <p className="text-sm text-on-surface-variant">Real-time attendance streams.</p>
                </div>
                <button 
                  onClick={exportToExcel} 
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel Export
                </button>
              </div>

              <div className="card p-6 bg-surface-container overflow-hidden">
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {attendance.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-40">No activity yet</p>
                    </div>
                  ) : (
                    attendance.map((log) => (
                      <div key={log.id} className="relative pl-6 pb-6 border-l-2 border-outline-variant last:pb-0">
                        <div className={cn(
                          "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-surface shadow-sm transition-transform group-hover:scale-125",
                          log.status === 'In' ? "bg-secondary" : "bg-red-500"
                        )} />
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              log.status === 'In' ? "text-secondary" : "text-red-500"
                            )}>
                              {log.status === 'In' ? 'Checked In' : 'Checked Out'}
                            </span>
                            <span className="text-[10px] font-mono text-on-surface-variant opacity-60">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1">
                            {log.avatar && (
                              <img src={log.avatar} className="w-6 h-6 rounded-full border border-outline-variant" alt="" />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-on-surface">{log.employeeName || 'Unknown Employee'}</p>
                                {log.role === 'admin' && (
                                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>
                                )}
                              </div>
                              <p className="text-[10px] text-on-surface-variant opacity-60">{log.department}</p>
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
                <h3 className="text-xl font-bold text-on-surface text-center mb-2">Delete Account?</h3>
                <p className="text-sm text-on-surface-variant text-center mb-8 opacity-70">
                  Are you sure you want to delete <span className="font-bold text-on-surface">{employees.find(e => e.id === confirmingDeleteId)?.name}</span>? This action cannot be undone.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setConfirmingDeleteId(null)}
                    className="btn border border-outline-variant hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={performDelete}
                    disabled={loading}
                    className="btn bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
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
                    {editingId ? 'Edit Employee' : 'New Employee'}
                  </h3>
                  <button onClick={() => { setShowModal(false); setEditingId(null); }} className="text-on-surface-variant hover:text-on-surface">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label className="input-label">Username</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newEmployee.username}
                      onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                      required 
                    />
                  </div>
                  <div>
                    <label className="input-label">Password {editingId && <span className="text-[10px] text-on-surface-variant opacity-60">(Leave blank to keep current)</span>}</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                      required={!editingId} 
                    />
                  </div>
                  <div>
                    <label className="input-label">Role</label>
                    <select 
                      className="input-field appearance-none bg-no-repeat bg-right pr-10" 
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.5em' }}
                    >
                      <option value="user">Normal User</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Display Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Department</label>
                    <select 
                      className="input-field appearance-none bg-no-repeat bg-right pr-10" 
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.5em' }}
                    >
                      <option>Operations</option>
                      <option>Logistics</option>
                      <option>Human Resources</option>
                      <option>Security</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-secondary w-full mt-4">
                    {editingId ? 'Update Identity' : 'Create Identity'}
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
