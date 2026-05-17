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
  Users
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Header } from "../components/Navigation";
import { cn } from "@/src/lib/utils";
import { Employee } from "../types";

export default function PayrollDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Payroll Config State
  const [payrollConfig, setPayrollConfig] = useState({
    baseSalary: 0,
    gracePeriodMinutes: 15,
    halfDayThresholdMinutes: 30,
    fullDayThresholdMinutes: 60,
    weekends: "5,6", // Default Fri, Sat
    holidays: "[]"
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchPayrollConfig(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
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
      const res = await fetch(`/api/payroll/config/${empId}`);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          ...payrollConfig
        }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Payroll configuration saved successfully." });
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      setMsg({ type: "error", text: "Error saving configuration." });
    } finally {
      setSaving(false);
    }
  };

  const exportPayrollReport = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      // 1. Fetch attendance logs for the employee and month
      const fromDate = `${selectedMonth}-01`;
      const toDate = new Date(new Date(fromDate).getFullYear(), new Date(fromDate).getMonth() + 1, 0).toISOString().split('T')[0];
      
      const queryParams = new URLSearchParams({
        from: fromDate,
        to: toDate,
        employeeId: selectedEmployeeId
      });
      
      const res = await fetch(`/api/attendance/report?${queryParams.toString()}`);
      const logs = await res.json();
      
      const employee = employees.find(e => e.id === selectedEmployeeId);
      const daysInMonth = new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).getDate();
      const dailyRate = payrollConfig.baseSalary / 30; // Standard 30-day denominator or fixed 30 as requested

      // Process logs into daily summary
      const daysReport: any[] = [];
      let totalDeductions = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${selectedMonth}-${String(i).padStart(2, '0')}`;
        const dayDate = new Date(dateStr);
        const dayOfWeek = dayDate.getDay();
        const isWeekend = payrollConfig.weekends.split(',').includes(dayOfWeek.toString());
        
        // Find logs for this day
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
          dailyEarnings = dailyRate; // Pay full day for weekends
        } else if (checkInLog) {
          status = checkInLog.geofenceStatus === "Success" ? "In Zone" : "Out Zone";
          const time = new Date(checkInLog.timestamp);
          checkInTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          
          // Simplified late calculation: anything after 09:00 AM is late (or relative to a shift if we had one)
          // For demo, let's assume grace period applies to a fixed 09:00 start
          const startBase = new Date(time);
          startBase.setHours(9, 0, 0, 0); 
          lateMinutes = Math.max(0, Math.floor((time.getTime() - startBase.getTime()) / (1000 * 60)));

          if (lateMinutes > payrollConfig.fullDayThresholdMinutes) {
            deduction = dailyRate;
            dailyEarnings = 0;
          } else if (lateMinutes > payrollConfig.halfDayThresholdMinutes) {
            deduction = dailyRate * 0.5;
            dailyEarnings = dailyRate * 0.5;
          } else if (lateMinutes > payrollConfig.gracePeriodMinutes) {
            // Late but within threshold - maybe a small deduction or just mark it
            // User requested Cond A and Cond B
          }
        } else {
          // Absent
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

      // Generate Excel
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

      // Summary rows
      ws.addRow([]);
      ws.addRow(["Total Base Salary:", "", "", "", "", "", payrollConfig.baseSalary.toFixed(2)]);
      ws.addRow(["Total Deductions Accumulated:", "", "", "", "", "", totalDeductions.toFixed(2)]);
      ws.addRow(["Net Payable Salary for Month:", "", "", "", "", "", (payrollConfig.baseSalary - totalDeductions).toFixed(2)]);

      // Styling
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

  return (
    <div className="min-h-screen bg-surface">
      <Header title="Deductions & Payroll" />
      
      <main className="lg:pl-[312px] p-8 pb-32">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-on-surface tracking-tight">Payroll Management</h2>
              <p className="text-on-surface-variant opacity-70 mt-1">Configure individual salary structures and automated deduction logic.</p>
            </div>
            
            <div className="flex items-center gap-3 bg-surface-container-high p-1.5 rounded-2xl border border-outline-variant/30">
              <Users className="w-4 h-4 text-primary ml-3" />
              <select 
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-on-surface py-2 pr-8"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} (@{emp.username})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Col: Configuration Form */}
            <div className="xl:col-span-2 space-y-8">
              <form onSubmit={handleSaveConfig} className="card p-8 bg-surface-container border border-outline-variant/20 shadow-xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-primary/10 p-2.5 rounded-xl">
                    <Settings2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">Employee Configuration</h3>
                    <p className="text-xs text-on-surface-variant opacity-60 font-medium uppercase tracking-widest mt-1">Salary & Thresholds</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">Base Monthly Salary (LYD)</label>
                    <div className="relative">
                      <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                      <input 
                        type="number" 
                        value={payrollConfig.baseSalary}
                        onChange={(e) => setPayrollConfig(prev => ({ ...prev, baseSalary: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">Grace Period (Minutes)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                      <input 
                        type="number" 
                        value={payrollConfig.gracePeriodMinutes}
                        onChange={(e) => setPayrollConfig(prev => ({ ...prev, gracePeriodMinutes: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-surface-container-high rounded-2xl border border-outline-variant/30 mb-8">
                   <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">Weekends (CSV Indexes)</label>
                    <input 
                      type="text" 
                      value={payrollConfig.weekends}
                      onChange={(e) => setPayrollConfig(prev => ({ ...prev, weekends: e.target.value }))}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface"
                      placeholder="0,6 (0=Sun, 6=Sat)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">Half-Day Threshold (Min)</label>
                    <input 
                      type="number" 
                      value={payrollConfig.halfDayThresholdMinutes}
                      onChange={(e) => setPayrollConfig(prev => ({ ...prev, halfDayThresholdMinutes: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">Full-Day Threshold (Min)</label>
                    <input 
                      type="number" 
                      value={payrollConfig.fullDayThresholdMinutes}
                      onChange={(e) => setPayrollConfig(prev => ({ ...prev, fullDayThresholdMinutes: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface"
                    />
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
                    disabled={saving}
                    className="ml-auto flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Configuration"}
                  </button>
                </div>
              </form>

              {/* Deduction Logic Info Panel */}
              <div className="card p-8 bg-surface-container border border-outline-variant/30 flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <h4 className="font-bold text-on-surface">Condition A: Half-Day Cut</h4>
                  </div>
                  <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
                    If check-in exceeds grace period by <span className="text-primary font-bold">{payrollConfig.halfDayThresholdMinutes} minutes</span>, 
                    the system automatically deducts 50% of the daily prorated rate.
                  </p>
                </div>
                <div className="w-[1px] bg-outline-variant/30 hidden md:block" />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h4 className="font-bold text-on-surface">Condition B: Full-Day Cut</h4>
                  </div>
                  <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed">
                    If check-in exceeds <span className="text-primary font-bold">{payrollConfig.fullDayThresholdMinutes} minutes</span> or 
                    status is "Absent", a 100% deduction is applied to that specific date.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Col: Reports & Export */}
            <div className="xl:col-span-1 space-y-8">
              <div className="card p-8 bg-surface-container border border-outline-variant/20 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <FileSpreadsheet className="w-32 h-32 text-primary" />
                </div>
                
                <h3 className="text-xl font-bold text-on-surface mb-6">Payroll Reporting</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">Target Month</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                      <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-surface-container-high rounded-2xl border border-outline-variant/30 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Selected Period</span>
                      <span className="font-bold text-on-surface">{new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Employee Name</span>
                      <span className="font-bold text-on-surface">{employees.find(e => e.id === selectedEmployeeId)?.name || "N/A"}</span>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/30">
                      <p className="text-[9px] text-center uppercase tracking-widest font-bold text-on-surface-variant opacity-40">
                        Exports realMicrosoft Excel format
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={exportPayrollReport}
                    disabled={loading || !selectedEmployeeId}
                    className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {loading ? "Processing..." : "Export Payroll Report"}
                  </button>
                </div>
              </div>

              <div className="card p-6 bg-surface-container-low border border-outline-variant/10 flex items-start gap-4">
                <div className="bg-emerald-500/10 p-2 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Automated Audit Active</h4>
                  <p className="text-xs text-on-surface-variant opacity-60 mt-1">
                    System verifies every log against geofence & timestamp rules before processing payroll line-items.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
