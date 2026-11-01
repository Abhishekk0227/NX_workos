import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  Lock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  TrendingDown,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Search,
  History,
  Eye,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Sliders,
  Check
} from 'lucide-react';
import api from '../../api/client';

export default function HRPayroll() {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'leaves' | 'history'

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [previews, setPreviews] = useState([]);
  const [missingProfiles, setMissingProfiles] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [monthLeaves, setMonthLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Reclassification Modal State
  const [showReclassifyModal, setShowReclassifyModal] = useState(false);
  const [targetLeave, setTargetLeave] = useState(null);
  const [targetClassification, setTargetClassification] = useState('LWP');
  const [reclassifyReason, setReclassifyReason] = useState('');

  // Payslip Modal State
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipData, setPayslipData] = useState(null);

  const fetchPayrollPreview = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/preview?month=${selectedMonth}`);
      if (res.data?.success) {
        setPreviews(res.data.previews || []);
        setMissingProfiles(res.data.missingProfiles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthLeaves = async () => {
    try {
      const res = await api.get(`/payroll/leaves-review?month=${selectedMonth}`);
      if (res.data?.success) {
        setMonthLeaves(res.data.leaves || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/history');
      if (res.data?.success) {
        setHistoryRecords(res.data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'preview') {
      fetchPayrollPreview();
    } else if (activeTab === 'leaves') {
      fetchMonthLeaves();
    } else {
      fetchHistory();
    }
  }, [selectedMonth, activeTab]);

  const handleGeneratePayroll = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/payroll/generate', { month: selectedMonth });
      if (res.data?.success) {
        alert(res.data.message || 'Payroll generated successfully!');
        fetchPayrollPreview();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payroll generation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalizePayroll = async () => {
    const notes = prompt(`Enter notes for finalizing and locking ${selectedMonth} payroll:`);
    if (notes === null) return;

    setProcessing(true);
    try {
      const res = await api.post('/payroll/finalize', { month: selectedMonth, notes });
      if (res.data?.success) {
        alert(res.data.message || 'Payroll finalized and locked!');
        fetchPayrollPreview();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Finalization failed');
    } finally {
      setProcessing(false);
    }
  };

  const openReclassifyModal = (leave) => {
    setTargetLeave(leave);
    setTargetClassification(leave.autoClassification === 'LWP' ? 'CL' : 'LWP');
    setReclassifyReason('');
    setShowReclassifyModal(true);
  };

  const handleExecuteReclassification = async (e) => {
    e.preventDefault();
    if (!targetLeave || !reclassifyReason.trim()) {
      alert('Please enter an audit reason for leave reclassification');
      return;
    }

    try {
      const res = await api.post('/payroll/reclassify-leave', {
        leaveId: targetLeave._id,
        targetClassification,
        reason: reclassifyReason.trim()
      });
      if (res.data?.success) {
        alert(res.data.message || 'Leave reclassified successfully!');
        setShowReclassifyModal(false);
        setReclassifyReason('');
        if (activeTab === 'leaves') {
          fetchMonthLeaves();
        } else {
          fetchPayrollPreview();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Reclassification failed');
    }
  };

  // Calculations
  const totalEmployeesCount = previews.length;
  const totalGross = previews.reduce((acc, p) => acc + (p.grossSalary || 0), 0);
  const totalDeductions = previews.reduce((acc, p) => acc + (p.totalDeductions || p.lwpDeduction || 0), 0);
  const totalNet = previews.reduce((acc, p) => acc + (p.netPayable || 0), 0);

  const processedCount = previews.filter(p => p.savedStatus === 'Finalized' || p.savedStatus === 'Review' || p.savedStatus === 'Draft').length;
  const pendingCount = Math.max(0, totalEmployeesCount - processedCount);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Payroll</h1>
            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
              HR Confidential
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Attendance-backed net pay, per-minute late arrival deductions, CL/SL-to-LWP adjustments, and record finalization
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs outline-none text-center sm:text-left"
          />

          <button
            onClick={handleGeneratePayroll}
            disabled={processing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
            Generate Payroll
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Headcount</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              {totalEmployeesCount}
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">{totalEmployeesCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium">All active employees</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Payroll</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">₹ {(totalGross / 1000).toFixed(1)}k</div>
          <span className="text-[11px] text-slate-400">Base committed compensation</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Deductions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 font-mono">-₹ {(totalDeductions / 1000).toFixed(1)}k</div>
          <span className="text-[11px] text-slate-400">Late + Half-day + LWP</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Payable</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">₹ {(totalNet / 1000).toFixed(1)}k</div>
          <span className="text-[11px] text-emerald-600 font-medium">{processedCount} records computed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'preview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payroll ({selectedMonth})
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'leaves'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Leave Review
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'preview' && (
          <button
            onClick={handleFinalizePayroll}
            disabled={processing || previews.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" /> Finalize & Lock Payroll
          </button>
        )}
      </div>

      {/* Missing Profiles Warning */}
      {missingProfiles.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
          <strong>Notice:</strong> {missingProfiles.length} active employee(s) need salary configuration:
          <span className="ml-1 font-semibold">{missingProfiles.map(m => m.fullName).join(', ')}</span>
        </div>
      )}

      {/* TAB 1: PAYROLL CALCULATION (Mobile Cards + Desktop Table) */}
      {activeTab === 'preview' && (
        <div className="space-y-3">
          {/* Mobile Card Feed */}
          <div className="block md:hidden space-y-2.5">
            {previews.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                No payroll records generated yet for {selectedMonth}. Click "Generate Payroll" above.
              </div>
            ) : (
              previews.map((item) => (
                <div
                  key={item.employee}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {item.employeeDetails?.fullName}
                      </div>
                      <div className="font-mono text-[10px] text-emerald-600 font-semibold">
                        {item.employeeDetails?.employeeId} • {item.employeeDetails?.department}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Processed
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Gross</span>
                      <span className="font-mono font-bold text-slate-800">₹{item.grossSalary?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Deductions</span>
                      <span className="font-mono font-bold text-rose-600">
                        {item.totalDeductions > 0 ? `-₹${item.totalDeductions?.toLocaleString()}` : '₹0'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Net Pay</span>
                      <span className="font-mono font-black text-emerald-700">₹{item.netPayable?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      <span>{item.presentDays || 0}P</span>
                      {item.halfDays > 0 && <span className="ml-1 text-amber-600">+{item.halfDays}HD</span>}
                      {item.paidLeaveDays > 0 && <span className="ml-1 text-blue-600">+{item.paidLeaveDays}LV</span>}
                      {item.totalLateMinutes > 0 && <span className="ml-1 text-rose-500 font-mono">({item.totalLateMinutes}m L)</span>}
                    </div>

                    <button
                      onClick={() => {
                        setPayslipData(item);
                        setShowPayslipModal(true);
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition"
                    >
                      View Payslip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Calendar Days</th>
                    <th className="py-3.5 px-4">Present / Half</th>
                    <th className="py-3.5 px-4">Late Mins</th>
                    <th className="py-3.5 px-4">Paid Leave / LWP</th>
                    <th className="py-3.5 px-4">Gross Salary</th>
                    <th className="py-3.5 px-4">Deductions</th>
                    <th className="py-3.5 px-4">Net Salary</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previews.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-slate-400">
                        No payroll records generated yet for {selectedMonth}. Click "Generate Payroll" above.
                      </td>
                    </tr>
                  ) : (
                    previews.map((item) => (
                      <tr key={item.employee} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {item.employeeDetails?.fullName}
                          </div>
                          <div className="font-mono text-[11px] text-emerald-600 font-semibold">
                            {item.employeeDetails?.employeeId}
                          </div>
                          <div className="text-[10px] text-slate-400">{item.employeeDetails?.department}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-medium">{item.calendarDays || 30} days</td>

                        <td className="py-3.5 px-4">
                          <span className="text-emerald-700 font-bold">{item.presentDays || 0} P</span>
                          {item.halfDays > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                              {item.halfDays} HD
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {item.totalLateMinutes > 0 ? (
                            <div>
                              <span className="font-mono text-rose-600 font-bold">{item.totalLateMinutes}m</span>
                              {item.lateDeduction > 0 && (
                                <div className="text-[10px] text-rose-500 font-mono">-₹{item.lateDeduction}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">0m</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-blue-700 font-semibold">{item.paidLeaveDays || 0} CL/SL</span>
                          {item.lwpDays > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                              {item.lwpDays} LWP
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          ₹ {item.grossSalary?.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-rose-600">
                          {item.totalDeductions > 0 ? `-₹ ${item.totalDeductions?.toLocaleString()}` : '₹ 0'}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                          ₹ {item.netPayable?.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Processed
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPayslipData(item);
                                setShowPayslipModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="View Itemized Payslip Breakdown"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRE-PAYROLL LEAVE REVIEW (Conditions 47-53) */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Monthly Leaves Audit & Classification ({selectedMonth})</h3>
              <p className="text-slate-500 text-[11px]">
                Review employee leaves for this payroll cycle. Reclassify Sick Leave (SL) or Paid CL to LWP before finalizing salaries.
              </p>
            </div>
            <button
              onClick={fetchMonthLeaves}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Refresh Leaves
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Reason Category</th>
                  <th className="py-3.5 px-4">Reason Details</th>
                  <th className="py-3.5 px-4">Classification</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No leave requests submitted for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  monthLeaves.map((lv) => (
                    <tr key={lv._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{lv.employee?.fullName}</div>
                        <div className="font-mono text-[11px] text-emerald-600 font-semibold">{lv.employee?.employeeId}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {lv.startDate} {lv.startDate !== lv.endDate ? `to ${lv.endDate}` : ''}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {lv.totalDays} day{lv.totalDays > 1 ? 's' : ''}
                        {lv.isHalfDay ? ' (Half)' : ''}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lv.reasonCategory === 'Health' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {lv.reasonCategory}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={lv.reasonDetails}>
                        {lv.reasonDetails}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          lv.autoClassification === 'CL' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          lv.autoClassification === 'SL' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          lv.autoClassification === 'LWP' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {lv.autoClassification}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lv.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {lv.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openReclassifyModal(lv)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Reclassify
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

      {/* TAB 3: FINALIZED HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Month</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Gross Salary</th>
                  <th className="py-3.5 px-4">Payable Days</th>
                  <th className="py-3.5 px-4">Late / LWP Deductions</th>
                  <th className="py-3.5 px-4">Net Salary</th>
                  <th className="py-3.5 px-4">Lock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No finalized payroll records yet
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((hist) => (
                    <tr key={hist._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{hist.month}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{hist.employee?.fullName}</div>
                        <div className="font-mono text-[10px] text-emerald-600">{hist.employee?.employeeId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">₹ {hist.grossSalary?.toLocaleString()}</td>
                      <td className="py-3.5 px-4">{hist.payableDays} / {hist.calendarDays} days</td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">
                        -₹ {((hist.lateDeduction || 0) + (hist.halfDayDeduction || 0) + (hist.lwpDeduction || 0))?.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">₹ {hist.netPayable?.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ITEMIZED PAYSLIP MODAL */}
      {showPayslipModal && payslipData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Itemized Payslip Breakdown</h3>
                <p className="text-[11px] text-slate-300">
                  {payslipData.employeeDetails?.fullName} ({payslipData.employeeDetails?.employeeId}) • {selectedMonth}
                </p>
              </div>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Monthly Gross Salary</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    ₹ {payslipData.grossSalary?.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Daily Rate Basis</span>
                  <span className="font-bold text-slate-900">{payslipData.dailyRateBasis}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Per-Day Rate</span>
                  <span className="font-bold text-slate-900 font-mono">₹ {payslipData.perDayRate?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Per-Minute Rate</span>
                  <span className="font-bold text-slate-900 font-mono">₹ {payslipData.perMinuteRate?.toFixed(4)} / min</span>
                </div>
              </div>

              {/* Attendance Counts */}
              <div className="space-y-1.5 py-2 border-b border-slate-100">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600">Present Working Days:</span>
                  <span className="font-bold text-slate-900">{payslipData.presentDays} days</span>
                </div>
                {payslipData.halfDays > 0 && (
                  <div className="flex justify-between items-center py-1 text-amber-700">
                    <span>Half Days Worked:</span>
                    <span className="font-bold">{payslipData.halfDays} days</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600">Paid Leaves (CL/SL):</span>
                  <span className="font-bold text-slate-900">{payslipData.paidLeaveDays} days</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600">Weekly Offs:</span>
                  <span className="font-bold text-slate-900">{payslipData.weeklyOffDays} days</span>
                </div>
              </div>

              {/* Itemized Deductions (Conditions 56-62) */}
              <div className="space-y-2 py-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Itemized Deductions</h4>

                {payslipData.deductionBreakdown && payslipData.deductionBreakdown.length > 0 ? (
                  payslipData.deductionBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 px-3 bg-rose-50/70 border border-rose-100 rounded-xl text-rose-700">
                      <span>{item.description}</span>
                      <span className="font-mono font-bold">-₹ {item.amount?.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-center py-2">No deductions applicable for this period.</div>
                )}
              </div>

              {/* Net Payable Banner */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-emerald-900 text-sm block">Net Payable Salary</span>
                  <span className="text-[10px] text-emerald-700">Payable days: {payslipData.payableDays} of {payslipData.calendarDays}</span>
                </div>
                <span className="font-black text-emerald-800 font-mono text-xl">
                  ₹ {payslipData.netPayable?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowPayslipModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE RECLASSIFICATION MODAL */}
      {showReclassifyModal && targetLeave && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-amber-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Reclassify Leave Request</h3>
                <p className="text-xs text-amber-200">
                  {targetLeave.employee?.fullName} ({targetLeave.employee?.employeeId}) • {targetLeave.startDate} ({targetLeave.totalDays} day)
                </p>
              </div>
              <button
                onClick={() => setShowReclassifyModal(false)}
                className="w-8 h-8 rounded-full bg-amber-900 hover:bg-amber-700 text-amber-200 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteReclassification} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                Reclassifying updates the leave ledger, adjusts payable days, recalculates salary deductions, and preserves the original application with an immutable audit log (Conditions 48-53).
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Classification
                </label>
                <input
                  type="text"
                  disabled
                  value={`${targetLeave.autoClassification} (${targetLeave.reasonCategory}: "${targetLeave.reasonDetails}")`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Payroll Classification *
                </label>
                <select
                  value={targetClassification}
                  onChange={(e) => setTargetClassification(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="CL">Paid Casual Leave (CL)</option>
                  <option value="SL">Paid Sick Leave (SL) - HR Medical Approval</option>
                  <option value="LWP">Leave Without Pay (LWP) - Salary Deduction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory HR Audit Reason *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Approved medical documentation presented; or quota exceeded converted to LWP..."
                  value={reclassifyReason}
                  onChange={(e) => setReclassifyReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReclassifyModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Execute Reclassification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
