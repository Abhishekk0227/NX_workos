import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DollarSign
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  isPushSupported,
  getPushPermissionStatus,
  requestPushPermission,
  showPushNotification
} from '../../services/pushNotification';
import { resolveNotificationRoute } from '../common/NotificationToast';

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

  const getIcon = (type, title = '') => {
    const t = (title || '').toLowerCase();
    if (t.includes('notice') || t.includes('broadcast')) {
      return <Megaphone className="w-4 h-4 text-purple-600" />;
    }
    switch (type) {
      case 'Attendance':
        return <Clock className="w-4 h-4 text-emerald-600" />;
      case 'Leave':
        return <Calendar className="w-4 h-4 text-rose-600" />;
      case 'Task':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case 'Payroll':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'Correction':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Notifications & Alerts</h3>
            {unreadCount > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PUSH NOTIFICATION STATUS BANNER (Clean production view, no test alert button) */}
        {pushStatus !== 'granted' && isPushSupported() && (
          <div className="p-3 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-300 truncate">Enable instant device alerts</span>
            </div>
            <button
              onClick={handleEnablePush}
              className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shrink-0"
            >
              Enable
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No notifications yet</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isNotice = item.title?.toLowerCase().includes('notice') || item.title?.toLowerCase().includes('broadcast');
              const read = item.isRead || (item.readBy || []).some(r => r.user === user?._id || r.user?._id === user?._id);

              return (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`group p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    read
                      ? 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                      : isNotice
                      ? 'bg-rose-50/70 border-rose-200 text-slate-900 shadow-2xs hover:border-rose-300'
                      : 'bg-blue-50/60 border-blue-100 text-slate-900 shadow-2xs hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white shadow-2xs shrink-0 border border-slate-100">
                      {getIcon(item.type, item.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{item.message}</p>
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Open section</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
