import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  Sparkles
} from 'lucide-react';
import api from '../../api/client';

export default function HRAttendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live IST Indian Time state
  const [currentTimeIST, setCurrentTimeIST] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeIST(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // View switch: 'calendar' | 'log'
  const [viewMode, setViewMode] = useState('calendar');

  // Calendar State: defaults to live current month/year
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarEmployeeId, setCalendarEmployeeId] = useState('');
  const [calendarRecords, setCalendarRecords] = useState([]);

  // Daily Log Filters: defaults to real-time current date
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Manual Edit Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideData, setOverrideData] = useState({
    punchIn: '',
    punchOut: '',
    status: '',
    reason: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, empRes] = await Promise.all([
        api.get(`/attendance/all?date=${selectedDate}&employeeId=${selectedEmployee}&status=${selectedStatus}`),
        api.get('/employees?status=Active')
      ]);

      const emps = empRes.data?.employees || [];
      setEmployees(emps);
      setRecords(attRes.data?.records || []);

      if (!calendarEmployeeId && emps.length > 0) {
        setCalendarEmployeeId(emps[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedEmployee, selectedStatus]);

  // Fetch monthly records for the selected employee in calendar view
  useEffect(() => {
    if (!calendarEmployeeId) return;

    const fetchMonthlyData = async () => {
      try {
        const year = calendarDate.getFullYear();
        const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
        const monthQuery = `${year}-${month}`;

        const res = await api.get(`/attendance/all?employeeId=${calendarEmployeeId}&month=${monthQuery}`);
        setCalendarRecords(res.data?.records || []);
      } catch (err) {
        console.error('Error fetching calendar records:', err);
      }
    };

    fetchMonthlyData();
  }, [calendarEmployeeId, calendarDate]);

  const handleReviewCorrection = async (attendanceId, decision) => {
    const reviewRemarks = prompt(`Enter remarks for ${decision.toLowerCase()} this correction request:`);
    if (reviewRemarks === null) return;

    try {
      const res = await api.post('/attendance/review-correction', {
        attendanceId,
        decision,
        reviewRemarks
      });
      if (res.data?.success) {
        alert(res.data.message);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review correction');
    }
  };

  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!overrideData.reason.trim()) {
      alert('A detailed audit reason is mandatory for manual modifications.');
      return;
    }

    try {
      const res = await api.post('/attendance/manual-correct', {
        attendanceId: overrideTarget._id,
        punchIn: overrideData.punchIn ? new Date(overrideData.punchIn) : undefined,
        punchOut: overrideData.punchOut ? new Date(overrideData.punchOut) : undefined,
        status: overrideData.status || undefined,
        reason: overrideData.reason
      });

      if (res.data?.success) {
        alert('Attendance updated successfully with audit trail.');
        setShowOverrideModal(false);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Override failed');
    }
  };

  const openOverride = (att) => {
    setOverrideTarget(att);
    setOverrideData({
      punchIn: att.punchIn ? new Date(att.punchIn).toISOString().slice(0, 16) : '',
      punchOut: att.punchOut ? new Date(att.punchOut).toISOString().slice(0, 16) : '',
      status: att.status || 'Present',
      reason: ''
    });
    setShowOverrideModal(true);
  };

  // Month navigation
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const currentMonthPickerVal = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`;

  // Find currently selected employee and their joining/starting date
  const currentEmp = employees.find((e) => e._id === calendarEmployeeId);
  const joinDateRaw = currentEmp?.joiningDate || currentEmp?.createdAt;
  const joinDateStr = joinDateRaw
    ? typeof joinDateRaw === 'string'
      ? joinDateRaw.slice(0, 10)
      : new Date(joinDateRaw).toISOString().slice(0, 10)
    : null;

  // Compute calendar days
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Map calendar records by day
  const recordsByDay = {};
  calendarRecords.forEach((rec) => {
    if (rec.date) {
      const dayNum = parseInt(rec.date.split('-')[2], 10);
      recordsByDay[dayNum] = rec;
    }
  });

  // Calculate KPIs strictly from employee's joining date onward
  let activeWorkingDaysInMonth = 0;
  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let onLeaveDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month, d);
    const isSunday = dateObj.getDay() === 0;

    // Days before employee joined the company are not part of employment
    if (joinDateStr && dStr < joinDateStr) {
      continue;
    }

    if (!isSunday) {
      activeWorkingDaysInMonth++;
    }

    const rec = recordsByDay[d];
    if (rec) {
      if (rec.status === 'Present') presentDays++;
      else if (rec.status === 'Late') {
        presentDays++;
        lateDays++;
      } else if (rec.status === 'Half Day' || rec.status === 'Half-day') {
        halfDays++;
      } else if (rec.status === 'Absent' || rec.status === 'Incomplete') {
        absentDays++;
      } else if (rec.status === 'On Leave') {
        onLeaveDays++;
      }
    } else {
      // Past working day without punch-in during active employment
      if (!isSunday && dStr < todayStr) {
        absentDays++;
      }
    }
  }

  // Pending corrections
  const pendingCorrections = records.filter((r) => r.correction?.status === 'Pending');

  // Formatted Live IST string
  const liveISTString = `${currentTimeIST.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  })} • ${currentTimeIST.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  })} IST`;

  return (
    <div className="space-y-6">
      {/* Top Header with Live India Time Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Attendance</h1>
            {/* Live IST Real-time Indicator */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-mono font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{liveISTString}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Attendance tracking, real-time IST session timestamps, and start-date bounded logs
          </p>
        </div>

        {/* Segmented View Switch: Monthly Calendar vs Daily Log */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Calendar
          </button>
          <button
            onClick={() => setViewMode('log')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'log'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Attendance Log
          </button>
        </div>
      </div>

      {/* Mobile Live IST Badge */}
      <div className="sm:hidden flex items-center justify-between p-2.5 bg-slate-900 text-white rounded-xl text-xs font-mono font-semibold shadow-xs">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>India Time (IST):</span>
        </span>
        <span className="text-emerald-400">{liveISTString}</span>
      </div>

      {/* Pending Correction Alert Banner */}
      {pendingCorrections.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 font-bold text-xs text-amber-900 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Attendance Corrections Pending Action ({pendingCorrections.length})</span>
          </div>
          <div className="space-y-2">
            {pendingCorrections.map((att) => (
              <div
                key={att._id}
                className="p-3 bg-white rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">{att.employee?.fullName}</span>{' '}
                  <span className="text-slate-500 font-mono">({att.employee?.employeeId})</span>
                  <div className="text-slate-600 mt-0.5">
                    Date: <strong>{att.date}</strong> | Reason:{' '}
                    <span className="italic font-medium">"{att.correction?.reason}"</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleReviewCorrection(att._id, 'Approved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReviewCorrection(att._id, 'Rejected')}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-[11px] transition cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 1: MONTHLY CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Controls: Employee dropdown & Interactive Month Picker */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Employee:</label>
              <select
                value={calendarEmployeeId}
                onChange={(e) => setCalendarEmployeeId(e.target.value)}
                className="w-full sm:w-72 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeId}) - {emp.designation}
                  </option>
                ))}
              </select>
            </div>

            {/* Joining Date Boundary Notice */}
            {currentEmp && (
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
                <span>Joining Date: </span>
                <strong className="text-slate-800 font-mono">
                  {joinDateStr || '01-01-2024'}
                </strong>
                <span className="text-[10px] text-slate-400 ml-1.5">(Records start from this date)</span>
              </div>
            )}

            {/* Interactive Month Picker with Calendar Select */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Native Calendar Month Picker */}
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-blue-600 absolute left-3 pointer-events-none" />
                <input
                  type="month"
                  value={currentMonthPickerVal}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m] = e.target.value.split('-').map(Number);
                      setCalendarDate(new Date(y, m - 1, 1));
                    }
                  }}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition"
                  title="Click to open calendar and select any Month & Year"
                />
              </div>

              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Jump to Current Month"
              >
                This Month
              </button>
            </div>
          </div>

          {/* 5 Attendance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Days</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{activeWorkingDaysInMonth}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Eligible Working Days</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Present</span>
              <span className="text-2xl font-black text-emerald-600 font-mono">{presentDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">On Schedule</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">Late</span>
              <span className="text-2xl font-black text-amber-600 font-mono">{lateDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Grace Exceeded</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">Absent</span>
              <span className="text-2xl font-black text-rose-600 font-mono">{absentDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Unexcused</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">On Leave</span>
              <span className="text-2xl font-black text-blue-600 font-mono">{onLeaveDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Approved</span>
            </div>
          </div>

          {/* Monthly Calendar Grid with Joining Date Boundary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayHeaders.map((dh) => (
                <div key={dh} className="text-center font-bold text-xs text-slate-500 py-1">
                  {dh}
                </div>
              ))}
            </div>

            {/* Calendar Days Cells */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty leading slots */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 sm:h-20 bg-slate-50/40 rounded-xl" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dateObj = new Date(year, month, dayNum);
                const isSunday = dateObj.getDay() === 0;
                const isPreJoining = joinDateStr && cellDateStr < joinDateStr;
                const isToday = cellDateStr === todayStr;
                const isFuture = cellDateStr > todayStr;
                const rec = recordsByDay[dayNum];

                let statusBadge = null;
                let bgStyle = 'bg-slate-50/70 border-slate-200/70';

                if (isPreJoining) {
                  // Days before joining date have NO previous data and cannot be marked
                  bgStyle = 'bg-slate-50/50 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed';
                  statusBadge = (
                    <span className="text-[9px] text-slate-400 font-medium italic" title={`Joined on ${joinDateStr}`}>
                      Pre-Joining
                    </span>
                  );
                } else if (isSunday) {
                  bgStyle = 'bg-slate-100/60 border-slate-200 text-slate-400';
                  statusBadge = <span className="text-[9px] font-semibold text-slate-400">Weekly Off</span>;
                } else if (rec) {
                  if (rec.status === 'Present') {
                    bgStyle = 'bg-emerald-50/70 border-emerald-200';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        Present
                      </span>
                    );
                  } else if (rec.status === 'Late') {
                    bgStyle = 'bg-amber-50/70 border-amber-200';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                        Late
                      </span>
                    );
                  } else if (rec.status === 'Half Day' || rec.status === 'Half-day') {
                    bgStyle = 'bg-orange-50/70 border-orange-200';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800">
                        Half Day
                      </span>
                    );
                  } else if (rec.status === 'On Leave') {
                    bgStyle = 'bg-blue-50/70 border-blue-200';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                        Leave
                      </span>
                    );
                  } else if (rec.status === 'Absent' || rec.status === 'Incomplete') {
                    bgStyle = 'bg-rose-50/70 border-rose-200';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                        Absent
                      </span>
                    );
                  }
                } else if (isToday) {
                  bgStyle = 'bg-blue-50/50 border-blue-200';
                  statusBadge = (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                      Today
                    </span>
                  );
                } else if (isFuture) {
                  bgStyle = 'bg-slate-50/40 border-slate-100 text-slate-300';
                  statusBadge = null;
                } else {
                  // Past day during active employment without punch in
                  bgStyle = 'bg-slate-100/50 border-slate-200 text-slate-400';
                  statusBadge = (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-600">
                      Unmarked
                    </span>
                  );
                }

                return (
                  <div
                    key={dayNum}
                    className={`h-16 sm:h-20 p-2 rounded-xl border flex flex-col justify-between transition hover:shadow-xs ${bgStyle}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isPreJoining ? 'text-slate-300' : 'text-slate-800'}`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" title="Today" />
                      )}
                    </div>
                    <div className="flex items-center justify-end">{statusBadge}</div>
                  </div>
                );
              })}
            </div>

            {/* Color Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Late</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-orange-500" />
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500" />
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-300" />
                <span>Weekly Off</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-100 border border-dashed border-slate-300" />
                <span>Pre-Joining (No Data)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY ATTENDANCE LOG */}
      {viewMode === 'log' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none min-w-40"
              >
                <option value="All">All Staff</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Working">Working</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Punch In</th>
                    <th className="py-3.5 px-4">Punch Out</th>
                    <th className="py-3.5 px-4">Working Hours</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Daily Report</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        No attendance records for the selected filters
                      </td>
                    </tr>
                  ) : (
                    records.map((att) => {
                      const isLate = att.lateMinutes > 0;
                      return (
                        <tr key={att._id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs">
                              {att.employee?.fullName}
                            </div>
                            <div className="font-mono text-[11px] text-emerald-600 font-semibold">
                              {att.employee?.employeeId}
                            </div>
                            <div className="text-[10px] text-slate-400">{att.employee?.department}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            {att.punchIn ? (
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isLate && (
                                  <div className="text-[10px] text-amber-600 font-medium">
                                    +{att.lateMinutes}m late
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Not marked</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {att.punchOut ? (
                              <span className="font-semibold text-slate-900">
                                {new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">In progress</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono font-semibold text-slate-800">
                              {att.actualWorkingHours ? `${att.actualWorkingHours} hrs` : '—'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                att.status === 'Present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : att.status === 'Late'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : att.status === 'Half Day'
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {att.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {att.dailyReport ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                                <CheckCircle className="w-3.5 h-3.5" /> Submitted
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => openOverride(att)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            >
                              Edit (HR)
                            </button>
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
      )}

      {/* MANUAL CORRECTION MODAL */}
      {showOverrideModal && overrideTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">HR Attendance Correction</h3>
                <p className="text-xs text-slate-300">
                  {overrideTarget.employee?.fullName} ({overrideTarget.employee?.employeeId}) • {overrideTarget.date}
                </p>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualOverride} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                Manual corrections recalculate late minutes and working hours server-side, logging an immutable audit record with your HR identity.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Punch In Time</label>
                  <input
                    type="datetime-local"
                    value={overrideData.punchIn}
                    onChange={(e) => setOverrideData({ ...overrideData, punchIn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Punch Out Time</label>
                  <input
                    type="datetime-local"
                    value={overrideData.punchOut}
                    onChange={(e) => setOverrideData({ ...overrideData, punchOut: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Override</label>
                <select
                  value={overrideData.status}
                  onChange={(e) => setOverrideData({ ...overrideData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mandatory Audit Reason *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Employee punch sensor biometric malfunction confirmed by security gate..."
                  value={overrideData.reason}
                  onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
