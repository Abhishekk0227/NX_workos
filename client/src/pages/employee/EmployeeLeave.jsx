import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarOff,
  Sparkles,
  Info,
  X,
  Calendar,
  Filter,
  Check,
  AlertCircle,
  Umbrella,
  Heart,
  Infinity,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import api from '../../api/client';

export default function EmployeeLeave() {
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState({ clBalance: 0, slBalance: 0, lwpCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balance'); // 'balance' or 'requests'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Pending', 'Approved', 'Rejected'

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'LWP',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isHalfDay: false,
    halfDayType: 'FirstHalf',
    reasonCategory: 'Personal',
    reasonDetails: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, balRes] = await Promise.all([
        api.get('/leaves/my'),
        api.get('/leaves/balance')
      ]);
      setRequests(reqRes.data?.requests || []);
      if (balRes.data?.balances) {
        setBalances(balRes.data.balances);
      }
    } catch (err) {
      console.error('Failed to fetch leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reasonDetails.trim()) {
      alert('Please fill in all required leave application fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/leaves/apply', applyForm);
      if (res.data?.success) {
        alert(res.data.message || 'Leave applied successfully!');
        setShowApplyModal(false);
        setApplyForm({
          leaveType: 'LWP',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          isHalfDay: false,
          halfDayType: 'FirstHalf',
          reasonCategory: 'Personal',
          reasonDetails: ''
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Leave application failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter requests based on status tab
  const filteredRequests = requests.filter((req) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Pending') return req.status === 'Pending' || req.status === 'Pending_Review' || req.status === 'Flagged';
    if (statusFilter === 'Approved') return req.status === 'Approved';
    if (statusFilter === 'Rejected') return req.status === 'Rejected';
    return true;
  });

  // Calculate day difference
  const calculateDays = () => {
    if (applyForm.isHalfDay) return 0.5;
    const start = new Date(applyForm.startDate);
    const end = new Date(applyForm.endDate);
    if (isNaN(start) || isNaN(end) || end < start) return 1;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching EppanelD.png #6 (hidden on mobile matching EppanelM.png #8) */}
      <div className="hidden sm:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Apply and track your leave requests and policy allowances</p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {/* Top Segmented Tabs: Leave Balance vs Leave History matching EppanelM.png #8 */}
      <div className="flex bg-slate-100 p-1 rounded-2xl max-w-sm">
        <button
          onClick={() => setActiveTab('balance')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'balance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Leave Balance
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Leave History
        </button>
      </div>

      {/* VIEW 1: LEAVE BALANCE */}
      {activeTab === 'balance' && (
        <div className="space-y-4">
          {/* Policy Notice Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                  LWP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-amber-950">Standard Unpaid Leave Policy</h3>
                    <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 text-[10px] font-extrabold uppercase rounded-md tracking-wider">
                      Default
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    All leaves are unpaid by default without segregation. Leave deductions are calculated directly in payroll.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Apply Leave
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Unpaid Leaves
              </span>
              <div className="text-2xl font-black text-amber-600">
                {balances.lwpCount || 0} <span className="text-xs font-semibold text-slate-400">Days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Recorded as LWP</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Approved Requests
              </span>
              <div className="text-2xl font-black text-emerald-600">
                {requests.filter(r => r.status === 'Approved').length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Accounted in payroll</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Pending Requests
              </span>
              <div className="text-2xl font-black text-slate-700">
                {requests.filter(r => r.status === 'Pending' || r.status === 'Pending_Review' || r.status === 'Flagged').length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting HR review</p>
            </div>
          </div>

          {/* Recent Leave Requests matching EppanelM.png Screen 8 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Recent Leave Requests
              </h3>
              <button
                onClick={() => setActiveTab('requests')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View History
              </button>
            </div>

            <div className="space-y-2.5">
              {requests.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No leave requests submitted yet
                </div>
              ) : (
                requests.slice(0, 4).map((req) => (
                  <div
                    key={req._id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {req.startDate}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {req.leaveType === 'CL' ? 'Casual Leave' : req.leaveType === 'SL' ? 'Sick Leave' : 'Unpaid Leave'} • Applied {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      req.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : req.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LEAVE HISTORY TABLE & FILTER */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 text-xs">All Leave Requests</h3>
            <div className="flex items-center gap-1.5">
              {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {status}
                </button>
              ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">From Date</th>
                    <th className="py-3 px-4">To Date</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Applied On</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <CalendarOff className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} leave requests found
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              req.autoClassification === 'CL'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.autoClassification === 'SL'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {req.autoClassification || 'CL'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{req.startDate}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold">{req.endDate}</td>
                        <td className="py-3.5 px-4 text-slate-900 font-bold">
                          {req.isHalfDay ? `0.5 Day (${req.halfDayType})` : `${req.totalDays} Day(s)`}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs text-slate-600 truncate">
                          <span className="font-semibold text-slate-800">{req.reasonCategory}:</span>{' '}
                          {req.reasonDetails}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'Pending' || req.status === 'Pending_Review' || req.status === 'Flagged'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                req.status === 'Approved'
                                  ? 'bg-emerald-500'
                                  : req.status === 'Rejected'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List matching EppanelM.png #7 */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CalendarOff className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} leave requests found
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div key={req._id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.autoClassification === 'CL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.autoClassification === 'SL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {req.autoClassification || 'CL'}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {req.isHalfDay ? `0.5 Day (${req.halfDayType})` : `${req.totalDays} Day(s)`}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'Pending' || req.status === 'Pending_Review' || req.status === 'Flagged'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            req.status === 'Approved'
                              ? 'bg-emerald-500'
                              : req.status === 'Rejected'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex items-center justify-between">
                      <span className="font-medium text-slate-500">Date Range:</span>
                      <span className="font-bold text-slate-900">
                        {req.startDate} {req.startDate !== req.endDate ? `to ${req.endDate}` : ''}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600">
                      <strong className="text-slate-800">{req.reasonCategory}:</strong> {req.reasonDetails}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Applied on: {new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPLY LEAVE MODAL matching EppanelD.png #8 & EppanelM.png #8 */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header matching EppanelM.png Screen 7 */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="p-1 -ml-1 text-slate-300 hover:text-white cursor-pointer"
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
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Apply for Leave</h3>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              {/* Leave Policy Notice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Leave Classification</label>
                <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                      LWP
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-950">Standard Unpaid Leave (LWP)</div>
                      <div className="text-[11px] text-amber-800">Company policy: all leaves are unpaid by default without segregation</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2.5 py-1 rounded-lg shrink-0">
                    Payroll Deductible
                  </span>
                </div>
              </div>

              {/* Duration: Full Day vs Half Day */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-700">Duration</label>
                <div className="flex items-center gap-6 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="duration"
                      checked={!applyForm.isHalfDay}
                      onChange={() => setApplyForm({ ...applyForm, isHalfDay: false })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Full Day
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="duration"
                      checked={applyForm.isHalfDay}
                      onChange={() => setApplyForm({ ...applyForm, isHalfDay: true })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Half Day
                  </label>
                </div>

                {applyForm.isHalfDay && (
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-6 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="radio"
                        name="halfDaySession"
                        value="FirstHalf"
                        checked={applyForm.halfDayType === 'FirstHalf'}
                        onChange={(e) => setApplyForm({ ...applyForm, halfDayType: e.target.value })}
                        className="text-emerald-600"
                      />
                      First Half (Morning)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="radio"
                        name="halfDaySession"
                        value="SecondHalf"
                        checked={applyForm.halfDayType === 'SecondHalf'}
                        onChange={(e) => setApplyForm({ ...applyForm, halfDayType: e.target.value })}
                        className="text-emerald-600"
                      />
                      Second Half (Afternoon)
                    </label>
                  </div>
                )}
              </div>

              {/* Date Inputs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Leave Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setApplyForm({
                        ...applyForm,
                        startDate: newStart,
                        endDate: applyForm.isHalfDay ? newStart : (applyForm.endDate < newStart ? newStart : applyForm.endDate)
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {!applyForm.isHalfDay && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">To Date (Optional for single day)</label>
                  <input
                    type="date"
                    required
                    min={applyForm.startDate}
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Total Days Indicator */}
              <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900">Total Requested Leave:</span>
                <span className="font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">
                  {calculateDays()} {calculateDays() === 1 || calculateDays() === 0.5 ? 'Day' : 'Days'}
                </span>
              </div>

              {/* Reason Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason Category *</label>
                <select
                  value={applyForm.reasonCategory}
                  onChange={(e) => setApplyForm({ ...applyForm, reasonCategory: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Personal">Personal</option>
                  <option value="Health">Sick / Medical</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Other">Other Operational</option>
                </select>
              </div>

              {/* Reason Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason Details *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Enter reason for leave..."
                  value={applyForm.reasonDetails}
                  onChange={(e) => setApplyForm({ ...applyForm, reasonDetails: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Action Buttons matching EppanelM.png Screen 7 */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition text-center tracking-wider uppercase cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition text-center tracking-wider uppercase cursor-pointer"
                >
                  {submitting ? 'APPLYING...' : 'APPLY LEAVE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
