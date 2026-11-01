import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Lock,
  Bell,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Shield,
  CalendarOff,
  CreditCard,
  ClipboardList,
  Megaphone,
  Settings,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function HRMoreMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Modals state matching Screen 12
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data?.success) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordMsg({ type: '', text: '' });
        }, 1500);
      }
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.message || 'Password update failed'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hrEmail = user?.email || 'hr@nxworkos.com';
  const hrName = user?.employee?.fullName || 'HR Admin';

  const operationalModules = [
    { name: 'Leave Management', path: '/hr/leave', icon: CalendarOff, color: 'text-amber-600 bg-amber-50 border-amber-100', desc: 'Quotas & approvals' },
    { name: 'Payroll', path: '/hr/payroll', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', desc: 'Monthly compensation' },
    { name: 'Tasks & Reports', path: '/hr/tasks-reports', icon: ClipboardList, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', desc: 'Work verification' },
    { name: 'Broadcast / Notice', path: '/hr/broadcast', icon: Megaphone, color: 'text-rose-600 bg-rose-50 border-rose-100', desc: 'Push announcements' },
    { name: 'System Settings', path: '/hr/settings', icon: Settings, color: 'text-purple-600 bg-purple-50 border-purple-100', desc: 'Shifts & policies' },
  ];

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-6">
      {/* 12. HR Profile / Menu Header matching HrpanelMui.png #12 */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-blue-500/20">
            HR
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {hrName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{hrEmail}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Human Resources Admin
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowProfileModal(true)}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Operational Modules Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Operational Modules
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {operationalModules.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-2xl transition group flex flex-col justify-between"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 border ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Screen 12 Exact Settings List matching HrpanelMui.png #12 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
        <button
          onClick={() => setShowProfileModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Profile Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        </button>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Change Password</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        </button>

        <Link
          to="/hr/settings"
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition">
              <Bell className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Notification Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        </Link>

        <button
          onClick={() => setShowHelpModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        </button>

        <button
          onClick={() => setShowAboutModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition">
              <Info className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">About NX Work OS</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        </button>

        {/* Logout Row matching Screen 12 */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-rose-600">Logout</span>
          </div>
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 my-auto sm:my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {passwordLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 my-auto sm:my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">HR Administrator Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-blue-600 mx-auto text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/20 mb-3">
                HR
              </div>
              <h4 className="font-bold text-slate-900">{hrName}</h4>
              <p className="text-xs text-slate-500">{hrEmail}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-slate-800">HR Administrator</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Access Level:</span>
                <span className="font-bold text-emerald-600">Full System RBAC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timezone:</span>
                <span className="font-bold text-slate-800">Asia/Kolkata</span>
              </div>
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-3 my-auto sm:my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Help & Support</h3>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              NX Work OS is built for high-reliability HR Administration and Employee Self-Service Operations.
            </p>
            <div className="p-3 bg-blue-50 rounded-2xl text-xs text-blue-900 space-y-1">
              <div className="font-bold">Need Administrator Assistance?</div>
              <div className="text-[11px] text-blue-700">Official HR Desk: support@nxworkos.com</div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-3 my-auto sm:my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">About NX Work OS</h3>
              <button onClick={() => setShowAboutModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto text-white flex items-center justify-center font-black text-lg mb-2 shadow-sm">
                NX
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">NX Work OS Platform</h4>
              <p className="text-[11px] text-slate-400">Version 1.0.0 (Production Release)</p>
            </div>
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Complete Enterprise Human Resources Operations, Autonomous Attendance & Payroll Ledger Platform.
            </p>
            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

