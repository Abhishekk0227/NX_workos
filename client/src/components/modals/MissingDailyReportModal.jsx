import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Mic,
  Clock,
  Sparkles,
  ArrowRight,
  Send
} from 'lucide-react';
import api from '../../api/client';
import { formatDateIST } from '../../utils/timeUtils';

export default function MissingDailyReportModal({
  isOpen,
  onClose,
  onSuccess,
  pendingSession
}) {
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
  const [successData, setSuccessData] = useState(null);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

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
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      setActiveSpeechField(null);
    } else {
      try {
        setActiveSpeechField(fieldKey);
        setIsListening(true);
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Recognition start error:', e.message);
      }
    }
  };

  if (!isOpen || !pendingSession) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!completedWork.trim()) {
      setError('Please provide details for Daily Completed Work.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      setActiveSpeechField(null);
    }

    setLoading(true);

    try {
      const bullets = completedWork
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await api.post('/reports/submit-pending', {
        attendanceId: pendingSession._id,
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
      setError(err.response?.data?.message || 'Failed to submit daily report. Please try again.');
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
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight flex items-center gap-2">
                <span>Submit Missing Daily Work Report</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800">
                  Auto Punched-Out
                </span>
              </h3>
              <p className="text-[11px] text-amber-900/80 mt-0.5">
                Session for {formatDateIST(pendingSession.date)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          {successData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Work Report Submitted!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Your daily report for {formatDateIST(pendingSession.date)} has been attached to your attendance record.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-2 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Session Date:</span>
                  <strong className="text-slate-900">{formatDateIST(pendingSession.date)}</strong>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Attendance Status:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {pendingSession.status || 'Present'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Actual Working Hours:</span>
                  <strong className="text-blue-700 font-bold">{pendingSession.actualWorkingHours || 0} hrs</strong>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Notice Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-[11px]">You forgot to punch out on this day</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    The system automatically logged your punch-out. Please write your daily work report for this day to complete your attendance record for HR.
                  </p>
                </div>
              </div>

              {/* Session Date & Time Details */}
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Session Date</span>
                  <strong className="text-slate-800 font-bold text-xs">
                    {pendingSession.date || 'Previous Session'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Logged Hours</span>
                  <strong className="text-blue-700 font-bold text-xs">
                    {pendingSession.actualWorkingHours ? `${pendingSession.actualWorkingHours} hrs` : 'Logged at Cutoff'}
                  </strong>
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Field 1: Completed Work */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>Daily Completed Work</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => toggleListening('completedWork')}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                        isListening && activeSpeechField === 'completedWork'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>{isListening && activeSpeechField === 'completedWork' ? 'Listening...' : 'Voice Input'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={completedWork}
                  onChange={(e) => setCompletedWork(e.target.value)}
                  placeholder="Detail the tasks and projects you worked on on this day (use separate lines for bullet points)..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-normal text-slate-800"
                  required
                />
              </div>

              {/* Field 2: Pending Tasks */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 text-xs">Pending Tasks / Blockers</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => toggleListening('pendingTasks')}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                        isListening && activeSpeechField === 'pendingTasks'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>{isListening && activeSpeechField === 'pendingTasks' ? 'Listening...' : 'Voice'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={pendingTasks}
                  onChange={(e) => setPendingTasks(e.target.value)}
                  placeholder="Any work left incomplete or blockers encountered..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-normal text-slate-800"
                />
              </div>

              {/* Field 3: Challenges Faced */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 text-xs">Challenges Faced</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => toggleListening('challengesFaced')}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                        isListening && activeSpeechField === 'challengesFaced'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>{isListening && activeSpeechField === 'challengesFaced' ? 'Listening...' : 'Voice'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={challengesFaced}
                  onChange={(e) => setChallengesFaced(e.target.value)}
                  placeholder="Key technical, operational or team challenges..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-normal text-slate-800"
                />
              </div>

              {/* Field 4: Next Day Plan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 text-xs">Plan for Next Working Day</label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => toggleListening('nextDayPlan')}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                        isListening && activeSpeechField === 'nextDayPlan'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>{isListening && activeSpeechField === 'nextDayPlan' ? 'Listening...' : 'Voice'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={nextDayPlan}
                  onChange={(e) => setNextDayPlan(e.target.value)}
                  placeholder="Priority goals for the next day..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-normal text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition cursor-pointer"
                >
                  Remind Me Later
                </button>
                <button
                  type="submit"
                  disabled={loading || !completedWork.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Daily Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

