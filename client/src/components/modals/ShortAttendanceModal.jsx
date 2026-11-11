import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  DollarSign,
  Clock,
  User,
  Calendar,
  ShieldAlert,
  Save,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import api from '../../api/client';
import { formatWorkingHours, formatDateIST } from '../../utils/timeUtils';

export default function ShortAttendanceModal({ isOpen, onClose, attendance, onSuccess, isPayrollContext = false }) {
  const [payableAmount, setPayableAmount] = useState(
    attendance?.shortAttendanceAlert?.payableAmount || 0
  );
  const [deductionAmount, setDeductionAmount] = useState(
    attendance?.shortAttendanceAlert?.deductionAmount || 0
  );
  const [hrClassification, setHrClassification] = useState(
    attendance?.shortAttendanceAlert?.hrClassification || attendance?.status || 'Short Attendance'
  );
  const [resolutionRemarks, setResolutionRemarks] = useState(
    attendance?.shortAttendanceAlert?.resolutionRemarks || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [halfDayThreshold, setHalfDayThreshold] = useState(4);

  useEffect(() => {
    if (!isOpen) return;
    api.get('/settings')
      .then((res) => {
        if (res.data?.settings?.halfDayThresholdHours != null) {
          setHalfDayThreshold(res.data.settings.halfDayThresholdHours);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !attendance) return null;

  const emp = attendance.employee || {};
  const isAlreadyResolved = attendance.shortAttendanceAlert?.status === 'Resolved';

  // Quick preset helper
  const applyPreset = (type) => {
    if (type === 'halfDay') {
      setHrClassification('Half Day');
      setPayableAmount(0);
      setDeductionAmount(0); // Handled by 50% half day rate
      setResolutionRemarks('HR Decision: Converted to Half Day (50% salary credit).');
    } else if (type === 'fullDay') {
      setHrClassification('Full Day');
      setPayableAmount(0);
      setDeductionAmount(0);
      setResolutionRemarks('HR Decision: Approved shortfall / Pardoned. 100% full pay.');
    } else if (type === 'absent') {
      setHrClassification('Absent');
      setPayableAmount(0);
      setDeductionAmount(0);
      setResolutionRemarks('HR Decision: Insufficient working hours. Marked as Absent (0% pay).');
    } else if (type === 'shortConfirm') {
      setHrClassification('Short Attendance');
      setResolutionRemarks('HR Decision: Confirmed short attendance with specific adjustment.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await api.patch(`/attendance/${attendance._id}/resolve-short-attendance`, {
        payableAmount: Number(payableAmount) || 0,
        deductionAmount: Number(deductionAmount) || 0,
        hrClassification,
        resolutionRemarks: resolutionRemarks.trim() || 'HR resolved short attendance alert.'
      });

      if (res.data?.success) {
        if (onSuccess) onSuccess(res.data.attendance, res.data.updatedPayroll);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve short attendance alert.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight flex items-center gap-2">
                <span>Resolve Short Attendance Alert</span>
                {isAlreadyResolved ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Resolved
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                    Pending Review
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-amber-900 font-medium">Under Half-Day Threshold Review &amp; Payroll Deduction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          {isPayrollContext && (
            <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center gap-2 text-xs text-blue-900">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                <strong>Payroll Live Sync:</strong> Saving here automatically updates this employee's payroll calculation and net pay.
              </span>
            </div>
          )}

          {/* Session Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Employee:</span>
              <strong className="text-slate-900 font-semibold">
                {emp.fullName || 'Employee'} ({emp.employeeId || 'NX---'})
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Session Date:</span>
              <span className="font-medium text-slate-800">
                {formatDateIST(attendance.date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Actual Working Hours:</span>
              <span className="font-bold text-rose-600 font-mono">
                {attendance.actualWorkingHours || 0} hrs ({formatWorkingHours(attendance)})
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
              <span>Half-Day Working Hours Threshold:</span>
              <span className="font-semibold text-slate-700">{halfDayThreshold} hrs</span>
            </div>
            {attendance.autoPunchedOut && (
              <div className="text-[11px] text-purple-700 font-semibold pt-1 border-t border-slate-200/60 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Auto Punched-Out by system at 12:00 AM IST cutoff.</span>
              </div>
            )}
            {isAlreadyResolved && attendance.shortAttendanceAlert?.resolvedAt && (
              <div className="text-[10px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60 mt-1">
                <strong>Previously Resolved:</strong> on {formatDateIST(attendance.shortAttendanceAlert.resolvedAt)}
                {attendance.shortAttendanceAlert.resolutionRemarks && ` — "${attendance.shortAttendanceAlert.resolutionRemarks}"`}
              </div>
            )}
          </div>

          {/* Quick Decision Presets */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Quick Decision Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => applyPreset('halfDay')}
                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition cursor-pointer ${
                  hrClassification === 'Half Day'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Half Day (50%)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('fullDay')}
                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition cursor-pointer ${
                  hrClassification === 'Full Day'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Pardon (Full Day)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('absent')}
                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition cursor-pointer ${
                  hrClassification === 'Absent'
                    ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Mark Absent (0%)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('shortConfirm')}
                className={`px-2 py-1.5 rounded-lg border text-center font-medium transition cursor-pointer ${
                  hrClassification === 'Short Attendance'
                    ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Custom Shortfall
              </button>
            </div>
          </div>

          {/* Action fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payable Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={payableAmount}
                onChange={(e) => setPayableAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Amount credited to employee for session
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deduction Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Amount deducted from monthly payroll
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attendance Classification
            </label>
            <select
              value={hrClassification}
              onChange={(e) => setHrClassification(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            >
              <option value="Short Attendance">Short Attendance (Confirmed Shortfall)</option>
              <option value="Half Day">Half Day (Convert to 50% salary credit)</option>
              <option value="Full Day">Full Day (Pardon Shortfall - 100% pay)</option>
              <option value="Absent">Absent (Zero Pay)</option>
              <option value="On Leave">Mark as Approved Leave (CL/SL/LWP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              HR Resolution Remarks *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Mandatory justification for audit history and payroll tracking..."
              value={resolutionRemarks}
              onChange={(e) => setResolutionRemarks(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : isAlreadyResolved ? 'Update Resolution' : 'Resolve Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
