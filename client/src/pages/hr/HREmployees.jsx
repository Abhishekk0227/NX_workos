import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  KeyRound,
  DollarSign,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Clock,
  Calendar,
  X,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ChevronRight,
  Check,
  Lock
} from 'lucide-react';
import api from '../../api/client';

export default function HREmployees() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // overview, attendance, leave, payroll
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Password reset modal (HR only)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetEmp, setResetTargetEmp] = useState(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showInitialPassword, setShowInitialPassword] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    officialEmail: '',
    mobileNumber: '',
    department: 'Engineering',
    designation: 'Developer',
    employmentType: 'Full-Time',
    joiningDate: new Date().toISOString().split('T')[0],
    assignedShift: '',
    weeklyOff: ['Sunday'],
    leavePolicy: '',
    initialPassword: 'Employee@123',
    monthlyGrossSalary: '75000',
    dailyRateBasis: 'CalendarDays'
  });

  // Salary form state
  const [salaryData, setSalaryData] = useState({
    monthlyGrossSalary: '',
    basicSalary: '',
    hra: '',
    specialAllowance: '',
    dailyRateBasis: 'CalendarDays',
    effectiveFrom: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [salaryHistory, setSalaryHistory] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, shiftRes, polRes] = await Promise.all([
        api.get(`/employees?search=${search}&status=${statusFilter}`),
        api.get('/shifts'),
        api.get('/leaves/policies')
      ]);

      setEmployees(empRes.data?.employees || []);
      setShifts(shiftRes.data?.shifts || []);
      setPolicies(polRes.data?.policies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    try {
      const res = await api.post('/employees', formData);
      if (res.data?.success) {
        alert(res.data.message || 'Employee created successfully!');
        setShowCreateModal(false);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create employee');
    }
  };

  const handleToggleStatus = async (emp) => {
    const newStatus = emp.employmentStatus === 'Active' ? 'Inactive' : 'Active';
    const newIsActive = newStatus === 'Active';
    try {
      await api.patch(`/employees/${emp._id}/status`, {
        employmentStatus: newStatus,
        isActive: newIsActive
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openResetPasswordModal = (emp) => {
    setResetTargetEmp(emp);
    setResetNewPassword(`NX@${Math.floor(100000 + Math.random() * 900000)}`);
    setResetSuccessData(null);
    setCopied(false);
    setShowResetModal(true);
  };

  const handleExecuteResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTargetEmp) return;
    setResetLoading(true);
    try {
      const res = await api.post(`/employees/${resetTargetEmp._id}/reset-password`, {
        newPassword: resetNewPassword
      });
      if (res.data?.success) {
        setResetSuccessData({
          employeeName: resetTargetEmp.fullName,
          employeeId: resetTargetEmp.employeeId,
          loginEmail: resetTargetEmp.officialEmail,
          password: res.data.updatedPassword || resetNewPassword
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Password update failed');
    } finally {
      setResetLoading(false);
    }
  };

  const openSalaryModal = async (emp) => {
    setSelectedEmployee(emp);
    setShowSalaryModal(true);
    try {
      const res = await api.get(`/employees/${emp._id}/salary`);
      if (res.data?.success) {
        const current = res.data.currentProfile;
        if (current) {
          setSalaryData({
            monthlyGrossSalary: current.monthlyGrossSalary || '',
            basicSalary: current.basicSalary || '',
            hra: current.hra || '',
            specialAllowance: current.specialAllowance || '',
            dailyRateBasis: current.dailyRateBasis || 'CalendarDays',
            effectiveFrom: new Date().toISOString().split('T')[0],
            notes: ''
          });
        }
        setSalaryHistory(res.data.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/employees/${selectedEmployee._id}/salary`, salaryData);
      if (res.data?.success) {
        alert('Salary profile updated successfully!');
        setShowSalaryModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save salary configuration');
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    if (roleFilter !== 'All' && emp.designation !== roleFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header matching hrpanelD.png #2 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Employees</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage employee directory, shifts, status, and permissions</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              ...formData,
              assignedShift: shifts[0]?._id || '',
              leavePolicy: policies[0]?._id || ''
            });
            setShowCreateModal(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Employee ID, name, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="All">All Roles</option>
            <option value="Developer">Developer</option>
            <option value="Designer">Designer</option>
            <option value="QA Tester">QA Tester</option>
            <option value="Operations Specialist">Operations Specialist</option>
            <option value="HR Manager">HR Manager</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employee List Table matching hrpanelD.png #2 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Shift</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Join Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No employees matching the search filters
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={emp._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 text-slate-400 font-medium">{idx + 1}</td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.fullName?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {emp.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400">{emp.officialEmail}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {emp.employeeId}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{emp.designation}</span>
                      <div className="text-[10px] text-slate-400">{emp.department}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="font-medium text-slate-700">
                        {emp.assignedShift?.startTime && emp.assignedShift?.endTime
                          ? `${emp.assignedShift.startTime} - ${emp.assignedShift.endTime}`
                          : '09:30 AM - 06:30 PM'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.employmentStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.employmentStatus === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {emp.employmentStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '01/01/2024'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setDetailTab('overview');
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openSalaryModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="Configure Salary (HR)"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="Edit/Reset Password (HR Only)"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            emp.employmentStatus === 'Active'
                              ? 'text-rose-500 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={emp.employmentStatus === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {emp.employmentStatus === 'Active' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL (2-Column Form matching hrpanelD.png #3) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Add New Employee</h3>
                <p className="text-[11px] text-slate-300">Create employee profile and generate login access</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. NX001 or NX-EMP-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave blank to auto-generate sequentially</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={formData.officialEmail}
                    onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                    placeholder="rahul@nxworkos.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">This email is the employee's login ID</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Login Password *</label>
                  <div className="relative">
                    <input
                      type={showInitialPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={formData.initialPassword}
                      onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                      placeholder="Min 6 characters (e.g. Employee@123)"
                      className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInitialPassword(!showInitialPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showInitialPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">🔒 Only HR can change this password later</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product Design">Product Design</option>
                    <option value="Operations">Operations</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Designation *</label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Developer">Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="QA Tester">QA Tester</option>
                    <option value="Operations Specialist">Operations Specialist</option>
                    <option value="HR Manager">HR Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Intern">Intern</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Shift</label>
                  <select
                    value={formData.assignedShift}
                    onChange={(e) => setFormData({ ...formData, assignedShift: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {shifts.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Gross Salary (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.monthlyGrossSalary}
                    onChange={(e) => setFormData({ ...formData, monthlyGrossSalary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Create & Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE DETAIL MODAL WITH TABS matching hrpanelD.png #3 */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {selectedEmployee.fullName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selectedEmployee.fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                    <span className="font-mono font-bold text-emerald-400">{selectedEmployee.employeeId}</span>
                    <span>•</span>
                    <span>{selectedEmployee.designation}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs: Overview | Attendance | Leave | Payroll */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
              {['overview', 'attendance', 'leave', 'payroll'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                    detailTab === tab
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {detailTab === 'overview' && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Official Email</span>
                    <span className="font-bold text-slate-800">{selectedEmployee.officialEmail}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Mobile Phone</span>
                    <span className="font-bold text-slate-800">{selectedEmployee.mobileNumber || '—'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Department</span>
                    <span className="font-bold text-slate-800">{selectedEmployee.department}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Employment Type</span>
                    <span className="font-bold text-slate-800">{selectedEmployee.employmentType || 'Full-Time'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Assigned Shift</span>
                    <span className="font-bold text-slate-800">{selectedEmployee.assignedShift?.name || 'General Shift'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Status</span>
                    <span className="font-bold text-emerald-600">{selectedEmployee.employmentStatus}</span>
                  </div>
                </div>
              )}

              {detailTab === 'attendance' && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Detailed employee monthly attendance stats can also be viewed in the{' '}
                  <span className="font-bold text-blue-600">Attendance</span> tab.
                </div>
              )}

              {detailTab === 'leave' && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Leave balances and request review available in the{' '}
                  <span className="font-bold text-blue-600">Leave Management</span> tab.
                </div>
              )}

              {detailTab === 'payroll' && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  To configure salary, click the{' '}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openSalaryModal(selectedEmployee);
                    }}
                    className="font-bold text-emerald-700 underline"
                  >
                    Configure Compensation
                  </button>{' '}
                  button.
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALARY CONFIGURATION MODAL (HR ONLY) */}
      {showSalaryModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base leading-tight">Configure Compensation</h3>
                  <p className="text-[11px] text-emerald-200">
                    {selectedEmployee.fullName} ({selectedEmployee.employeeId}) — HR Restricted
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSalaryModal(false)}
                className="w-8 h-8 rounded-full bg-emerald-900 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                Salary changes are <strong>effective-dated</strong>. Previous historical payroll records remain untouched.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Gross (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={salaryData.monthlyGrossSalary}
                    onChange={(e) => setSalaryData({ ...salaryData, monthlyGrossSalary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={salaryData.effectiveFrom}
                    onChange={(e) => setSalaryData({ ...salaryData, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Calculation Basis</label>
                  <select
                    value={salaryData.dailyRateBasis}
                    onChange={(e) => setSalaryData({ ...salaryData, dailyRateBasis: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="CalendarDays">Actual Calendar Days (e.g. 30 or 31)</option>
                    <option value="WorkingDays">Working Days Only</option>
                    <option value="30DaysFixed">Fixed 30 Days Standard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Notes</label>
                  <input
                    type="text"
                    value={salaryData.notes}
                    onChange={(e) => setSalaryData({ ...salaryData, notes: e.target.value })}
                    placeholder="e.g. Annual Appraisal 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  Save Salary Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* HR PASSWORD UPDATE / RESET MODAL */}
      {showResetModal && resetTargetEmp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Update Employee Password</h3>
                  <p className="text-[11px] text-slate-400">HR Administrator Access Only</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target Employee Info */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {resetTargetEmp.fullName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{resetTargetEmp.fullName}</h4>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID: {resetTargetEmp.employeeId} • Login: {resetTargetEmp.officialEmail}
                  </div>
                </div>
              </div>

              {resetSuccessData ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Password successfully updated!</span>
                  </div>
                  <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Employee Login Credentials</div>
                    <div className="text-xs text-slate-700"><strong>Login Email:</strong> {resetSuccessData.loginEmail}</div>
                    <div className="text-xs text-slate-700 flex items-center justify-between">
                      <span><strong>New Password:</strong> <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-emerald-700">{resetSuccessData.password}</code></span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`Login Email: ${resetSuccessData.loginEmail}\nPassword: ${resetSuccessData.password}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-semibold"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecuteResetPassword} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">Set New Password *</label>
                      <button
                        type="button"
                        onClick={() => setResetNewPassword(`NX@${Math.floor(100000 + Math.random() * 900000)}`)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        ⚡ Generate Random
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Employees cannot edit or change this password themselves. Only HR can update it.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      {resetLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
