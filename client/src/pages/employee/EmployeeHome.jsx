import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ClipboardList,
  CheckSquare,
  CalendarOff,
  CalendarCheck,
  LogOut,
  Megaphone,
  Check,
  ExternalLink,
  ChevronRight,
  PartyPopper,
  Sparkles,
  AlarmClock,
  CalendarDays,
  Eye,
  X,
  Flame
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PunchInModal from '../../components/modals/PunchInModal';
import PunchOutModal from '../../components/modals/PunchOutModal';
import MissingDailyReportModal from '../../components/modals/MissingDailyReportModal';

import { HomeShimmer } from '../../components/common/Shimmer';
import { formatWorkingHours, formatDateIST } from '../../utils/timeUtils';

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState({ clBalance: 0, slBalance: 0, lwpCount: 0 });
  const [leavesTakenThisMonth, setLeavesTakenThisMonth] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [broadcasts, setBroadcasts] = useState([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [activeReminders, setActiveReminders] = useState([]);
  const [workHoursPolicy, setWorkHoursPolicy] = useState({ fullDayThresholdHours: 8, halfDayThresholdHours: 4 });
  const [loading, setLoading] = useState(true);

  // Notice Read & Acknowledge Modal state
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  // Modals
  const [showPunchInModal, setShowPunchInModal] = useState(false);
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [pendingAutoPunchOutReport, setPendingAutoPunchOutReport] = useState(null);
  const [showMissingReportModal, setShowMissingReportModal] = useState(false);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [attRes, balRes, taskRes, broadRes, holRes, remRes, pendingReportRes, setRes] = await Promise.allSettled([
        api.get('/attendance/today'),
        api.get('/leaves/balance'),
        api.get('/tasks/my'),
        api.get('/broadcasts/active'),
        api.get('/holidays/upcoming'),
        api.get('/reminders?status=Pending'),
        api.get('/reports/pending-auto-punch-out'),
        api.get('/settings')
      ]);

      if (attRes.status === 'fulfilled') {
        setAttendance(attRes.value.data.attendance);
      }
      if (balRes.status === 'fulfilled') {
        setLeaveBalances(balRes.value.data.balances || { clBalance: 0, slBalance: 0, lwpCount: 0 });
        setLeavesTakenThisMonth(balRes.value.data.leavesTakenThisMonth ?? 0);
      }
      if (taskRes.status === 'fulfilled') {
        const pTasks = taskRes.value.data.personalTasks || [];
        const hTasks = taskRes.value.data.hrAssignedTasks || [];
        const combined = [...pTasks, ...hTasks];
        setTasks(combined);
        const pendingCount = combined.filter(t => t.status !== 'Completed').length;
        setPendingTasksCount(pendingCount);
      }
      if (broadRes.status === 'fulfilled') {
        setBroadcasts(broadRes.value.data.broadcasts || []);
      }
      if (holRes.status === 'fulfilled') {
        setUpcomingHolidays(holRes.value.data.holidays || []);
      }
      if (remRes.status === 'fulfilled') {
        setActiveReminders(remRes.value.data.reminders || []);
      }
      if (pendingReportRes.status === 'fulfilled' && pendingReportRes.value.data.pendingReport) {
        setPendingAutoPunchOutReport(pendingReportRes.value.data.pendingReport);
        setShowMissingReportModal(true);
      } else {
        setPendingAutoPunchOutReport(null);
      }
      if (setRes.status === 'fulfilled' && setRes.value.data?.settings) {
        const s = setRes.value.data.settings;
        setWorkHoursPolicy({
          fullDayThresholdHours: s.fullDayThresholdHours ?? s.defaultRequiredHours ?? 8,
          halfDayThresholdHours: s.halfDayThresholdHours ?? 4
        });
      }
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  // Filter unacknowledged notices (never popup or banner if already read/acknowledged)
  const unacknowledgedNotices = broadcasts.filter((b) => !b.isAcknowledged);
  const activeNotice = unacknowledgedNotices[0];

  // Auto-open modal for Urgent unacknowledged notice
  useEffect(() => {
    if (activeNotice && activeNotice.priority === 'Urgent') {
      const dismissed = sessionStorage.getItem(`notice_dismissed_${activeNotice._id}`);
      if (!dismissed && !showNoticeModal) {
        setSelectedNotice(activeNotice);
        setShowNoticeModal(true);
      }
    }
  }, [activeNotice]);

  const handleAcknowledgeNotice = async (noticeId) => {
    setAcknowledgingId(noticeId);
    try {
      await api.post(`/broadcasts/${noticeId}/acknowledge`);
      setBroadcasts((prev) =>
        prev.map((b) => (b._id === noticeId ? { ...b, isAcknowledged: true } : b))
      );
      if (selectedNotice?._id === noticeId) {
        setShowNoticeModal(false);
        setSelectedNotice(null);
      }
    } catch (err) {
      console.error('Failed to acknowledge notice:', err);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: nextStatus });
      fetchHomeData();
    } catch (err) {
      console.error(err);
    }
  };

  const emp = user?.employee;
  const fullName = emp?.fullName || 'Rahul Sharma';
  const displayInitials = emp?.fullName
    ? emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)
    : 'RS';

  const isWorking = attendance?.punchIn && !attendance?.punchOut;
  const isPunchedOut = attendance?.punchIn && attendance?.punchOut;

  // Working hours target details
  const fullDayHrs = workHoursPolicy.fullDayThresholdHours || 8;
  const halfDayHrs = workHoursPolicy.halfDayThresholdHours || 4;

  // Live Real-Time Working Hours Timer
  const [liveWorkingHours, setLiveWorkingHours] = useState('00:00');

  useEffect(() => {
    const calculateWorkingHours = () => {
      if (attendance?.punchIn && !attendance?.punchOut) {
        const punchInTime = new Date(attendance.punchIn).getTime();
        const now = Date.now();
        const diffMs = Math.max(0, now - punchInTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setLiveWorkingHours(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      } else if (attendance?.punchIn && attendance?.punchOut) {
        if (attendance.workingHoursFormatted && attendance.workingHoursFormatted !== '0:00') {
          setLiveWorkingHours(attendance.workingHoursFormatted);
        } else {
          const diffMs = Math.max(0, new Date(attendance.punchOut).getTime() - new Date(attendance.punchIn).getTime());
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setLiveWorkingHours(`${hours}:${String(minutes).padStart(2, '0')}`);
        }
      } else {
        setLiveWorkingHours('00:00');
      }
    };

    calculateWorkingHours();
    const timer = setInterval(calculateWorkingHours, 1000);
    return () => clearInterval(timer);
  }, [attendance]);

  const displayTasks = tasks.slice(0, 4);
  const totalTasksCount = tasks.length;

  if (loading) {
    return <HomeShimmer />;
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto sm:max-w-2xl lg:max-w-4xl pb-6">
      {/* Active Unacknowledged Notice Highlight Banner */}
      {activeNotice && (
        <div
          className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 text-white transition-all duration-300 shadow-xl ${
            activeNotice.priority === 'Urgent'
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 ring-4 ring-rose-500/30 shadow-rose-500/25'
              : activeNotice.priority === 'High'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 ring-4 ring-amber-400/30 shadow-amber-500/25'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 ring-4 ring-indigo-500/20 shadow-blue-500/20'
          }`}
        >
          {/* Subtle animated background shine */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            {/* Top Row: Category, Priority Badge, Date */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                    activeNotice.priority === 'Urgent'
                      ? 'bg-white text-rose-700 animate-pulse'
                      : activeNotice.priority === 'High'
                      ? 'bg-white text-amber-800'
                      : 'bg-white text-blue-700'
                  }`}
                >
                  {activeNotice.priority === 'Urgent' && <Flame className="w-3.5 h-3.5 text-rose-600 animate-bounce" />}
                  {activeNotice.priority === 'High' && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                  {activeNotice.priority === 'Normal' && <Megaphone className="w-3.5 h-3.5 text-blue-600" />}
                  {activeNotice.priority === 'Urgent' ? 'Urgent Action Required' : `${activeNotice.priority} Notice`}
                </span>

                {activeNotice.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs">
                    {activeNotice.category}
                  </span>
                )}

                {activeNotice.targetType === 'SPECIFIC' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                    Direct Message
                  </span>
                )}
              </div>

              <div className="text-[11px] text-white/80 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date(activeNotice.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Middle: Title & Message Excerpt */}
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                {activeNotice.title}
              </h2>
              <p className="text-xs text-white/90 font-medium mt-1 line-clamp-2 leading-relaxed">
                {activeNotice.message}
              </p>
            </div>

            {/* Bottom: Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/20">
              <span className="text-[11px] text-white/70 italic font-medium">
                {unacknowledgedNotices.length > 1
                  ? `+${unacknowledgedNotices.length - 1} more unread notices on Notice Board`
                  : 'Official directive requiring your acknowledgement'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotice(activeNotice);
                    setShowNoticeModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Read Full Notice</span>
                </button>

                <button
                  type="button"
                  disabled={acknowledgingId === activeNotice._id}
                  onClick={() => handleAcknowledgeNotice(activeNotice._id)}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-white text-slate-900 hover:bg-slate-100 shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                  <span>{acknowledgingId === activeNotice._id ? 'Saving...' : 'Acknowledge'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missing Daily Report Attention Banner (Auto Punch-Out) */}
      {pendingAutoPunchOutReport && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-3.5 sm:p-4 rounded-3xl shadow-md flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                  Work Report Required
                </span>
                <span className="text-[11px] text-amber-100 font-semibold">
                  {formatDateIST(pendingAutoPunchOutReport.date)}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                Auto punched-out: You forgot to punch out on this day. Please submit your daily report.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMissingReportModal(true)}
            className="px-4 py-2 bg-white text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-black shadow-sm shrink-0 transition cursor-pointer"
          >
            Write Report
          </button>
        </div>
      )}

      {/* Holiday Announcement Banner (If Today is a Holiday) */}
      {attendance?.isHoliday && (
        <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <PartyPopper className="w-4 h-4 text-yellow-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                Holiday Announcement
              </span>
              <p className="text-xs font-bold text-white truncate mt-0.5">
                Today is {attendance.holiday?.name || 'Company Holiday'} 🎉
              </p>
              <p className="text-[11px] text-teal-100">
                Paid holiday. If you punch in today, attendance is logged as "Working on Holiday".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Top Greeting Card matching Screenshot */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs flex items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] shrink-0">
            <div className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-full overflow-hidden shadow-xs border-2 border-white ring-2 ring-slate-100 bg-slate-900 flex items-center justify-center">
              {emp?.profilePicture ? (
                <img
                  src={emp.profilePicture}
                  alt={fullName}
                  className="w-full h-full min-w-full min-h-full max-w-full max-h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-base">
                  {displayInitials}
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full z-10" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-400 font-medium block leading-tight">Good Morning,</span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5 truncate">
              {fullName} 👋
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-normal truncate">Have a productive day!</p>
          </div>
        </div>
      </div>

      {/* 2. Daily Working Hours Card */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        {/* Working Hours Details Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block leading-tight">Daily Working Hours</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {fullDayHrs} hrs Full Day • {halfDayHrs} hrs Half Day
              </span>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-slate-100 text-slate-600 font-semibold rounded-xl">
            Hours-Based
          </span>
        </div>

        {/* Big Rounded Pill Button: PUNCH IN / PUNCH OUT */}
        {!attendance?.punchIn ? (
          <button
            onClick={() => setShowPunchInModal(true)}
            className="w-full py-3.5 px-6 bg-[#00ab55] hover:bg-[#00964b] active:scale-[0.99] text-white font-extrabold text-sm rounded-full shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <span className="tracking-wider text-sm sm:text-base font-black text-white">PUNCH IN</span>
            <ArrowRight className="w-5 h-5 text-white shrink-0" />
          </button>
        ) : isWorking ? (
          <button
            onClick={() => setShowPunchOutModal(true)}
            className="w-full py-3.5 px-6 bg-[#f59e0b] hover:bg-[#d97706] active:scale-[0.99] text-white font-extrabold text-sm rounded-full shadow-lg shadow-amber-500/20 transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <span className="tracking-wider text-sm sm:text-base font-black text-white">PUNCH OUT</span>
            <ArrowRight className="w-5 h-5 text-white shrink-0" />
          </button>
        ) : (
          <div className="w-full py-3 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs sm:text-sm rounded-2xl text-center flex items-center justify-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Work Session Completed ({formatWorkingHours(attendance)} recorded)</span>
          </div>
        )}
      </div>

      {/* 3. 4-Card Quick Metrics Grid (2x2 on mobile, 4 columns on lg) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tasks */}
        <Link
          to="/employee/tasks"
          className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600 block">Tasks</span>
            <div className="text-2xl font-black text-blue-600 leading-tight mt-1">
              {pendingTasksCount}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Pending</span>
          </div>
        </Link>

        {/* Card 2: Leave Taken This Month */}
        <Link
          to="/employee/leave"
          className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs flex flex-col justify-between hover:border-rose-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600 block">Leave</span>
            <div className="text-2xl font-black text-rose-500 leading-tight mt-1">
              {leavesTakenThisMonth}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Taken This Month</span>
          </div>
        </Link>

        {/* Card 3: Attendance */}
        <Link
          to="/employee/attendance"
          className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <CalendarCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600 block">Attendance</span>
            <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight mt-1">
              Today
            </div>
            <span className={`text-[11px] font-medium block mt-0.5 ${
              attendance?.punchIn ? 'text-emerald-600 font-bold' : 'text-slate-400'
            }`}>
              {attendance?.punchIn ? (attendance.status || 'Present') : 'Not Marked'}
            </span>
          </div>
        </Link>

        {/* Card 4: Working Hours */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs flex flex-col justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-600 block">Working Hours</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mt-1">
              {liveWorkingHours}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Today</span>
          </div>
        </div>
      </div>

      {/* 4. Today's Tasks (3) Section matching Screenshot */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Today's Tasks ({totalTasksCount})
          </h2>
          <Link
            to="/employee/tasks"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            View All
          </Link>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {displayTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-400 space-y-1">
              <ClipboardList className="w-7 h-7 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No tasks created yet</p>
              <Link to="/employee/tasks" className="text-xs text-blue-600 font-bold hover:underline inline-block">
                + Add your first task
              </Link>
            </div>
          ) : (
            displayTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const priorityClass =
              task.priority === 'High'
                ? 'bg-rose-50 text-rose-500'
                : task.priority === 'Medium'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-blue-50 text-blue-500';

            return (
              <div
                key={task._id}
                className="flex items-center justify-between gap-3 py-1 text-xs"
              >
                {/* Left: Blue vertical bar + Checkbox + Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Blue vertical accent bar */}
                  <span className="w-1 h-5 rounded-full bg-blue-500 shrink-0" />

                  {/* Circular Checkbox */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!task.isDemo) {
                        handleToggleTaskStatus(task._id, task.status);
                      }
                    }}
                    className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                      isCompleted
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 hover:border-blue-400 bg-white'
                    }`}
                  >
                    {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>

                  {/* Task Title */}
                  <span
                    className={`truncate font-medium text-xs ${
                      isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Right: Priority pill + "Today" */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${priorityClass}`}>
                    {task.priority || 'Medium'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Today
                  </span>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* 5. Active Reminders Widget (If any) */}
      {activeReminders.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlarmClock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Active Reminders ({activeReminders.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Scheduled Alerts</span>
          </div>

          <div className="space-y-2">
            {activeReminders.slice(0, 3).map((rem) => (
              <div key={rem._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                      {rem.type}
                    </span>
                    <span className="font-bold text-slate-900 truncate">{rem.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>Due: {new Date(rem.remindAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {rem.priority && (
                      <span className={`font-bold ${rem.priority === 'High' ? 'text-rose-500' : 'text-slate-500'}`}>
                        • {rem.priority} Priority
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.patch(`/reminders/${rem._id}/status`, { status: 'Completed' });
                      fetchHomeData();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-xl font-bold text-xs shrink-0 transition cursor-pointer"
                >
                  ✓ Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Upcoming Holidays Widget */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Upcoming Holidays
            </h2>
          </div>
          <Link
            to="/employee/holidays"
            className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingHolidays.length === 0 ? (
          <p className="text-xs text-slate-400 py-2 italic text-center">
            No upcoming company holidays in the next 30 days.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {upcomingHolidays.slice(0, 4).map((hol) => {
              const displayDate = hol.startDate || hol.date;
              return (
                <Link
                  key={hol._id || hol.name + hol.date}
                  to="/employee/holidays"
                  className="p-3 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-2xl border border-emerald-100/80 hover:border-emerald-300 transition flex items-center gap-3 text-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <span className="text-xs leading-none">
                      {displayDate ? displayDate.split('-')[2] : '01'}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider leading-none mt-0.5">
                      {displayDate
                        ? new Date(displayDate + 'T12:00:00+05:30').toLocaleDateString('en-US', { month: 'short' })
                        : ''}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate leading-tight">
                      {hol.name}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1.5 truncate">
                      {hol.isMultiDay && (
                        <>
                          <span className="font-bold">{hol.totalDays} Days</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{hol.type.replace(' Holiday', '')}</span>
                      <span>•</span>
                      <span>100% Paid</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals for Punch In and Punch Out */}
      <PunchInModal
        isOpen={showPunchInModal}
        onClose={() => setShowPunchInModal(false)}
        onSuccess={() => {
          setShowPunchInModal(false);
          fetchHomeData();
        }}
      />

      <PunchOutModal
        isOpen={showPunchOutModal}
        onClose={() => setShowPunchOutModal(false)}
        onSuccess={() => {
          setShowPunchOutModal(false);
          fetchHomeData();
        }}
      />

      <MissingDailyReportModal
        isOpen={showMissingReportModal}
        onClose={() => setShowMissingReportModal(false)}
        pendingSession={pendingAutoPunchOutReport}
        onSuccess={() => {
          setShowMissingReportModal(false);
          fetchHomeData();
        }}
      />

      {/* Notice Detail & Acknowledge Modal */}
      {showNoticeModal && selectedNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header with Priority Gradient */}
            <div
              className={`px-6 py-4.5 text-white flex items-center justify-between ${
                selectedNotice.priority === 'Urgent'
                  ? 'bg-gradient-to-r from-red-600 to-rose-700'
                  : selectedNotice.priority === 'High'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                  : 'bg-gradient-to-r from-slate-900 to-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Official Company Notice
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {selectedNotice.sender?.fullName || 'HR Administration'} •{' '}
                    {new Date(selectedNotice.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(`notice_dismissed_${selectedNotice._id}`, 'true');
                  setShowNoticeModal(false);
                }}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    selectedNotice.priority === 'Urgent'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : selectedNotice.priority === 'High'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {selectedNotice.priority} Priority
                </span>

                {selectedNotice.category && (
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                    {selectedNotice.category}
                  </span>
                )}

                {selectedNotice.targetType === 'SPECIFIC' && (
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Direct Message to You
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  {selectedNotice.title}
                </h2>
                <div className="mt-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedNotice.message}
                </div>
              </div>

              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Acknowledging this circular confirms that you have reviewed the details. Once acknowledged, it will no longer pop up on your home screen.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(`notice_dismissed_${selectedNotice._id}`, 'true');
                  setShowNoticeModal(false);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close & Read Later
              </button>

              <button
                type="button"
                disabled={acknowledgingId === selectedNotice._id}
                onClick={() => handleAcknowledgeNotice(selectedNotice._id)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{acknowledgingId === selectedNotice._id ? 'Acknowledging...' : 'I Have Read & Acknowledge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
