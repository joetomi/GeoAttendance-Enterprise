import React, { useState, useEffect } from "react";
import { Plus, Trash2, MoreVertical, ShieldCheck, UserMinus, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Employee } from "../types";
import { cn } from "@/src/lib/utils";
import { Header } from "../components/Navigation";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        setLoading(false);
      });
  }, []);

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
              { label: "Out of Sync", value: 0, color: "bg-error" }
            ].map((stat, i) => (
              <div key={i} className="card p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-bold text-on-surface mt-1">{stat.value}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", stat.color)}>
                  {i === 0 ? <Users className="w-6 h-6" /> : i === 1 ? <ShieldCheck className="w-6 h-6" /> : <UserMinus className="w-6 h-6" />}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-bold text-on-surface tracking-tight">Employee Directory</h3>
              <p className="text-sm text-on-surface-variant">View and manage authorized staff for geofenced locations.</p>
            </div>
            <button className="btn-primary">
              <Plus className="w-5 h-5" />
              Add Employee
            </button>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant italic">Loading database...</td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant italic">No employees found.</td>
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
                              <p className="text-xs text-on-surface-variant opacity-70">{employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-on-surface">{employee.department}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            employee.status === 'Active' 
                              ? "bg-secondary-container text-on-secondary-container" 
                              : "bg-error-container text-on-error-container"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", employee.status === 'Active' ? "bg-secondary" : "bg-error")} />
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => deleteEmployee(employee.id)}
                              className="p-2 text-error hover:bg-error-container transition-colors rounded-full opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-surface-container-high flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              <p>Showing {employees.length} employees</p>
              <div className="flex gap-2">
                <button className="p-2 border border-outline-variant rounded-lg hover:bg-white transition-colors disabled:opacity-50" disabled>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-2 border border-outline-variant rounded-lg hover:bg-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
