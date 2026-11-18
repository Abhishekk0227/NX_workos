import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Check,
  X,
  Shield,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  UserMinus
} from 'lucide-react';
import api from '../../api/client';
import { TableShimmer } from '../../components/common/Shimmer';

export default function HRManagers() {
  const [managers, setManagers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Designate Modal
  const [showDesignateModal, setShowDesignateModal] = useState(false);
  const [designateEmpId, setDesignateEmpId] = useState('');
  const [designateSubmitting, setDesignateSubmitting] = useState(false);

  const fetchManagersData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/manager/admin/all-managers');
      if (res.data?.success) {
        setManagers(res.data.managers || []);
        setAllStudents(res.data.allStudents || []);
      }
    } catch (err) {
      console.error('Failed to load managers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagersData();
  }, []);

  const openAssignModal = manager => {
    setSelectedManager(manager);
    const currentAssigned = (manager.assignedStudents || []).map(s => s._id || s);
    setSelectedStudentIds(currentAssigned);
    setStudentSearch('');
    setShowAssignModal(true);
  };

  const toggleStudentSelection = studentId => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSaveStudentAssignments = async () => {
    if (!selectedManager) return;
    setAssignSubmitting(true);
    try {
      const res = await api.post('/manager/admin/assign-students', {
        managerEmployeeId: selectedManager._id,
        studentIds: selectedStudentIds
      });
      if (res.data?.success) {
        setShowAssignModal(false);
        fetchManagersData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign students');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleDesignateManager = async e => {
    e.preventDefault();
    if (!designateEmpId) return;
    setDesignateSubmitting(true);
    try {
      const res = await api.post('/manager/admin/designate', {
        employeeId: designateEmpId,
        isManager: true
      });
      if (res.data?.success) {
        alert(res.data.message || 'Successfully designated as Manager!');
        setShowDesignateModal(false);
        setDesignateEmpId('');
        fetchManagersData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to designate manager');
    } finally {
      setDesignateSubmitting(false);
    }
  };

  const handleRevokeManager = async manager => {
    if (
      !window.confirm(
        `Are you sure you want to revoke Manager role from ${manager.fullName}? Any active students will need reassignment.`
      )
    ) {
      return;
    }
    try {
      const res = await api.post('/manager/admin/designate', {
        employeeId: manager._id,
        isManager: false
      });
      if (res.data?.success) {
        fetchManagersData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke manager');
    }
  };

  const filteredManagers = managers.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.fullName?.toLowerCase().includes(q) ||
      m.employeeId?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q) ||
      m.officialEmail?.toLowerCase().includes(q)
    );
  });

  const filteredModalStudents = allStudents.filter(s => {
    // Exclude manager themselves
    if (selectedManager && s._id === selectedManager._id) return false;
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.employeeId?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-blue-600" /> Manager & Student Cohort Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Designate employees as Managers and assign specific students/interns to them for task supervision.
          </p>
        </div>

        <button
          onClick={() => setShowDesignateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Designate Manager
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-400">Designated Managers</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : managers.length}
          </div>
          <div className="text-[10px] text-slate-500">Supervising teams & interns</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Supervised Students</div>
          <div className="text-2xl font-black text-blue-600 font-mono">
            {loading
              ? '...'
              : managers.reduce((acc, m) => acc + (m.assignedStudents?.length || 0), 0)}
          </div>
          <div className="text-[10px] text-slate-500">Allocated to active managers</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Active Employees / Students</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : allStudents.length}
          </div>
          <div className="text-[10px] text-slate-500">Available across the organization</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search managers by name, ID or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Managers List */}
      {loading ? (
        <TableShimmer rows={4} cols={5} />
      ) : filteredManagers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Managers Designated Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Designate Manager" to pick an employee and assign students to their supervision.
          </p>
          <button
            onClick={() => setShowDesignateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
          >
            <UserPlus className="w-4 h-4" /> Designate First Manager
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredManagers.map(mgr => {
            const studentCount = mgr.assignedStudents?.length || 0;

            return (
              <div
                key={mgr._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 hover:shadow-xs transition space-y-4"
              >
                {/* Header: Manager Info & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      {mgr.fullName?.[0] || 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{mgr.fullName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Manager
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {mgr.employeeId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {mgr.designation} • {mgr.department} • <span className="font-mono">{mgr.officialEmail}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openAssignModal(mgr)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Assign Students ({studentCount})
                    </button>
                    <button
                      onClick={() => handleRevokeManager(mgr)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Revoke Manager Role"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Assigned Students Chips */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Assigned Students & Interns ({studentCount})</span>
                    {studentCount > 0 && (
                      <button
                        onClick={() => openAssignModal(mgr)}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold underline cursor-pointer"
                      >
                        Modify Cohort
                      </button>
                    )}
                  </div>

                  {studentCount === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
                      No students currently assigned to this manager.{' '}
                      <button
                        onClick={() => openAssignModal(mgr)}
                        className="text-blue-600 font-bold underline ml-1 cursor-pointer"
                      >
                        Assign now
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {mgr.assignedStudents.map(student => (
                        <div
                          key={student._id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs transition"
                        >
                          <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px]">
                            {student.fullName?.[0] || 'S'}
                          </div>
                          <span className="font-bold text-slate-800">{student.fullName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({student.employeeId})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Assign Students to Manager */}
      {showAssignModal && selectedManager && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Students to {selectedManager.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select students and interns to assign to this manager's cohort
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Search & Select Controls */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter students by name or ID..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-slate-500 px-1">
                <span>
                  Selected: <b className="text-blue-600">{selectedStudentIds.length}</b> student(s)
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      const allIds = filteredModalStudents.map(s => s._id);
                      setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...allIds])));
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    Select All Visible
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setSelectedStudentIds([])}
                    className="text-rose-600 hover:text-rose-800 font-bold"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>

            {/* Students Checkbox List */}
            <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {filteredModalStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No eligible students found matching search.
                </div>
              ) : (
                filteredModalStudents.map(student => {
                  const isChecked = selectedStudentIds.includes(student._id);
                  const isAssignedOther =
                    student.assignedManager &&
                    student.assignedManager._id !== selectedManager._id;

                  return (
                    <label
                      key={student._id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-300'
                          : 'bg-white border-slate-200/70 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(student._id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {student.fullName}
                            {student.employmentType?.toLowerCase().includes('intern') && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                Intern
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {student.employeeId} • {student.department || 'General'}
                          </div>
                        </div>
                      </div>

                      {isAssignedOther && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Assigned to: {student.assignedManager.fullName}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStudentAssignments}
                disabled={assignSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
              >
                {assignSubmitting ? 'Saving Cohort...' : `Save ${selectedStudentIds.length} Assignments`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Designate Employee as Manager */}
      {showDesignateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Designate Manager</h3>
                  <p className="text-xs text-slate-500">Promote an employee to Manager role</p>
                </div>
              </div>
              <button
                onClick={() => setShowDesignateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDesignateManager} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={designateEmpId}
                  onChange={e => setDesignateEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {allStudents
                    .filter(emp => !managers.some(m => String(m._id) === String(emp._id)))
                    .map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId}) • {emp.department}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Once designated, they gain access to the Manager panel to assign tasks and track deadlines.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDesignateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={designateSubmitting || !designateEmpId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition disabled:opacity-50"
                >
                  {designateSubmitting ? 'Designating...' : 'Confirm Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
