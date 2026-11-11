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
  X,
  ShieldCheck,
  Sliders,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function HRSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('hours'); // 'hours' | 'policy' | 'company' | 'roles' | 'notifications' | 'profile'

  const [settings, setSettings] = useState({
    companyName: 'NX Global Technologies',
    companyEmail: 'contact@nxglobal.com',
    companyAddress: 'Tech Park Avenue, Bangalore, India',
    companyTimezone: 'Asia/Kolkata',
    departments: ['Engineering', 'Product Design', 'Operations', 'Human Resources', 'Sales & Marketing'],
    designations: ['Developer', 'Designer', 'QA Tester', 'Operations Specialist', 'HR Manager'],
    gracePeriodMinutes: 15,
    enableGracePeriod: true,
    fullDayThresholdHours: 8,
    halfDayThresholdHours: 4,
    halfDayDeductionPercentage: 50,
    enableLateDeduction: true,
    enableShortfallDeduction: false,
    fullDayCutoffMinutes: 120,
    morningHalfDayCutoffMinutes: 60,
    afternoonHalfDayCutoffMinutes: 60,
    lunchStartTime: '13:30',
    workStartTime: '10:00',
    workEndTime: '18:00',
    monthlyClAllowance: 1,
    yearlyClTotal: 12,
    yearlySlTotal: 12,
    defaultRequiredHours: 8,
    dailyRateBasis: 'WorkingDays'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const setRes = await api.get('/settings');
      if (setRes.data?.settings) {
        const fetched = setRes.data.settings;
        setSettings((prev) => ({
          ...prev,
          ...fetched,
          fullDayThresholdHours: fetched.fullDayThresholdHours ?? fetched.defaultRequiredHours ?? 8,
          halfDayThresholdHours: fetched.halfDayThresholdHours ?? 4
        }));
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
    const fullHrs = Number(settings.fullDayThresholdHours || 8);
    const halfHrs = Number(settings.halfDayThresholdHours || 4);
    if (isNaN(fullHrs) || fullHrs <= 0 || isNaN(halfHrs) || halfHrs <= 0) {
      alert('Full-Day and Half-Day thresholds must be positive numbers.');
      return;
    }
    if (halfHrs >= fullHrs) {
      alert('Half-Day working hours threshold must be strictly less than Full-Day threshold.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/settings', {
        ...settings,
        fullDayThresholdHours: fullHrs,
        halfDayThresholdHours: halfHrs,
        defaultRequiredHours: fullHrs
      });
      if (res.data?.success) {
        if (res.data.settings) {
          setSettings((prev) => ({ ...prev, ...res.data.settings }));
        }
        alert('Settings saved successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Roles &amp; Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure working hours thresholds, company parameters, attendance policies, and security</p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-2 sm:p-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto w-full max-w-full">
          {[
            { id: 'hours', label: 'Working Hours Rules', icon: Clock },
            { id: 'policy', label: 'Attendance & Leave Policy', icon: ShieldCheck },
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

        {/* TAB 1: WORKING HOURS & THRESHOLDS */}
        {activeTab === 'hours' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-6 max-w-3xl">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Working Hours &amp; Attendance Threshold Rules
              </h3>
              <p className="text-xs text-slate-500">
                Attendance status and salary eligibility are calculated directly from actual eligible working hours.
              </p>
            </div>

            {/* Live Classification Preview Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200/80">
                    <th className="py-2.5 px-4">Working Hours</th>
                    <th className="py-2.5 px-4">Attendance Status</th>
                    <th className="py-2.5 px-4">Salary Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 bg-white">
                  <tr>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                      {settings.fullDayThresholdHours || 8} hours or more
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Full Day
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700">100%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                      {settings.halfDayThresholdHours || 4} to less than {settings.fullDayThresholdHours || 8} hours
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                        Half Day
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-amber-700">
                      {100 - Number(settings.halfDayDeductionPercentage ?? 50)}% ({settings.halfDayDeductionPercentage ?? 50}% Deduction)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                      Less than {settings.halfDayThresholdHours || 4} hours
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Short Attendance
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-rose-700">HR Decides (Alert Generated)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">No attendance</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        Absent
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-600">0% (Paid on Holidays)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Configurable Hours Inputs */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Configure Working Hours Thresholds
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full-Day Threshold (Hours) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={settings.fullDayThresholdHours ?? 8}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fullDayThresholdHours: Number(e.target.value),
                        defaultRequiredHours: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Hours &ge; this value count as Full Day (100% pay)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Half-Day Threshold (Hours) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={settings.halfDayThresholdHours ?? 4}
                    onChange={(e) => setSettings({ ...settings, halfDayThresholdHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-amber-700 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Hours between Half-Day and Full-Day = Half Day; below this = Short Attendance
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Half-Day Deduction Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.halfDayDeductionPercentage ?? 50}
                    onChange={(e) =>
                      setSettings({ ...settings, halfDayDeductionPercentage: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Default 50% salary deduction on Half Day
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard Work Start Time (HH:mm)
                  </label>
                  <input
                    type="text"
                    value={settings.workStartTime || '10:00'}
                    onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                    placeholder="10:00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Used for leave advance cutoff &amp; late minutes reference (IST)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-xl text-[11px] text-blue-900">
              <strong>Automatic Punch-Out Cutoff:</strong> Employees who forget to punch out are automatically punched out at <strong>12:00 AM IST</strong> of the next day, and attendance is classified using these exact working-hours thresholds.
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                Save Working Hours Rules
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ATTENDANCE & LEAVE POLICY (Conditions 1-80) */}
        {activeTab === 'policy' && (
          <div className="p-6 space-y-6 max-w-3xl">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Attendance, Late & Leave Deduction Policies</h3>
              <p className="text-xs text-slate-500 mb-4">
                Configurable business rules for automatic leave processing, half-day thresholds, and per-minute salary deductions.
              </p>
            </div>

            {/* Section 1: Late Arrival & Grace Period */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Late Arrival & Grace Period (Conditions 3-6, 19-20, 56)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Enable Grace Period</span>
                    <span className="text-[10px] text-slate-400">Late calculation begins after grace period</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableGracePeriod !== false}
                    onChange={(e) => setSettings({ ...settings, enableGracePeriod: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grace Period Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.gracePeriodMinutes || 15}
                    onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 cursor-pointer sm:col-span-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Enable Per-Minute Late Deduction in Payroll</span>
                    <span className="text-[10px] text-slate-400">
                      Calculates salary deduction based on exact late arrival minutes: (Daily Rate &divide; Working Minutes) &times; Late Mins
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableLateDeduction !== false}
                    onChange={(e) => setSettings({ ...settings, enableLateDeduction: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Section 2: Working Hours Summary Note */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Working Hours Classification Thresholds
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('hours')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Edit in Working Hours Rules
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Full Day: <strong>&ge; {settings.fullDayThresholdHours ?? 8} hrs</strong> (100% pay) &bull;
                Half Day: <strong>{settings.halfDayThresholdHours ?? 4} to &lt; {settings.fullDayThresholdHours ?? 8} hrs</strong> ({settings.halfDayDeductionPercentage ?? 50}% deduction) &bull;
                Short Attendance: <strong>&lt; {settings.halfDayThresholdHours ?? 4} hrs</strong> (HR decides)
              </p>
            </div>

            {/* Section 3: Leave Quotas & 1 Monthly Paid CL Rule */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Leave Entitlements & Monthly 1 CL Limit (Conditions 25-27, 36-46)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Paid CL Allowance
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={settings.monthlyClAllowance || 1}
                    onChange={(e) => setSettings({ ...settings, monthlyClAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none font-bold text-purple-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">1 Paid CL/month; subsequent leaves auto-deduct as LWP</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Total CL Entitlement
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.yearlyClTotal || 12}
                    onChange={(e) => setSettings({ ...settings, yearlyClTotal: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Total 12 Casual Leaves per year</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Total SL Entitlement
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.yearlySlTotal || 12}
                    onChange={(e) => setSettings({ ...settings, yearlySlTotal: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Sick Leave paid only upon HR review</span>
                </div>
              </div>
            </div>

            {/* Section 4: Leave Application Cut-off Windows */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Leave Application Cut-off Windows (Conditions 32-35)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full-Day Leave Advance Cutoff (Minutes before Start)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.fullDayCutoffMinutes || 120}
                    onChange={(e) => setSettings({ ...settings, fullDayCutoffMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 120 mins (2 hours before work start)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Morning Half-Day Cutoff (Minutes before Start)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.morningHalfDayCutoffMinutes || 60}
                    onChange={(e) => setSettings({ ...settings, morningHalfDayCutoffMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 60 mins before work start</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lunch Break Start Time
                  </label>
                  <input
                    type="text"
                    value={settings.lunchStartTime || '13:30'}
                    onChange={(e) => setSettings({ ...settings, lunchStartTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Base for Afternoon Half-Day cutoff</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Afternoon Half-Day Cutoff (Minutes before Lunch)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.afternoonHalfDayCutoffMinutes || 60}
                    onChange={(e) => setSettings({ ...settings, afternoonHalfDayCutoffMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 60 mins before lunch start</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Save Attendance & Leave Policies
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: COMPANY SETTINGS */}
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

        {/* TAB 4: EMPLOYEE ROLES */}
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
                    { feature: 'Autonomous Leave Application (Auto <= 24 hrs)', emp: true, hr: true },
                    { feature: 'Leave Approval & LWP / SL Reclassification', emp: false, hr: true },
                    { feature: 'Payroll Review & Itemized Deductions (Confidential)', emp: false, hr: true },
                    { feature: 'Working Hours & Policy Configuration', emp: false, hr: true }
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

        {/* TAB 5: NOTIFICATIONS */}
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

        {/* TAB 6: HR PROFILE */}
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
