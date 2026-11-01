import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  Clock,
  AlertTriangle,
  UserX,
  CalendarOff,
  FileText,
  ClipboardList,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Calendar,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import api from '../../api/client';

export default function HRDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    absentToday: 0,
    reportsSubmitted: 0,
    pendingTasks: 0,
    leavePending: 0,
    leaveApproved: 0,
    leaveRejected: 0,
    payrollAmount: '0',
    payrollMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  });
  const [recentLogs, setRecentLogs] = useState([]);

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const [empRes, attRes, repRes, leaveRes] = await Promise.allSettled([
        api.get('/employees?status=Active'),
        api.get(`/attendance/all?date=${todayStr}`),
        api.get(`/reports?date=${todayStr}`),
        api.get('/leaves/all')
      ]);

      const employees = empRes.status === 'fulfilled' ? empRes.value.data.employees || [] : [];
      const attendance = attRes.status === 'fulfilled' ? attRes.value.data.records || [] : [];
      const reports = repRes.status === 'fulfilled' ? repRes.value.data.reports || [] : [];
      const leaves = leaveRes.status === 'fulfilled' ? leaveRes.value.data.requests || [] : [];

      let presentCount = 0;
      let lateCount = 0;
      let onLeaveCount = 0;

      attendance.forEach((att) => {
        if (att.status === 'Present') presentCount++;
        else if (att.status === 'Late') {
          presentCount++;
          lateCount++;
        } else if (att.status === 'Half Day' || att.status === 'Half-day') {
          presentCount += 0.5;
        } else if (att.status === 'On Leave') onLeaveCount++;
      });

      const totalActive = employees.length;
      const calculatedPresent = presentCount;
      const calculatedLate = lateCount;
      const calculatedLeave = onLeaveCount;
      const calculatedAbsent = Math.max(0, totalActive - (calculatedPresent + calculatedLeave));

      let pendingL = 0;
      let approvedL = 0;
      let rejectedL = 0;
      leaves.forEach((l) => {
        if (l.status === 'Approved') approvedL++;
        else if (l.status === 'Rejected') rejectedL++;
        else pendingL++;
      });

      setStats({
        totalEmployees: totalActive,
        presentToday: calculatedPresent,
        lateToday: calculatedLate,
        onLeaveToday: calculatedLeave,
        absentToday: calculatedAbsent,
        reportsSubmitted: reports.length,
        pendingTasks: 0,
        leavePending: pendingL,
        leaveApproved: approvedL,
        leaveRejected: rejectedL,
        payrollAmount: '0',
        payrollMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
      });

      setRecentLogs(attendance.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const attendancePercent = stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner matching HrpanelMui.png Screen 1 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Good Morning, HR Admin</h1>
          <p className="text-xs text-slate-500 mt-0.5">Here's today's overview</p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayDateFormatted}</span>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition shadow-xs cursor-pointer self-end sm:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 4 Top KPI Cards matching HrpanelMui.png Screen 1 (2x2 Grid on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Employees */}
        <Link to="/hr/employees" className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 truncate">Total Employees</span>
          </div>
          {loading ? (
            <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-lg my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.totalEmployees}</div>
          )}
        </Link>

        {/* Present Today */}
        <Link to="/hr/attendance" className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 truncate">Present Today</span>
          </div>
          {loading ? (
            <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-lg my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.presentToday}</div>
          )}
        </Link>

        {/* On Leave */}
        <Link to="/hr/leave" className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-200 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 truncate">On Leave</span>
          </div>
          {loading ? (
            <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-lg my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.onLeaveToday}</div>
          )}
        </Link>

        {/* Absent Today */}
        <Link to="/hr/attendance" className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all cursor-pointer group">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <UserX className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 truncate">Absent Today</span>
          </div>
          {loading ? (
            <div className="h-8 w-12 bg-slate-100 animate-pulse rounded-lg my-0.5" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.absentToday}</div>
          )}
        </Link>
      </div>

      {/* Today's Attendance Card matching HrpanelMui.png Screen 1 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-3">Today's Attendance</h3>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600"
                strokeDasharray={`${attendancePercent}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-slate-900">{attendancePercent}%</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {stats.presentToday} / {stats.totalEmployees}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Present</div>
          </div>
        </div>
      </div>

      {/* Leave Requests Card matching HrpanelMui.png Screen 1 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-sm">Leave Requests</h3>
          <Link to="/hr/leave" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center py-1">
          <div className="px-2">
            <div className="text-xl font-black text-amber-500">{stats.leavePending}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Pending</div>
          </div>
          <div className="px-2">
            <div className="text-xl font-black text-emerald-500">{stats.leaveApproved}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Approved</div>
          </div>
          <div className="px-2">
            <div className="text-xl font-black text-rose-500">{stats.leaveRejected}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Rejected</div>
          </div>
        </div>
      </div>

      {/* Bottom Row (Task Reports & Payroll side-by-side matching Screen 1) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Link
          to="/hr/tasks-reports"
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-200 transition"
        >
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Task Reports</h3>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {stats.reportsSubmitted}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Submitted Today</p>
          </div>
        </Link>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Payroll</h3>
            <p className="text-[11px] text-slate-500 mt-1">Ready for {stats.payrollMonth}</p>
          </div>
          <Link
            to="/hr/payroll"
            className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center transition shadow-xs"
          >
            View Payroll
          </Link>
        </div>
      </div>

      {/* Quick Navigation Cards matching HrpanelMui.png */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Quick Operational Shortcuts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/hr/employees"
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <Users className="w-5 h-5 mx-auto text-blue-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Employees</span>
            <span className="text-[10px] text-slate-400">Manage Staff</span>
          </Link>

          <Link
            to="/hr/attendance"
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <Clock className="w-5 h-5 mx-auto text-emerald-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Attendance</span>
            <span className="text-[10px] text-slate-400">Calendar & Logs</span>
          </Link>

          <Link
            to="/hr/leave"
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <CalendarOff className="w-5 h-5 mx-auto text-amber-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Leave</span>
            <span className="text-[10px] text-slate-400">Ledger & Quotas</span>
          </Link>

          <Link
            to="/hr/settings"
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <ShieldCheck className="w-5 h-5 mx-auto text-purple-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Settings</span>
            <span className="text-[10px] text-slate-400">Shift & Policy</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
