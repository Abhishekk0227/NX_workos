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

  // Selected Day in Calendar for mobile & detail inspection
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

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
      if (rec.status === 'Present' || rec.status === 'Working' || rec.punchIn) {
        if (rec.status === 'Late' || rec.lateMinutes > 0) {
          presentDays++;
          lateDays++;
        } else if (rec.status === 'Half Day' || rec.status === 'Half-day') {
          halfDays++;
          presentDays += 0.5;
        } else {
          presentDays++;
        }
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Attendance tracking, session timestamps, and start-date bounded logs
          </p>
        </div>

        {/* Segmented View Switch: Monthly Calendar vs Daily Log */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Calendar
          </button>
          <button
            onClick={() => setViewMode('log')}
            className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'log'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Attendance Log
          </button>
        </div>
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
        <div className="space-y-4 sm:space-y-6">
          {/* Controls: Employee dropdown & Interactive Month Picker */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Employee:</label>
              <select
                value={calendarEmployeeId}
                onChange={(e) => setCalendarEmployeeId(e.target.value)}
                className="w-full sm:w-64 md:w-72 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>

              {/* Joining Date Boundary Notice */}
              {currentEmp && (
                <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/70 inline-flex items-center gap-1">
                  <span>Joined:</span>
                  <strong className="text-slate-800 font-mono font-bold">
                    {joinDateStr || (currentEmp?.createdAt ? new Date(currentEmp.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))}
                  </strong>
                </div>
              )}
            </div>

            {/* Interactive Month Picker with Calendar Select */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Native Calendar Month Picker */}
              <div className="relative flex items-center flex-1 sm:flex-initial">
                <Calendar className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 pointer-events-none" />
                <input
                  type="month"
                  value={currentMonthPickerVal}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m] = e.target.value.split('-').map(Number);
                      setCalendarDate(new Date(y, m - 1, 1));
                    }
                  }}
                  className="w-full sm:w-36 pl-8 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition"
                  title="Click to open calendar and select any Month & Year"
                />
              </div>

              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5 Attendance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Active Days</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{activeWorkingDaysInMonth}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Working Days</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-emerald-100 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Present</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">{presentDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">On Schedule</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-amber-100 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600 block mb-0.5">Late</span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">{lateDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Over Grace</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-rose-100 shadow-xs text-center">
              <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5">Absent</span>
              <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">{absentDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Unexcused</span>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-blue-100 shadow-xs text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-blue-600 block mb-0.5">On Leave</span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 font-mono">{onLeaveDays}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">Approved</span>
            </div>
          </div>

          {/* Monthly Calendar Grid with App-Like Responsive Cells */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-5">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2">
              {dayHeaders.map((dh) => (
                <div key={dh} className="text-center font-bold text-[11px] sm:text-xs text-slate-500 py-1 uppercase tracking-tight">
                  {dh}
                </div>
              ))}
            </div>

            {/* Calendar Days Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty leading slots */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square sm:aspect-auto sm:h-20 bg-slate-50/40 rounded-xl sm:rounded-2xl border border-transparent" />
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
                const isSelected = selectedDay === dayNum;

                let statusBadge = null;
                let statusDot = null;
                let bgStyle = 'bg-slate-50/70 border-slate-200/80 text-slate-800';

                if (isPreJoining) {
                  bgStyle = 'bg-slate-50/40 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed';
                  statusBadge = (
                    <span className="text-[9px] text-slate-400 font-medium italic truncate" title={`Joined on ${joinDateStr}`}>
                      Pre-Join
                    </span>
                  );
                  statusDot = <span className="text-[8px] text-slate-300 font-mono leading-none">-</span>;
                } else if (isSunday) {
                  bgStyle = 'bg-slate-100/60 border-slate-200 text-slate-400';
                  statusBadge = <span className="text-[9px] font-semibold text-slate-500 truncate">Weekly Off</span>;
                  statusDot = <span className="w-1.5 h-1.5 rounded-full bg-slate-400/80" title="Weekly Off" />;
                } else if (rec) {
                  if (rec.status === 'Present' || rec.status === 'Working') {
                    bgStyle = 'bg-emerald-50/80 border-emerald-200 text-emerald-950';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 truncate">
                        {rec.status === 'Working' ? 'Working' : 'Present'}
                      </span>
                    );
                    statusDot = <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title={rec.status === 'Working' ? 'Working (Present)' : 'Present'} />;
                  } else if (rec.status === 'Late') {
                    bgStyle = 'bg-amber-50/80 border-amber-200 text-amber-950';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 truncate">
                        Late
                      </span>
                    );
                    statusDot = <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" title="Late" />;
                  } else if (rec.status === 'Half Day' || rec.status === 'Half-day') {
                    bgStyle = 'bg-orange-50/80 border-orange-200 text-orange-950';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800 truncate">
                        Half Day
                      </span>
                    );
                    statusDot = <span className="w-2 h-2 rounded-full bg-orange-500 shadow-xs" title="Half Day" />;
                  } else if (rec.status === 'On Leave') {
                    bgStyle = 'bg-blue-50/80 border-blue-200 text-blue-950';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 truncate">
                        Leave
                      </span>
                    );
                    statusDot = <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs" title="Leave" />;
                  } else if (rec.status === 'Absent' || rec.status === 'Incomplete') {
                    bgStyle = 'bg-rose-50/80 border-rose-200 text-rose-950';
                    statusBadge = (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 truncate">
                        Absent
                      </span>
                    );
                    statusDot = <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" title="Absent" />;
                  }
                } else if (isToday) {
                  bgStyle = 'bg-blue-50/60 border-blue-300 text-blue-900';
                  statusBadge = (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 truncate">
                      Today
                    </span>
                  );
                  statusDot = <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="Today" />;
                } else if (isFuture) {
                  bgStyle = 'bg-slate-50/30 border-slate-100 text-slate-300';
                  statusBadge = null;
                  statusDot = null;
                } else {
                  bgStyle = 'bg-slate-100/50 border-slate-200 text-slate-400';
                  statusBadge = (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-600 truncate">
                      Unmarked
                    </span>
                  );
                  statusDot = <span className="w-1.5 h-1.5 rounded-full bg-slate-300" title="Unmarked" />;
                }

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    className={`aspect-square sm:aspect-auto sm:h-20 p-1 sm:p-2 rounded-xl sm:rounded-2xl border flex flex-col justify-between items-center sm:items-stretch transition cursor-pointer select-none ${bgStyle} ${
                      isSelected ? 'ring-2 ring-blue-600 ring-offset-1 shadow-sm' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[11px] sm:text-xs font-bold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-black mx-auto sm:mx-0'
                          : isPreJoining
                          ? 'text-slate-300'
                          : 'text-slate-800'
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && (
                        <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-blue-600" title="Today" />
                      )}
                    </div>

                    {/* Mobile Dot Indicator */}
                    <div className="flex items-center justify-center mt-0.5 sm:hidden">
                      {statusDot}
                    </div>

                    {/* Desktop Full Badge */}
                    <div className="hidden sm:flex items-center justify-end w-full">
                      {statusBadge}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Active Day Inspection Strip (App-like experience) */}
            {(() => {
              const selDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
              const selDateObj = new Date(year, month, selectedDay);
              const selIsSunday = selDateObj.getDay() === 0;
              const selIsPreJoin = joinDateStr && selDateStr < joinDateStr;
              const selRec = recordsByDay[selectedDay];
              const selIsFuture = selDateStr > todayStr;

              let statusLabel = 'Unmarked';
              let statusPillClass = 'bg-slate-100 text-slate-700';

              if (selIsPreJoin) {
                statusLabel = 'Pre-Joining (Not Active)';
                statusPillClass = 'bg-slate-100 text-slate-400 border border-dashed border-slate-300';
              } else if (selIsSunday) {
                statusLabel = 'Weekly Off';
                statusPillClass = 'bg-slate-100 text-slate-600 border border-slate-200';
              } else if (selRec) {
                statusLabel = selRec.status;
                if (selRec.status === 'Present' || selRec.status === 'Working') statusPillClass = 'bg-emerald-100 text-emerald-800 font-bold';
                else if (selRec.status === 'Late') statusPillClass = 'bg-amber-100 text-amber-800 font-bold';
                else if (selRec.status === 'Half Day') statusPillClass = 'bg-orange-100 text-orange-800 font-bold';
                else if (selRec.status === 'On Leave') statusPillClass = 'bg-blue-100 text-blue-800 font-bold';
                else statusPillClass = 'bg-rose-100 text-rose-800 font-bold';
              } else if (selIsFuture) {
                statusLabel = 'Upcoming';
                statusPillClass = 'bg-slate-50 text-slate-400';
              }

              return (
                <div className="mt-4 p-3 sm:p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center font-bold shrink-0">
                      <span className="text-sm font-black text-slate-900 leading-tight">{selectedDay}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                        {selDateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {selDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPillClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {selIsPreJoin
                          ? `Employment started on ${joinDateStr}. Prior days are completely free from penalties.`
                          : selRec?.punchIn
                          ? `Punch In: ${new Date(selRec.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Punch Out: ${selRec.punchOut ? new Date(selRec.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'} • ${selRec.actualWorkingHours || 0} hrs`
                          : selIsSunday
                          ? 'Scheduled weekly holiday.'
                          : selIsFuture
                          ? 'Future work day.'
                          : 'No biometric/web punch-in recorded.'}
                      </div>
                    </div>
                  </div>

                  {!selIsPreJoin && (
                    <button
                      onClick={() => {
                        const targetRec = selRec || {
                          employee: currentEmp,
                          date: selDateStr,
                          status: 'Present'
                        };
                        openManualOverride(targetRec);
                      }}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer text-center"
                    >
                      Audit / Correct Day
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Color Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 pt-4 border-t border-slate-100 text-[11px] sm:text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Weekly Off</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-dashed border-slate-400" />
                <span>Pre-Joining</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY ATTENDANCE LOG */}
      {viewMode === 'log' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
              />
            </div>

            <div className="w-full sm:w-auto flex-1 min-w-0">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none truncate"
              >
                <option value="All">All Staff</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
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

          {/* Mobile Card View (App-like for phones) */}
          <div className="block md:hidden space-y-2.5">
            {records.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                No attendance records for the selected filters
              </div>
            ) : (
              records.map((att) => {
                const isLate = att.lateMinutes > 0;
                return (
                  <div
                    key={att._id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {att.employee?.fullName}
                        </div>
                        <div className="font-mono text-[10px] text-emerald-600 font-semibold">
                          {att.employee?.employeeId} • {att.employee?.department}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'Present' || att.status === 'Working'
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
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Punch In</span>
                        <span className="font-semibold text-slate-800">
                          {att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        {isLate && (
                          <span className="text-[9px] text-amber-600 font-bold block">+{att.lateMinutes}m late</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Punch Out</span>
                        <span className="font-semibold text-slate-800">
                          {att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {att.actualWorkingHours ? `${att.actualWorkingHours} hrs` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px]">
                        {att.dailyReport ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Report Filed
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No daily report</span>
                        )}
                      </div>

                      <button
                        onClick={() => openOverride(att)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Audit Correction
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Records Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                                att.status === 'Present' || att.status === 'Working'
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
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
