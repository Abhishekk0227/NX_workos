/**
 * Push Notification Service for NX Work OS
 */
import api from '../api/client';

export const isPushSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const getPushPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

export const requestPushPermission = async (triggerWelcomeNotice = true) => {
  if (!isPushSupported()) {
    alert('Push notifications are not supported on this browser or device.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Sync subscription to backend if user is logged in
      const token = localStorage.getItem('nx_token');
      if (token && 'serviceWorker' in navigator) {
        try {
          await api.post('/notifications/subscribe', {
            subscription: {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          });
        } catch (apiErr) {
          // Non-blocking if subscription sync fails
          console.warn('[Push Service API warning]:', apiErr?.message);
        }
      }

      // Show welcome confirmation notification
      if (triggerWelcomeNotice) {
        await showPushNotification('NX Work OS — Push Notifications Active! 🔔', {
          body: 'You will now receive instant shift alerts, company notices, and task updates.',
          url: '/'
        });
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
      // Prefer service worker showNotification for persistent native notifications
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, {
            body: options.body || '',
            icon: options.icon || '/icons/icon-192.svg',
            badge: options.badge || '/icons/icon-192.svg',
            vibrate: [200, 100, 200],
            tag: options.tag || ('nx-work-os-' + Date.now()),
            data: { url: options.url || '/' }
          });
          return;
        }
      }

      // Fallback to Window Notification API
      new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/icons/icon-192.svg'
      });
    } catch (e) {
      console.warn('Native notification via SW failed, trying direct Notification:', e);
      try {
        new Notification(title, {
          body: options.body || '',
          icon: '/icons/icon-192.svg'
        });
      } catch (err2) {
        console.warn('Direct notification also failed:', err2);
      }
    }
  }
};

export const sendTestPushNotification = async () => {
  return await showPushNotification('NX Work OS — Test Push Notification 🚀', {
    body: 'Push notification system is working 100% on this device!',
    url: '/'
  });
};
