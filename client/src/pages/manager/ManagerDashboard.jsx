import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  Flame,
  Calendar,
  Eye,
  Check,
  FileText
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer, CardListShimmer } from '../../components/common/Shimmer';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/manager/dashboard');
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {
    totalStudents: 0,
    totalTasks: 0,
    activeTasks: 0,
    submittedTasks: 0,
    completedTasks: 0,
    missedDeadlines: 0,
    onTimeRate: 100
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-purple-600" /> Manager Control Panel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track your assigned students, manage task deadlines, monitor overdue work, and maintain complete task history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/manager/tasks?action=create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Assign New Task
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Assigned Students */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Students</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : metrics.totalStudents}
          </div>
          <div className="text-[10px] text-slate-500">Active students in your cohort</div>
        </div>

        {/* Card 2: Active Tasks */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Tasks</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">
            {loading ? '...' : metrics.activeTasks}
          </div>
          <div className="text-[10px] text-slate-500">In Progress / New assignments</div>
        </div>

        {/* Card 3: Pending Reviews */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Submissions</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {loading ? '...' : metrics.submittedTasks}
          </div>
          <div className="text-[10px] text-slate-500">Submitted awaiting your review</div>
        </div>

        {/* Card 4: Missed Deadlines */}
        <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-2xs space-y-2 bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Missed Deadlines</span>
            <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {loading ? '...' : metrics.missedDeadlines}
          </div>
          <div className="text-[10px] text-rose-600 font-semibold">Overdue / delayed deliveries</div>
        </div>

        {/* Card 5: On-Time Rate */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On-Time Rate</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {loading ? '...' : `${metrics.onTimeRate}%`}
          </div>
          <div className="text-[10px] text-slate-500">Cohort deadline completion score</div>
        </div>
      </div>

      {/* Missed Deadlines Alert Banner if any */}
      {metrics.missedDeadlines > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Attention Needed:</span> {metrics.missedDeadlines} task deadline(s) have been missed by assigned students.
            </div>
          </div>
          <Link
            to="/manager/deadlines"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shrink-0"
          >
            Review Missed Deadlines <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Grid: Pending Reviews + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Submissions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Submissions Pending Review
            </h3>
            <Link to="/manager/tasks?status=Submitted" className="text-xs text-purple-600 hover:underline font-semibold">
              View all
            </Link>
          </div>

          {loading ? (
            <CardListShimmer count={3} />
          ) : (data?.recentSubmissions?.length || 0) === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No tasks currently waiting for review.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.recentSubmissions.map((task) => (
                <div
                  key={task._id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{task.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Submitted by: <strong className="text-purple-700">{task.employee?.fullName}</strong> ({task.employee?.employeeId})
                    </div>
                  </div>
                  <Link
                    to={`/manager/tasks?review=${task._id}`}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] transition shrink-0"
                  >
                    Review Work
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Upcoming Deadlines
            </h3>
            <Link to="/manager/deadlines" className="text-xs text-purple-600 hover:underline font-semibold">
              Tracker
            </Link>
          </div>

          {loading ? (
            <CardListShimmer count={3} />
          ) : (data?.upcomingDeadlines?.length || 0) === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No upcoming task deadlines scheduled.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.upcomingDeadlines.map((task) => {
                const due = new Date(task.dueDate);
                return (
                  <div
                    key={task._id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{task.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {task.employee?.fullName} • Due: {due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assigned Students Performance Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" /> Assigned Students Overview
          </h3>
          <Link to="/manager/students" className="text-xs text-purple-600 hover:underline font-semibold">
            Manage all students
          </Link>
        </div>

        {loading ? (
          <TableShimmer cols={6} rows={3} />
        ) : (data?.studentStats?.length || 0) === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No students currently assigned to your manager profile by Admin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Active Tasks</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Missed Deadlines</th>
                  <th className="py-3 px-4">On-Time Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.studentStats.map((st) => (
                  <tr key={st._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{st.fullName}</span>
                        {st.isActiveNow ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-purple-600">{st.employeeId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{st.department}</td>
                    <td className="py-3 px-4 font-bold text-blue-600">{st.activeTasks}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{st.completedTasks}</td>
                    <td className="py-3 px-4 font-bold">
                      {st.missedDeadlines > 0 ? (
                        <span className="text-rose-600">❌ {st.missedDeadlines}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.onTimeRate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        st.onTimeRate >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {st.onTimeRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/manager/tasks?action=create&studentId=${st._id}`}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[10px] transition"
                        >
                          Assign Task
                        </Link>
                        <Link
                          to={`/manager/history?studentId=${st._id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] transition"
                        >
                          History
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
