import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppInstallModal from '../../components/modals/AppInstallModal';
import { requestPushPermission } from '../../services/pushNotification';

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

  useEffect(() => {
    // Detect standalone PWA mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(standaloneMode);

    // If opened as downloaded standalone app, automatically ask for push notifications
    if (standaloneMode && 'Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        requestPushPermission(true);
      }, 1000);
    }

    // Capture beforeinstallprompt for 1-click install
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // When app is installed, automatically prompt for push notifications
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
          requestPushPermission(true);
        }, 800);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDownloadAppClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        // Automatically ask for push notification popup when downloaded
        if ('Notification' in window && Notification.permission === 'default') {
          setTimeout(() => {
            requestPushPermission(true);
          }, 800);
        }
      }
    } else {
      setShowInstallModal(true);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* App Install Guide Modal (For iOS Safari or manual guidance) */}
      <AppInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onPromptInstall={handleDownloadAppClick}
      />

      <div className="w-full max-w-md">
        {/* Brand Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-8">
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

              {/* Simple Clean Download App Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadAppClick}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isInstalled ? 'App Installed ✓' : 'Download App'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Protected by Role-Based Access Control & bcrypt encryption
          </div>
        </div>
      </div>
    </div>
  );
}
