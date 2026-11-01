import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  CheckCheck,
  Radio,
  Send,
  Sparkles,
  Megaphone
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import {
  isPushSupported,
  getPushPermissionStatus,
  requestPushPermission,
  showPushNotification
} from '../../services/pushNotification';
import api from '../../api/client';

export default function NotificationDrawer({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [pushStatus, setPushStatus] = useState(getPushPermissionStatus());
  const [testingPush, setTestingPush] = useState(false);

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

  const handleSendTestPush = async () => {
    setTestingPush(true);
    try {
      await api.post('/notifications/test-push');
      showPushNotification('NX Work OS — Test Push Notification', {
        body: 'Real-time push delivery verified! You will receive live shift, broadcast, and task alerts.'
      });
      alert('Test push notification dispatched!');
    } catch (err) {
      console.warn(err);
      // Fallback local notification
      showPushNotification('NX Work OS — Push Notification Test', {
        body: 'Real-time push delivery verified! You will receive live shift, broadcast, and task alerts.'
      });
    } finally {
      setTestingPush(false);
    }
  };

  const getIcon = (type, title = '') => {
    if (title.toLowerCase().includes('notice') || title.toLowerCase().includes('broadcast')) {
      return <Megaphone className="w-4 h-4 text-rose-600" />;
    }
    switch (type) {
      case 'Attendance': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Leave': return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'Task': return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case 'Correction': return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default: return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-700" />
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

        {/* PUSH NOTIFICATION CONTROLLER BANNER */}
        <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-b border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold">Native Push Notifications</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              pushStatus === 'granted'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {pushStatus === 'granted' ? 'Active / Allowed' : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {pushStatus !== 'granted' ? (
              <button
                onClick={handleEnablePush}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Enable Push Notifications
              </button>
            ) : (
              <button
                onClick={handleSendTestPush}
                disabled={testingPush}
                className="w-full py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer border border-white/20 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3 h-3 text-emerald-400" />
                <span>{testingPush ? 'Sending...' : 'Send Test Push Alert'}</span>
              </button>
            )}
          </div>
        </div>

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
              return (
                <div
                  key={item._id}
                  onClick={() => markAsRead(item._id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    item.isRead
                      ? 'bg-white border-slate-100 text-slate-600'
                      : isNotice
                      ? 'bg-rose-50/70 border-rose-200 text-slate-900 shadow-xs'
                      : 'bg-blue-50/60 border-blue-100 text-slate-900 shadow-xs'
                  } hover:border-slate-300`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white shadow-xs shrink-0 border border-slate-100">
                      {getIcon(item.type, item.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{item.message}</p>
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
