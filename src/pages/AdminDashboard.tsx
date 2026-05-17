import React, { useState, useEffect } from "react";
import { Plus, Trash2, MoreVertical, ShieldCheck, UserMinus, Users, ChevronLeft, ChevronRight, X, Edit3 } from "lucide-react";
import { Employee } from "../types";
import { cn } from "@/src/lib/utils";
import { Header } from "../components/Navigation";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
        const [empRes, attRes] = await Promise.all([
          fetch("/api/employees").catch(() => null),
          fetch("/api/attendance").catch(() => null)
        ]);

        if (empRes && empRes.ok) {
          const data = await empRes.json();
          setEmployees(Array.isArray(data) ? data : []);
        }
        
        if (attRes && attRes.ok) {
          const data = await attRes.json();
          setAttendance(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);
      } finally {
        setLoading(false);
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
    if (window.confirm("Are you sure you want to remove this employee?")) {
      fetch(`/api/employees/${id}`, { method: "DELETE" })
        .then(() => setEmployees(employees.filter(e => e.id !== id)));
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header title="Manage Employees" />
      
      <main className="lg:pl-[312px] p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: "Total Employees", value: employees.length, color: "bg-primary-container" },
              { label: "Active Today", value: employees.filter(e => e.status === 'Active').length, color: "bg-secondary" },
              { label: "Total Logs", value: attendance.length, color: "bg-primary" }
            ].map((stat, i) => (
              <div key={i} className="card p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">{stat.value}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", stat.color)}>
                  {i === 0 ? <Users className="w-6 h-6" /> : i === 1 ? <ShieldCheck className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
              </div>
            ))}
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
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant italic">Loading metadata...</td>
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
                                  <p className="text-sm font-bold text-on-surface">{employee.name}</p>
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
                                  onClick={() => handleEditClick(employee)}
                                  className="p-2 text-secondary hover:bg-secondary-container transition-colors rounded-full"
                                  title="Edit Employee"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteEmployee(employee.id)}
                                  className="p-2 text-error hover:bg-error-container transition-colors rounded-full"
                                  title="Remove Employee"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
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
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-on-surface tracking-tight">Activity Logs</h3>
                <p className="text-sm text-on-surface-variant">Real-time attendance streams.</p>
              </div>

              <div className="card p-6 bg-white overflow-hidden">
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {attendance.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-40">No activity yet</p>
                    </div>
                  ) : (
                    attendance.map((log) => (
                      <div key={log.id} className="relative pl-6 pb-6 border-l-2 border-outline-variant last:pb-0">
                        <div className={cn(
                          "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-125",
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
                              <p className="text-sm font-bold text-on-surface">{log.employeeName || 'Unknown Employee'}</p>
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

          {/* Add Employee Modal */}
          {showModal && (
            <div id="add-employee-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="card w-full max-w-md p-8 bg-white shadow-2xl">
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
