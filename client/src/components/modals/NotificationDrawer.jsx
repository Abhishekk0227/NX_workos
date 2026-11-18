import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  CheckCheck,
  Radio,
  ExternalLink,
  Megaphone,
  DollarSign,
  ListFilter,
  Info,
  AlarmClock,
  PartyPopper
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  isPushSupported,
  getPushPermissionStatus,
  requestPushPermission,
  showPushNotification
} from '../../services/pushNotification';
import { resolveNotificationRoute } from '../../utils/navigation';
import { formatTime12, formatRelativeNotificationDate } from '../../utils/timeUtils';

export default function NotificationDrawer({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pushStatus, setPushStatus] = useState(getPushPermissionStatus());

  useEffect(() => {
    if (isOpen) {
      setPushStatus(getPushPermissionStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushStatus(getPushPermissionStatus());
    if (granted) {
      showPushNotification('Push Notifications Activated!', {
        body: 'You will now receive native alerts for attendance, shifts, and broadcasts.'
      });
    }
  };

  const handleItemClick = (item) => {
    markAsRead(item._id);
    onClose();
    const route = resolveNotificationRoute(item, user?.role);
    if (route) {
      navigate(route);
    }
  };

  const isHR = user?.role === 'HR';

  const getIcon = (type, title = '') => {
    const t = (title || '').toLowerCase();
    if (t.includes('notice') || t.includes('broadcast')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
      );
    }
    switch (type) {
      case 'Attendance':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        );
      case 'Leave':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        );
      case 'Task':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'Payroll':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        );
      case 'Correction':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#f8f9fa] h-full shadow-2xl flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right duration-200">
        {/* Header matching Image 2 */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Notifications & Alerts</h3>
                {unreadCount > 0 && (
                  <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {unreadCount} New
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader: Recent Notifications */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ListFilter className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Recent Notifications</h4>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-30 text-blue-600" />
              <p className="text-xs font-semibold text-slate-600">No new notifications</p>
              <p className="text-[11px] text-slate-400 mt-1">You are all caught up!</p>
            </div>
          ) : (
            (() => {
              const getNotificationGroup = (dateStr) => {
                if (!dateStr) return 'Earlier';
                const targetDate = new Date(dateStr);
                if (isNaN(targetDate.getTime())) return 'Earlier';
                const getFormattedDatePart = (d) =>
                  new Intl.DateTimeFormat('en-CA', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }).format(d);
                const now = new Date();
                const todayStr = getFormattedDatePart(now);
                const targetStr = getFormattedDatePart(targetDate);
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const yesterdayStr = getFormattedDatePart(yesterday);

                if (targetStr === todayStr) return 'Today';
                if (targetStr === yesterdayStr) return 'Yesterday';
                return 'Earlier';
              };

              const grouped = notifications.reduce((acc, item) => {
                const group = getNotificationGroup(item.createdAt);
                if (!acc[group]) acc[group] = [];
                acc[group].push(item);
                return acc;
              }, {});

              return ['Today', 'Yesterday', 'Earlier'].map((groupName) => {
                const items = grouped[groupName];
                if (!items || items.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-2.5">
                    <div className="flex items-center gap-2 pt-1 pb-0.5 px-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {groupName} ({items.length})
                      </span>
                      <div className="flex-1 h-px bg-slate-200/80" />
                    </div>

                    {items.map((item) => {
                      const read =
                        item.isRead ||
                        (item.readBy || []).some(
                          (r) => r.user === user?._id || r.user?._id === user?._id
                        );

                      return (
                        <div
                          key={item._id}
                          onClick={() => handleItemClick(item)}
                          className={`group bg-white p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                            read
                              ? 'border-slate-100 text-slate-600 hover:border-slate-300'
                              : 'border-blue-200/90 shadow-2xs hover:border-blue-400'
                          }`}
                        >
                          {/* Left blue accent indicator for unread */}
                          {!read && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l" />
                          )}

                          <div className="flex items-start gap-3">
                            {getIcon(item.type, item.title)}

                            <div className="flex-1 min-w-0 pr-1">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                                    {item.title}
                                  </p>
                                  {!read && (
                                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  {formatRelativeNotificationDate(item.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Footer matching Image 2 */}
        <div className="p-3 bg-white border-t border-slate-100 text-center">
          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>
              View older notifications in{' '}
              <button
                onClick={() => {
                  onClose();
                  navigate(isHR ? '/hr/broadcast' : '/employee/notices');
                }}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                History
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
