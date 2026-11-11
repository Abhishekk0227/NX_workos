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
  Check,
  ShieldAlert,
  Edit2,
  RotateCcw
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer, CardListShimmer } from '../../components/common/Shimmer';
import ShortAttendanceModal from '../../components/modals/ShortAttendanceModal';
import { formatDateIST, formatWorkingHours } from '../../utils/timeUtils';

export default function HRPayroll() {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'shortAttendance' | 'leaves' | 'history'

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [previews, setPreviews] = useState([]);
  const [missingProfiles, setMissingProfiles] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [monthLeaves, setMonthLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Short Attendance State & Review
  const [shortAttendanceSessions, setShortAttendanceSessions] = useState([]);
  const [thresholds, setThresholds] = useState({ fullDayThresholdHours: 8, halfDayThresholdHours: 4 });
  const [showShortAttendanceModal, setShowShortAttendanceModal] = useState(false);
  const [targetShortAttendance, setTargetShortAttendance] = useState(null);
  const [loadingShortAttendance, setLoadingShortAttendance] = useState(false);

  // Reclassification Modal State
  const [showReclassifyModal, setShowReclassifyModal] = useState(false);
  const [targetLeave, setTargetLeave] = useState(null);
  const [targetClassification, setTargetClassification] = useState('LWP');
  const [reclassifyReason, setReclassifyReason] = useState('');

  // Payslip Modal State
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipData, setPayslipData] = useState(null);

  // Manual Payroll Edit Modal State
  const [showEditPayrollModal, setShowEditPayrollModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [savingManualEdit, setSavingManualEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    grossSalary: 0,
    bonusAmount: 0,
    presentDays: 0,
    halfDays: 0,
    paidLeaveDays: 0,
    weeklyOffDays: 0,
    lwpDays: 0,
    payableDays: 0,
    lateDeduction: 0,
    halfDayDeduction: 0,
    shortAttendanceDeduction: 0,
    lwpDeduction: 0,
    shortfallDeduction: 0,
    otherDeductions: 0,
    overrideNetPayable: false,
    netPayable: 0,
    reason: '',
    notes: ''
  });

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

  const fetchMonthShortAttendance = async () => {
    setLoadingShortAttendance(true);
    try {
      const res = await api.get(`/payroll/short-attendance-review?month=${selectedMonth}`);
      if (res.data?.success) {
        setShortAttendanceSessions(res.data.records || []);
        if (res.data.thresholds) {
          setThresholds(res.data.thresholds);
        }
      }
    } catch (err) {
      console.error('Failed to load short attendance sessions:', err);
    } finally {
      setLoadingShortAttendance(false);
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
      fetchMonthShortAttendance();
    } else if (activeTab === 'shortAttendance') {
      fetchMonthShortAttendance();
    } else if (activeTab === 'leaves') {
      fetchMonthLeaves();
    } else {
      fetchHistory();
    }
  }, [selectedMonth, activeTab]);

  const handleShortAttendanceSuccess = () => {
    fetchPayrollPreview();
    fetchMonthShortAttendance();
  };

  const openEmployeeShortfall = async (item) => {
    // Find attendance record in shortAttendanceSessions matching this employee
    const match = shortAttendanceSessions.find(
      (s) => s.employee?._id === item.employee || s.employee?.employeeId === item.employeeDetails?.employeeId
    );
    if (match) {
      setTargetShortAttendance(match);
      setShowShortAttendanceModal(true);
    } else {
      try {
        const res = await api.get(`/attendance/all?employeeId=${item.employee}&month=${selectedMonth}`);
        const shortRec = res.data?.records?.find(
          (r) => r.status === 'Short Attendance' || r.shortAttendanceAlert?.isAlert
        );
        if (shortRec) {
          setTargetShortAttendance(shortRec);
          setShowShortAttendanceModal(true);
        } else {
          alert('No unresolved short attendance sessions found for this employee.');
        }
      } catch (err) {
        alert('Failed to load short attendance details.');
      }
    }
  };

  const handleGeneratePayroll = async () => {
    if (!selectedMonth) {
      alert('Please select a valid month first.');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/payroll/generate', { month: selectedMonth });
      if (res.data?.success) {
        if (res.data.savedCount === 0 && res.data.errors?.length > 0) {
          alert(`Payroll generation issue:\n${res.data.errors.join('\n')}`);
        } else {
          alert(res.data.message || 'Payroll generated successfully!');
          fetchPayrollPreview();
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Payroll generation failed';
      alert(`Payroll Generation Failed: ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalizePayroll = async () => {
    if (!window.confirm(`Are you sure you want to finalize and permanently LOCK all payroll records for ${selectedMonth}? This action cannot be undone.`)) {
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post('/payroll/finalize', { month: selectedMonth });
      if (res.data?.success) {
        alert(res.data.message || 'Payroll locked and finalized.');
        setActiveTab('history');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Finalize failed');
    } finally {
      setProcessing(false);
    }
  };

  const openReclassifyModal = (lv) => {
    setTargetLeave(lv);
    setTargetClassification('LWP');
    setReclassifyReason('');
    setShowReclassifyModal(true);
  };

  const handleReclassifySubmit = async (e) => {
    e.preventDefault();
    if (!reclassifyReason.trim()) {
      alert('A detailed audit reason is mandatory for leave reclassification.');
      return;
    }

    try {
      const res = await api.patch(`/leaves/${targetLeave._id}/reclassify`, {
        targetClassification,
        reason: reclassifyReason
      });

      if (res.data?.success) {
        alert('Leave successfully reclassified to ' + targetClassification);
        setShowReclassifyModal(false);
        fetchMonthLeaves();
        fetchPayrollPreview();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Reclassification failed');
    }
  };

  const openEditPayrollModal = (item, fromHistory = false) => {
    const status = fromHistory ? item.status : (item.savedStatus || 'Unprocessed');
    if (status === 'Finalized') {
      alert('Finalized payroll records are locked and cannot be edited.');
      return;
    }

    const empObj = fromHistory ? item.employee : item.employeeDetails;
    const empId = fromHistory ? item.employee?._id : item.employee;
    const payrollRecordId = fromHistory ? item._id : (item.existingRecordId || null);

    setEditTarget({
      payrollRecordId,
      employeeId: empId,
      month: item.month || selectedMonth,
      fullName: empObj?.fullName || 'Employee',
      empCode: empObj?.employeeId || '',
      status,
      isManuallyEdited: Boolean(item.isManuallyEdited),
      manualEditReason: item.manualEditReason || ''
    });

    setEditForm({
      grossSalary: item.grossSalary ?? 0,
      bonusAmount: item.bonusAmount ?? 0,
      presentDays: item.presentDays ?? 0,
      halfDays: item.halfDays ?? 0,
      paidLeaveDays: item.paidLeaveDays ?? 0,
      weeklyOffDays: item.weeklyOffDays ?? 0,
      lwpDays: item.lwpDays ?? 0,
      payableDays: item.payableDays ?? 0,
      lateDeduction: item.lateDeduction ?? 0,
      halfDayDeduction: item.halfDayDeduction ?? 0,
      shortAttendanceDeduction: item.shortAttendanceDeduction ?? 0,
      lwpDeduction: item.lwpDeduction ?? 0,
      shortfallDeduction: item.shortfallDeduction ?? 0,
      otherDeductions: item.otherDeductions ?? 0,
      overrideNetPayable: Boolean(item.isNetPayableOverridden),
      netPayable: item.netPayable ?? 0,
      reason: item.manualEditReason || '',
      notes: item.notes || ''
    });
    setEditError('');
    setShowEditPayrollModal(true);
  };

  const liveManualDeductionsTotal = parseFloat(
    (
      (Number(editForm.lateDeduction) || 0) +
      (Number(editForm.halfDayDeduction) || 0) +
      (Number(editForm.shortAttendanceDeduction) || 0) +
      (Number(editForm.lwpDeduction) || 0) +
      (Number(editForm.shortfallDeduction) || 0) +
      (Number(editForm.otherDeductions) || 0)
    ).toFixed(2)
  );

  const liveComputedNetPayable = Math.max(
    0,
    parseFloat(
      ((Number(editForm.grossSalary) || 0) + (Number(editForm.bonusAmount) || 0) - liveManualDeductionsTotal).toFixed(2)
    )
  );

  const handleManualEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.reason || !editForm.reason.trim()) {
      setEditError('Please provide an audit reason for the manual payroll edit.');
      return;
    }
    setSavingManualEdit(true);
    setEditError('');
    try {
      const payload = {
        payrollRecordId: editTarget.payrollRecordId,
        employeeId: editTarget.employeeId,
        month: editTarget.month,
        grossSalary: Number(editForm.grossSalary),
        bonusAmount: Number(editForm.bonusAmount || 0),
        presentDays: Number(editForm.presentDays),
        halfDays: Number(editForm.halfDays),
        paidLeaveDays: Number(editForm.paidLeaveDays),
        weeklyOffDays: Number(editForm.weeklyOffDays),
        lwpDays: Number(editForm.lwpDays),
        payableDays: Number(editForm.payableDays),
        lateDeduction: Number(editForm.lateDeduction || 0),
        halfDayDeduction: Number(editForm.halfDayDeduction || 0),
        shortAttendanceDeduction: Number(editForm.shortAttendanceDeduction || 0),
        lwpDeduction: Number(editForm.lwpDeduction || 0),
        shortfallDeduction: Number(editForm.shortfallDeduction || 0),
        otherDeductions: Number(editForm.otherDeductions || 0),
        overrideNetPayable: Boolean(editForm.overrideNetPayable),
        netPayable: editForm.overrideNetPayable ? Number(editForm.netPayable) : liveComputedNetPayable,
        reason: editForm.reason.trim(),
        notes: editForm.notes?.trim() || ''
      };

      const res = await api.put('/payroll/manual-edit', payload);
      if (res.data?.success) {
        setShowEditPayrollModal(false);
        setEditTarget(null);
        if (activeTab === 'history') {
          fetchHistory();
        } else {
          fetchPayrollPreview();
        }
        alert(res.data.message || 'Payroll manually updated!');
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update payroll.');
    } finally {
      setSavingManualEdit(false);
    }
  };

  const handleResetToAuto = async (payrollRecordId) => {
    if (!payrollRecordId) return;
    if (!window.confirm('Reset this manually edited payroll record back to auto-calculated attendance & deduction figures?')) {
      return;
    }
    try {
      const res = await api.post(`/payroll/${payrollRecordId}/reset-auto`, {
        reason: 'Reset manually edited payroll to auto-calculated attendance values'
      });
      if (res.data?.success) {
        setShowEditPayrollModal(false);
        setShowPayslipModal(false);
        if (activeTab === 'history') {
          fetchHistory();
        } else {
          fetchPayrollPreview();
        }
        alert(res.data.message || 'Payroll reset to auto-calculated values.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset payroll.');
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  // Metrics summary
  const totalEmployeesCount = previews.length;
  const totalGross = previews.reduce((acc, curr) => acc + (curr.grossSalary || 0), 0);
  const totalDeductions = previews.reduce((acc, curr) => acc + (curr.totalDeductions || 0), 0);
  const totalNet = previews.reduce((acc, curr) => acc + (curr.netPayable || 0), 0);
  const processedCount = previews.filter(p => p.savedStatus !== 'Unprocessed').length;

  const pendingShortAttendanceCount = shortAttendanceSessions.filter(
    (s) => s.shortAttendanceAlert?.status === 'Pending' || s.status === 'Short Attendance'
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-blue-600" /> Payroll Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated salary computations with Short Attendance alerts, configurable working-hour thresholds, and audit trails.
          </p>
        </div>

        {/* Month selector & actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-1 text-xs font-bold text-slate-800 outline-none bg-transparent"
            />
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGeneratePayroll}
            disabled={processing}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Calculating...' : 'Generate Payroll'}
          </button>

          <button
            onClick={fetchPayrollPreview}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition shadow-2xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
          <span className="text-[11px] text-slate-400">Late + Half-day + Shortfall</span>
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
            onClick={() => setActiveTab('shortAttendance')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'shortAttendance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Short Attendance</span>
            {pendingShortAttendanceCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black animate-pulse">
                {pendingShortAttendanceCount} Action
              </span>
            ) : shortAttendanceSessions.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {shortAttendanceSessions.length}
              </span>
            ) : null}
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
            <Lock className="w-3.5 h-3.5" /> Finalize &amp; Lock Payroll
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

      {/* TAB 1: PAYROLL PREVIEW & REAL-TIME CALCULATION */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {loading ? (
              <CardListShimmer count={4} />
            ) : previews.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No payroll preview available for {selectedMonth}. Click "Generate Payroll" above.
              </div>
            ) : (
              previews.map((item) => (
                <div key={item.employee} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{item.employeeDetails?.fullName}</div>
                      <div className="font-mono text-[11px] text-emerald-600 font-semibold">{item.employeeDetails?.employeeId}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.savedStatus === 'Finalized'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : item.savedStatus === 'Review' || item.savedStatus === 'Draft'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {item.savedStatus || 'Preview'}
                      </span>
                      {item.isManuallyEdited && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Manually Edited
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Gross Pay</span>
                      <strong className="text-slate-800 font-mono">₹{item.grossSalary?.toLocaleString()}</strong>
                      {item.bonusAmount > 0 && (
                        <span className="block text-[10px] font-bold text-emerald-600 font-mono">+₹{item.bonusAmount?.toLocaleString()} Bonus</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Net Pay</span>
                      <strong className="text-emerald-700 font-mono text-xs">₹{item.netPayable?.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Deductions</span>
                      <strong className="text-rose-600 font-mono">-₹{item.totalDeductions?.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Payable Days</span>
                      <strong className="text-slate-800">{item.payableDays} / {item.calendarDays}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      <span>{item.presentDays || 0}P</span>
                      {item.halfDays > 0 && <span className="ml-1 text-amber-600">+{item.halfDays}HD</span>}
                      {item.shortAttendanceDays > 0 && (
                        <button
                          onClick={() => openEmployeeShortfall(item)}
                          className="ml-1 text-purple-700 font-bold underline cursor-pointer"
                        >
                          {item.shortAttendanceDays}Short
                        </button>
                      )}
                      {item.paidLeaveDays > 0 && <span className="ml-1 text-blue-600">+{item.paidLeaveDays}LV</span>}
                      {item.totalLateMinutes > 0 && <span className="ml-1 text-rose-500 font-mono">({item.totalLateMinutes}m L)</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.shortAttendanceDays > 0 && (
                        <button
                          onClick={() => openEmployeeShortfall(item)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-xs transition cursor-pointer"
                        >
                          Adjust Shortfall
                        </button>
                      )}
                      {item.savedStatus !== 'Finalized' && (
                        <button
                          onClick={() => openEditPayrollModal(item, false)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setPayslipData(item);
                          setShowPayslipModal(true);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        Payslip
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          {loading ? (
            <div className="hidden md:block">
              <TableShimmer cols={10} rows={6} />
            </div>
          ) : (
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">Calendar Days</th>
                      <th className="py-3.5 px-4">Present / Half / Short</th>
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
                            {item.shortAttendanceDays > 0 && (
                              <button
                                onClick={() => openEmployeeShortfall(item)}
                                className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 inline-flex items-center gap-1 cursor-pointer"
                                title="Click to review / adjust short attendance deduction"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-purple-600" />
                                {item.shortAttendanceDays} Short
                              </button>
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
                            <div>₹ {item.grossSalary?.toLocaleString()}</div>
                            {item.bonusAmount > 0 && (
                              <div className="text-[10px] font-semibold text-emerald-600">+₹ {item.bonusAmount?.toLocaleString()} bonus</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-rose-600">
                            {item.totalDeductions > 0 ? `-₹ ${item.totalDeductions?.toLocaleString()}` : '₹ 0'}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                            ₹ {item.netPayable?.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.savedStatus === 'Finalized'
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : item.savedStatus === 'Review' || item.savedStatus === 'Draft'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {item.savedStatus === 'Finalized' ? (
                                  <Lock className="w-3 h-3" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                )}
                                {item.savedStatus || 'Preview'}
                              </span>
                              {item.isManuallyEdited && (
                                <span
                                  title={item.manualEditReason || 'Manually edited by HR'}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                  Manual Edit
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.shortAttendanceDays > 0 && (
                                <button
                                  onClick={() => openEmployeeShortfall(item)}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="Review & Adjust Short Attendance Deductions"
                                >
                                  <Sliders className="w-4 h-4" />
                                </button>
                              )}
                              {item.savedStatus !== 'Finalized' && (
                                <button
                                  onClick={() => openEditPayrollModal(item, false)}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  title="Manually Edit Payroll"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
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
          )}
        </div>
      )}

      {/* TAB 2: SHORT ATTENDANCE REVIEW & HR DEDUCTION OVERRIDES (Section 3 Requirement) */}
      {activeTab === 'shortAttendance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Short Attendance Audit &amp; Deductions ({selectedMonth})</span>
                {pendingShortAttendanceCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-bold text-[10px]">
                    {pendingShortAttendanceCount} Pending HR Action
                  </span>
                )}
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Review sessions under half-day threshold. HR can adjust payable amount, enter deductions, or convert classification. Any changes immediately recalculate payroll.
              </p>
            </div>
            <button
              onClick={fetchMonthShortAttendance}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer shrink-0"
            >
              Refresh Sessions
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Session Date</th>
                  <th className="py-3.5 px-4">Logged Hours</th>
                  <th className="py-3.5 px-4">Alert Status</th>
                  <th className="py-3.5 px-4">HR Classification</th>
                  <th className="py-3.5 px-4">Pay / Deduction</th>
                  <th className="py-3.5 px-4">HR Remarks</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingShortAttendance ? (
                  <tr>
                    <td colSpan="8" className="py-8">
                      <TableShimmer rows={4} />
                    </td>
                  </tr>
                ) : shortAttendanceSessions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-slate-700">No Short Attendance sessions recorded for {selectedMonth}.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">All employees logged hours meeting or exceeding half-day thresholds.</p>
                    </td>
                  </tr>
                ) : (
                  shortAttendanceSessions.map((rec) => {
                    const isPending = rec.shortAttendanceAlert?.status === 'Pending' || rec.status === 'Short Attendance';
                    const isResolved = rec.shortAttendanceAlert?.status === 'Resolved';
                    const emp = rec.employee || {};

                    return (
                      <tr key={rec._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{emp.fullName}</div>
                          <div className="font-mono text-[11px] text-emerald-600 font-semibold">{emp.employeeId}</div>
                          <div className="text-[10px] text-slate-400">{emp.department}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{formatDateIST(rec.date)}</div>
                          <div className="text-[10px] text-slate-500">{emp.designation || 'Employee'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-rose-600 font-mono">
                            {rec.actualWorkingHours || 0} hrs
                          </div>
                          <div className="text-[10px] text-slate-400">
                            threshold: &lt; {thresholds.halfDayThresholdHours || 4}h
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isResolved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-700" /> Pending Action
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-semibold">
                            {rec.shortAttendanceAlert?.hrClassification || rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {rec.shortAttendanceAlert?.deductionAmount > 0 ? (
                            <span className="text-rose-600 font-semibold">-₹{rec.shortAttendanceAlert.deductionAmount}</span>
                          ) : rec.shortAttendanceAlert?.payableAmount > 0 ? (
                            <span className="text-emerald-700 font-semibold">+₹{rec.shortAttendanceAlert.payableAmount}</span>
                          ) : isResolved ? (
                            <span className="text-slate-400">₹0 (Pardoned)</span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Pending</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                          {rec.shortAttendanceAlert?.resolutionRemarks || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setTargetShortAttendance(rec);
                              setShowShortAttendanceModal(true);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                              isPending
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isPending ? 'Resolve Decision' : 'Modify'}
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
      )}

      {/* TAB 3: PRE-PAYROLL LEAVE REVIEW */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div>
              <h3 className="font-bold text-slate-900">Monthly Leaves Audit &amp; Classification ({selectedMonth})</h3>
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
                        <div className="font-bold text-slate-800">{lv.employee?.fullName}</div>
                        <div className="font-mono text-[10px] text-emerald-600 font-semibold">{lv.employee?.employeeId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {lv.startDate} to {lv.endDate}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{lv.totalDays} day(s)</td>
                      <td className="py-3.5 px-4 text-slate-600">{lv.reasonCategory || 'General'}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{lv.reason || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          lv.leaveType === 'Casual' ? 'bg-blue-100 text-blue-800' :
                          lv.leaveType === 'Sick' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {lv.leaveType} Leave
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {lv.status}
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

      {/* TAB 4: FINALIZED HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Month</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Gross / Bonus</th>
                  <th className="py-3.5 px-4">Payable Days</th>
                  <th className="py-3.5 px-4">Total Deductions</th>
                  <th className="py-3.5 px-4">Net Salary</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No payroll records generated yet
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((hist) => {
                    const computedDeductions =
                      hist.totalDeductions > 0 || hist.isManuallyEdited
                        ? (hist.totalDeductions ?? 0)
                        : ((hist.lateDeduction || 0) +
                           (hist.halfDayDeduction || 0) +
                           (hist.shortAttendanceDeduction || 0) +
                           (hist.lwpDeduction || 0) +
                           (hist.otherDeductions || 0));

                    return (
                      <tr key={hist._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{hist.month}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{hist.employee?.fullName}</div>
                          <div className="font-mono text-[10px] text-emerald-600">{hist.employee?.employeeId}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <div>₹ {hist.grossSalary?.toLocaleString()}</div>
                          {hist.bonusAmount > 0 && (
                            <div className="text-[10px] font-semibold text-emerald-600">+₹ {hist.bonusAmount?.toLocaleString()} bonus</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{hist.payableDays} / {hist.calendarDays} days</td>
                        <td className="py-3.5 px-4 font-mono text-rose-600">
                          -₹ {computedDeductions?.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">₹ {hist.netPayable?.toLocaleString()}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col items-start gap-1">
                            {hist.status === 'Finalized' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {hist.status || 'Review'}
                              </span>
                            )}
                            {hist.isManuallyEdited && (
                              <span
                                title={hist.manualEditReason || 'Manually edited by HR'}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                              >
                                Manual Edit
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hist.status !== 'Finalized' && (
                              <>
                                <button
                                  onClick={() => openEditPayrollModal(hist, true)}
                                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  title="Manually Edit Payroll"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {hist.isManuallyEdited && (
                                  <button
                                    onClick={() => handleResetToAuto(hist._id)}
                                    className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                    title="Reset to Auto-Calculated Values"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => {
                                setPayslipData({
                                  ...hist,
                                  employee: hist.employee?._id || hist.employee,
                                  employeeDetails: hist.employee,
                                  savedStatus: hist.status,
                                  existingRecordId: hist._id,
                                  totalDeductions: computedDeductions
                                });
                                setShowPayslipModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="View Payslip Breakdown"
                            >
                              <Eye className="w-4 h-4" />
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
      )}

      {/* SHORT ATTENDANCE MODAL FOR PAYROLL */}
      {showShortAttendanceModal && targetShortAttendance && (
        <ShortAttendanceModal
          isOpen={showShortAttendanceModal}
          onClose={() => {
            setShowShortAttendanceModal(false);
            setTargetShortAttendance(null);
          }}
          attendance={targetShortAttendance}
          onSuccess={handleShortAttendanceSuccess}
          isPayrollContext={true}
        />
      )}

      {/* LEAVE RECLASSIFICATION MODAL */}
      {showReclassifyModal && targetLeave && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Reclassify Leave to LWP</h3>
              <button
                onClick={() => setShowReclassifyModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReclassifySubmit} className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-600">
                <div><strong>Employee:</strong> {targetLeave.employee?.fullName} ({targetLeave.employee?.employeeId})</div>
                <div><strong>Leave Dates:</strong> {targetLeave.startDate} to {targetLeave.endDate} ({targetLeave.totalDays} days)</div>
                <div><strong>Current Type:</strong> {targetLeave.leaveType} Leave</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Classification</label>
                <select
                  value={targetClassification}
                  onChange={(e) => setTargetClassification(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="LWP">LWP (Leave Without Pay - Deduct Salary)</option>
                  <option value="Casual">Casual Leave (Paid)</option>
                  <option value="Sick">Sick Leave (Paid)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Reclassification *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Medical certificate not submitted within cutoff, converted to LWP..."
                  value={reclassifyReason}
                  onChange={(e) => setReclassifyReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReclassifyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition cursor-pointer"
                >
                  Confirm Reclassify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEMIZED PAYSLIP MODAL */}
      {showPayslipModal && payslipData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Itemized Payslip Breakdown</h3>
                  {payslipData.isManuallyEdited && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      Manually Edited
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300">
                  {payslipData.employeeDetails?.fullName} ({payslipData.employeeDetails?.employeeId}) • {payslipData.month || selectedMonth}
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
              {payslipData.isManuallyEdited && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-0.5">
                  <div className="font-bold text-[11px]">Manually Edited Payroll Record</div>
                  {payslipData.manualEditReason && (
                    <div className="text-[11px] text-amber-800">
                      <strong>Reason:</strong> {payslipData.manualEditReason}
                    </div>
                  )}
                  {payslipData.notes && (
                    <div className="text-[11px] text-amber-700">
                      <strong>Notes:</strong> {payslipData.notes}
                    </div>
                  )}
                </div>
              )}

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

              {(payslipData.bonusAmount || 0) > 0 && (
                <div className="flex justify-between items-center py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                  <span className="font-semibold">Bonus / Manual Addition</span>
                  <span className="font-mono font-bold">+₹ {payslipData.bonusAmount?.toLocaleString()}</span>
                </div>
              )}

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
                {payslipData.shortAttendanceDays > 0 && (
                  <div className="flex justify-between items-center py-1 text-purple-700">
                    <span>Short Attendance Sessions:</span>
                    <span className="font-bold">{payslipData.shortAttendanceDays} day(s)</span>
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

              {/* Itemized Deductions */}
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

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {(payslipData.savedStatus || payslipData.status) !== 'Finalized' && (
                  <button
                    onClick={() => {
                      const target = payslipData;
                      setShowPayslipModal(false);
                      openEditPayrollModal(target, false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Payroll
                  </button>
                )}
                {payslipData.isManuallyEdited &&
                  (payslipData.existingRecordId || payslipData._id) &&
                  (payslipData.savedStatus || payslipData.status) !== 'Finalized' && (
                    <button
                      onClick={() => handleResetToAuto(payslipData.existingRecordId || payslipData._id)}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset Auto
                    </button>
                  )}
              </div>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL PAYROLL EDIT MODAL */}
      {showEditPayrollModal && editTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" /> Manually Edit Employee Payroll
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {editTarget.fullName} ({editTarget.empCode}) • Month: {editTarget.month}
                </p>
              </div>
              <button
                onClick={() => setShowEditPayrollModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualEditSubmit} className="p-5 sm:p-6 space-y-5 text-xs">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold">
                  {editError}
                </div>
              )}

              {/* Section 1: Salary & Bonus */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5">Salary &amp; Additions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Monthly Gross Salary (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={editForm.grossSalary}
                      onChange={(e) => setEditForm((f) => ({ ...f, grossSalary: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bonus / Extra Allowance (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.bonusAmount}
                      onChange={(e) => setEditForm((f) => ({ ...f, bonusAmount: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Days */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5">Attendance &amp; Payable Days</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Present Days</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.presentDays}
                      onChange={(e) => setEditForm((f) => ({ ...f, presentDays: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Half Days</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.halfDays}
                      onChange={(e) => setEditForm((f) => ({ ...f, halfDays: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Paid Leaves (CL/SL)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.paidLeaveDays}
                      onChange={(e) => setEditForm((f) => ({ ...f, paidLeaveDays: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Weekly Offs</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.weeklyOffDays}
                      onChange={(e) => setEditForm((f) => ({ ...f, weeklyOffDays: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">LWP Days</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.lwpDays}
                      onChange={(e) => setEditForm((f) => ({ ...f, lwpDays: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Payable Days</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.payableDays}
                      onChange={(e) => setEditForm((f) => ({ ...f, payableDays: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Deductions */}
              <div>
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2.5">Itemized Deductions (₹)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Late Deduction</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.lateDeduction}
                      onChange={(e) => setEditForm((f) => ({ ...f, lateDeduction: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Half-Day Deduction</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.halfDayDeduction}
                      onChange={(e) => setEditForm((f) => ({ ...f, halfDayDeduction: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Short Attendance Ded.</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.shortAttendanceDeduction}
                      onChange={(e) => setEditForm((f) => ({ ...f, shortAttendanceDeduction: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">LWP Deduction</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.lwpDeduction}
                      onChange={(e) => setEditForm((f) => ({ ...f, lwpDeduction: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-1">Other / Manual Deduction (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.otherDeductions}
                      onChange={(e) => setEditForm((f) => ({ ...f, otherDeductions: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Net Payable Calculation / Direct Override */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-emerald-800">
                      Auto Summary: Gross (₹{Number(editForm.grossSalary || 0).toLocaleString()}) + Bonus (₹{Number(editForm.bonusAmount || 0).toLocaleString()}) − Deductions (₹{liveManualDeductionsTotal.toLocaleString()})
                    </div>
                    <div className="font-black text-emerald-900 font-mono text-lg">
                      Net Payable: ₹ {(editForm.overrideNetPayable ? Number(editForm.netPayable || 0) : liveComputedNetPayable).toLocaleString()}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-bold text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={editForm.overrideNetPayable}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          overrideNetPayable: e.target.checked,
                          netPayable: e.target.checked ? liveComputedNetPayable : f.netPayable
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    Override Net Payable Manually
                  </label>
                </div>

                {editForm.overrideNetPayable && (
                  <div>
                    <label className="block font-semibold text-emerald-900 mb-1">Custom Final Net Payable (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={editForm.netPayable}
                      onChange={(e) => setEditForm((f) => ({ ...f, netPayable: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-emerald-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                )}
              </div>

              {/* Section 5: Audit Reason & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audit Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Performance bonus / Advance recovery / Attendance correction"
                    value={editForm.reason}
                    onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payslip Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Visible remark on payslip record"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div>
                  {editTarget.payrollRecordId && editTarget.isManuallyEdited && (
                    <button
                      type="button"
                      onClick={() => handleResetToAuto(editTarget.payrollRecordId)}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset to Auto
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowEditPayrollModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingManualEdit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {savingManualEdit ? 'Saving...' : 'Save Payroll Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
