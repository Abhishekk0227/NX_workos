import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  MoreVertical,
  MoreHorizontal,
  ArrowLeft,
  Phone,
  Mail,
  Briefcase,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') || 'All';
  const urlSearch = searchParams.get('search') || '';

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [roleFilter, setRoleFilter] = useState('All');
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s && s !== statusFilter) setStatusFilter(s);
    const q = searchParams.get('search');
    if (q !== null && q !== search) setSearch(q);
  }, [searchParams]);

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('status', newStatus);
      return p;
    }, { replace: true });
  };

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
            placeholder="Search by name, ID or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="All">All Roles</option>
            <option value="Developer">Developer</option>
            <option value="Designer">Designer</option>
            <option value="QA Tester">QA Tester</option>
            <option value="Operations Specialist">Operations Specialist</option>
            <option value="HR Manager">HR Manager</option>
          </select>
        </div>
      </div>

      {/* Status Segment Pills matching Mobile Screen 2 (All, Active, Inactive) */}
      <div className="flex items-center gap-2">
        {[
          { id: 'All', label: `All (${employees.length})` },
          { id: 'Active', label: `Active (${employees.filter(e => e.employmentStatus === 'Active').length})` },
          { id: 'Inactive', label: `Inactive (${employees.filter(e => e.employmentStatus !== 'Active').length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleStatusFilterChange(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MOBILE CARD VIEW matching Image Screen 2 (Employees List) */}
      <div className="block md:hidden space-y-2.5">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
            No employees found
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp._id}
              className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-3 relative hover:border-slate-200 transition"
            >
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => {
                  setSelectedEmployee(emp);
                  setDetailTab('overview');
                  setShowDetailModal(true);
                }}
              >
                <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-sm">
                  {emp.profilePicture ? (
                    <img src={emp.profilePicture} alt={emp.fullName} className="w-full h-full min-w-full min-h-full max-w-full max-h-full object-cover rounded-full" />
                  ) : (
                    emp.fullName?.charAt(0)
                  )}
                </div>
                <div>
                  <div className="font-mono text-[11px] font-bold text-slate-900 tracking-tight">
                    {emp.employeeId}
                  </div>
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {emp.fullName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {emp.designation}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    emp.employmentStatus === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {emp.employmentStatus}
                </span>

                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === emp._id ? null : emp._id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === emp._id && (
                    <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 text-xs animate-in fade-in">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setDetailTab('overview');
                          setShowDetailModal(true);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-500" /> View Detail
                      </button>
                      <button
                        onClick={() => {
                          openResetPasswordModal(emp);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Reset Password
                      </button>
                      <button
                        onClick={() => {
                          openSalaryModal(emp);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Salary Profile
                      </button>
                      <button
                        onClick={() => {
                          handleToggleStatus(emp);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2"
                      >
                        {emp.employmentStatus === 'Active' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Mark Inactive
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Mark Active
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW matching hrpanelD.png #2 */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                      {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
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

      {/* EMPLOYEE DETAIL MODAL matching Screen 4 in Image */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-3 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="font-bold text-sm">NX Work OS • Employee Detail</div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Hero Card matching Screen 4 */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px] rounded-full bg-slate-100 overflow-hidden shrink-0 border-2 border-slate-200 flex items-center justify-center font-black text-slate-700 text-xl shadow-xs">
                  {selectedEmployee.profilePicture ? (
                    <img src={selectedEmployee.profilePicture} alt={selectedEmployee.fullName} className="w-full h-full min-w-full min-h-full max-w-full max-h-full object-cover rounded-full" />
                  ) : (
                    selectedEmployee.fullName?.charAt(0)
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{selectedEmployee.fullName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {selectedEmployee.employmentStatus || 'Active'}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-slate-700">{selectedEmployee.employeeId}</div>
                  <div className="text-xs text-slate-500">{selectedEmployee.designation}</div>
                  <div className="text-[11px] text-slate-400">{selectedEmployee.department}</div>
                </div>
              </div>

              {/* Action Buttons: Edit, Reset Password, More */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    alert('Employee details can be updated via HR admin controls.');
                  }}
                  className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 transition"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Edit</span>
                </button>
                <button
                  onClick={() => {
                    openResetPasswordModal(selectedEmployee);
                  }}
                  className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 transition"
                >
                  <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Reset Password</span>
                </button>
                <button
                  onClick={() => {
                    openSalaryModal(selectedEmployee);
                  }}
                  className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 transition"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="truncate">More</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs: Overview | Attendance | Leave | Payroll */}
            <div className="px-3 sm:px-5 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center gap-3 sm:gap-4 text-xs font-bold overflow-x-auto">
              {['overview', 'attendance', 'leave', 'payroll'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`pb-1.5 capitalize transition cursor-pointer relative shrink-0 ${
                    detailTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-5 space-y-4 text-xs">
              {detailTab === 'overview' && (
                <>
                  {/* Basic Information Card */}
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2.5">
                    <h4 className="font-bold text-slate-900 text-xs">Basic Information</h4>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.officialEmail}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Phone
                      </span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.mobileNumber || '9876543210'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Joining Date
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedEmployee.joiningDate
                          ? new Date(selectedEmployee.joiningDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : selectedEmployee.createdAt
                          ? new Date(selectedEmployee.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" /> Employee Type
                      </span>
                      <span className="font-semibold text-slate-800">{selectedEmployee.employmentType || 'Full-time'}</span>
                    </div>
                  </div>

                  {/* Work Details Card */}
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2.5">
                    <h4 className="font-bold text-slate-900 text-xs">Work Details</h4>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Shift
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedEmployee.assignedShift?.startTime && selectedEmployee.assignedShift?.endTime
                          ? `${selectedEmployee.assignedShift.startTime} - ${selectedEmployee.assignedShift.endTime}`
                          : '10:00 AM - 6:00 PM'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Working Days
                      </span>
                      <span className="font-semibold text-slate-800">Mon - Sat (6 Days)</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> Weekly Off
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedEmployee.weeklyOff?.join(', ') || 'Sunday'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {detailTab === 'attendance' && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Monthly attendance and punch times can also be audited in the{' '}
                  <span className="font-bold text-blue-600">Attendance</span> module.
                </div>
              )}

              {detailTab === 'leave' && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Leave balance: 1 CL monthly quota applies. Full request history available in{' '}
                  <span className="font-bold text-blue-600">Leave Management</span>.
                </div>
              )}

              {detailTab === 'payroll' && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openSalaryModal(selectedEmployee);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Open Salary Configuration
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-6 pb-20 sm:pb-8">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-8 animate-in fade-in zoom-in-95 duration-150">
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
