import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckSquare,
  Clock,
  CalendarDays,
  DollarSign,
  AlertCircle,
  Megaphone,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const resolveNotificationRoute = (notif, userRole) => {
  if (notif?.link && notif.link.trim() !== '') return notif.link;
  const isHR = userRole === 'HR';
  const type = (notif?.type || '').toLowerCase();
  const title = (notif?.title || '').toLowerCase();

  if (type === 'task' || title.includes('task')) {
    return isHR ? '/hr/tasks-reports' : '/employee/tasks';
  }
  if (type === 'attendance' || title.includes('punch') || title.includes('attendance')) {
    return isHR ? '/hr/attendance' : '/employee/attendance';
  }
  if (type === 'leave' || title.includes('leave')) {
    return isHR ? '/hr/leave' : '/employee/leave';
  }
  if (type === 'payroll' || title.includes('salary') || title.includes('payroll')) {
    return isHR ? '/hr/payroll' : '/employee/profile';
  }
  if (type === 'correction') {
    return isHR ? '/hr/attendance' : '/employee/attendance';
  }
  if (title.includes('notice') || title.includes('broadcast') || type === 'system') {
    return isHR ? '/hr/broadcast' : '/employee/notices';
  }

  return isHR ? '/hr/dashboard' : '/employee/home';
};

export default function NotificationToast({ toast, onDismiss, onMarkRead }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const handleClick = () => {
    if (toast.notifId && onMarkRead) {
      onMarkRead(toast.notifId);
    }
    onDismiss(toast.id);
    const route = resolveNotificationRoute(toast, user?.role);
    if (route) {
      navigate(route);
    }
  };

  const getIcon = () => {
    const type = (toast.type || '').toLowerCase();
    const title = (toast.title || '').toLowerCase();

    if (type === 'task' || title.includes('task')) {
      return <CheckSquare className="w-5 h-5 text-blue-400" />;
    }
    if (type === 'attendance' || title.includes('punch') || title.includes('attendance')) {
      return <Clock className="w-5 h-5 text-emerald-400" />;
    }
    if (type === 'leave' || title.includes('leave')) {
      return <CalendarDays className="w-5 h-5 text-rose-400" />;
    }
    if (type === 'payroll' || title.includes('salary')) {
      return <DollarSign className="w-5 h-5 text-amber-400" />;
    }
    if (title.includes('notice') || title.includes('broadcast')) {
      return <Megaphone className="w-5 h-5 text-purple-400" />;
    }
    return <Bell className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div
      onClick={handleClick}
      className="pointer-events-auto bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/70 p-3.5 sm:p-4 flex items-start gap-3.5 cursor-pointer hover:bg-slate-800/95 transition-all transform hover:-translate-y-0.5 active:scale-98 animate-in slide-in-from-top-5 fade-in duration-300 ring-1 ring-white/10"
      role="alert"
    >
      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-1">
          <h4 className="text-xs font-bold text-white tracking-tight truncate">
            {toast.title}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium shrink-0">Just now</span>
        </div>
        <p className="text-xs text-slate-300 mt-0.5 leading-snug line-clamp-2">
          {toast.message}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-blue-400 font-semibold mt-1.5 hover:text-blue-300">
          <span>Tap to open section</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 -mr-1 -mt-1"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
