import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Info,
  CalendarDays,
  FileText,
  X
} from 'lucide-react';
import api from '../../api/client';
import PunchInModal from '../../components/modals/PunchInModal';
import PunchOutModal from '../../components/modals/PunchOutModal';
import MissingDailyReportModal from '../../components/modals/MissingDailyReportModal';
import { AttendanceShimmer } from '../../components/common/Shimmer';
import { formatTime24, formatWorkingHours } from '../../utils/timeUtils';

export default function EmployeeAttendance() {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'calendar' | 'history'
  const [history, setHistory] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [workHoursPolicy, setWorkHoursPolicy] = useState({
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4,
    gracePeriodMinutes: 15
  });
  const [loading, setLoading] = useState(true);

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState(() => new Date().getDate());

  // Modals
  const [showPunchIn, setShowPunchIn] = useState(false);
  const [showPunchOut, setShowPunchOut] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [selectedMissingReport, setSelectedMissingReport] = useState(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionData, setCorrectionData] = useState({
    requestedPunchIn: '',
    requestedPunchOut: '',
    reason: ''
  });

  const monthYearString = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const selectedMonthParam = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [todayRes, histRes, holRes, setRes] = await Promise.allSettled([
        api.get('/attendance/today'),
        api.get(`/attendance/my-history?month=${selectedMonthParam}`),
        api.get(`/holidays?year=${year}&month=${month}`),
        api.get('/settings')
      ]);

      if (todayRes.status === 'fulfilled') {
        setTodayAttendance(todayRes.value.data.attendance);
      }
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value.data.history || []);
      }
      if (holRes.status === 'fulfilled') {
        setHolidays(holRes.value.data.holidays || []);
      }
      if (setRes.status === 'fulfilled' && setRes.value.data?.settings) {
        const s = setRes.value.data.settings;
        setWorkHoursPolicy({
          fullDayThresholdHours: s.fullDayThresholdHours ?? s.defaultRequiredHours ?? 8,
          halfDayThresholdHours: s.halfDayThresholdHours ?? 4,
          gracePeriodMinutes: s.gracePeriodMinutes ?? 15
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonthParam]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isWorking = todayAttendance?.punchIn && !todayAttendance?.punchOut;
  const isPunchedOut = todayAttendance?.punchIn && todayAttendance?.punchOut;

  // Calendar Day Generator
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: '', isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = history.find(h => h.date === dateStr);
      const isSunday = new Date(year, month, d).getDay() === 0;
      const mmdd = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hol = holidays.find(h => h.date === dateStr || (h.startDate && h.endDate && h.startDate <= dateStr && dateStr <= h.endDate) || (h.isRecurring && h.date && h.date.slice(5) === mmdd));

      let dotColor = null;
      let status = null;
      let holidayName = hol ? hol.name : null;

      if (record) {
        status = record.status;
        if (record.status === 'Present' || record.status === 'Full Day') dotColor = 'bg-[#10b981]';
        else if (record.status === 'Late') dotColor = 'bg-[#f59e0b]';
        else if (record.status === 'Half Day' || record.status === 'Half-day') dotColor = 'bg-[#f97316]';
        else if (record.status === 'Short Attendance') dotColor = 'bg-[#a855f7]';
        else if (record.status === 'Holiday') dotColor = 'bg-[#06b6d4]';
        else if (record.status === 'Working on Holiday') dotColor = 'bg-[#059669]';
        else if (record.status === 'On Leave') dotColor = 'bg-[#3b82f6]';
        else if (record.status === 'Absent' || record.status === 'Incomplete') dotColor = 'bg-[#ef4444]';
      } else if (hol) {
        status = 'Holiday';
        dotColor = 'bg-[#06b6d4]';
      } else if (isSunday) {
        status = 'Weekly Off';
        dotColor = 'bg-slate-400';
      }

      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        dotColor,
        isToday: d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear(),
        status,
        holidayName
      });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  const handleRequestCorrection = async (e) => {
    e.preventDefault();
    if (!correctionData.reason.trim()) {
      alert('A reason is required');
      return;
    }

    try {
      const res = await api.post('/attendance/request-correction', {
        attendanceId: correctionTarget._id,
        requestedPunchIn: correctionData.requestedPunchIn ? new Date(correctionData.requestedPunchIn) : undefined,
        requestedPunchOut: correctionData.requestedPunchOut ? new Date(correctionData.requestedPunchOut) : undefined,
        reason: correctionData.reason
      });

      if (res.data?.success) {
        alert(res.data.message);
        setShowCorrectionModal(false);
        fetchAttendance();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit correction');
    }
  };

  const openCorrection = (att) => {
    setCorrectionTarget(att);
    setCorrectionData({
      requestedPunchIn: att.punchIn ? new Date(att.punchIn).toISOString().slice(0, 16) : '',
      requestedPunchOut: att.punchOut ? new Date(att.punchOut).toISOString().slice(0, 16) : '',
      reason: ''
    });
    setShowCorrectionModal(true);
  };

  if (loading) {
    return <AttendanceShimmer />;
  }

  return (
    <div className="space-y-4">
      {/* Date Pill matching EppanelM.png Screen 4 */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeTab === 'details' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activeTab === 'history' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'calendar' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {activeTab === 'details' && (
        /* SUBVIEW 1: ATTENDANCE (TODAY) matching EppanelM.png Screen 4 */
        <div className="space-y-4">
          {/* Status Card matching Screen 4 */}
          <div className={`p-5 rounded-2xl border transition shadow-2xs text-center space-y-3.5 ${
            !todayAttendance?.punchIn
              ? 'bg-rose-50/70 border-rose-200'
              : isWorking
              ? 'bg-blue-50/70 border-blue-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                !todayAttendance?.punchIn
                  ? 'bg-rose-100 text-rose-700'
                  : isWorking
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {!todayAttendance?.punchIn ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Not Marked
                  </>
                ) : isWorking ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Working
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
                  </>
                )}
              </span>
            </div>

            <p className="text-xs font-medium text-slate-700">
              {!todayAttendance?.punchIn
                ? "You haven't marked your attendance yet."
                : isWorking
                ? `Punched in at ${formatTime24(todayAttendance.punchIn)}`
                : `Completed today. Working hours: ${formatWorkingHours(todayAttendance)}`}
            </p>

            {!todayAttendance?.punchIn ? (
              <button
                onClick={() => setShowPunchIn(true)}
                className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>PUNCH IN</span>
              </button>
            ) : isWorking ? (
              <button
                onClick={() => setShowPunchOut(true)}
                className="w-full py-3.5 px-6 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>PUNCH OUT (SUBMIT REPORT)</span>
              </button>
            ) : (
              <div className="text-xs text-emerald-700 font-bold py-1">
                ✓ Recorded on Server
              </div>
            )}
          </div>

          {/* Working Hours Rules Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Working Hours Policy</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Full Day Requirement</span>
                <span className="font-bold text-emerald-700">&ge; {workHoursPolicy.fullDayThresholdHours} hours (100% Pay)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Half Day Requirement</span>
                <span className="font-bold text-amber-700">{workHoursPolicy.halfDayThresholdHours} to &lt; {workHoursPolicy.fullDayThresholdHours} hours (50% Pay)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Logged Working Hours</span>
                <span className="font-bold text-slate-800">
                  {todayAttendance?.actualWorkingHours ? formatWorkingHours(todayAttendance) : '0:00'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Grace Period</span>
                <span className="font-bold text-slate-800">{workHoursPolicy.gracePeriodMinutes} minutes</span>
              </div>
            </div>
          </div>

          {/* Info callout matching Screen 4 */}
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              Please enter your Employee ID to mark attendance.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        /* SUBVIEW 2: CALENDAR VIEW matching EppanelD.png #4 */
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">My Attendance</h2>
              <p className="text-xs text-slate-500">View your daily attendance records</p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <button onClick={prevMonth} className="hover:text-blue-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-20 text-center">{monthYearString}</span>
              <button onClick={nextMonth} className="hover:text-blue-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="w-full">
            {/* Day headers */}
            <div className="grid grid-cols-7 text-center font-bold text-slate-400 text-[11px] sm:text-xs pb-2 border-b border-slate-100 uppercase tracking-tight">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-2">
              {calendarDays.map((cd, idx) => {
                const isSelected = cd.isCurrentMonth && cd.dayNumber === selectedCalDay;
                return (
                  <div
                    key={idx}
                    onClick={() => cd.isCurrentMonth && setSelectedCalDay(cd.dayNumber)}
                    className={`aspect-square sm:aspect-auto sm:h-16 p-1 rounded-xl sm:rounded-2xl flex flex-col items-center justify-between border transition cursor-pointer select-none ${
                      !cd.isCurrentMonth
                        ? 'opacity-20 border-transparent cursor-default'
                        : isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 shadow-2xs font-bold'
                        : cd.isToday
                        ? 'bg-blue-600 text-white font-bold border-blue-600'
                        : 'bg-slate-50/70 border-slate-100 text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-[11px] sm:text-xs leading-none ${cd.isToday ? 'text-white' : ''}`}>
                      {cd.dayNumber}
                    </span>
                    {cd.dotColor && !cd.isToday && (
                      <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${cd.dotColor} shadow-2xs`} />
                    )}
                    {cd.isToday && (
                      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-blue-100 font-bold leading-none">
                        Today
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Day Details Preview for Employee */}
            {(() => {
              const selectedItem = calendarDays.find(
                (c) => c.isCurrentMonth && c.dayNumber === selectedCalDay
              );
              if (!selectedItem) return null;

              const matchedRecord = history.find((h) => h.date === selectedItem.dateStr);

              return (
                <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      Day {selectedCalDay} • {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {matchedRecord ? (
                        <>
                          Status: <strong className="text-slate-800">{matchedRecord.status}</strong> •
                          Punch: {matchedRecord.punchIn ? formatTime24(matchedRecord.punchIn) : '—'}
                          {matchedRecord.punchOut ? ` – ${formatTime24(matchedRecord.punchOut)}` : ''}
                          {` (${formatWorkingHours(matchedRecord)})`}
                        </>
                      ) : selectedItem.status === 'Holiday' ? (
                        <span>
                          Status: <strong className="text-cyan-700 font-bold">Holiday: {selectedItem.holidayName || 'Official Holiday'} (100% Paid)</strong>
                        </span>
                      ) : (
                        <span>Status: <strong>{selectedItem.status || 'No record'}</strong></span>
                      )}
                    </div>
                  </div>

                  {matchedRecord && (
                    <button
                      onClick={() => openCorrection(matchedRecord)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-600 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
                    >
                      Correction
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Legend matching EppanelD.png #4 + New Upgrade Statuses */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span>Full Day / Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
              <span>Half Day (50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
              <span>Short Attendance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <span>Working on Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              <span>On Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Weekly Off</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        /* SUBVIEW 3: ATTENDANCE HISTORY matching EppanelM.png #9 */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Attendance History</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <button onClick={prevMonth} className="hover:text-blue-600 cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="min-w-20 text-center">{monthYearString}</span>
              <button onClick={nextMonth} className="hover:text-blue-600 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No records for this month</div>
            ) : (
              history.map((att) => (
                <div key={att._id} className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center font-bold text-slate-800 shrink-0">
                      <span className="text-sm leading-tight">{new Date(att.date).getDate()}</span>
                      <span className="text-[9px] uppercase text-slate-400">
                        {new Date(att.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-slate-800">
                        {att.punchIn ? `${formatTime24(att.punchIn)} – ${att.punchOut ? formatTime24(att.punchOut) : 'In progress'}` : 'Not Marked'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Working Hours: {att.punchOut ? formatWorkingHours(att) : '-'}
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        att.status === 'Present' || att.status === 'Full Day'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : att.status === 'Half Day' || att.status === 'Half-day'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : att.status === 'Short Attendance'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : att.status === 'Holiday'
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : att.status === 'Working on Holiday'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold'
                          : att.status === 'On Leave'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : att.status === 'Late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {att.status}
                      </span>

                      {att.autoPunchedOut && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          ⚡ Auto
                        </span>
                      )}

                      {att.autoPunchedOut && !att.dailyReport && (
                        <button
                          onClick={() => {
                            setSelectedMissingReport(att);
                            setShowMissingModal(true);
                          }}
                          className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold shadow-xs transition cursor-pointer"
                        >
                          Write Report
                        </button>
                      )}

                      <button
                        onClick={() => openCorrection(att)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold ml-1 cursor-pointer"
                      >
                        Correction
                      </button>
                    </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CORRECTION REQUEST MODAL */}
      {showCorrectionModal && correctionTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Request Attendance Correction</h3>
                <p className="text-xs text-slate-400">{correctionTarget.date}</p>
              </div>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestCorrection} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Punch In</label>
                  <input
                    type="datetime-local"
                    value={correctionData.requestedPunchIn}
                    onChange={(e) => setCorrectionData({ ...correctionData, requestedPunchIn: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Punch Out</label>
                  <input
                    type="datetime-local"
                    value={correctionData.requestedPunchOut}
                    onChange={(e) => setCorrectionData({ ...correctionData, requestedPunchOut: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Correction *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="State reason clearly..."
                  value={correctionData.reason}
                  onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Punch In / Out Modals */}
      <PunchInModal
        isOpen={showPunchIn}
        onClose={() => setShowPunchIn(false)}
        onSuccess={() => fetchAttendance()}
      />

      <PunchOutModal
        isOpen={showPunchOut}
        onClose={() => setShowPunchOut(false)}
        onSuccess={() => fetchAttendance()}
        punchIn={todayAttendance?.punchIn}
      />

      <MissingDailyReportModal
        isOpen={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        pendingSession={selectedMissingReport}
        onSuccess={() => {
          setShowMissingModal(false);
          fetchAttendance();
        }}
      />
    </div>
  );
}
