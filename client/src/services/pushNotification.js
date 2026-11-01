/**
 * Push Notification Service for NX Work OS
 */
import api from '../api/client';

export const isPushSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

export const getPushPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

export const requestPushPermission = async () => {
  if (!isPushSupported()) {
    alert('Push notifications are not supported on this browser.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register with service worker
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        // Post subscription or sync to backend
        try {
          await api.post('/notifications/subscribe', {
            subscription: {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          });
        } catch (apiErr) {
          console.warn('[Push Service API error]:', apiErr);
        }
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Push Service Error]:', err);
    return false;
  }
};

export const showPushNotification = async (title, options = {}) => {
  if (!isPushSupported()) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg.active) {
          reg.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body: options.body || '',
            url: options.url || '/'
          });
          return;
        }
      }
      // Fallback
      new Notification(title, {
        body: options.body || '',
        icon: '/icons/icon-192.svg'
      });
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
};
