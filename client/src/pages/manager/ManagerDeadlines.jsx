import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  User,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Flame,
  X
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer } from '../../components/common/Shimmer';

export default function ManagerDeadlines() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('missed'); // 'missed' | 'approaching'
  const [search, setSearch] = useState('');

  // Extend Modal
  const [extendTask, setExtendTask] = useState(null);
  const [extendDueDate, setExtendDueDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  const fetchDeadlines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/manager/deadlines');
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load deadlines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const handleExtendSubmit = async () => {
    if (!extendTask || !extendDueDate) return;
    setExtendSubmitting(true);
    try {
      const res = await api.put(`/manager/tasks/${extendTask._id}`, {
        dueDate: extendDueDate,
        extensionReason: extendReason
      });
      if (res.data?.success) {
        setExtendTask(null);
        setExtendDueDate('');
        setExtendReason('');
        fetchDeadlines();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to extend deadline');
    } finally {
      setExtendSubmitting(false);
    }
  };

  const formatDateTime = dateStr => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const counts = data?.counts || {
    totalTracked: 0,
    missedCount: 0,
    approachingCount: 0,
    onTimeCount: 0
  };

  const missedDeadlines = (data?.missedDeadlines || []).filter(item => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.task?.title?.toLowerCase().includes(query) ||
      item.student?.fullName?.toLowerCase().includes(query) ||
      item.student?.employeeId?.toLowerCase().includes(query)
    );
  });

  const approachingDeadlines = (data?.approachingDeadlines || []).filter(item => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.task?.title?.toLowerCase().includes(query) ||
      item.student?.fullName?.toLowerCase().includes(query) ||
      item.student?.employeeId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Clock className="w-6 h-6 text-purple-600" /> Deadline Tracker & Delay Monitor
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time tracking of missed deadlines, overdue tasks, delay durations, and approaching deadlines across all assigned students.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Missed Deadlines */}
        <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Missed / Overdue</span>
            <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {loading ? '...' : counts.missedCount}
          </div>
          <div className="text-[10px] text-rose-600">Requires manager attention</div>
        </div>

        {/* Approaching */}
        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Approaching Due Date</span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {loading ? '...' : counts.approachingCount}
          </div>
          <div className="text-[10px] text-amber-600">Active deadlines within window</div>
        </div>

        {/* On-Time Completed */}
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Delivered On-Time</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            {loading ? '...' : counts.onTimeCount}
          </div>
          <div className="text-[10px] text-emerald-600">Successfully met schedule</div>
        </div>

        {/* Total Monitored */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tracked</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : counts.totalTracked}
          </div>
          <div className="text-[10px] text-slate-500">Tasks with scheduled deadlines</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('missed')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'missed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Missed Deadlines ({counts.missedCount})
          </button>
          <button
            onClick={() => setActiveTab('approaching')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'approaching'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Approaching Deadlines ({counts.approachingCount})
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or task..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <TableShimmer rows={5} cols={5} />
      ) : activeTab === 'missed' ? (
        /* Missed Deadlines List */
        missedDeadlines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Missed Deadlines!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All assigned students are currently on schedule. No overdue tasks or late submissions found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {missedDeadlines.map((item, idx) => {
              const task = item.task;
              const student = item.student;
              const isLateSubmission = item.isSubmittedLate;

              return (
                <div
                  key={task?._id || idx}
                  className="bg-white rounded-2xl border border-rose-200 p-4 sm:p-5 hover:shadow-xs transition space-y-3.5 bg-rose-50/15"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{task?.title}</span>
                        {isLateSubmission ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                            Submitted Late
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-rose-600 text-white">
                          DELAY: {item.delayFormatted}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{task?.description || 'No description provided'}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setExtendTask(task);
                          if (task?.dueDate) {
                            const d = new Date(task.dueDate);
                            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                            setExtendDueDate(d.toISOString().slice(0, 16));
                          }
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Extend Deadline
                      </button>
                    </div>
                  </div>

                  {/* Student & Deadline Breakdown Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-slate-200/80 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Assigned Student</div>
                      <div className="font-bold text-slate-800 mt-0.5">{student?.fullName || '—'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {student?.employeeId} • {student?.department}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Scheduled Deadline</div>
                      <div className="font-bold text-slate-800 font-mono mt-0.5">
                        {formatDateTime(item.dueDate)}
                      </div>
                      <div className="text-[10px] text-slate-500">Original target completion</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        {isLateSubmission ? 'Actual Submission' : 'Current Status'}
                      </div>
                      <div className="font-bold text-rose-700 font-mono mt-0.5">
                        {isLateSubmission ? formatDateTime(item.submittedAt) : `Overdue by ${item.delayHours} hrs`}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isLateSubmission ? 'Turned in after deadline' : 'Not submitted yet'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Approaching Deadlines List */
        approachingDeadlines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Approaching Deadlines</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no pending tasks with approaching due dates in the current tracking queue.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {approachingDeadlines.map((item, idx) => {
              const task = item.task;
              const student = item.student;
              const isUrgent = item.isUrgent;

              return (
                <div
                  key={task?._id || idx}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 hover:shadow-xs transition space-y-3.5 ${
                    isUrgent ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{task?.title}</span>
                        {isUrgent ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due Soon ({item.remainingFormatted})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {item.remainingFormatted}
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600">
                          {task?.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{task?.description || 'No description provided'}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setExtendTask(task);
                          if (task?.dueDate) {
                            const d = new Date(task.dueDate);
                            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                            setExtendDueDate(d.toISOString().slice(0, 16));
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Adjust Deadline
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Student</div>
                      <div className="font-bold text-slate-800 mt-0.5">{student?.fullName || '—'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {student?.employeeId} • {student?.department}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Deadline</div>
                      <div className="font-bold text-slate-800 font-mono mt-0.5">
                        {formatDateTime(item.dueDate)}
                      </div>
                      <div className="text-[10px] text-slate-500">{item.remainingFormatted}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* EXTEND DEADLINE MODAL */}
      {extendTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Extend / Adjust Deadline</h3>
                  <p className="text-xs text-slate-500">{extendTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setExtendTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-slate-500">Current Deadline:</div>
              <div className="font-bold text-slate-800 font-mono">
                {formatDateTime(extendTask.dueDate)}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                New Deadline (Date & Time) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={extendDueDate}
                onChange={e => setExtendDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-mono font-medium"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Extension</label>
              <textarea
                rows={2}
                placeholder="e.g. Granted 48h extension after manager review..."
                value={extendReason}
                onChange={e => setExtendReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExtendTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtendSubmit}
                disabled={extendSubmitting || !extendDueDate}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
              >
                {extendSubmitting ? 'Updating...' : 'Save New Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
