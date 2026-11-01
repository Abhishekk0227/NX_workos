import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Building,
  Shield,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  Building2,
  Calendar,
  Bell,
  User,
  Lock,
  Check,
  X
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function HRSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('shifts'); // 'roles' | 'company' | 'shifts' | 'notifications' | 'profile'

  const [shifts, setShifts] = useState([]);
  const [settings, setSettings] = useState({
    companyName: 'NX Global Technologies',
    companyEmail: 'contact@nxglobal.com',
    companyAddress: 'Tech Park Avenue, Bangalore, India',
    companyTimezone: 'Asia/Kolkata',
    departments: ['Engineering', 'Product Design', 'Operations', 'Human Resources', 'Sales & Marketing'],
    designations: ['Developer', 'Designer', 'QA Tester', 'Operations Specialist', 'HR Manager'],
    gracePeriodMinutes: 15,
    defaultRequiredHours: 8.5,
    dailyRateBasis: 'CalendarDays'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New shift form
  const [newShift, setNewShift] = useState({
    name: '',
    startTime: '09:30',
    endTime: '18:30',
    requiredHours: 8.5,
    gracePeriodMinutes: 15,
    breakDurationMinutes: 60,
    isDefault: false
  });

  // Password update form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Notifications toggles
  const [notifications, setNotifications] = useState({
    punchAlerts: true,
    leaveRequests: true,
    dailyReports: true,
    lateArrivals: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shiftRes, setRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/settings')
      ]);
      setShifts(shiftRes.data?.shifts || []);
      if (setRes.data?.settings) {
        setSettings((prev) => ({ ...prev, ...setRes.data.settings }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', settings);
      if (res.data?.success) {
        alert('Settings saved successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/shifts', newShift);
      if (res.data?.success) {
        alert('Shift template added!');
        setNewShift({
          name: '',
          startTime: '09:30',
          endTime: '18:30',
          requiredHours: 8.5,
          gracePeriodMinutes: 15,
          breakDurationMinutes: 60,
          isDefault: false
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add shift template');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    try {
      const res = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (res.data?.success) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching hrpanelD.png #9 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Roles & Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure shifts, company parameters, permissions, and security</p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>

      {/* 5 Segmented Navigation Tabs matching hrpanelD.png #9, #10, #11, #12 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'shifts', label: 'Shift & Working Hours', icon: Clock },
            { id: 'company', label: 'Company Settings', icon: Building2 },
            { id: 'roles', label: 'Employee Roles', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'profile', label: 'HR Profile', icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SHIFT & WORKING HOURS matching hrpanelD.png #11 */}
        {activeTab === 'shifts' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Active Shift Templates</h3>
              <p className="text-xs text-slate-500 mb-4">Set standard work schedules and grace allowances</p>

              <div className="space-y-3">
                {shifts.map((s) => (
                  <div key={s._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                        {s.isDefault && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span>Timing: <strong>{s.startTime} - {s.endTime}</strong></span>
                        <span>•</span>
                        <span>Grace: <strong>{s.gracePeriodMinutes} mins</strong></span>
                        <span>•</span>
                        <span>Required: <strong>{s.requiredHours} hrs</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Shift Form */}
            <form onSubmit={handleCreateShift} className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Add New Shift Template
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Evening Operations Shift"
                    value={newShift.name}
                    onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                    <input
                      type="text"
                      required
                      placeholder="09:30"
                      value={newShift.startTime}
                      onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                    <input
                      type="text"
                      required
                      placeholder="18:30"
                      value={newShift.endTime}
                      onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={newShift.gracePeriodMinutes}
                    onChange={(e) => setNewShift({ ...newShift, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Working Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newShift.requiredHours}
                    onChange={(e) => setNewShift({ ...newShift, requiredHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Create Shift Template
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: COMPANY SETTINGS matching hrpanelD.png #10 */}
        {activeTab === 'company' && (
          <div className="p-6 space-y-4 max-w-xl">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Corporate Details</h3>
            <p className="text-xs text-slate-500 mb-4">Organizational metadata and calculation standard</p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Contact Email</label>
              <input
                type="email"
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headquarters Location</label>
              <input
                type="text"
                value={settings.companyAddress}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Daily Rate Basis</label>
              <select
                value={settings.dailyRateBasis}
                onChange={(e) => setSettings({ ...settings, dailyRateBasis: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none text-slate-800"
              >
                <option value="CalendarDays">Actual Calendar Days (e.g. 30 or 31)</option>
                <option value="WorkingDays">Working Days Only</option>
                <option value="30DaysFixed">Fixed 30 Days Standard</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 3: EMPLOYEE ROLES matching hrpanelD.png #9 */}
        {activeTab === 'roles' && (
          <div className="p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm mb-1">System Roles & Access Control</h3>
            <p className="text-xs text-slate-500 mb-4">RBAC permissions matrix between HR and Employee tiers</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Feature / Module</th>
                    <th className="py-3 px-4 text-center">Employee Tier</th>
                    <th className="py-3 px-4 text-center">HR Admin Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { feature: 'Punch In / Server Verification', emp: true, hr: true },
                    { feature: 'Punch Out & Work Report Mandatory Bullets', emp: true, hr: true },
                    { feature: 'View Personal Tasks & Checklist', emp: true, hr: true },
                    { feature: 'Assign Directives to Staff', emp: false, hr: true },
                    { feature: 'Autonomous Leave Application', emp: true, hr: true },
                    { feature: 'Leave Approval & LWP Conversion', emp: false, hr: true },
                    { feature: 'Payroll Review & Compensation (Confidential)', emp: false, hr: true },
                    { feature: 'System Shift & Policy Configuration', emp: false, hr: true }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{row.feature}</td>
                      <td className="py-3 px-4 text-center">
                        {row.emp ? (
                          <span className="inline-flex p-1 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400">
                            <X className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex p-1 rounded-full bg-emerald-50 text-emerald-600">
                          <Check className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="p-6 space-y-4 max-w-xl">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Operational Alerts</h3>
            <p className="text-xs text-slate-500 mb-4">Select event triggers for real-time notification alerts</p>

            <div className="space-y-3">
              {[
                { key: 'punchAlerts', label: 'Employee Punch In / Out Events' },
                { key: 'leaveRequests', label: 'New Leave Applications' },
                { key: 'dailyReports', label: 'Punch-Out Daily Work Reports' },
                { key: 'lateArrivals', label: 'Late Arrival Grace Period Flags' }
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: HR PROFILE */}
        {activeTab === 'profile' && (
          <div className="p-6 space-y-6 max-w-xl">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">HR Administrator Profile</h3>
              <p className="text-xs text-slate-500 mb-4">Master operational credentials</p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Admin Email</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || 'hr@nxworkos.com'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Role Tier</label>
                  <input
                    type="text"
                    disabled
                    value="Executive HR Admin (Full Access)"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Change Password */}
            <form onSubmit={handleChangePassword} className="pt-6 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Update HR Password</h4>

              {passwordMsg.text && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {passwordMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Change Admin Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
