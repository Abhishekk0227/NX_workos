import React, { useState, useEffect } from 'react';
import {
  History,
  Filter,
  Search,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer } from '../../components/common/Shimmer';

export default function ManagerHistory() {
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStudent, setSelectedStudent] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await api.get('/manager/students');
      if (res.data?.success) {
        setStudents(res.data.students || []);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedStudent !== 'All') params.studentId = selectedStudent;
      if (selectedAction !== 'All') params.action = selectedAction;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/manager/history', { params });
      if (res.data?.success) {
        setEvents(res.data.historyEvents || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [selectedStudent, selectedAction, search]);

  const formatDateTime = dateStr => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = action => {
    switch (action) {
      case 'ASSIGNED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
            TASK ASSIGNED
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
            WORK SUBMITTED
          </span>
        );
      case 'DEADLINE_EXTENDED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
            DEADLINE EXTENDED
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
            APPROVED
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
            REVISION REQUESTED
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-200 text-rose-900 border border-rose-300">
            DEADLINE MISSED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-800">
            {action}
          </span>
        );
    }
  };

  const renderActionDetails = (action, details) => {
    if (!details) return null;

    if (action === 'DEADLINE_EXTENDED') {
      return (
        <div className="text-xs text-amber-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 space-y-1">
          <div className="font-semibold">
            Extended to: <span className="font-mono">{formatDateTime(details.newDueDate)}</span>
          </div>
          {details.previousDueDate && (
            <div className="text-[11px] text-amber-700">
              Previous due: <span className="font-mono">{formatDateTime(details.previousDueDate)}</span>
            </div>
          )}
          {details.reason && (
            <div className="text-[11px] italic text-amber-800">
              Reason: "{details.reason}"
            </div>
          )}
        </div>
      );
    }

    if (action === 'SUBMITTED') {
      return (
        <div className="text-xs text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200/80 space-y-1">
          <div className="font-semibold">
            Submission Status: {details.isSubmittedLate ? <span className="text-rose-600 font-bold">[SUBMITTED LATE]</span> : <span className="text-emerald-700 font-bold">[ON TIME]</span>}
          </div>
          {details.submissionNote && (
            <div className="text-[11px] text-indigo-950">
              Note: "{details.submissionNote}"
            </div>
          )}
          {details.submissionLink && (
            <div>
              <a
                href={details.submissionLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-indigo-700 underline text-[11px]"
              >
                <ExternalLink className="w-3 h-3" /> View Submitted URL
              </a>
            </div>
          )}
        </div>
      );
    }

    if (action === 'APPROVED' || action === 'REVISION_REQUESTED') {
      return (
        <div className="text-xs text-slate-800 bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 space-y-1">
          <div className="font-semibold">
            Manager Feedback:
          </div>
          <div className="text-[11px] text-slate-600 italic">
            "{details.feedback || 'No feedback notes provided'}"
          </div>
        </div>
      );
    }

    if (action === 'ASSIGNED') {
      return (
        <div className="text-xs text-purple-900 bg-purple-50/70 p-2.5 rounded-xl border border-purple-200/80 space-y-1">
          <div className="font-semibold">
            Assigned with target deadline: <span className="font-mono">{formatDateTime(details.dueDate)}</span>
          </div>
          <div className="text-[11px] text-purple-700">
            Priority: {details.priority} • Category: {details.category}
          </div>
        </div>
      );
    }

    return (
      <div className="text-xs font-mono bg-slate-50 p-2 rounded-lg text-slate-600">
        {JSON.stringify(details)}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <History className="w-6 h-6 text-purple-600" /> Complete Task & Audit History
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit trail of all task assignments, submissions, manager reviews, and deadline changes.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by task title or keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 transition"
            />
          </div>

          {/* Student Filter */}
          <div>
            <select
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 transition font-medium"
            >
              <option value="All">All Assigned Students</option>
              {students.map(s => (
                <option key={s._id} value={s._id}>
                  {s.fullName} ({s.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-purple-500 transition font-medium"
            >
              <option value="All">All Actions</option>
              <option value="ASSIGNED">Task Assigned</option>
              <option value="SUBMITTED">Work Submitted</option>
              <option value="DEADLINE_EXTENDED">Deadline Extended</option>
              <option value="APPROVED">Approved</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
              <option value="OVERDUE">Deadline Missed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
          <span>
            Total audit records: <b className="text-slate-900">{events.length}</b>
          </span>
          {(selectedStudent !== 'All' || selectedAction !== 'All' || search) && (
            <button
              onClick={() => {
                setSelectedStudent('All');
                setSelectedAction('All');
                setSearch('');
              }}
              className="text-purple-600 hover:text-purple-800 underline font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Timeline */}
      {loading ? (
        <TableShimmer rows={6} cols={4} />
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No History Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No audit actions have been recorded yet matching your filter criteria.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {events.map((event, idx) => (
            <div key={event.eventId || idx} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-6 sm:-left-8 top-1.5 w-3.5 h-3.5 rounded-full bg-purple-600 ring-4 ring-white group-hover:scale-125 transition-all shadow-xs" />

              {/* Event Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {getActionBadge(event.action)}
                    <span className="text-sm font-bold text-slate-900">
                      {event.taskTitle}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 uppercase">
                      {event.priority || 'Medium'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(event.performedAt)}
                  </div>
                </div>

                {/* Performed by & Student */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>Student:</span>
                    <span className="font-bold text-slate-800">
                      {event.student?.fullName || 'Assigned Student'} ({event.student?.employeeId})
                    </span>
                  </div>

                  {event.performedBy && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>Action by:</span>
                      <span className="font-medium text-slate-700">
                        {event.performedBy.name || event.performedBy.email}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Details Card */}
                {renderActionDetails(event.action, event.details)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
