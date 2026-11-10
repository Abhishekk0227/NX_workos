import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  X,
  ClipboardList,
  Target,
  Layers,
  ListChecks,
  PlayCircle,
  FileText,
  Clock,
  MoreVertical,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Flame,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { TasksShimmer } from '../../components/common/Shimmer';

export default function EmployeeTasks() {
  const { user } = useAuth();
  const [personalTasks, setPersonalTasks] = useState([]);
  const [hrAssignedTasks, setHrAssignedTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'my' | 'hr'
  const [activeTab, setActiveTab] = useState('my');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Menu Dropdown State
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [savingTask, setSavingTask] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [newSubtaskInputs, setNewSubtaskInputs] = useState({});
  const [newCommentInputs, setNewCommentInputs] = useState({});

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'Medium',
    taskType: 'Personal',
    employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    subtasks: ['']
  });

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees?status=Active');
      if (res.data?.success) {
        setEmployees(res.data.employees || []);
        return res.data.employees || [];
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
    return [];
  };

  useEffect(() => {
    if (user?.role === 'HR') {
      fetchEmployees();
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/my');
      if (res.data?.success) {
        setPersonalTasks(res.data.personalTasks || []);
        setHrAssignedTasks(res.data.hrAssignedTasks || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openCreateModal = async () => {
    setEditingTask(null);
    let empList = employees;
    if (user?.role === 'HR' && empList.length === 0) {
      empList = await fetchEmployees();
    }
    setForm({
      title: '',
      description: '',
      category: 'General',
      priority: 'Medium',
      taskType: activeTab === 'hr' ? 'HR_Assigned' : 'Personal',
      employeeId: empList.length > 0 ? empList[0]._id : '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      subtasks: ['']
    });
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      category: task.category || 'General',
      priority: task.priority || 'Medium',
      taskType: task.taskType || 'Personal',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      subtasks: task.subtasks?.map(s => s.title) || ['']
    });
    setActiveMenuId(null);
    setShowModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || savingTask) return;

    setSavingTask(true);
    try {
      const cleanedSubtasks = (form.subtasks || []).map(s => typeof s === 'string' ? s.trim() : s?.title?.trim()).filter(Boolean);
      const payload = { ...form, subtasks: cleanedSubtasks };

      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, payload);
      } else if (user?.role === 'HR' && form.employeeId) {
        await api.post('/tasks/assign', payload);
      } else {
        await api.post('/tasks', payload);
      }
      setShowModal(false);
      if (form.taskType === 'HR_Assigned') {
        setActiveTab('hr');
      } else {
        setActiveTab('my');
      }
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSavingTask(false);
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    try {
      await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  const handleAddSubtask = async (taskId) => {
    const title = (newSubtaskInputs[taskId] || '').trim();
    if (!title) return;
    try {
      await api.post(`/tasks/${taskId}/subtasks`, { title });
      setNewSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
      fetchTasks();
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  };

  const handleAddComment = async (taskId) => {
    const text = (newCommentInputs[taskId] || '').trim();
    if (!text) return;
    try {
      await api.post(`/tasks/${taskId}/updates`, { text });
      setNewCommentInputs(prev => ({ ...prev, [taskId]: '' }));
      fetchTasks();
    } catch (err) {
      console.error('Failed to post update:', err);
    }
  };

  const handleStatusSelect = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';
    handleStatusSelect(taskId, nextStatus);
  };

  const handleDelete = async (taskId) => {
    const targetTask = currentList.find((t) => t._id === taskId);
    if (targetTask?.taskType === 'HR_Assigned' && user?.role !== 'HR') {
      alert('Tasks assigned by HR administrators cannot be deleted by employees.');
      return;
    }
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setActiveMenuId(null);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Active list based on tab
  const currentList = activeTab === 'my' ? personalTasks : hrAssignedTasks;

  const filteredTasks = currentList.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    let matchesStatus = true;
    if (statusFilter === 'New') {
      matchesStatus = t.status === 'New';
    } else if (statusFilter === 'In Progress') {
      matchesStatus = t.status === 'In Progress';
    } else if (statusFilter === 'Pending') {
      matchesStatus = t.status === 'Pending';
    } else if (statusFilter === 'Completed') {
      matchesStatus = t.status === 'Completed';
    } else {
      matchesStatus = true; // 'All'
    }
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate task counts
  const newCount = currentList.filter((t) => t.status === 'New').length;
  const inProgressCount = currentList.filter((t) => t.status === 'In Progress').length;
  const pendingCount = currentList.filter((t) => t.status === 'Pending').length;
  const completedCount = currentList.filter((t) => t.status === 'Completed').length;

  if (loading) {
    return <TasksShimmer />;
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto sm:max-w-2xl lg:max-w-4xl pb-12">
      {/* 1. Header Title matching Image 1 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          My Tasks
        </h1>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">
          Stay on top of your work
        </p>
      </div>

      {/* 2. Top Tabs: My Tasks (X) | Assigned by HR (Y) */}
      <div className="bg-slate-100/90 p-1 rounded-2xl flex max-w-sm">
        <button
          onClick={() => {
            setActiveTab('my');
            setStatusFilter('All');
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'my'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Tasks ({personalTasks.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('hr');
            setStatusFilter('All');
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'hr'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Assigned by HR ({hrAssignedTasks.length})
        </button>
      </div>

      {/* 3. 4-Card Status Grid (2x2 on mobile, 4 columns on lg) matching Image 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: New */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'New' ? 'All' : 'New')}
          className={`bg-white p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs flex items-center gap-3 ${
            statusFilter === 'New'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block leading-tight">New</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 leading-none">
              {newCount}
            </div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'All' : 'In Progress')}
          className={`bg-white p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs flex items-center gap-3 ${
            statusFilter === 'In Progress'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block leading-tight">In Progress</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 leading-none">
              {inProgressCount}
            </div>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
          className={`bg-white p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs flex items-center gap-3 ${
            statusFilter === 'Pending'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block leading-tight">Pending</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 leading-none">
              {pendingCount}
            </div>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'All' : 'Completed')}
          className={`bg-white p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer shadow-2xs flex items-center gap-3 ${
            statusFilter === 'Completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block leading-tight">Completed</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 leading-none">
              {completedCount}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filter Chips (Horizontal Scroll) matching Image 1 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'All', label: `All (${currentList.length})` },
          { id: 'New', label: `New (${newCount})` },
          { id: 'In Progress', label: `In Progress (${inProgressCount})` },
          { id: 'Completed', label: `Completed (${completedCount})` }
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setStatusFilter(chip.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              statusFilter === chip.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 5. Section Header: Today's Priorities */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Today's Priorities
          </h2>
        </div>

        {/* Search bar inside header if needed */}
        <div className="relative w-36 sm:w-48">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 6. Tasks List Cards matching Image 1 */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 text-xs shadow-2xs space-y-2">
            <ClipboardList className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No tasks in this category</p>
            <p className="text-[11px] text-slate-400">Tap Add Task below to create a new task</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isExpanded = expandedTaskId === task._id;

            // Dynamic progress calculation based on subtasks or percentage
            const totalSubtasks = task.subtasks?.length || 0;
            const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
            const progressPercent = task.progressPercentage ?? (totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (isCompleted ? 100 : (task.status === 'In Progress' ? 50 : 10)));

            const priorityBadgeClass =
              task.priority === 'Urgent'
                ? 'bg-red-500 text-white font-extrabold shadow-xs'
                : task.priority === 'High'
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : task.priority === 'Medium'
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200';

            const statusBadgeClass =
              task.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : task.status === 'In Progress'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : task.status === 'Overdue'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : task.status === 'On Hold'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-sky-50 text-sky-600 border border-sky-200';

            return (
              <div
                key={task._id}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs hover:shadow-xs transition-all relative group"
              >
                {/* Row 1: Checkbox + Title + Priority + 3-Dot Menu */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(task._id, task.status)}
                      className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                        isCompleted
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 hover:border-blue-500 bg-white'
                      }`}
                    >
                      {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {task.category && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                            {task.category}
                          </span>
                        )}
                        <h3
                          className={`text-sm font-bold truncate leading-tight ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </h3>
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{task.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${priorityBadgeClass}`}>
                      {task.priority === 'Urgent' && <Flame className="w-3 h-3 animate-pulse" />}
                      {task.priority || 'Medium'}
                    </span>

                    {/* Three-dot dropdown menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === task._id ? null : task._id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === task._id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => openEditModal(task)}
                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit Task</span>
                          </button>
                          {task.taskType === 'HR_Assigned' && user?.role !== 'HR' ? (
                            <div className="px-3 py-2 text-slate-400 text-[10px] italic border-t border-slate-100">
                              HR Locked (Protected)
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDelete(task._id)}
                              className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium border-t border-slate-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete Task</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Metadata (Project, Due Date, Status Pill, Progress Ratio) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{task.taskType === 'HR_Assigned' ? 'HR Assigned' : 'NX Work OS'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                        : 'Today'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[10px] font-bold text-slate-600">
                      {totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks} steps (${progressPercent}%)` : `${progressPercent}%`}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${statusBadgeClass}`}>
                      {task.status || 'New'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar matching Image 1 */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Expandable Subtasks & Work Updates Button */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>
                      {totalSubtasks > 0 ? `Subtasks (${completedSubtasks}/${totalSubtasks})` : 'Checklist'}
                      {task.updates?.length > 0 ? ` • ${task.updates.length} updates` : ''}
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Quick status switch chips */}
                  <div className="flex items-center gap-1">
                    {['New', 'In Progress', 'On Hold', 'Completed'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusSelect(task._id, st)}
                        className={`px-2 py-0.5 text-[9px] rounded font-bold transition cursor-pointer ${
                          task.status === st
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expanded Subtasks & Comments Drawer */}
                {isExpanded && (
                  <div className="mt-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 animate-in fade-in duration-150">
                    {/* Checklist section */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                        Checklist Subtasks ({completedSubtasks}/{totalSubtasks})
                      </div>

                      {task.subtasks?.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No subtasks added yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {task.subtasks.map((sub) => (
                            <label
                              key={sub._id}
                              className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition"
                            >
                              <input
                                type="checkbox"
                                checked={!!sub.isCompleted}
                                onChange={() => handleToggleSubtask(task._id, sub._id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className={`flex-1 ${sub.isCompleted ? 'line-through text-slate-400 font-normal' : 'font-medium'}`}>
                                {sub.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Add subtask inline input */}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          placeholder="Add new subtask item..."
                          value={newSubtaskInputs[task._id] || ''}
                          onChange={(e) => setNewSubtaskInputs({ ...newSubtaskInputs, [task._id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubtask(task._id);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSubtask(task._id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    {/* Comments & Work Updates Section */}
                    <div className="pt-2 border-t border-slate-200/80">
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        Work Updates & Notes ({task.updates?.length || 0})
                      </div>

                      {task.updates?.length > 0 && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto mb-2">
                          {task.updates.map((up, idx) => (
                            <div key={idx} className="bg-white p-2 rounded-xl border border-slate-100 text-xs">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                                <span className="font-bold text-slate-700">{up.authorName || 'Staff'}</span>
                                <span>{new Date(up.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-slate-800">{up.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Post a progress update or remark..."
                          value={newCommentInputs[task._id] || ''}
                          onChange={(e) => setNewCommentInputs({ ...newCommentInputs, [task._id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComment(task._id);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(task._id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Post
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 7. Centered "+ Add Task" Pill Button matching Image 1 */}
      <div className="flex justify-center pt-3">
        <button
          onClick={openCreateModal}
          className="py-3 px-8 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-sm rounded-full shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <Plus className="w-5 h-5 text-white" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Task Creation / Editing Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Prepare weekly project update"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Details or notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category || 'General'}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {['General', 'Development', 'Design', 'Marketing', 'Operations', 'Finance', 'Support', 'Quality'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
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
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Subtasks Builder in Modal */}
              {!editingTask && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Checklist Subtasks ({form.subtasks?.length || 0})</label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, subtasks: [...(form.subtasks || []), ''] })}
                      className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      + Add Step
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {form.subtasks?.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder={`Step ${idx + 1}...`}
                          value={sub}
                          onChange={(e) => {
                            const updated = [...form.subtasks];
                            updated[idx] = e.target.value;
                            setForm({ ...form, subtasks: updated });
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {form.subtasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = form.subtasks.filter((_, i) => i !== idx);
                              setForm({ ...form, subtasks: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user?.role === 'HR' && !editingTask && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign To Employee</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {employees.map((em) => (
                      <option key={em._id} value={em._id}>
                        {em.fullName} ({em.employeeId || 'NX'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition"
                >
                  {savingTask ? 'Saving...' : editingTask ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
