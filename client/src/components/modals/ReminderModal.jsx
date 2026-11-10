import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Volume2,
  Repeat,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import api from '../../api/client';
import { formatDateIST, formatTime12, playReminderChime } from '../../utils/timeUtils';

const REMINDER_TYPES = [
  'Task Reminder',
  'Due Date Reminder',
  'Work Update Reminder',
  'Follow-up Reminder',
  'Meeting Reminder',
  'Payment Reminder',
  'Daily Reminder',
  'Personal Reminder',
  'Custom Reminder'
];

export default function ReminderModal({ isOpen, onClose }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes() + 15).padStart(2, '0')}`;

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: defaultDate,
    time: defaultTime,
    type: 'Task Reminder',
    linkedTask: '',
    priority: 'Medium',
    repeat: 'None',
    notificationType: 'All'
  });

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reminders');
      setReminders(res.data?.reminders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/my');
      const allTasks = [...(res.data?.personalTasks || []), ...(res.data?.hrAssignedTasks || [])];
      setTasks(allTasks);
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
      fetchTasks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = { ...form };
      if (!payload.linkedTask) delete payload.linkedTask;

      await api.post('/reminders', payload);
      setForm({
        title: '',
        description: '',
        date: defaultDate,
        time: defaultTime,
        type: 'Task Reminder',
        linkedTask: '',
        priority: 'Medium',
        repeat: 'None',
        notificationType: 'All'
      });
      setActiveTab('list');
      fetchReminders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id, status, snoozeMinutes = 10) => {
    try {
      await api.patch(`/reminders/${id}/status`, { status, snoozeMinutes });
      if (status === 'Snoozed') {
        playReminderChime();
      }
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Reminder Management
              </h3>
              <p className="text-[11px] text-slate-500">Persistent IST Scheduled Reminders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2 bg-white">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'list'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Active Reminders ({reminders.filter((r) => r.status === 'Pending').length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'create'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> New Reminder
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-3.5">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on client deliverables"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date (IST) *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time (IST) *</label>
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reminder Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    {REMINDER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {tasks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link to Task (Optional)
                  </label>
                  <select
                    value={form.linkedTask}
                    onChange={(e) => setForm({ ...form, linkedTask: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="">None (Independent Reminder)</option>
                    {tasks.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Repeat</label>
                  <select
                    value={form.repeat}
                    onChange={(e) => setForm({ ...form, repeat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="None">Does not repeat</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notification</label>
                  <select
                    value={form.notificationType}
                    onChange={(e) => setForm({ ...form, notificationType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="All">In-App + Push + Sound</option>
                    <option value="In-App">In-App Only</option>
                    <option value="Sound">Sound / Alarm Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Set Reminder'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading reminders...</div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="text-xs font-semibold">No active reminders</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-2 text-xs text-purple-600 font-bold hover:underline"
                  >
                    + Create your first reminder
                  </button>
                </div>
              ) : (
                reminders.map((r) => {
                  const isPending = r.status === 'Pending';
                  const isCompleted = r.status === 'Completed';

                  return (
                    <div
                      key={r._id}
                      className={`p-3.5 rounded-xl border transition space-y-2 ${
                        isCompleted
                          ? 'bg-slate-50/60 border-slate-200/50 opacity-60'
                          : 'bg-white border-slate-200/80 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4
                            className={`text-xs font-bold ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {r.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-purple-700">
                              {r.date} @ {r.time} IST
                            </span>
                            <span>•</span>
                            <span className="text-slate-500">{r.type}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleStatusUpdate(r._id, 'Completed')}
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                              title="Mark Done"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(r._id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Reminder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {r.description && (
                        <p className="text-[11px] text-slate-600">{r.description}</p>
                      )}

                      {/* Snooze Presets for Pending reminders */}
                      {isPending && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-slate-400 font-medium">Snooze:</span>
                          <button
                            onClick={() => handleStatusUpdate(r._id, 'Snoozed', 10)}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-semibold"
                          >
                            +10m
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(r._id, 'Snoozed', 60)}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-semibold"
                          >
                            +1h
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(r._id, 'Snoozed', 1440)}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-semibold"
                          >
                            Tomorrow
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

