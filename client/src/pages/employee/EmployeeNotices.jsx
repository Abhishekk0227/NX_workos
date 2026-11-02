import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  UserCheck,
  Pin,
  Check,
  AlertCircle,
  Search,
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import api from '../../api/client';
import { NoticeShimmer } from '../../components/common/Shimmer';

export default function EmployeeNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'DIRECT' | 'URGENT' | 'UNACKNOWLEDGED'

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/broadcasts/active');
      setNotices(res.data?.broadcasts || []);
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleAcknowledge = async (noticeId) => {
    try {
      await api.post(`/broadcasts/${noticeId}/acknowledge`);
      setNotices((prev) =>
        prev.map((n) => (n._id === noticeId ? { ...n, isAcknowledged: true } : n))
      );
    } catch (err) {
      console.error('Failed to acknowledge notice:', err);
    }
  };

  const filteredNotices = notices.filter((n) => {
    // Search match
    const matchesSearch =
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.message?.toLowerCase().includes(search.toLowerCase()) ||
      n.category?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Filter match
    if (filter === 'DIRECT') return n.targetType === 'SPECIFIC';
    if (filter === 'URGENT') return n.priority === 'Urgent' || n.priority === 'High';
    if (filter === 'UNACKNOWLEDGED') return !n.isAcknowledged;
    return true;
  });

  const unacknowledgedCount = notices.filter((n) => !n.isAcknowledged).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-8">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Notice Board & Announcements
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official company circulars, urgent HR alerts, and direct operations updates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {unacknowledgedCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {unacknowledgedCount} Pending Action
            </span>
          )}
          <button
            onClick={fetchNotices}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
            title="Refresh Notices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notices by title, keyword, or policy..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: `All (${notices.length})` },
            { id: 'DIRECT', label: 'Direct to Me' },
            { id: 'URGENT', label: 'Urgent / High' },
            { id: 'UNACKNOWLEDGED', label: `Unread (${unacknowledgedCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notices List */}
      {loading ? (
        <NoticeShimmer count={3} />
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Notices Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || filter !== 'ALL'
              ? 'No notices match your active search or filter criteria.'
              : 'You have caught up with all company broadcasts and announcements!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredNotices.map((notice) => {
            const isUrgent = notice.priority === 'Urgent';
            const isHigh = notice.priority === 'High';
            const isSpecific = notice.targetType === 'SPECIFIC';

            const badgeTheme = isUrgent
              ? 'bg-rose-600 text-white'
              : isHigh
              ? 'bg-amber-500 text-white'
              : 'bg-indigo-600 text-white';

            return (
              <div
                key={notice._id}
                className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:shadow-xs border-l-4 ${
                  isUrgent
                    ? 'border-l-rose-500'
                    : isHigh
                    ? 'border-l-amber-500'
                    : 'border-l-indigo-600'
                }`}
              >
                <div className="p-4 sm:p-5">
                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase shadow-2xs ${badgeTheme}`}
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        {notice.priority} Notice
                      </span>

                      {isSpecific ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          <UserCheck className="w-3.5 h-3.5" />
                          Direct Message to You
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Company-Wide Notice
                        </span>
                      )}

                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {notice.category || 'General'}
                      </span>

                      {notice.isPinnedBanner && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                          <Pin className="w-3 h-3 rotate-45" /> Pinned
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(notice.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Title & Body Message */}
                  <div className="py-3">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      {notice.title}
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {notice.message}
                    </p>
                  </div>

                  {/* Footer & Acknowledge Button */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500">
                      Issued by{' '}
                      <span className="font-semibold text-slate-800">
                        {notice.sender?.fullName || 'HR Operations & People Desk'}
                      </span>
                    </div>

                    <div>
                      {notice.isAcknowledged ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Read & Acknowledged
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(notice._id)}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-98 cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          Mark as Read & Acknowledged
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
