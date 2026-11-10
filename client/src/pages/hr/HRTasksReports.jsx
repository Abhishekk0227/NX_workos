import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  X,
  UserCheck,
  Eye,
  Check,
  Mic,
  Tag,
  Trash2,
  ListChecks,
  RotateCcw
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer, CardListShimmer } from '../../components/common/Shimmer';
import { formatTime12 } from '../../utils/timeUtils';

export default function HRTasksReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || 'reports';
  const urlDate = searchParams.get('date');
  const urlStatus = searchParams.get('status') || 'New';

  const todayStr = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState(urlTab === 'tasks' ? 'tasks' : 'reports');

  // Reports state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportDate, setReportDate] = useState(urlDate || todayStr);
  const [reportEmpFilter, setReportEmpFilter] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedEmpFilter, setSelectedEmpFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(urlStatus);
  const [assigningTask, setAssigningTask] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'reports' || t === 'tasks') setActiveTab(t);
    const d = searchParams.get('date');
    if (d) setReportDate(d);
    const s = searchParams.get('status');
    if (s) setSelectedStatusFilter(s);
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    }, { replace: true });
  };

  const handleReportDateChange = (date) => {
    setReportDate(date);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('date', date);
      return p;
    }, { replace: true });
  };

  const handleTaskStatusChange = (status) => {
    setSelectedStatusFilter(status);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('status', status);
      return p;
    }, { replace: true });
  };

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    title: '',
    description: '',
    category: 'General',
    startDate: todayStr,
    dueDate: '',
    priority: 'Medium',
    subtasks: ['']
  });

  // Reassignment modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState(null);
  const [reassignEmployeeId, setReassignEmployeeId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees?status=Active');
      if (res.data?.success) {
        const empList = res.data.employees || [];
        setEmployees(empList);
        return empList;
      }
    } catch (err) {
      console.error('Failed to load active employees:', err);
    }
    return [];
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await api.get(`/reports?date=${reportDate}&employeeId=${reportEmpFilter}`);
      setReports(res.data?.reports || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await api.get(`/tasks?employeeId=${selectedEmpFilter}&status=${selectedStatusFilter}`);
      setTasks(res.data?.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTasksLoading(false);
    }
  };

  // Always fetch employees on mount so dropdown is always ready
  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else {
      fetchTasks();
    }
  }, [activeTab, reportDate, reportEmpFilter, selectedEmpFilter, selectedStatusFilter]);

  const openAssignModal = async () => {
    let empList = employees;
    if (!empList || empList.length === 0) {
      empList = await fetchEmployees();
    }
    setAssignForm({
      employeeId: empList.length > 0 ? empList[0]._id : '',
      title: '',
      description: '',
      category: 'General',
      startDate: todayStr,
      dueDate: '',
      priority: 'Medium',
      subtasks: ['']
    });
    setShowAssignModal(true);
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!assignForm.employeeId || !assignForm.title.trim() || assigningTask) {
      if (!assignForm.employeeId || !assignForm.title.trim()) {
        alert('Employee and task title are required');
      }
      return;
    }

    setAssigningTask(true);
    try {
      const cleanedSubtasks = (assignForm.subtasks || [])
        .map(s => s.trim())
        .filter(Boolean);

      const res = await api.post('/tasks/assign', {
        ...assignForm,
        subtasks: cleanedSubtasks
      });
      if (res.data?.success) {
        alert('Task assigned successfully!');
        setShowAssignModal(false);
        setAssignForm({
          employeeId: '',
          title: '',
          description: '',
          category: 'General',
          startDate: todayStr,
          dueDate: '',
          priority: 'Medium',
          subtasks: ['']
        });
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setAssigningTask(false);
    }
  };

  const openReassignModal = (task) => {
    setTaskToReassign(task);
    setReassignEmployeeId('');
    setReassignReason('');
    setShowReassignModal(true);
  };

  const handleReassignTask = async (e) => {
    e.preventDefault();
    if (!taskToReassign || !reassignEmployeeId || reassigning) return;
    setReassigning(true);
    try {
      const res = await api.patch(`/tasks/${taskToReassign._id}/reassign`, {
        newEmployeeId: reassignEmployeeId,
        reason: reassignReason
      });
      if (res.data?.success) {
        alert(res.data.message || 'Task reassigned successfully');
        setShowReassignModal(false);
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Reassignment failed');
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching hrpanelD.png #8 & HrpanelMui.png #9 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Tasks & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect server-verified punch-out work reports and manage operational directives
          </p>
        </div>

        <button
          onClick={openAssignModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex bg-slate-200/70 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => handleTabChange('reports')}
            className={`flex-1 md:flex-initial text-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Task Reports ({reports.length})
          </button>
          <button
            onClick={() => handleTabChange('tasks')}
            className={`flex-1 md:flex-initial text-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned Tasks
          </button>
        </div>

        {activeTab === 'reports' ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => handleReportDateChange(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
            />
            <select
              value={reportEmpFilter}
              onChange={(e) => setReportEmpFilter(e.target.value)}
              className="w-full sm:w-auto min-w-0 max-w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none truncate"
            >
              <option value="All">All Staff</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.fullName} ({e.employeeId})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <select
              value={selectedEmpFilter}
              onChange={(e) => setSelectedEmpFilter(e.target.value)}
              className="w-full sm:w-auto min-w-0 max-w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none truncate"
            >
              <option value="All">All Employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.fullName} ({e.employeeId})</option>
              ))}
            </select>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="New">New</option>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: DAILY TASK REPORTS (Mobile Cards + Desktop Table) */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {/* Mobile Cards Feed for Reports */}
          <div className="block md:hidden space-y-2.5">
            {reportsLoading ? (
              <CardListShimmer count={4} />
            ) : reports.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No daily work reports submitted for {reportDate}
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report._id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {report.employee?.fullName}
                      </div>
                      <div className="font-mono text-[10px] text-emerald-600 font-semibold">
                        {report.employee?.employeeId} • {report.employee?.department}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Submitted
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Key Work Summary</span>
                    {report.summaryBullets?.slice(0, 2).map((bullet, bIdx) => (
                      <div key={bIdx} className="text-slate-700 truncate flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{bullet}</span>
                      </div>
                    ))}
                    {report.summaryBullets?.length > 2 && (
                      <span className="text-[10px] text-blue-600 font-semibold block pt-0.5">
                        +{report.summaryBullets.length - 2} more tasks
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      {formatTime12(report.submittedAt)}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowReportModal(true);
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      View Report
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Reports Table */}
          {reportsLoading ? (
            <div className="hidden md:block">
              <TableShimmer cols={6} rows={6} />
            </div>
          ) : (
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Tasks Summary</th>
                  <th className="py-3.5 px-4">Submitted At</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No daily work reports submitted for {reportDate}
                    </td>
                  </tr>
                ) : (
                  reports.map((report, idx) => (
                    <tr key={report._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-slate-400 font-medium">{idx + 1}</td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {report.employee?.fullName}
                        </div>
                        <div className="font-mono text-[11px] text-emerald-600 font-semibold">
                          {report.employee?.employeeId}
                        </div>
                        <div className="text-[10px] text-slate-400">{report.employee?.department}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        <div className="space-y-1">
                          {report.summaryBullets?.slice(0, 2).map((bullet, bIdx) => (
                            <div key={bIdx} className="text-slate-700 truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">{bullet}</span>
                            </div>
                          ))}
                          {report.summaryBullets?.length > 2 && (
                            <span className="text-[10px] text-blue-600 font-semibold">
                              +{report.summaryBullets.length - 2} more accomplishments
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatTime12(report.submittedAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Submitted
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setShowReportModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )}

      {/* TAB 2: ASSIGNED TASKS TABLE */}
      {activeTab === 'tasks' && (
        tasksLoading ? (
          <TableShimmer cols={6} rows={6} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Task Details</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Progress & Checklist</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No assigned tasks found
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const completedSubs = task.subtasks?.filter(s => s.isCompleted).length || 0;
                    const totalSubs = task.subtasks?.length || 0;
                    const progress = task.progressPercentage ?? (totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : (task.status === 'Completed' ? 100 : 0));

                    return (
                      <tr key={task._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {task.category || 'General'}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {task.title}
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">{task.description}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block">{task.employee?.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{task.employee?.employeeId}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              task.priority === 'Urgent'
                                ? 'bg-red-500 text-white font-extrabold shadow-xs'
                                : task.priority === 'High'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : task.priority === 'Medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {task.priority || 'Medium'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1 font-medium">
                            <span>{totalSubs > 0 ? `${completedSubs}/${totalSubs} subtasks` : `${progress}%`}</span>
                            <span className="font-bold text-slate-900">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              task.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : task.status === 'In Progress'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : task.status === 'Overdue'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : task.status === 'On Hold'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openReassignModal(task)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                            title="Reassign Task"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Reassign</span>
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
        )
      )}

      {/* VIEW REPORT MODAL */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Daily Work Report</h3>
                <p className="text-[11px] text-slate-300">
                  {selectedReport.employee?.fullName} ({selectedReport.employee?.employeeId}) • {selectedReport.date}
                </p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Submitted at:</span>
                <span className="font-bold text-slate-900">
                  {formatTime12(selectedReport.submittedAt)}
                </span>
              </div>

              {selectedReport.voiceUsed && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                  <Mic className="w-3.5 h-3.5 text-blue-600" />
                  Voice-to-Text Dictated Report
                </div>
              )}

              {/* 4 Structured Punch-out Sections */}
              {selectedReport.completedWork && (
                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    1. Completed Work
                  </h4>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.completedWork}
                  </p>
                </div>
              )}

              {selectedReport.pendingTasks && (
                <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                    2. Pending Tasks
                  </h4>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.pendingTasks}
                  </p>
                </div>
              )}

              {selectedReport.challengesFaced && (
                <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
                  <h4 className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1">
                    3. Challenges Faced
                  </h4>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.challengesFaced}
                  </p>
                </div>
              )}

              {selectedReport.nextDayPlan && (
                <div className="p-3.5 bg-sky-50/60 rounded-2xl border border-sky-100">
                  <h4 className="text-[11px] font-bold text-sky-800 uppercase tracking-wider mb-1">
                    4. Next Working Day Plan
                  </h4>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.nextDayPlan}
                  </p>
                </div>
              )}

              {/* Fallback to legacy summaryBullets if 4 sections are empty */}
              {!selectedReport.completedWork && selectedReport.summaryBullets?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Accomplishments Logged:
                  </h4>
                  <ul className="space-y-2">
                    {selectedReport.summaryBullets.map((bullet, idx) => (
                      <li key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5 text-xs text-slate-800">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TASK MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Assign Directive Task</h3>
                <p className="text-[11px] text-slate-300">Delegate task with checklist & thresholds</p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignee Employee * {employees.length > 0 ? `(${employees.length} available)` : ''}
                </label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.fullName} ({e.employeeId}) {e.designation ? `• ${e.designation}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct compliance audit on server logs"
                  value={assignForm.title}
                  onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={assignForm.category}
                    onChange={(e) => setAssignForm({ ...assignForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {['General', 'Development', 'Design', 'Marketing', 'Operations', 'Finance', 'Support', 'Quality'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={assignForm.priority}
                    onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Urgent">🔥 Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={assignForm.startDate}
                    onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={assignForm.dueDate}
                    onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {/* Subtasks Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                    Subtasks / Checklist ({assignForm.subtasks?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={() => setAssignForm({ ...assignForm, subtasks: [...(assignForm.subtasks || []), ''] })}
                    className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-1.5">
                  {assignForm.subtasks?.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Subtask step #${idx + 1}`}
                        value={sub}
                        onChange={(e) => {
                          const updated = [...assignForm.subtasks];
                          updated[idx] = e.target.value;
                          setAssignForm({ ...assignForm, subtasks: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {assignForm.subtasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = assignForm.subtasks.filter((_, i) => i !== idx);
                            setAssignForm({ ...assignForm, subtasks: updated });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Instructions</label>
                <textarea
                  rows="3"
                  placeholder="Provide instructions or requirements..."
                  value={assignForm.description}
                  onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningTask}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {assigningTask ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN TASK MODAL */}
      {showReassignModal && taskToReassign && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Reassign Task</h3>
                <p className="text-[11px] text-slate-300">Delegate to another employee with audit logging</p>
              </div>
              <button
                onClick={() => setShowReassignModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReassignTask} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Task</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{taskToReassign.title}</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Current Assignee: <strong>{taskToReassign.employee?.fullName}</strong> ({taskToReassign.employee?.employeeId})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Assignee Employee *
                </label>
                <select
                  required
                  value={reassignEmployeeId}
                  onChange={(e) => setReassignEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select New Assignee</option>
                  {employees
                    .filter(e => e._id !== taskToReassign.employee?._id)
                    .map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.fullName} ({e.employeeId}) {e.designation ? `• ${e.designation}` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Reassignment</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Workload balancing or skill requirement..."
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>This reassignment will be permanently recorded in system audit logs.</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning || !reassignEmployeeId}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
