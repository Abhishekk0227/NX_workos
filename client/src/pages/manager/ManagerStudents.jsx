import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  FileText
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer, CardListShimmer } from '../../components/common/Shimmer';

export default function ManagerStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [studentHistoryData, setStudentHistoryData] = useState(null);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/manager/students');
      if (res.data?.success) {
        setStudents(res.data.students || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openStudentHistory = async (student) => {
    setSelectedStudentForHistory(student);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/manager/students/${student._id}/history`);
      if (res.data?.success) {
        setStudentHistoryData(res.data);
      }
    } catch (err) {
      console.error('Failed to load student history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredStudents = students.filter(st => {
    const q = search.toLowerCase();
    return (
      st.fullName?.toLowerCase().includes(q) ||
      st.employeeId?.toLowerCase().includes(q) ||
      st.officialEmail?.toLowerCase().includes(q) ||
      st.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-purple-600" /> Assigned Students
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Students and interns assigned to your managerial mentorship from the Admin Panel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Students Cards Grid */}
      {loading ? (
        <CardListShimmer count={4} />
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          No students found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((st) => (
            <div
              key={st._id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4 hover:border-purple-200 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{st.fullName}</h3>
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
                  <div className="font-mono text-xs text-purple-600 font-semibold">{st.employeeId}</div>
                  <div className="text-[11px] text-slate-500">{st.department} • {st.designation}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  st.onTimeRate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  st.onTimeRate >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {st.onTimeRate}% On-Time
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{st.officialEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{st.mobileNumber}</span>
                </div>
              </div>

              {/* Task Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Active</span>
                  <span className="font-black text-blue-600">{st.activeTasks || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Completed</span>
                  <span className="font-black text-emerald-600">{st.completedTasks || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Missed</span>
                  <span className={`font-black ${st.missedDeadlines > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {st.missedDeadlines || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => openStudentHistory(st)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" /> History
                </button>
                <Link
                  to={`/manager/tasks?action=create&studentId=${st._id}`}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign Task
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Task History Modal */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" /> Student Task History &amp; Deadlines
                </h3>
                <p className="text-[11px] text-slate-300">
                  {selectedStudentForHistory.fullName} ({selectedStudentForHistory.employeeId}) • {selectedStudentForHistory.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {historyLoading ? (
                <CardListShimmer count={3} />
              ) : !studentHistoryData?.tasks || studentHistoryData.tasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No tasks assigned to this student yet.
                </div>
              ) : (
                <>
                  {/* Summary Bar */}
                  <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 text-center">
                    <div>
                      <span className="text-purple-600 text-[10px] uppercase font-bold block">Total Tasks</span>
                      <strong className="text-base text-slate-900 font-mono">{studentHistoryData.metrics.totalTasks}</strong>
                    </div>
                    <div>
                      <span className="text-purple-600 text-[10px] uppercase font-bold block">Completed</span>
                      <strong className="text-base text-emerald-700 font-mono">{studentHistoryData.metrics.completedTasks}</strong>
                    </div>
                    <div>
                      <span className="text-purple-600 text-[10px] uppercase font-bold block">Missed Deadlines</span>
                      <strong className={`text-base font-mono ${studentHistoryData.metrics.missedDeadlines > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {studentHistoryData.metrics.missedDeadlines}
                      </strong>
                    </div>
                    <div>
                      <span className="text-purple-600 text-[10px] uppercase font-bold block">On-Time Score</span>
                      <strong className="text-base text-purple-700 font-mono">{studentHistoryData.metrics.onTimeRate}%</strong>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">All Assigned Tasks</h4>
                    {studentHistoryData.tasks.map((task) => {
                      const due = task.dueDate ? new Date(task.dueDate) : null;
                      const isOverdue = task.status === 'Overdue' || task.deadlineMissed || (due && due < new Date() && task.status !== 'Completed');

                      return (
                        <div
                          key={task._id}
                          className={`p-4 rounded-2xl border transition space-y-2.5 ${
                            isOverdue
                              ? 'bg-rose-50/30 border-rose-200'
                              : task.status === 'Completed'
                              ? 'bg-emerald-50/20 border-emerald-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{task.title}</div>
                              {task.description && (
                                <p className="text-slate-600 mt-1 line-clamp-2">{task.description}</p>
                              )}
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              task.status === 'Submitted' ? 'bg-purple-100 text-purple-800' :
                              task.status === 'Overdue' || isOverdue ? 'bg-rose-100 text-rose-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {task.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <div>
                              <strong>Deadline:</strong> {due ? due.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No deadline'}
                              {task.isSubmittedLate && (
                                <span className="ml-2 font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  ⚠️ Submitted Late
                                </span>
                              )}
                              {isOverdue && !task.isSubmittedLate && (
                                <span className="ml-2 font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  ❌ Missed Deadline
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-700">
                              Priority: <span className="text-purple-700">{task.priority}</span>
                            </div>
                          </div>

                          {/* Submission info if any */}
                          {task.submissionNote && (
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                              <div><strong>Student Note:</strong> {task.submissionNote}</div>
                              {task.submissionLink && (
                                <div>
                                  <strong>Link:</strong> <a href={task.submissionLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">{task.submissionLink}</a>
                                </div>
                              )}
                              {task.managerFeedback && (
                                <div className="text-purple-800 font-semibold pt-1 border-t border-slate-200/50">
                                  <strong>Manager Feedback:</strong> {task.managerFeedback}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
