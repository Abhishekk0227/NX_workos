import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  X,
  ClipboardList,
  ArrowLeft
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

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

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    taskType: 'Personal',
    employeeId: '',
    dueDate: new Date().toISOString().split('T')[0]
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
      console.error(err);
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
      priority: 'Medium',
      taskType: activeTab === 'hr' ? 'HR_Assigned' : 'Personal',
      employeeId: empList.length > 0 ? empList[0]._id : '',
      dueDate: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'Medium',
      taskType: task.taskType || 'Personal',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, form);
      } else if (user?.role === 'HR' && form.employeeId) {
        await api.post('/tasks/assign', form);
      } else {
        await api.post('/tasks/personal', form);
      }
      setShowModal(false);
      // Switch to the matching tab so employee sees their task immediately
      if (form.taskType === 'HR_Assigned') {
        setActiveTab('hr');
      } else {
        setActiveTab('my');
      }
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: nextStatus });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Active list based on tab
  const currentList = activeTab === 'my' ? personalTasks : hrAssignedTasks;

  const filteredTasks = currentList.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-4">
      {/* 1. Top Controls Bar matching EppanelD.png #2 (hidden on mobile matching EppanelM.png Screen 2) */}
      <div className="hidden md:flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dropdowns & Add Button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* 2. Tabs: My Tasks | Assigned by HR (Pill switcher on mobile matching EppanelM.png #2) */}
      <div className="bg-slate-100 p-1 rounded-2xl flex max-w-sm">
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'my'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Tasks ({personalTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('hr')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'hr'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Assigned by HR ({hrAssignedTasks.length})
        </button>
      </div>

      {/* Filter Chips matching EppanelM.png #2 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'All', label: `All (${currentList.length})` },
          { id: 'Pending', label: `Pending (${currentList.filter(t => t.status === 'Pending').length})` },
          { id: 'In Progress', label: `In Progress (${currentList.filter(t => t.status === 'In Progress').length})` }
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setStatusFilter(chip.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === chip.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 3A. Mobile Task Cards View matching EppanelM.png Screen 2 */}
      <div className="md:hidden space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No tasks found in this view
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isCompleted = t.status === 'Completed';
            return (
              <div
                key={t._id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleStatus(t._id, t.status)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <span className={`text-xs font-bold block truncate ${
                      isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}>
                      {t.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'High'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : t.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {t.priority || 'Medium'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.taskType === 'HR_Assigned'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {t.taskType === 'HR_Assigned' ? 'HR Assigned' : 'Personal'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Today'}
                  </span>
                  <button
                    onClick={() => openEditModal(t)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Task Button on Mobile matching EppanelM.png Screen 2 */}
      <div className="md:hidden fixed bottom-20 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <button
          onClick={openCreateModal}
          className="pointer-events-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-lg shadow-blue-500/30 flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* 3B. Desktop Task Table matching EppanelD.png #2 */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-8">#</th>
                <th className="py-3 px-4">Task Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No tasks found in this view
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t, idx) => {
                  const isCompleted = t.status === 'Completed';
                  return (
                    <tr key={t._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleToggleStatus(t._id, t.status)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <span className={`font-semibold block ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {t.title}
                            </span>
                            {t.description && (
                              <span className="text-[11px] text-slate-400 truncate block max-w-xs">{t.description}</span>
                            )}
                          </div>
                        </label>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          t.taskType === 'HR_Assigned'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {t.taskType === 'HR_Assigned' ? 'HR Assigned' : 'Personal'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.priority === 'High'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : t.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {t.priority || 'Medium'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          t.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Add / Edit Task Modal matching EppanelD.png #3 */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Modal Header matching EppanelM.png Screen 3 */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1 -ml-1 text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-[10px]">
                    NX
                  </div>
                  <span className="font-extrabold text-xs tracking-tight">NX Work OS</span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter task title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows="1"
                    placeholder="Enter task description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Priority Selectors matching EppanelD.png #3 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map((p) => {
                    const isSelected = form.priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm({ ...form, priority: p })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition ${
                          isSelected
                            ? p === 'High'
                              ? 'bg-red-50 text-red-600 border-red-300 ring-2 ring-red-400/30'
                              : p === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-400/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-400/30'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type Radio buttons matching EppanelD.png #3 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                <div className="flex gap-6 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="taskType"
                      value="Personal"
                      checked={form.taskType === 'Personal'}
                      onChange={() => setForm({ ...form, taskType: 'Personal' })}
                      className="text-blue-600"
                    />
                    <span>Personal Task</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="taskType"
                      value="HR_Assigned"
                      checked={form.taskType === 'HR_Assigned'}
                      onChange={() => setForm({ ...form, taskType: 'HR_Assigned' })}
                      className="text-blue-600"
                    />
                    <span>HR Assigned Task</span>
                  </label>
                </div>
              </div>

              {/* Assignee Employee (When HR is creating or task is HR_Assigned) */}
              {(user?.role === 'HR' || form.taskType === 'HR_Assigned') && employees.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign to Employee *
                  </label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.fullName} ({e.employeeId}) {e.designation ? `• ${e.designation}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Due Date picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-xs"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
