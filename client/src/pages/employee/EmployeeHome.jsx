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
  ChevronRight
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PunchInModal from '../../components/modals/PunchInModal';
import PunchOutModal from '../../components/modals/PunchOutModal';

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState({ clBalance: 0, slBalance: 0, lwpCount: 0 });
  const [tasks, setTasks] = useState([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [broadcasts, setBroadcasts] = useState([]);
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
        setLeaveBalances(balRes.value.data.balances || { clBalance: 0, slBalance: 0, lwpCount: 0 });
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
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

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

  // Shift details
  const shiftName = emp?.assignedShift?.name || 'General Shift';
  const shiftTime = emp?.assignedShift?.startTime && emp?.assignedShift?.endTime
    ? `${emp.assignedShift.startTime} - ${emp.assignedShift.endTime}`
    : '10:00 AM - 6:00 PM';

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
        setLiveWorkingHours('00:00');
      }
    };

    calculateWorkingHours();
    const timer = setInterval(calculateWorkingHours, 1000);
    return () => clearInterval(timer);
  }, [attendance]);

  // Leave balance number (CL + SL available)
  const totalLeaveBalance = (leaveBalances?.clBalance || 0) + (leaveBalances?.slBalance || 0);

  const displayTasks = tasks.slice(0, 4);
  const totalTasksCount = tasks.length;

  return (
    <div className="space-y-4 max-w-lg mx-auto sm:max-w-2xl lg:max-w-4xl pb-6">
      {/* Active Broadcast Alert (If any) */}
      {broadcasts.length > 0 && (
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <Megaphone className="w-5 h-5 text-amber-300 shrink-0 animate-bounce" />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Notice
              </span>
              <p className="text-xs font-bold truncate mt-0.5">{broadcasts[0].title}</p>
            </div>
          </div>
          <Link
            to="/employee/notices"
            className="text-xs font-bold text-white underline shrink-0 hover:text-amber-200"
          >
            Read
          </Link>
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
                <div className="w-full h-full bg-linear-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-base">
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

      {/* 2. Today's Shift Card matching Screenshot */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
        {/* Shift Details Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium block leading-tight">Today's Shift</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {shiftTime}
              </span>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-slate-100 text-slate-600 font-semibold rounded-xl">
            {shiftName}
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
            <span>Shift Completed ({attendance?.actualWorkingHours || 8}h recorded)</span>
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

        {/* Card 2: Leave */}
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
              {totalLeaveBalance}
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Balance</span>
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
    </div>
  );
}
