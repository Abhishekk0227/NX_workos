import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import NotificationToast from '../components/common/NotificationToast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const knownNotifIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  const showToast = useCallback((toastData) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev.slice(-2), { id, ...toastData }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        const list = res.data.notifications || [];
        setNotifications(list);

        const unreadItems = list.filter((n) => {
          if (n.recipient && (n.recipient === user._id || n.recipient._id === user._id)) return !n.isRead;
          const readByMe = (n.readBy || []).some((r) => r.user === user._id || r.user?._id === user._id);
          return !readByMe;
        });

        setUnreadCount(unreadItems.length);

        // Detect newly arrived notifications to show a floating toast pop-up
        if (!isInitialLoadRef.current && unreadItems.length > 0) {
          const freshItems = unreadItems.filter((n) => !knownNotifIdsRef.current.has(n._id));
          freshItems.forEach((fresh) => {
            showToast({
              notifId: fresh._id,
              title: fresh.title,
              message: fresh.message,
              type: fresh.type,
              link: fresh.link
            });
          });
        }

        // Update known IDs
        list.forEach((n) => knownNotifIdsRef.current.add(n._id));
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      // background polling silent catch
    }
  }, [user, showToast]);

  useEffect(() => {
    if (!user) {
      knownNotifIdsRef.current = new Set();
      isInitialLoadRef.current = true;
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
        showToast
      }}
    >
      {children}

      {/* Real-time Floating Notification Pop-up Toast Container */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
        {toasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onMarkRead={markAsRead}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
