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
  ChevronRight,
  CalendarDays,
  Bell,
  Sparkles,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import api from '../../api/client';
import { HRDashboardShimmer } from '../../components/common/Shimmer';
import ShortAttendanceModal from '../../components/modals/ShortAttendanceModal';
import { formatDateIST, formatWorkingHours } from '../../utils/timeUtils';

export default function HRDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    fullDayPresent: 0,
    halfDay: 0,
    shortAttendance: 0,
    absentToday: 0,
    onLeaveToday: 0,
    holidayToday: 0,
    reportsSubmitted: 0,
    pendingTasks: 0,
    leavePending: 0,
    leaveApproved: 0,
    leaveRejected: 0,
    payrollAmount: '0',
    payrollMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  });

  const [pendingAlerts, setPendingAlerts] = useState({
    shortAttendanceAlerts: [],
    autoPunchOutRecords: []
  });

  const [selectedAlertAttendance, setSelectedAlertAttendance] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
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

      const [empRes, attRes, repRes, leaveRes, alertRes] = await Promise.allSettled([
        api.get('/employees?status=Active'),
        api.get(`/attendance/all?date=${todayStr}`),
        api.get(`/reports?date=${todayStr}`),
        api.get('/leaves/all'),
        api.get('/attendance/pending-alerts')
      ]);

      const employees = empRes.status === 'fulfilled' ? empRes.value.data.employees || [] : [];
      const attendance = attRes.status === 'fulfilled' ? attRes.value.data.records || [] : [];
      const reports = repRes.status === 'fulfilled' ? repRes.value.data.reports || [] : [];
      const leaves = leaveRes.status === 'fulfilled' ? leaveRes.value.data.requests || [] : [];
      const alerts = alertRes.status === 'fulfilled' ? alertRes.value.data : { shortAttendanceAlerts: [], autoPunchOutRecords: [] };

      // Compute exact 7 Attendance Dashboard KPI categories without any 0.5 conversion
      let fullDayCount = 0;
      let halfDayCount = 0;
      let shortAttendanceCount = 0;
      let absentCount = 0;
      let onLeaveCount = 0;
      let holidayCount = 0;

      attendance.forEach((att) => {
        const s = att.status;
        if (s === 'Full Day' || s === 'Present' || s === 'Late' || s === 'Working') {
          fullDayCount++;
        } else if (s === 'Half Day' || s === 'Half-day') {
          halfDayCount++;
        } else if (s === 'Short Attendance') {
          shortAttendanceCount++;
        } else if (s === 'Absent' || s === 'Incomplete') {
          absentCount++;
        } else if (s === 'On Leave') {
          onLeaveCount++;
        } else if (s === 'Holiday' || s === 'Working on Holiday') {
          holidayCount++;
        }
      });

      let pendingL = 0;
      let approvedL = 0;
      let rejectedL = 0;
      leaves.forEach((l) => {
        if (l.status === 'Approved') approvedL++;
        else if (l.status === 'Rejected') rejectedL++;
        else pendingL++;
      });

      setStats({
        totalEmployees: employees.length,
        fullDayPresent: fullDayCount,
        halfDay: halfDayCount,
        shortAttendance: shortAttendanceCount,
        absentToday: absentCount,
        onLeaveToday: onLeaveCount,
        holidayToday: holidayCount,
        reportsSubmitted: reports.length,
        pendingTasks: 0,
        leavePending: pendingL,
        leaveApproved: approvedL,
        leaveRejected: rejectedL,
        payrollAmount: '0',
        payrollMonth: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
      });

      setPendingAlerts({
        shortAttendanceAlerts: alerts.shortAttendanceAlerts || [],
        autoPunchOutRecords: alerts.autoPunchOutRecords || []
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAutoPunchOut = async (attendanceId) => {
    try {
      const res = await api.patch(`/attendance/${attendanceId}/review-auto-punch-out`, {
        remarks: 'HR acknowledged auto punch-out from dashboard'
      });
      if (res.data?.success) {
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge record');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalPendingAlertCount =
    (pendingAlerts.shortAttendanceAlerts?.length || 0) +
    (pendingAlerts.autoPunchOutRecords?.length || 0);

  const attendancePercent =
    stats.totalEmployees > 0
      ? Math.round((stats.fullDayPresent / stats.totalEmployees) * 100)
      : 0;

  if (loading) {
    return <HRDashboardShimmer />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            HR Control Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">India Standard Time (IST) Active Operating System</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayDateFormatted}</span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition shadow-2xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* PENDING ALERTS BANNER (Immediately visible on opening HR panel as specified in Section 3) */}
      {totalPendingAlertCount > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Pending Operational Alerts ({totalPendingAlertCount} Action Required)</span>
            </div>
            <Link
              to="/hr/attendance?view=log"
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1"
            >
              View Attendance Log <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingAlerts.shortAttendanceAlerts.slice(0, 4).map((alert) => (
              <div
                key={alert._id}
                className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {alert.employee?.fullName} ({alert.employee?.employeeId})
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    <span className="font-semibold text-rose-600">{alert.actualWorkingHours} hrs logged</span> • {formatDateIST(alert.date)} • {alert.employee?.department || 'Staff'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedAlertAttendance(alert);
                    setShowResolveModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
                >
                  Resolve
                </button>
              </div>
            ))}

            {pendingAlerts.autoPunchOutRecords.slice(0, 4).map((rec) => (
              <div
                key={rec._id}
                className="p-3 bg-white rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {rec.employee?.fullName} ({rec.employee?.employeeId})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      ⚡ Auto Punched-Out
                    </span>
                  </div>
                  <div className="text-[11px] text-purple-800 font-medium mt-0.5">
                    {formatDateIST(rec.date)} • {rec.actualWorkingHours || 0} hrs logged ({rec.status})
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAcknowledgeAutoPunchOut(rec._id)}
                    className="px-2.5 py-1.5 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Acknowledge
                  </button>
                  <Link
                    to={`/hr/attendance?view=log&date=${rec.date}`}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Audit / Correct
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7 ATTENDANCE DASHBOARD CARDS (Section 2: Total Employees, Full Day Present, Half Day, Short Attendance, Absent, On Leave, Holiday) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Attendance Distribution Today</h3>
          <span className="text-[11px] text-slate-500 font-medium">Distinct employee counts (No 0.5 split)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* 1. Total Employees */}
          <Link
            to="/hr/employees"
            className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition text-center"
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 truncate">Total Staff</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{stats.totalEmployees}</span>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5 truncate">Active</span>
          </Link>

          {/* 2. Full Day Present */}
          <Link
            to={`/hr/attendance?view=log&status=Full%20Day&date=${todayStr}`}
            className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition text-center"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5 truncate">Full Day</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">{stats.fullDayPresent}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">8h+ / 100% Pay</span>
          </Link>

          {/* 3. Half Day */}
          <Link
            to={`/hr/attendance?view=log&status=Half%20Day&date=${todayStr}`}
            className="bg-white p-3.5 rounded-2xl border border-orange-100 shadow-xs hover:border-orange-300 transition text-center"
          >
            <span className="text-[10px] uppercase font-bold text-orange-600 block mb-0.5 truncate">Half Day</span>
            <span className="text-xl sm:text-2xl font-black text-orange-600 font-mono">{stats.halfDay}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">4-8h / 50% Pay</span>
          </Link>

          {/* 4. Short Attendance */}
          <Link
            to={`/hr/attendance?view=log&status=Short%20Attendance&date=${todayStr}`}
            className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-xs hover:border-rose-400 transition text-center"
          >
            <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5 truncate">Short Att.</span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">{stats.shortAttendance}</span>
            <span className="text-[10px] text-rose-500 font-bold block mt-0.5 truncate">&lt; 4h (Alert)</span>
          </Link>

          {/* 5. Absent */}
          <Link
            to={`/hr/attendance?view=log&status=Absent&date=${todayStr}`}
            className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-400 transition text-center"
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 truncate">Absent</span>
            <span className="text-xl sm:text-2xl font-black text-slate-700 font-mono">{stats.absentToday}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">Unexcused / 0%</span>
          </Link>

          {/* 6. On Leave */}
          <Link
            to="/hr/leave"
            className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition text-center"
          >
            <span className="text-[10px] uppercase font-bold text-blue-600 block mb-0.5 truncate">On Leave</span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 font-mono">{stats.onLeaveToday}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">Approved</span>
          </Link>

          {/* 7. Holiday */}
          <Link
            to="/hr/holidays"
            className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-xs hover:border-amber-300 transition text-center"
          >
            <span className="text-[10px] uppercase font-bold text-amber-600 block mb-0.5 truncate">Holiday</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">{stats.holidayToday}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">Paid Non-Working</span>
          </Link>
        </div>
      </div>

      {/* Middle Operations: Leave Requests & Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Leave Requests Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">Leave Applications</h3>
            <Link to="/hr/leave" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Manage Quotas &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center py-2">
            <Link to="/hr/leave?status=Pending" className="px-2 py-1.5 rounded-xl hover:bg-amber-50/70 transition block">
              <div className="text-xl font-black text-amber-500">{stats.leavePending}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Pending Review</div>
            </Link>
            <Link to="/hr/leave?status=Approved" className="px-2 py-1.5 rounded-xl hover:bg-emerald-50/70 transition block">
              <div className="text-xl font-black text-emerald-500">{stats.leaveApproved}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Approved</div>
            </Link>
            <Link to="/hr/leave?status=Rejected" className="px-2 py-1.5 rounded-xl hover:bg-rose-50/70 transition block">
              <div className="text-xl font-black text-rose-500">{stats.leaveRejected}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Rejected</div>
            </Link>
          </div>
        </div>

        {/* Task Reports & Compensation Preview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-sm">Daily Work Reports</h3>
            <Link to={`/hr/tasks-reports?tab=reports&date=${todayStr}`} className="text-xs font-semibold text-blue-600">
              View All &rarr;
            </Link>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-2xl font-black text-slate-900">{stats.reportsSubmitted}</div>
              <p className="text-xs text-slate-500 mt-0.5">Submitted by employees today</p>
            </div>
            <Link
              to="/hr/payroll"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Open Payroll
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Core Operating Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/hr/attendance"
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <Clock className="w-5 h-5 mx-auto text-emerald-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Attendance</span>
            <span className="text-[10px] text-slate-400">Live Logs & Calendar</span>
          </Link>

          <Link
            to="/hr/holidays"
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <CalendarDays className="w-5 h-5 mx-auto text-amber-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Holiday Calendar</span>
            <span className="text-[10px] text-slate-400">Company & Festival</span>
          </Link>

          <Link
            to="/hr/reports"
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <FileText className="w-5 h-5 mx-auto text-blue-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Reports & Analytics</span>
            <span className="text-[10px] text-slate-400">11 Category Exports</span>
          </Link>

          <Link
            to="/hr/settings"
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-center transition group"
          >
            <ShieldCheck className="w-5 h-5 mx-auto text-purple-600 mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-slate-800 block">Working Hours &amp; Policy</span>
            <span className="text-[10px] text-slate-400">Thresholds &amp; Rules</span>
          </Link>
        </div>
      </div>

      {/* Short Attendance Resolution Modal */}
      {showResolveModal && (
        <ShortAttendanceModal
          isOpen={showResolveModal}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedAlertAttendance(null);
          }}
          attendance={selectedAlertAttendance}
          onSuccess={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
