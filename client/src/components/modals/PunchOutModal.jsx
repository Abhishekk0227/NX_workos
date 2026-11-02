import React, { useState } from 'react';
import { X, LogOut, Plus, Trash2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import api from '../../api/client';
import { formatWorkingHours } from '../../utils/timeUtils';

export default function PunchOutModal({ isOpen, onClose, onSuccess, punchIn }) {
  const [bullets, setBullets] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

  const hoursWorked = punchIn ? (Date.now() - new Date(punchIn).getTime()) / (1000 * 60 * 60) : null;
  const isUnder6Hours = hoursWorked !== null && hoursWorked < 6;

  const handleAddBullet = () => {
    setBullets([...bullets, '']);
  };

  const handleRemoveBullet = (index) => {
    if (bullets.length <= 1) return;
    setBullets(bullets.filter((_, i) => i !== index));
  };

  const handleBulletChange = (index, value) => {
    const updated = [...bullets];
    updated[index] = value;
    setBullets(updated);
  };

  const handleProceedToConfirmation = (e) => {
    e.preventDefault();
    setError('');

    const clean = bullets.map((b) => b.trim()).filter(Boolean);
    if (clean.length === 0) {
      setError('Please add at least one bullet point describing your work today.');
      return;
    }

    setConfirmed(true);
  };

  const handleFinalPunchOut = async () => {
    setLoading(true);
    setError('');

    const clean = bullets.map((b) => b.trim()).filter(Boolean);

    try {
      const res = await api.post('/attendance/punch-out', {
        summaryBullets: clean
      });

      if (res.data?.success) {
        setSuccessData(res.data);
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to punch out. Please try again.');
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBullets(['']);
    setError('');
    setConfirmed(false);
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header matching EppanelM.png Screen 6 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Daily Work Report</h3>
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
              <h4 className="text-lg font-bold text-slate-800">Punch Out Completed!</h4>
              <p className="text-sm text-slate-600">{successData.message}</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Actual Working Hours:</span>
                  <strong className="text-blue-700 text-sm font-semibold">{formatWorkingHours(successData.attendance)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Final Status:</span>
                  <strong className={successData.attendance?.status === 'Half Day' ? 'text-orange-600 font-bold' : 'text-emerald-700'}>
                    {successData.attendance?.status}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Daily Report Bullets:</span>
                  <span>{successData.dailyReport?.summaryBullets?.length || 0} items saved</span>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-4 py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition"
              >
                Close
              </button>
            </div>
          ) : !confirmed ? (
            <form onSubmit={handleProceedToConfirmation} className="space-y-4">
              <p className="text-xs text-slate-500">
                Please enter the work you completed today before punching out.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2.5">
                {bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => handleBulletChange(idx, e.target.value)}
                      placeholder="Enter completed task"
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                    {bullets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBullet(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1.5 font-bold pt-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Another Task
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Enter any notes..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition tracking-wider uppercase active:scale-98 cursor-pointer"
                >
                  SUBMIT REPORT & PROCEED
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs border border-slate-200 transition"
                >
                  CANCEL
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {isUnder6Hours && (
                <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2.5 text-xs text-orange-950">
                  <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-orange-900">⚠️ Half Day Notice (Under 6 Hours)</strong>
                    <span className="leading-relaxed">
                      You have completed {hoursWorked.toFixed(1)} hrs today. Punching out before 6 hours will mark today's attendance as <strong>Half Day</strong>.
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h5 className="font-semibold text-amber-900 text-sm mb-1">Final Punch Out Confirmation</h5>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Your daily report has been prepared. Confirming will record your exact server Punch Out timestamp and close today's attendance session.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Report Summary ({bullets.filter(b => b.trim()).length} points)
                </p>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                  {bullets.filter(b => b.trim()).map((b, i) => (
                    <li key={i} className="leading-relaxed">{b}</li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmed(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
                >
                  Edit Report
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalPunchOut}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm shadow-xs transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Recording...' : 'Confirm Punch Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
