import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  Printer,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import api from '../../api/client';
import { formatDateIST, formatTime12, formatWorkingHours } from '../../utils/timeUtils';
import { TableShimmer } from '../../components/common/Shimmer';

const REPORT_TABS = [
  { id: 'daily_attendance', label: '1. Daily Attendance' },
  { id: 'monthly_attendance', label: '2. Monthly Attendance' },
  { id: 'employee_attendance', label: '3. Employee-wise' },
  { id: 'short_attendance', label: '4. Short Attendance' },
  { id: 'late_arrival', label: '5. Late Arrival' },
  { id: 'auto_punch_out', label: '6. Auto Punch-Out' },
  { id: 'leave', label: '7. Leave Report' },
  { id: 'holiday', label: '8. Holiday Report' },
  { id: 'task_completion', label: '9. Task Completion' },
  { id: 'work_report', label: '10. Employee Work Report' },
  { id: 'payroll', label: '11. Payroll Report' }
];

export default function HRReports() {
  const [selectedReport, setSelectedReport] = useState('daily_attendance');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = todayStr.slice(0, 7);

  const [dateRange, setDateRange] = useState({
    startDate: todayStr,
    endDate: todayStr,
    month: currentMonth
  });

  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('All');

  // Load employee list
  useEffect(() => {
    api.get('/employees?status=Active').then((res) => {
      setEmployees(res.data?.employees || []);
    }).catch(console.error);
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('reportType', selectedReport);
      params.set('startDate', dateRange.startDate);
      params.set('endDate', dateRange.endDate);
      params.set('month', dateRange.month);
      if (departmentFilter !== 'All') params.set('department', departmentFilter);
      if (employeeFilter !== 'All') params.set('employeeId', employeeFilter);

      const res = await api.get(`/reports/analytics?${params.toString()}`);
      setData(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, dateRange, departmentFilter, employeeFilter]);

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';

    if (['daily_attendance', 'monthly_attendance', 'employee_attendance', 'short_attendance', 'late_arrival', 'auto_punch_out'].includes(selectedReport)) {
      csvContent += 'Employee ID,Full Name,Department,Date,Shift,Punch In,Punch Out,Working Hours,Status\n';
      data.forEach((r) => {
        const emp = r.employee || {};
        csvContent += `"${emp.employeeId || ''}","${emp.fullName || ''}","${emp.department || ''}","${r.date || ''}","${r.shift?.name || ''}","${r.punchIn ? formatTime12(r.punchIn) : ''}","${r.punchOut ? formatTime12(r.punchOut) : ''}","${r.actualWorkingHours || 0}","${r.status || ''}"\n`;
      });
    } else if (selectedReport === 'leave') {
      csvContent += 'Employee ID,Full Name,Start Date,End Date,Days,Reason Category,Status\n';
      data.forEach((r) => {
        const emp = r.employee || {};
        csvContent += `"${emp.employeeId || ''}","${emp.fullName || ''}","${r.startDate || ''}","${r.endDate || ''}","${r.totalDays || 0}","${r.reasonCategory || ''}","${r.status || ''}"\n`;
      });
    } else if (selectedReport === 'holiday') {
      csvContent += 'Holiday Name,Date,Type,Applicability,Paid\n';
      data.forEach((r) => {
        csvContent += `"${r.name || ''}","${r.date || ''}","${r.type || ''}","${r.applicability || ''}","${r.paid ? 'Yes' : 'No'}"\n`;
      });
    } else if (selectedReport === 'task_completion') {
      csvContent += 'Task Title,Assigned To,Priority,Due Date,Status,Progress\n';
      data.forEach((r) => {
        const emp = r.employee || {};
        csvContent += `"${r.title || ''}","${emp.fullName || ''}","${r.priority || ''}","${r.dueDate ? r.dueDate.slice(0, 10) : ''}","${r.status || ''}","${r.progressPercentage || 0}%"\n`;
      });
    } else if (selectedReport === 'work_report') {
      csvContent += 'Employee ID,Full Name,Date,Completed Work,Pending Tasks,Challenges\n';
      data.forEach((r) => {
        const emp = r.employee || {};
        csvContent += `"${emp.employeeId || ''}","${emp.fullName || ''}","${r.date || ''}","${(r.completedWork || '').replace(/"/g, '""')}","${(r.pendingTasks || '').replace(/"/g, '""')}","${(r.challengesFaced || '').replace(/"/g, '""')}"\n`;
      });
    } else if (selectedReport === 'payroll') {
      csvContent += 'Employee ID,Full Name,Month,Gross Salary,Payable Days,Net Payable,Status\n';
      data.forEach((r) => {
        const emp = r.employee || {};
        csvContent += `"${emp.employeeId || ''}","${emp.fullName || ''}","${r.month || ''}","₹${r.grossSalary || 0}","${r.payableDays || 0}","₹${r.netPayable || 0}","${r.status || ''}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReport}_report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" /> Reports &amp; Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export and analyze organizational attendance, payroll, leaves, tasks, and auto-punch activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Print
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Report Categories Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-2 sm:p-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedReport(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedReport === tab.id
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {selectedReport === 'monthly_attendance' || selectedReport === 'payroll' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">Month:</span>
                <input
                  type="month"
                  value={dateRange.month}
                  onChange={(e) => setDateRange({ ...dateRange, month: e.target.value })}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">From:</span>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">To:</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Dept:</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="All">All Departments</option>
                {['Engineering', 'Product Design', 'Operations', 'Human Resources', 'Sales & Marketing', 'Quality Assurance'].map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Employee:</span>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none max-w-[160px]"
              >
                <option value="All">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-slate-500 font-semibold text-[11px]">
            Showing {data.length} records
          </span>
        </div>

        {/* Data Table */}
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <TableShimmer rows={6} />
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-xs font-semibold">No records found for the selected filters</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Date / Range</th>
                  <th className="py-2.5 px-3">Primary Metric</th>
                  <th className="py-2.5 px-3">Status / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.map((item, idx) => {
                  const emp = item.employee || {};
                  return (
                    <tr key={item._id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-900 block font-semibold">{emp.fullName || item.name || '—'}</strong>
                        <span className="text-[10px] text-slate-400">{emp.employeeId || ''}</span>
                      </td>
                      <td className="py-2.5 px-3">{emp.department || item.applicability || '—'}</td>
                      <td className="py-2.5 px-3 font-medium">
                        {item.date ? formatDateIST(item.date) : item.startDate ? `${item.startDate} to ${item.endDate}` : item.month || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.actualWorkingHours !== undefined
                          ? `${item.actualWorkingHours} hrs (${formatWorkingHours(item)})`
                          : item.netPayable !== undefined
                          ? `₹${item.netPayable}`
                          : item.totalDays !== undefined
                          ? `${item.totalDays} Days`
                          : item.progressPercentage !== undefined
                          ? `${item.progressPercentage}% Done`
                          : item.type || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'Full Day' || item.status === 'Present' || item.status === 'Completed' || item.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Short Attendance'
                              ? 'bg-rose-100 text-rose-800'
                              : item.status === 'Half Day'
                              ? 'bg-orange-100 text-orange-800'
                              : item.status === 'Holiday' || item.status === 'Working on Holiday'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status || item.type || 'Standard'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

