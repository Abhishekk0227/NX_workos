import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  ClipboardList,
  CalendarOff,
  CalendarCheck,
  FileText,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Megaphone,
  UserCheck,
  Check,
  Pin,
  ShieldAlert
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PunchInModal from '../../components/modals/PunchInModal';
import PunchOutModal from '../../components/modals/PunchOutModal';

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState({ clBalance: 6, slBalance: 4, lwpCount: 0 });
  const [tasks, setTasks] = useState([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(5);
  const [broadcasts, setBroadcasts] = useState([]);
  const [activeNoticeIndex, setActiveNoticeIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPunchInModal, setShowPunchInModal] = useState(false);
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [attRes, balRes, taskRes, broadRes] = await Promise.allSettled([
        api.get('/attendance/today'),
        api.get('/leaves/balance'),
        api.get('/tasks/my'),
        api.get('/broadcasts/active')
      ]);

      if (attRes.status === 'fulfilled') {
        setAttendance(attRes.value.data.attendance);
      }
      if (balRes.status === 'fulfilled') {
        setLeaveBalances(balRes.value.data.balances || { clBalance: 6, slBalance: 4, lwpCount: 0 });
      }
      if (taskRes.status === 'fulfilled') {
        const pTasks = taskRes.value.data.personalTasks || [];
        const hTasks = taskRes.value.data.hrAssignedTasks || [];
        const combined = [...pTasks, ...hTasks];
        setTasks(combined);
        setPendingTasksCount(combined.filter(t => t.status !== 'Completed').length);
      }
      if (broadRes.status === 'fulfilled') {
        setBroadcasts(broadRes.value.data.broadcasts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleAcknowledge = async (broadcastId) => {
    try {
      await api.post(`/broadcasts/${broadcastId}/acknowledge`);
      setBroadcasts(prev =>
        prev.map(b => (b._id === broadcastId ? { ...b, isAcknowledged: true } : b))
      );
    } catch (err) {
      console.error(err);
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

  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const emp = user?.employee;
  const firstName = emp?.fullName ? emp.fullName.split(' ')[0] : 'Rahul';

  const isWorking = attendance?.punchIn && !attendance?.punchOut;
  const isPunchedOut = attendance?.punchIn && attendance?.punchOut;

  // Live Real-Time Working Hours Timer
  const [liveWorkingHours, setLiveWorkingHours] = useState('00:00');

  useEffect(() => {
    const calculateWorkingHours = () => {
      if (attendance?.punchIn && !attendance?.punchOut) {
        // Shift is currently running -> calculate live elapsed time
        const punchInTime = new Date(attendance.punchIn).getTime();
        const now = Date.now();
        const diffMs = Math.max(0, now - punchInTime);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setLiveWorkingHours(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      } else if (attendance?.punchIn && attendance?.punchOut) {
        // Shift is finished -> display actual completed hours
        if (attendance.actualWorkingHours) {
          const totalMinutes = Math.round(attendance.actualWorkingHours * 60);
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          setLiveWorkingHours(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        } else {
          const diffMs = Math.max(0, new Date(attendance.punchOut).getTime() - new Date(attendance.punchIn).getTime());
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setLiveWorkingHours(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        }
      } else {
        // Not punched in yet
        setLiveWorkingHours('00:00');
      }
    };

    calculateWorkingHours();
    const timer = setInterval(calculateWorkingHours, 1000);
    return () => clearInterval(timer);
  }, [attendance]);

  const todaySchedule = [
    { time: '10:00 AM', label: 'Shift Start', isKey: true },
    { time: '10:00 AM – 12:00 PM', label: 'Client meeting (Online)' },
    { time: '12:00 PM – 1:00 PM', label: 'Content Update' },
    { time: '1:00 PM – 2:00 PM', label: 'Lunch Break' },
    { time: '2:00 PM – 3:00 PM', label: 'Team Meeting' },
    { time: '3:00 PM – 6:00 PM', label: 'Work & Reports' },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Mobile & Desktop Greeting Row matching EppanelM.png #1 */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            {emp?.profilePicture ? (
              <img
                src={emp.profilePicture}
                alt={emp.fullName || 'User'}
                className="w-12 h-12 rounded-full object-cover shadow-xs border-2 border-white ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                {emp?.fullName ? emp.fullName.split(' ').map(n => n[0]).join('') : 'RS'}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block leading-tight">Good Morning,</span>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              {emp?.fullName || 'Rahul Sharma'} 👋
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Have a productive day!</p>
          </div>
        </div>

        <div className="hidden sm:flex px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 shadow-2xs items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{todayDateString}</span>
        </div>
      </div>



      {/* 2. Today's Shift Card matching EppanelM.png #1 */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block leading-tight">Today's Shift</span>
              <span className="text-sm sm:text-base font-bold text-slate-900">10:00 AM – 6:00 PM</span>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold rounded-lg">
            General Shift
          </span>
        </div>

        {!attendance?.punchIn ? (
          <button
            onClick={() => setShowPunchInModal(true)}
            className="w-full py-3 sm:py-3.5 px-4 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>PUNCH IN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : isWorking ? (
          <button
            onClick={() => setShowPunchOutModal(true)}
            className="w-full py-3 sm:py-3.5 px-4 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>PUNCH OUT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-full py-2.5 px-3 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Shift Completed ({attendance?.actualWorkingHours || 8}h)</span>
          </div>
        )}
      </div>

      {/* 3. 4-Card Quick Metrics (2x2 on mobile, 4 columns on lg) matching EppanelM.png #1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tasks */}
        <Link
          to="/employee/tasks"
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium">Tasks</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {pendingTasksCount} <span className="text-xs font-normal text-slate-400">Pending</span>
            </div>
          </div>
        </Link>

        {/* Card 2: Leave */}
        <Link
          to="/employee/leave"
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-rose-300 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2">
            <CalendarOff className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium">Leave</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {leaveBalances.clBalance + leaveBalances.slBalance}{' '}
              <span className="text-xs font-normal text-slate-400">Balance</span>
            </div>
          </div>
        </Link>

        {/* Card 3: Attendance */}
        <Link
          to="/employee/attendance"
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium">Attendance</span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
              <span className="text-slate-400 font-normal">Today </span>
              {attendance?.punchIn ? (
                <span className="text-emerald-600 font-bold">{attendance.status || 'Present'}</span>
              ) : (
                <span className="text-rose-600 font-bold">Not Marked</span>
              )}
            </div>
          </div>
        </Link>

        {/* Card 4: Working Hours */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            {isWorking && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live
              </span>
            )}
            {isPunchedOut && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                Done
              </span>
            )}
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium">Working Hours</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 flex items-baseline gap-1">
              <span>{liveWorkingHours}</span>
              <span className="text-xs font-normal text-slate-400">Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Today's Tasks List matching EppanelM.png Screen 1 */}
      <div className="lg:hidden bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Today's Tasks ({tasks.length})
          </h2>
          <Link to="/employee/tasks" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            View All
          </Link>
        </div>

        <div className="space-y-2.5">
          {tasks.slice(0, 4).map((task) => (
            <div
              key={task._id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-1 h-5 rounded-full ${
                  task.priority === 'High' ? 'bg-rose-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {task.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  task.priority === 'High'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : task.priority === 'Medium'
                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  {task.priority}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Today
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Middle 3-Column Section (Desktop only - EppanelD.png) */}
      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Today's Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Today's Tasks</h3>
              <Link to="/employee/tasks" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {tasks.slice(0, 4).map((t) => {
                const isCompleted = t.status === 'Completed';
                return (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-slate-50 transition"
                  >
                    <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => handleToggleTaskStatus(t._id, t.status)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={`text-xs truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                        {t.title}
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.priority === 'High'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : t.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {t.priority || 'Medium'}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        {t.dueDate ? new Date(t.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            to="/employee/tasks"
            className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-blue-600 font-semibold hover:text-blue-800 block"
          >
            Manage All Tasks →
          </Link>
        </div>

        {/* Column 2: Today's Schedule Timeline (Matching EppanelD.png #1) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Today's Schedule</h3>
            <span className="text-[11px] text-slate-400 font-medium">8h shift</span>
          </div>

          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
            {todaySchedule.map((item, idx) => (
              <div key={idx} className="relative flex items-start gap-2 text-xs">
                {/* Dot */}
                <div className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                  item.isKey ? 'bg-blue-600' : 'bg-blue-400'
                }`} />
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block leading-tight">
                    {item.time}
                  </span>
                  <span className="font-semibold text-slate-800 leading-tight">
                    {item.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Quick Actions (Matching EppanelD.png #1) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100">
              Quick Actions
            </h3>

            <div className="space-y-2.5">
              <Link
                to="/employee/tasks"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Task
              </Link>

              <Link
                to="/employee/leave"
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <CalendarOff className="w-4 h-4 text-blue-600" /> Apply for Leave
              </Link>

              <Link
                to="/employee/attendance"
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4 text-blue-600" /> View Attendance
              </Link>

              <Link
                to="/employee/leave"
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 text-blue-600" /> View Leave Balance
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            NX Work OS v1.0.0 • Connected
          </div>
        </div>
      </div>

      {/* Global Modals */}
      <PunchInModal
        isOpen={showPunchInModal}
        onClose={() => setShowPunchInModal(false)}
        onSuccess={() => fetchHomeData()}
      />

      <PunchOutModal
        isOpen={showPunchOutModal}
        onClose={() => setShowPunchOutModal(false)}
        onSuccess={() => fetchHomeData()}
        punchIn={attendance?.punchIn}
      />
    </div>
  );
}
