import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mic,
  MicOff,
  Clock,
  Sparkles,
  AlertTriangle,
  Check
} from 'lucide-react';
import api from '../../api/client';
import { formatWorkingHours } from '../../utils/timeUtils';

export default function PunchOutModal({ isOpen, onClose, onSuccess, punchIn }) {
  const [completedWork, setCompletedWork] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [voiceUsed, setVoiceUsed] = useState(false);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechField, setActiveSpeechField] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Default to Indian English

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        if (event.results[event.results.length - 1].isFinal) {
          const textToAdd = currentTranscript.trim();
          if (textToAdd) {
            setVoiceUsed(true);
            if (activeSpeechField === 'completedWork') {
              setCompletedWork((prev) => (prev ? `${prev} ${textToAdd}` : textToAdd));
            } else if (activeSpeechField === 'pendingTasks') {
              setPendingTasks((prev) => (prev ? `${prev} ${textToAdd}` : textToAdd));
            } else if (activeSpeechField === 'challengesFaced') {
              setChallengesFaced((prev) => (prev ? `${prev} ${textToAdd}` : textToAdd));
            } else if (activeSpeechField === 'nextDayPlan') {
              setNextDayPlan((prev) => (prev ? `${prev} ${textToAdd}` : textToAdd));
            }
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setActiveSpeechField(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveSpeechField(null);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [activeSpeechField]);

  const toggleListening = (fieldKey) => {
    if (!speechSupported) {
      setError('Voice recognition is not supported in this browser. Please type manually.');
      return;
    }

    if (isListening && activeSpeechField === fieldKey) {
      // Stop listening
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      setActiveSpeechField(null);
    } else {
      // Start listening for this field
      try {
        setActiveSpeechField(fieldKey);
        setIsListening(true);
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Recognition start error:', e.message);
      }
    }
  };

  if (!isOpen) return null;

  const hoursWorked = punchIn ? (Date.now() - new Date(punchIn).getTime()) / (1000 * 60 * 60) : 0;
  const isShortAttendance = hoursWorked < 4;
  const isHalfDay = hoursWorked >= 4 && hoursWorked < 8;

  const handleProceedToConfirmation = (e) => {
    e.preventDefault();
    setError('');

    if (!completedWork.trim()) {
      setError('Please provide details for Daily Completed Work.');
      return;
    }

    // Stop microphone if currently on
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      setActiveSpeechField(null);
    }

    setConfirmed(true);
  };

  const handleFinalPunchOut = async () => {
    setLoading(true);
    setError('');

    try {
      const bullets = completedWork
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await api.post('/attendance/punch-out', {
        completedWork: completedWork.trim(),
        pendingTasks: pendingTasks.trim(),
        challengesFaced: challengesFaced.trim(),
        nextDayPlan: nextDayPlan.trim(),
        summaryBullets: bullets.length > 0 ? bullets : [completedWork.trim()],
        voiceUsed
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
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    }
    setCompletedWork('');
    setPendingTasks('');
    setChallengesFaced('');
    setNextDayPlan('');
    setVoiceUsed(false);
    setError('');
    setConfirmed(false);
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all">
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Punch-Out Work Report
              </h3>
              <p className="text-[11px] text-slate-500">Voice-to-Text enabled Daily Submission</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          {successData ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Punch Out Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">{successData.message}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-2 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Logged Working Hours:</span>
                  <strong className="text-blue-700 font-bold text-sm">
                    {formatWorkingHours(successData.attendance)}
                  </strong>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Attendance Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      successData.attendance?.status === 'Short Attendance'
                        ? 'bg-rose-100 text-rose-800'
                        : successData.attendance?.status === 'Half Day'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {successData.attendance?.status}
                  </span>
                </div>
                {successData.attendance?.shortAttendanceAlert?.isAlert && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Short Attendance alert forwarded to HR for review.</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition text-xs cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : !confirmed ? (
            <form onSubmit={handleProceedToConfirmation} className="space-y-4">
              {/* Working Hours Snapshot & Threshold Alert */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-900">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Session Elapsed: <strong>{hoursWorked.toFixed(2)} hrs</strong></span>
                </div>
                {isShortAttendance ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                    &lt; 4 hrs (Short Attendance)
                  </span>
                ) : isHalfDay ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                    4-8 hrs (Half Day)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    8+ hrs (Full Day)
                  </span>
                )}
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Daily Completed Work */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    1. Daily Completed Work Details <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleListening('completedWork')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isListening && activeSpeechField === 'completedWork'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isListening && activeSpeechField === 'completedWork' ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" /> Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" /> Voice-to-Text
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={completedWork}
                  onChange={(e) => setCompletedWork(e.target.value)}
                  placeholder="Detail tasks completed today (type or speak)..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* 2. Pending Tasks */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    2. Pending Tasks
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleListening('pendingTasks')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isListening && activeSpeechField === 'pendingTasks'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isListening && activeSpeechField === 'pendingTasks' ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" /> Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" /> Voice-to-Text
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={pendingTasks}
                  onChange={(e) => setPendingTasks(e.target.value)}
                  placeholder="Any unfinished items or in-progress deliverables..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* 3. Challenges Faced */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    3. Challenges Faced
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleListening('challengesFaced')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isListening && activeSpeechField === 'challengesFaced'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isListening && activeSpeechField === 'challengesFaced' ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" /> Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" /> Voice-to-Text
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={challengesFaced}
                  onChange={(e) => setChallengesFaced(e.target.value)}
                  placeholder="Blockers, technical dependencies, or difficulties encountered..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* 4. Next Working Day Plan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    4. Next Working Day Plan
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleListening('nextDayPlan')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isListening && activeSpeechField === 'nextDayPlan'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isListening && activeSpeechField === 'nextDayPlan' ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" /> Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" /> Voice-to-Text
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={nextDayPlan}
                  onChange={(e) => setNextDayPlan(e.target.value)}
                  placeholder="Key targets for tomorrow..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  Review &amp; Confirm <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Confirm Punch-Out Submission
                </div>
                <p className="mt-1 text-[11px] text-amber-800">
                  Please verify your report details. Once submitted, your attendance session for today will be logged and finalized.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3 text-xs text-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">1. Completed Work:</span>
                  <p className="whitespace-pre-wrap font-medium mt-0.5">{completedWork}</p>
                </div>
                {pendingTasks && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">2. Pending Tasks:</span>
                    <p className="whitespace-pre-wrap font-medium mt-0.5">{pendingTasks}</p>
                  </div>
                )}
                {challengesFaced && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">3. Challenges Faced:</span>
                    <p className="whitespace-pre-wrap font-medium mt-0.5">{challengesFaced}</p>
                  </div>
                )}
                {nextDayPlan && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">4. Next Day Plan:</span>
                    <p className="whitespace-pre-wrap font-medium mt-0.5">{nextDayPlan}</p>
                  </div>
                )}
                {voiceUsed && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                    <Mic className="w-3 h-3" /> Voice dictation was used in this report.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmed(false)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleFinalPunchOut}
                  disabled={loading}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {loading ? 'Submitting...' : 'Confirm & Punch Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
