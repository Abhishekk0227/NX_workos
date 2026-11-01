import React, { useState, useEffect } from 'react';
import {
  CalendarOff,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  ShieldCheck,
  User,
  ArrowRight,
  Plus,
  X,
  Settings,
  Calendar,
  Check
} from 'lucide-react';
import api from '../../api/client';

export default function HRLeave() {
  const [requests, setRequests] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Pending', 'Approved', 'Rejected'
  const [typeFilter, setTypeFilter] = useState('All');

  // Ledger inspection modal
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerBalances, setLedgerBalances] = useState(null);

  // Policy creation modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    name: 'Standard Corporate Policy',
    clAnnualQuota: 12,
    slAnnualQuota: 10,
    applicationCutOffHours: 2,
    allowHalfDay: true,
    fallbackPolicy: 'LWP',
    lateLeavePolicy: 'Flag_For_Review',
    isDefault: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, polRes] = await Promise.all([
        api.get('/leaves/all'),
        api.get('/leaves/policies')
      ]);
      setRequests(reqRes.data?.requests || []);
      setPolicies(polRes.data?.policies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (leaveId, status) => {
    const reviewRemarks = prompt(`Enter remarks for marking this leave as ${status}:`);
    if (reviewRemarks === null) return;

    try {
      const res = await api.patch(`/leaves/${leaveId}/review`, {
        status,
        reviewRemarks
      });
      if (res.data?.success) {
        alert(res.data.message || `Leave marked as ${status}`);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Review failed');
    }
  };

  const handleConvertToLwp = async (leave) => {
    const reason = prompt(
      `Enter mandatory audit reason to convert ${leave.employee?.fullName}'s leave (${leave.autoClassification}) to LWP:`
    );
    if (!reason || !reason.trim()) return;

    try {
      const res = await api.post(`/leaves/${leave._id}/convert-lwp`, { reason });
      if (res.data?.success) {
        alert(res.data.message || 'Leave successfully converted to LWP');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Conversion failed');
    }
  };

  const openLedgerModal = async (employee) => {
    setLedgerTarget(employee);
    setShowLedgerModal(true);
    try {
      const res = await api.get(`/leaves/balance/${employee._id}`);
      if (res.data?.success) {
        setLedgerBalances(res.data.balances);
        setLedgerData(res.data.ledger || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/leaves/policies', policyForm);
      if (res.data?.success) {
        alert('Leave policy created successfully!');
        setShowPolicyModal(false);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Policy creation failed');
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'All') {
      if (statusFilter === 'Pending' && req.status !== 'Pending' && req.status !== 'Pending_Review' && req.status !== 'Flagged') return false;
      if (statusFilter === 'Approved' && req.status !== 'Approved') return false;
      if (statusFilter === 'Rejected' && req.status !== 'Rejected') return false;
    }
    if (typeFilter !== 'All' && req.autoClassification !== typeFilter) return false;
    return true;
  });

  // Summary counts
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let lwpConvertedCount = 0;

  requests.forEach((r) => {
    if (r.status === 'Approved') approvedCount++;
    else if (r.status === 'Rejected') rejectedCount++;
    else pendingCount++;

    if (r.convertedToLwp) lwpConvertedCount++;
  });

  return (
    <div className="space-y-6">
      {/* Top Header matching hrpanelD.png #6 & HrpanelMui.png #7 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Review, approve, and track employee leave applications and ledgers</p>
        </div>

        <button
          onClick={() => setShowPolicyModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-500" /> Policy Settings
        </button>
      </div>

      {/* 4 Summary Cards matching hrpanelD.png #6 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Requests</span>
          <span className="text-2xl font-black text-slate-900">{requests.length}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Lifetime</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs text-center">
          <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">Pending Action</span>
          <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Needs Review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Approved</span>
          <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Granted</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs text-center">
          <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">Converted to LWP</span>
          <span className="text-2xl font-black text-rose-600">{lwpConvertedCount}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Loss of Pay</span>
        </div>
      </div>

      {/* Filter Tabs Bar matching Mockup */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-3">
        {/* Status Filter Tabs: All | Pending | Approved | Rejected */}
        <div className="flex items-center gap-1.5">
          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-500">Classification:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="All">All Types</option>
            <option value="CL">Casual Leave (CL)</option>
            <option value="SL">Sick Leave (SL)</option>
            <option value="LWP">Leave Without Pay (LWP)</option>
          </select>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">From Date</th>
                <th className="py-3.5 px-4">To Date</th>
                <th className="py-3.5 px-4">Days</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Applied On</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <CalendarOff className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No leave applications matching the filters
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{req.employee?.fullName}</div>
                      <div className="font-mono text-[11px] text-emerald-600 font-semibold">{req.employee?.employeeId}</div>
                      <button
                        onClick={() => openLedgerModal(req.employee)}
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <History className="w-3 h-3" /> Ledger
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          req.autoClassification === 'CL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.autoClassification === 'SL'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {req.autoClassification || 'CL'}
                      </span>
                      {req.convertedToLwp && (
                        <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          Converted LWP
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-800 font-medium">{req.startDate}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">{req.endDate}</td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {req.isHalfDay ? `0.5 Day` : `${req.totalDays} Day(s)`}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs text-slate-600 truncate">
                      <strong className="text-slate-800">{req.reasonCategory}:</strong> {req.reasonDetails}
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

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status !== 'Approved' && (
                          <button
                            onClick={() => handleReview(req._id, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {req.status !== 'Rejected' && (
                          <button
                            onClick={() => handleReview(req._id, 'Rejected')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                        {!req.convertedToLwp && ['CL', 'SL'].includes(req.autoClassification) && (
                          <button
                            onClick={() => handleConvertToLwp(req)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                            title="Convert to LWP and reverse deduction"
                          >
                            Convert LWP
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEDGER MODAL */}
      {showLedgerModal && ledgerTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Employee Leave Ledger & Balance</h3>
                <p className="text-xs text-slate-400">{ledgerTarget.fullName} ({ledgerTarget.employeeId})</p>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {ledgerBalances && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Casual Leave (CL)</span>
                    <strong className="text-xl font-black text-emerald-900">{ledgerBalances.clBalance} days</strong>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">Sick Leave (SL)</span>
                    <strong className="text-xl font-black text-rose-900">{ledgerBalances.slBalance} days</strong>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">LWP Taken</span>
                    <strong className="text-xl font-black text-amber-900">{ledgerBalances.lwpCount} days</strong>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Immutable Ledger Entries</h4>
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {ledgerData.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">No ledger records</div>
                  ) : (
                    ledgerData.map((tx) => (
                      <div key={tx._id} className="p-2.5 bg-slate-50 rounded-xl text-xs flex justify-between items-center border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800">{tx.leaveType}</span> —{' '}
                          <span className={`font-semibold ${tx.transactionType === 'Credit' || tx.transactionType === 'Reversal' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.transactionType} ({tx.units} days)
                          </span>
                          <div className="text-[11px] text-slate-500 mt-0.5">{tx.remarks}</div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POLICY MODAL */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Leave Policy Configuration</h3>
                <p className="text-[11px] text-slate-300">Set quotas and operational cut-off rules</p>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Corporate Policy"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CL Annual Quota</label>
                  <input
                    type="number"
                    min="0"
                    value={policyForm.clAnnualQuota}
                    onChange={(e) => setPolicyForm({ ...policyForm, clAnnualQuota: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SL Annual Quota</label>
                  <input
                    type="number"
                    min="0"
                    value={policyForm.slAnnualQuota}
                    onChange={(e) => setPolicyForm({ ...policyForm, slAnnualQuota: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Notice (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    value={policyForm.applicationCutOffHours}
                    onChange={(e) => setPolicyForm({ ...policyForm, applicationCutOffHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quota Exhausted Fallback</label>
                  <select
                    value={policyForm.fallbackPolicy}
                    onChange={(e) => setPolicyForm({ ...policyForm, fallbackPolicy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none"
                  >
                    <option value="LWP">Fallback to LWP</option>
                    <option value="Reject">Auto Reject</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
