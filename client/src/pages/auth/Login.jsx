import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Smartphone,
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppInstallModal from '../../components/modals/AppInstallModal';
import {
  requestPushPermission,
  getPushPermissionStatus,
  sendTestPushNotification,
  isPushSupported
} from '../../services/pushNotification';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Push Notification State
  const [pushStatus, setPushStatus] = useState('default');
  const [pushTesting, setPushTesting] = useState(false);
  const [pushFeedback, setPushFeedback] = useState('');

  useEffect(() => {
    // Detect standalone PWA mode
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(checkStandalone);

    // Capture beforeinstallprompt for 1-click install
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial push notification status check
    setPushStatus(getPushPermissionStatus());

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDownloadAppClick = async () => {
    if (deferredPrompt) {
      // Trigger native browser install prompt
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // Open step-by-step install guide modal
      setShowInstallModal(true);
    }
  };

  const handleEnablePush = async () => {
    setPushFeedback('');
    const granted = await requestPushPermission(true);
    const updatedStatus = getPushPermissionStatus();
    setPushStatus(updatedStatus);

    if (granted) {
      setPushFeedback('Push alerts activated! Live shift & notice alerts enabled.');
      setTimeout(() => setPushFeedback(''), 5000);
    } else if (updatedStatus === 'denied') {
      alert(
        'Push notifications are blocked in your browser. Please click the lock 🔒 icon next to the address bar, enable Notifications, and reload the page.'
      );
    }
  };

  const handleTestPush = async () => {
    setPushTesting(true);
    await sendTestPushNotification();
    setPushFeedback('Test alert dispatched to your device!');
    setTimeout(() => {
      setPushTesting(false);
      setPushFeedback('');
    }, 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      if (loggedInUser.role === 'HR') {
        navigate('/hr/dashboard');
      } else {
        navigate('/employee/home');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
      {/* App Install Guide Modal */}
      <AppInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onPromptInstall={handleDownloadAppClick}
      />

      <div className="w-full max-w-md space-y-4">
        {/* Top PWA Quick-Install Pill Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl text-xs text-white shadow-lg">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-200">
              {isInstalled ? 'Running in App Mode' : 'Mobile & Desktop App Available'}
            </span>
          </div>

          <button
            onClick={handleDownloadAppClick}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalled ? 'View App Info' : 'Download App'}</span>
          </button>
        </div>

        {/* Brand Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-7 sm:p-8">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-blue-500/30">
                NX
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                  WORK <span className="text-blue-600">OS</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Enterprise Operations Platform
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">Welcome Back</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in to your authorized operational account
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employee ID / Official Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. TEST_EMP_80 or name@nxworkos.com"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sign in using your Employee ID or registered email
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Sign In to Work OS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Actions Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 font-semibold uppercase tracking-wider">
                  Mobile App & Notifications
                </span>
              </div>
            </div>

            {/* Download App & Push Notifications Section */}
            <div className="space-y-3">
              {/* Download App Action Card */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        Download NX App
                      </span>
                      <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-black rounded-md uppercase">
                        Fast
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Install on Android, iPhone & PC
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadAppClick}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isInstalled ? 'Installed ✓' : 'Install'}</span>
                </button>
              </div>

              {/* Push Notifications Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    pushStatus === 'granted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : pushStatus === 'denied'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {pushStatus === 'granted' ? (
                      <BellRing className="w-4 h-4" />
                    ) : pushStatus === 'denied' ? (
                      <BellOff className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        Push Notifications
                      </span>
                      {pushStatus === 'granted' && (
                        <span className="text-[10px] text-emerald-600 font-bold">Active ✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {pushStatus === 'granted'
                        ? 'Live alerts for shifts & notices'
                        : pushStatus === 'denied'
                        ? 'Blocked in browser permissions'
                        : 'Receive real-time operational alerts'}
                    </p>
                  </div>
                </div>

                {pushStatus === 'granted' ? (
                  <button
                    type="button"
                    onClick={handleTestPush}
                    disabled={pushTesting}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    <span>{pushTesting ? 'Sending...' : 'Test Alert'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Enable</span>
                  </button>
                )}
              </div>

              {pushFeedback && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{pushFeedback}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Protected by Role-Based Access Control</span>
            <span className="flex items-center gap-1 text-slate-500 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>SSL / PWA Secure</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
