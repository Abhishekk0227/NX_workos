import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Users,
  User,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Send,
  X,
  Radio,
  Clock,
  Pin,
  Sparkles,
  Search,
  Filter,
  CheckSquare,
  Square,
  UserCheck
} from 'lucide-react';
import api from '../../api/client';
import { showPushNotification } from '../../services/pushNotification';
import { NoticeShimmer } from '../../components/common/Shimmer';

export default function HRBroadcast() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'COMPANY', 'SPECIFIC', 'MULTIPLE', 'URGENT'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [formData, setFormData] = useState({
    targetType: 'ALL', // 'ALL', 'SPECIFIC', 'MULTIPLE'
    targetEmployee: '',
    targetEmployees: [],
    title: '',
    message: '',
    priority: 'High',
    category: 'General',
    isPinnedBanner: true,
    sendPush: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, eRes] = await Promise.all([
        api.get('/broadcasts'),
        api.get('/employees?status=Active')
      ]);
      setBroadcasts(bRes.data?.broadcasts || []);
      const activeEmps = eRes.data?.employees || [];
      setEmployees(activeEmps);

      if (activeEmps.length > 0 && !formData.targetEmployee) {
        setFormData((prev) => ({ ...prev, targetEmployee: activeEmps[0]._id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleEmployeeSelect = (empId) => {
    setFormData((prev) => {
      const exists = prev.targetEmployees.includes(empId);
      const updated = exists
        ? prev.targetEmployees.filter((id) => id !== empId)
        : [...prev.targetEmployees, empId];
      return { ...prev, targetEmployees: updated };
    });
  };

  const selectAllEmployees = () => {
    setFormData((prev) => ({
      ...prev,
      targetEmployees: employees.map((e) => e._id)
    }));
  };

  const clearAllEmployees = () => {
    setFormData((prev) => ({
      ...prev,
      targetEmployees: []
    }));
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Title and notice message are required');
      return;
    }

    if (formData.targetType === 'SPECIFIC' && !formData.targetEmployee) {
      alert('Please select a specific employee');
      return;
    }

    if (formData.targetType === 'MULTIPLE' && (!formData.targetEmployees || formData.targetEmployees.length === 0)) {
      alert('Please select at least one employee from the list');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/broadcasts', formData);
      if (res.data?.success) {
        alert(res.data.message || 'Notice published successfully!');
        // Trigger client-side push notification preview
        if (formData.sendPush) {
          showPushNotification(`[Notice] ${formData.title}`, {
            body: formData.message
          });
        }
        setShowModal(false);
        setFormData({
          targetType: 'ALL',
          targetEmployee: employees[0]?._id || '',
          targetEmployees: [],
          title: '',
          message: '',
          priority: 'High',
          category: 'General',
          isPinnedBanner: true,
          sendPush: true
        });
        setEmpSearch('');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (!window.confirm('Delete this broadcast notice?')) return;
    try {
      const res = await api.delete(`/broadcasts/${id}`);
      if (res.data?.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Filter logic
  const filteredBroadcasts = broadcasts.filter((b) => {
    if (filter === 'COMPANY') return b.targetType === 'ALL';
    if (filter === 'SPECIFIC') return b.targetType === 'SPECIFIC';
    if (filter === 'MULTIPLE') return b.targetType === 'MULTIPLE';
    if (filter === 'URGENT') return b.priority === 'Urgent';
    return true;
  });

  const companyWideCount = broadcasts.filter((b) => b.targetType === 'ALL').length;
  const specificCount = broadcasts.filter((b) => b.targetType === 'SPECIFIC').length;
  const multipleCount = broadcasts.filter((b) => b.targetType === 'MULTIPLE').length;
  const urgentCount = broadcasts.filter((b) => b.priority === 'Urgent').length;

  const filteredStaff = employees.filter((e) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase();
    return (
      (e.fullName && e.fullName.toLowerCase().includes(q)) ||
      (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
      (e.designation && e.designation.toLowerCase().includes(q)) ||
      (e.department && e.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Broadcast & Notices
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Live Alert System
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish critical notices company-wide, to multiple selected staff, or direct to an individual
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              ...formData,
              targetEmployee: employees[0]?._id || '',
              targetEmployees: []
            });
            setEmpSearch('');
            setShowModal(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Broadcast Notice
        </button>
      </div>

      {/* 5 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Broadcasts
          </span>
          <div className="text-2xl font-black text-slate-900">{broadcasts.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Published notices</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block mb-1">
            Company-Wide
          </span>
          <div className="text-2xl font-black text-blue-700">{companyWideCount}</div>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Sent to all staff</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block mb-1">
            Direct Personal
          </span>
          <div className="text-2xl font-black text-purple-700">{specificCount}</div>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Single employee target</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block mb-1">
            Multiple Select
          </span>
          <div className="text-2xl font-black text-indigo-700">{multipleCount}</div>
          <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Selected group</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Urgent Priority
          </span>
          <div className="text-2xl font-black text-rose-700">{urgentCount}</div>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">High attention alerts</p>
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-slate-200/70 p-1 rounded-xl flex-wrap gap-1">
          {[
            { id: 'ALL', label: `All (${broadcasts.length})` },
            { id: 'COMPANY', label: `Company-Wide (${companyWideCount})` },
            { id: 'SPECIFIC', label: `Direct Personal (${specificCount})` },
            { id: 'MULTIPLE', label: `Multiple Select (${multipleCount})` },
            { id: 'URGENT', label: `Urgent (${urgentCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Broadcast List Cards */}
      <div className="space-y-3">
        {loading ? (
          <NoticeShimmer count={4} />
        ) : filteredBroadcasts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-slate-400">
            <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium">No broadcast notices found in this filter</p>
          </div>
        ) : (
          filteredBroadcasts.map((b) => (
            <div
              key={b._id}
              className={`bg-white p-5 rounded-2xl border transition shadow-xs hover:border-slate-300 ${
                b.priority === 'Urgent' ? 'border-l-4 border-l-rose-500' : b.priority === 'High' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-blue-500'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      b.priority === 'Urgent'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : b.priority === 'High'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {b.priority} Priority
                  </span>

                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {b.category}
                  </span>

                  {b.targetType === 'ALL' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Users className="w-3 h-3" /> Target: All Employees
                    </span>
                  ) : b.targetType === 'MULTIPLE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Users className="w-3 h-3" /> Target: Multiple Staff ({b.targetEmployees?.length || b.totalTarget || 0} employees)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      <User className="w-3 h-3" /> Target: {b.targetEmployee?.fullName || 'Specific Employee'} ({b.targetEmployee?.employeeId || 'ID'})
                    </span>
                  )}

                  {b.isPinnedBanner && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <Pin className="w-3 h-3 text-amber-500" /> Pinned on Dashboard
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(b.createdAt).toLocaleString()}</span>
                  <button
                    onClick={() => handleDeleteBroadcast(b._id)}
                    className="p-1 hover:text-rose-600 transition ml-2 cursor-pointer"
                    title="Delete Notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mb-1.5">{b.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">{b.message}</p>

              {/* Show list of targeted employee tags if MULTIPLE */}
              {b.targetType === 'MULTIPLE' && b.targetEmployees && b.targetEmployees.length > 0 && (
                <div className="mb-3 p-2 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-semibold">Recipients ({b.targetEmployees.length}):</span>
                  {b.targetEmployees.map((te) => (
                    <span
                      key={te._id || te}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-700 font-medium text-[10px]"
                    >
                      {te.fullName || 'Staff'} {te.employeeId ? `(${te.employeeId})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Reach & Acknowledgement Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Employee Acknowledgements:</span>
                  <strong className="text-slate-900">
                    {b.acknowledgedCount || 0} / {b.totalTarget || 1} ({b.acknowledgePercentage || 0}%)
                  </strong>
                </div>

                <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, b.acknowledgePercentage || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE BROADCAST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Publish Broadcast Notice</h3>
                <p className="text-[11px] text-slate-300">
                  Send important notice to all staff, a specific person, or multiple selected employees
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBroadcast} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Target Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Recipient Target *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetType: 'ALL' })}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      formData.targetType === 'ALL'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <strong className="text-xs font-bold text-slate-900">All Staff</strong>
                    </div>
                    <p className="text-[11px] text-slate-500">Company-wide notice</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetType: 'SPECIFIC' })}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      formData.targetType === 'SPECIFIC'
                        ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-4 h-4 text-purple-600" />
                      <strong className="text-xs font-bold text-slate-900">Specific Person</strong>
                    </div>
                    <p className="text-[11px] text-slate-500">Single individual staff</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetType: 'MULTIPLE' })}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      formData.targetType === 'MULTIPLE'
                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <strong className="text-xs font-bold text-slate-900">Multiple Select</strong>
                    </div>
                    <p className="text-[11px] text-slate-500">Choose multiple staff</p>
                  </button>
                </div>
              </div>

              {/* Specific Employee Dropdown */}
              {formData.targetType === 'SPECIFIC' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Target Employee *
                  </label>
                  <select
                    required
                    value={formData.targetEmployee}
                    onChange={(e) => setFormData({ ...formData, targetEmployee: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId}) — {emp.designation} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multiple Employees Picker */}
              {formData.targetType === 'MULTIPLE' && (
                <div className="space-y-2 p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950">
                      Select Employees ({formData.targetEmployees.length} of {employees.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllEmployees}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllEmployees}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Search box within employee list */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search employee by name, ID, or designation..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Scrollable list */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {filteredStaff.length === 0 ? (
                      <p className="text-center py-4 text-xs text-slate-400">No employees found matching search</p>
                    ) : (
                      filteredStaff.map((emp) => {
                        const isSelected = formData.targetEmployees.includes(emp._id);
                        return (
                          <div
                            key={emp._id}
                            onClick={() => toggleEmployeeSelect(emp._id)}
                            className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer select-none ${
                              isSelected
                                ? 'bg-indigo-100/70 text-indigo-950 border border-indigo-200'
                                : 'bg-white hover:bg-slate-50 text-slate-800 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {emp.fullName?.charAt(0) || 'E'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">
                                  {emp.fullName}{' '}
                                  <span className="text-[10px] font-normal text-slate-500">({emp.employeeId})</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {emp.designation} • {emp.department}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-2">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Normal', 'High', 'Urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p })}
                      className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        formData.priority === p
                          ? p === 'Urgent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : p === 'High'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                >
                  <option value="General">General Announcement</option>
                  <option value="Operational">Operations Directives</option>
                  <option value="Emergency">Emergency Alert</option>
                  <option value="HR Policy">HR Policy & Compliance</option>
                  <option value="Holiday">Company Holiday</option>
                  <option value="Maintenance">System Maintenance</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title / Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Townhall & Operations Sync"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Details *</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Write clear instructions, timings, and expectations..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Delivery Options */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isPinnedBanner}
                    onChange={(e) => setFormData({ ...formData, isPinnedBanner: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Pin prominently as Top Banner on Employee Dashboard</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.sendPush}
                    onChange={(e) => setFormData({ ...formData, sendPush: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Dispatch Real-time Native Push Notification to Devices</span>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Publishing...' : 'Publish & Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
