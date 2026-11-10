import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  Clock,
  Repeat,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Info
} from 'lucide-react';
import api from '../../api/client';
import { formatDateIST } from '../../utils/timeUtils';
import { TableShimmer } from '../../components/common/Shimmer';

const HOLIDAY_TYPES = [
  'National Holiday',
  'Public Holiday',
  'Festival Holiday',
  'Company Holiday',
  'Optional Holiday',
  'Special Holiday'
];

/**
 * Calculate total days inclusive between two date strings (YYYY-MM-DD)
 */
function calculateDays(start, end) {
  if (!start || !end) return 1;
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

export default function HRHolidayCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([
    'Engineering',
    'Product Design',
    'Operations',
    'Human Resources',
    'Sales & Marketing',
    'Quality Assurance'
  ]);

  // Current calendar month navigation
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    description: '',
    type: 'Company Holiday',
    applicability: 'All',
    applicableDepartments: [],
    applicableShifts: [],
    isRecurring: false,
    paid: true
  });

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const params = new URLSearchParams();
      params.set('year', year);
      params.set('month', month);
      if (selectedType !== 'All') params.set('type', selectedType);
      if (selectedDept !== 'All') params.set('department', selectedDept);

      const [holRes, shiftRes] = await Promise.allSettled([
        api.get(`/holidays?${params.toString()}`),
        api.get('/shifts')
      ]);

      if (holRes.status === 'fulfilled') {
        setHolidays(holRes.value.data?.holidays || []);
      }
      if (shiftRes.status === 'fulfilled') {
        setShifts(shiftRes.value.data?.shifts || []);
      }
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentDate, selectedType, selectedDept]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const openCreateModal = (prefillDate = null) => {
    const initialDate = prefillDate || new Date().toISOString().split('T')[0];
    setEditingHoliday(null);
    setFormError('');
    setForm({
      name: '',
      startDate: initialDate,
      endDate: initialDate,
      description: '',
      type: 'Company Holiday',
      applicability: 'All',
      applicableDepartments: [],
      applicableShifts: [],
      isRecurring: false,
      paid: true
    });
    setShowModal(true);
  };

  const openEditModal = (hol) => {
    setEditingHoliday(hol);
    setFormError('');
    setForm({
      name: hol.name,
      startDate: hol.startDate || hol.date,
      endDate: hol.endDate || hol.date,
      description: hol.description || '',
      type: hol.type || 'Company Holiday',
      applicability: hol.applicability || 'All',
      applicableDepartments: hol.applicableDepartments || [],
      applicableShifts: (hol.applicableShifts || []).map((s) => (s._id ? s._id : s)),
      isRecurring: !!hol.isRecurring,
      paid: hol.paid !== false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    if (form.endDate < form.startDate) {
      setFormError('End Date cannot be earlier than Start Date.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        date: form.startDate
      };
      if (editingHoliday) {
        await api.put(`/holidays/${editingHoliday._id}`, payload);
      } else {
        await api.post('/holidays', payload);
      }
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name, isMulti = false, totalDays = 1) => {
    const confirmMsg = isMulti
      ? `Are you sure you want to delete multi-day holiday "${name}" (${totalDays} days)? This will remove all dates in the range and revert attendance.`
      : `Are you sure you want to delete holiday "${name}"?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/holidays/${id}`);
      fetchHolidays();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete holiday');
    }
  };

  // Calendar Days computation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Map holidays by day string YYYY-MM-DD
  const holidayMap = {};
  holidays.forEach((h) => {
    holidayMap[h.date] = h;
    if (h.isRecurring && h.date) {
      const mmdd = h.date.slice(5);
      holidayMap[`${year}-${mmdd}`] = h;
    }
  });

  // Group multi-day holidays for clean right-panel listing
  const groupedHolidays = [];
  const seenGroupKeys = new Set();
  holidays.forEach((h) => {
    const groupKey = h.rangeGroupId || `${h.name}_${h.startDate || h.date}_${h.endDate || h.date}`;
    if (!seenGroupKeys.has(groupKey)) {
      seenGroupKeys.add(groupKey);
      groupedHolidays.push(h);
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-blue-600" /> Holiday Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company, national, and festival holidays with full Start Date & End Date range support.
          </p>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      {/* Filter and Month Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Month Picker */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-900 min-w-[140px] text-center">
            {monthName}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
          >
            <option value="All">All Holiday Types</option>
            {HOLIDAY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Grid & List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Grid View (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Blank offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="h-20 sm:h-24 rounded-xl bg-slate-50/40" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hol = holidayMap[dateStr];
              const isSunday = (firstDayIndex + i) % 7 === 0;

              return (
                <div
                  key={dateStr}
                  onClick={() => (hol ? openEditModal(hol) : openCreateModal(dateStr))}
                  className={`h-20 sm:h-24 p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    hol
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-xs hover:border-amber-400'
                      : isSunday
                      ? 'bg-slate-50/60 border-slate-100 text-slate-400'
                      : 'bg-white border-slate-200/70 hover:border-blue-400 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{dayNum}</span>
                    {hol && <Sparkles className="w-3 h-3 text-amber-600" />}
                  </div>

                  {hol ? (
                    <div className="mt-1">
                      <span className="text-[10px] sm:text-[11px] font-bold line-clamp-2 leading-tight text-amber-900">
                        {hol.name}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-amber-700/80 truncate">
                          {hol.type.replace(' Holiday', '')}
                        </span>
                        {hol.isMultiDay && (
                          <span className="text-[8px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-semibold shrink-0">
                            Range
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 opacity-0 hover:opacity-100 transition">
                      + Add
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Holidays List in Month (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
            <span>Holidays in {currentDate.toLocaleString('en-US', { month: 'short' })}</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              {groupedHolidays.length}
            </span>
          </h3>

          {loading ? (
            <div className="py-8">
              <TableShimmer rows={4} />
            </div>
          ) : groupedHolidays.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <CalendarIcon className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold">No holidays scheduled for this month</p>
              <button
                onClick={() => openCreateModal()}
                className="mt-3 text-xs text-blue-600 hover:underline font-bold"
              >
                + Add a holiday
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1 max-h-[460px] pr-1">
              {groupedHolidays.map((h) => {
                const isMulti = h.isMultiDay || (h.startDate && h.endDate && h.startDate !== h.endDate);
                const dayCount = h.totalDays || (isMulti ? calculateDays(h.startDate, h.endDate) : 1);

                return (
                  <div
                    key={h._id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{h.name}</h4>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          {isMulti ? (
                            <>
                              <span>{formatDateIST(h.startDate || h.date)} – {formatDateIST(h.endDate || h.date)}</span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {dayCount} Days
                              </span>
                            </>
                          ) : (
                            <span>{formatDateIST(h.date)} (1 Day)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-white transition cursor-pointer"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(h._id, h.name, isMulti, dayCount)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white transition cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-800">
                        {h.type}
                      </span>
                      <span className="px-2 py-0.5 rounded font-semibold bg-slate-200 text-slate-700">
                        {h.applicability === 'All' ? 'All Staff' : `${h.applicability} Specific`}
                      </span>
                      {h.isRecurring && (
                        <span className="px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800 flex items-center gap-0.5">
                          <Repeat className="w-2.5 h-2.5" /> Annual
                        </span>
                      )}
                    </div>
                    {h.description && (
                      <p className="text-[11px] text-slate-600 pt-0.5">{h.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Specify start and end dates to schedule single or multi-day holidays.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Festival Break"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Start Date and End Date range pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        startDate: newStart,
                        endDate: prev.endDate < newStart ? newStart : prev.endDate
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Range helper summary */}
              {form.startDate && form.endDate && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    {form.startDate === form.endDate ? (
                      <span>Single Day Holiday (1 Day)</span>
                    ) : (
                      <span>Multi-day Holiday ({calculateDays(form.startDate, form.endDate)} Days)</span>
                    )}
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    {formatDateIST(form.startDate)} {form.startDate !== form.endDate && `→ ${formatDateIST(form.endDate)}`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Holiday Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicability Scope
                </label>
                <select
                  value={form.applicability}
                  onChange={(e) => setForm({ ...form, applicability: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="All">All Employees (Company-wide)</option>
                  <option value="Department">Department-wise</option>
                  <option value="Shift">Shift-wise</option>
                </select>
              </div>

              {form.applicability === 'Department' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicable Departments
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {departments.map((d) => (
                      <label key={d} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.applicableDepartments.includes(d)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, applicableDepartments: [...form.applicableDepartments, d] });
                            } else {
                              setForm({
                                ...form,
                                applicableDepartments: form.applicableDepartments.filter((item) => item !== d)
                              });
                            }
                          }}
                        />
                        <span>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.applicability === 'Shift' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applicable Shifts
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {shifts.length === 0 ? (
                      <p className="text-xs text-slate-400 col-span-2">No shift templates defined</p>
                    ) : (
                      shifts.map((s) => (
                        <label key={s._id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.applicableShifts.includes(s._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, applicableShifts: [...form.applicableShifts, s._id] });
                              } else {
                                setForm({
                                  ...form,
                                  applicableShifts: form.applicableShifts.filter((id) => id !== s._id)
                                });
                              }
                            }}
                          />
                          <span>{s.name} ({s.startTime} - {s.endTime})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details or instructions..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Annual Recurring Holiday</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.paid}
                    onChange={(e) => setForm({ ...form, paid: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Paid Holiday</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {saving ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Create Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
