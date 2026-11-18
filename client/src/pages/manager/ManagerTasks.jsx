import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  History,
  User,
  Check,
  X,
  FileText,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Trash2
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer } from '../../components/common/Shimmer';

export default function ManagerTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Segregation Tab & Counts
  const [segregationTab, setSegregationTab] = useState(searchParams.get('tab') || 'all');
  const [counts, setCounts] = useState({
    all: 0,
    inReview: 0,
    forRevision: 0,
    dueSoon: 0,
    missed: 0,
    completed: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('studentId') || 'All');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const hasActiveFilter = selectedStudent !== 'All' || selectedPriority !== 'All';

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
  const [reviewTask, setReviewTask] = useState(null);
  const [extendTask, setExtendTask] = useState(null);
  const [historyTask, setHistoryTask] = useState(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    employeeId: '',
    dueDate: '',
    priority: 'Medium',
    category: 'Development',
    subtasks: ['']
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Review Form State
  const [reviewDecision, setReviewDecision] = useState('Approve');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Extend Deadline Form State
  const [extendDueDate, setExtendDueDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/manager/students');
      if (res.data?.success) {
        setStudents(res.data.students || []);
        if (searchParams.get('studentId')) {
          setCreateForm(prev => ({ ...prev, employeeId: searchParams.get('studentId') }));
        }
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {
        segregationFilter: segregationTab
      };
      if (selectedStudent !== 'All') params.studentId = selectedStudent;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedPriority !== 'All') params.priority = selectedPriority;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/manager/tasks', { params });
      if (res.data?.success) {
        setTasks(res.data.tasks || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [segregationTab, selectedStudent, selectedStatus, selectedPriority, search]);

  // Handle Subtask Input Add / Remove
  const handleAddSubtaskInput = () => {
    setCreateForm(prev => ({ ...prev, subtasks: [...prev.subtasks, ''] }));
  };

  const handleSubtaskChange = (idx, value) => {
    const updated = [...createForm.subtasks];
    updated[idx] = value;
    setCreateForm(prev => ({ ...prev, subtasks: updated }));
  };

  const handleRemoveSubtaskInput = idx => {
    setCreateForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== idx)
    }));
  };

  // Submit Task Creation
  const handleCreateTask = async e => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.title.trim()) {
      setCreateError('Please enter a task title');
      return;
    }
    if (!createForm.employeeId) {
      setCreateError('Please select a student');
      return;
    }
    if (!createForm.dueDate) {
      setCreateError('Please set a deadline');
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await api.post('/manager/tasks', {
        title: createForm.title,
        description: createForm.description,
        employeeId: createForm.employeeId,
        dueDate: createForm.dueDate,
        priority: createForm.priority,
        category: createForm.category,
        subtasks: createForm.subtasks.filter(s => s && s.trim())
      });

      if (res.data?.success) {
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          employeeId: '',
          dueDate: '',
          priority: 'Medium',
          category: 'Development',
          subtasks: ['']
        });
        fetchTasks();
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Review
  const handleReviewSubmit = async () => {
    if (!reviewTask) return;
    setReviewSubmitting(true);
    try {
      const res = await api.post(`/manager/tasks/${reviewTask._id}/review`, {
        decision: reviewDecision,
        feedback: reviewFeedback
      });
      if (res.data?.success) {
        setReviewTask(null);
        setReviewFeedback('');
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Handle Extend Deadline
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
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update deadline');
    } finally {
      setExtendSubmitting(false);
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async taskId => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await api.delete(`/manager/tasks/${taskId}`);
      if (res.data?.success) {
        fetchTasks();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // Helper formatting
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

  const getDeadlineTag = task => {
    const now = new Date();
    const due = task.dueDate ? new Date(task.dueDate) : null;
    if (!due) return null;

    const isMissed = task.deadlineMissed || task.status === 'Overdue' || (due < now && task.status !== 'Completed');
    const isLate = task.isSubmittedLate;

    if (isLate) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
          <Clock className="w-3 h-3" /> Late
        </span>
      );
    }

    if (isMissed) {
      const diffHours = Math.round((now - due) / (1000 * 60 * 60));
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
          <AlertTriangle className="w-3 h-3" /> Overdue {diffHours >= 24 ? `${Math.floor(diffHours / 24)}d` : `${diffHours}h`}
        </span>
      );
    }

    const diffHours = Math.round((due - now) / (1000 * 60 * 60));
    if (diffHours <= 48 && diffHours > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
          <Clock className="w-3 h-3" /> {diffHours <= 24 ? `${diffHours}h left` : `${Math.floor(diffHours / 24)}d left`}
        </span>
      );
    }

    return null;
  };

  const getPriorityBadge = priority => {
    switch (priority) {
      case 'Urgent':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200">Urgent</span>;
      case 'High':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
    }
  };

  const getStatusBadge = status => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="w-3 h-3" /> Under Review
          </span>
        );
      case 'Revision Requested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Needs Revision
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            New
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            <span>Task Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Assign tasks with strict deadlines, track student submissions, and review work.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Assign New Task</span>
          <span className="sm:hidden">New Task</span>
        </button>
      </div>

      {/* Segregated Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'in_review', label: 'In Review', count: counts.inReview },
          { id: 'for_revision', label: 'For Revision', count: counts.forRevision },
          { id: 'due_soon', label: 'Due Soon', count: counts.dueSoon },
          { id: 'missed', label: 'Overdue', count: counts.missed },
          { id: 'completed', label: 'Completed', count: counts.completed },
        ].map(tab => {
          const isActive = segregationTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSegregationTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer shrink-0 ${
              showFilterDrawer || hasActiveFilter
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilter && (
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            )}
          </button>
        </div>

        {/* Collapsible Filter Tray */}
        {showFilterDrawer && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-150">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Assigned Student
              </label>
              <select
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-medium"
              >
                <option value="All">All Students</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.fullName} ({s.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-medium"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        )}

        {/* Active filter badges / reset */}
        {hasActiveFilter && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {selectedStudent !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                Student: {students.find(s => s._id === selectedStudent)?.fullName || 'Selected'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStudent('All')} />
              </span>
            )}
            {selectedPriority !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                Priority: {selectedPriority}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPriority('All')} />
              </span>
            )}
            <button
              onClick={() => {
                setSelectedStudent('All');
                setSelectedPriority('All');
                setSearch('');
              }}
              className="text-[11px] text-purple-600 hover:text-purple-800 font-bold ml-1 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Task List */}
      {loading ? (
        <TableShimmer rows={4} cols={4} />
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search filters or assign a new task to your students.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Assign New Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const isMissed = task.deadlineMissed || task.status === 'Overdue';
            const isSubmitted = task.status === 'Submitted';

            return (
              <div
                key={task._id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition hover:shadow-xs space-y-3 ${
                  isMissed
                    ? 'border-rose-300 ring-1 ring-rose-200/60'
                    : isSubmitted
                    ? 'border-indigo-300 ring-1 ring-indigo-200/60'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Header row: Category & Priority on left, Status Badge on right */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 uppercase tracking-wider">
                      {task.category || 'General'}
                    </span>
                    {getPriorityBadge(task.priority)}
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(task.status)}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Subtasks progress bar if any */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>
                        Subtasks: {task.subtasks.filter(s => s.isCompleted).length} / {task.subtasks.length}
                      </span>
                      <span>{task.progressPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${task.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Unified Timeline Bar: Assigned timestamp & Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Assigned: <strong className="text-slate-800 font-semibold">{formatDateTime(task.createdAt)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 text-slate-600">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        Due: <strong className="text-slate-800 font-semibold">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'No deadline'}</strong>
                      </span>
                    </div>
                    {getDeadlineTag(task)}
                  </div>
                </div>

                {/* Student Assignment Info */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {task.employee?.fullName?.[0] || 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {task.employee?.fullName || 'Assigned Student'}
                        </span>
                        {task.employee?.isActiveNow ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {task.employee?.employeeId} • {task.employee?.department || 'Department'} • Assigned by: {task.assignedBy?.name || 'Manager'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submission Preview Card if submitted */}
                {task.submissionNote || task.submissionLink ? (
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Student Submission</span>
                        {task.isSubmittedLate && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">LATE</span>
                        )}
                      </div>
                      {task.submittedAt && (
                        <span className="text-[10px] text-indigo-600 font-medium whitespace-nowrap">
                          {formatDateTime(task.submittedAt)}
                        </span>
                      )}
                    </div>

                    {task.submissionNote && (
                      <div className="p-2 bg-white/85 rounded-lg border border-indigo-100 text-indigo-950 font-medium text-xs leading-relaxed">
                        "{task.submissionNote}"
                      </div>
                    )}

                    {task.submissionLink && (
                      <a
                        href={task.submissionLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View Submitted Attachment / Link
                      </a>
                    )}

                    {task.managerFeedback && (
                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/60 text-[11px] text-amber-900">
                        <span className="font-bold">Your Feedback:</span> {task.managerFeedback}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Actions Row */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  {isSubmitted && (
                    <button
                      onClick={() => {
                        setReviewTask(task);
                        setReviewFeedback(task.managerFeedback || '');
                      }}
                      className="flex-1 min-w-[140px] py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Review Submission
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setExtendTask(task);
                      if (task.dueDate) {
                        const d = new Date(task.dueDate);
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        setExtendDueDate(d.toISOString().slice(0, 16));
                      }
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" /> Extend
                  </button>

                  <button
                    onClick={() => setHistoryTask(task)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" /> History
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer ml-auto"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create / Assign Task */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assign New Task</h3>
                  <p className="text-xs text-slate-500">Assign task to a student with a tracked deadline</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              {/* Select Student */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assign To Student <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.employeeId}
                  onChange={e => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-medium"
                  required
                >
                  <option value="">-- Choose Assigned Student --</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.fullName} ({s.employeeId}) • {s.department || 'Student'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Implement Student Assignment Module"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-medium"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed instructions, deliverables, requirements..."
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-medium resize-none"
                />
              </div>

              {/* Due Date & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Deadline (Date & Time) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.dueDate}
                    onChange={e => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-mono font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-medium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={createForm.category}
                  onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 font-medium"
                >
                  <option value="Development">Development</option>
                  <option value="Design">Design</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Research">Research</option>
                  <option value="Bug Fix">Bug Fix</option>
                  <option value="Marketing">Marketing</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Checklist Subtasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Checklist Subtasks (Optional)</label>
                  <button
                    type="button"
                    onClick={handleAddSubtaskInput}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-800"
                  >
                    + Add Item
                  </button>
                </div>
                {createForm.subtasks.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Subtask #${idx + 1}`}
                      value={st}
                      onChange={e => handleSubtaskChange(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-purple-500"
                    />
                    {createForm.subtasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtaskInput(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
                >
                  {createSubmitting ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Review Submission */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Review Student Submission</h3>
                  <p className="text-xs text-slate-500">{reviewTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setReviewTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student info */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="font-bold text-slate-800">
                {reviewTask.employee?.fullName} ({reviewTask.employee?.employeeId})
              </div>
              <div className="text-slate-500">
                Submitted at: {formatDateTime(reviewTask.submittedAt)}
                {reviewTask.isSubmittedLate && (
                  <span className="ml-2 font-bold text-rose-600">[LATE SUBMISSION]</span>
                )}
              </div>
            </div>

            {/* Submission Content */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="font-bold text-indigo-900">Student Notes:</div>
              <p className="text-indigo-950 font-medium">
                {reviewTask.submissionNote || 'No notes provided by student.'}
              </p>
              {reviewTask.submissionLink && (
                <div>
                  <a
                    href={reviewTask.submissionLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-indigo-700 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Submitted Link / Drive
                  </a>
                </div>
              )}
            </div>

            {/* Decision Radio */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700">Manager Decision:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('Approve')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                    reviewDecision === 'Approve'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Check className="w-4 h-4" /> Approve & Complete
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('Request Revision')}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                    reviewDecision === 'Request Revision'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" /> Request Revision
                </button>
              </div>
            </div>

            {/* Feedback input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Feedback for Student {reviewDecision === 'Request Revision' && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder={
                  reviewDecision === 'Approve'
                    ? 'Optional praise or notes (e.g. Great work, well documented!)'
                    : 'Explain clearly what changes or additions are required before approval...'
                }
                value={reviewFeedback}
                onChange={e => setReviewFeedback(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewSubmit}
                disabled={reviewSubmitting || (reviewDecision === 'Request Revision' && !reviewFeedback.trim())}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
              >
                {reviewSubmitting ? 'Saving...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Extend Deadline */}
      {extendTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Extend Task Deadline</h3>
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
                placeholder="e.g. Student requested extra 24 hours due to server migration..."
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

      {/* MODAL 4: Task Audit History */}
      {historyTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Task Audit History</h3>
                  <p className="text-xs text-slate-500">{historyTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {(!historyTask.auditHistory || historyTask.auditHistory.length === 0) ? (
                <div className="text-center py-6 text-slate-400 font-medium">
                  No audit history records available for this task.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {historyTask.auditHistory.map((entry, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-white" />
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="uppercase tracking-wider text-[10px] text-purple-600">
                            {entry.action}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            {formatDateTime(entry.performedAt)}
                          </span>
                        </div>
                        {entry.performedBy && (
                          <div className="text-[11px] text-slate-500">
                            By: <span className="font-medium text-slate-700">{entry.performedBy.name || entry.performedBy.email || 'System'}</span>
                          </div>
                        )}
                        {entry.details && (
                          <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 font-mono">
                            {JSON.stringify(entry.details, null, 1)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setHistoryTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
