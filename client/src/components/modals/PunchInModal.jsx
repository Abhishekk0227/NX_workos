import React, { useState } from 'react';
import { X, LogIn, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function PunchInModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

  const handleVerifyAndConfirm = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeIdInput.trim()) {
      setError('Please enter your Employee ID');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/attendance/punch-in', {
        employeeIdInput: employeeIdInput.trim()
      });

      if (res.data?.success) {
        setSuccessData(res.data);
        if (onSuccess) onSuccess(res.data.attendance);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Punch in failed. Please verify your Employee ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmployeeIdInput('');
    setError('');
    setConfirmed(false);
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header matching EppanelM.png Screen 5 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Verify Your Employee ID</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {successData ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Punch In Successful!</h4>
              <p className="text-sm text-slate-600">{successData.message}</p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 flex justify-between">
                <span>Status: <strong className="text-blue-600">{successData.attendance?.status}</strong></span>
                <span>Time: <strong>{new Date(successData.attendance?.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyAndConfirm} className="space-y-4">
              <p className="text-xs text-slate-500">
                Please enter your Employee ID to confirm your attendance.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <LogIn className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={employeeIdInput}
                    onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. NX001"
                    required
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs uppercase transition"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition tracking-wider uppercase active:scale-98"
                >
                  {loading ? 'Verifying...' : 'CONFIRM PUNCH IN'}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs border border-slate-200 transition"
                >
                  CANCEL
                </button>
              </div>

              {/* Callout box matching Screen 5 */}
              <div className="mt-4 p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  This helps confirm your identity and prevents accidental punching.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
