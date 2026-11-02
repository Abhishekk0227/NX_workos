import React, { useState, useRef } from 'react';
import {
  Lock,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Building,
  Camera,
  Upload,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function EmployeeProfile() {
  const { user, logout, setUser } = useAuth();
  const emp = user?.employee || {};

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Photo change state
  const fileInputRef = useRef(null);
  const [selectedPhoto, setSelectedPhoto] = useState(
    emp.profilePicture ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80'
  );
  const [customUrl, setCustomUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState({ type: '', message: '' });

  // Curated preset avatars
  const avatarPresets = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&auto=format&fit=crop&q=80'
  ];

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });

  const currentDisplayPhoto =
    emp.profilePicture ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80';

  // Handle local file selection with auto client-side image compression
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoFeedback({ type: 'error', message: 'Please select a valid image file (JPG, PNG, WebP).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize to standard avatar dimension (max 400x400)
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setSelectedPhoto(compressedDataUrl);
        setPhotoFeedback({ type: '', message: '' });
      };
      img.onerror = () => {
        setSelectedPhoto(event.target.result);
        setPhotoFeedback({ type: '', message: '' });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Save updated photo to backend
  const handleSavePhoto = async () => {
    if (!selectedPhoto) {
      setPhotoFeedback({ type: 'error', message: 'Please select an image or avatar first.' });
      return;
    }

    setPhotoLoading(true);
    setPhotoFeedback({ type: '', message: '' });
    try {
      const res = await api.put('/auth/profile-picture', {
        profilePicture: selectedPhoto
      });

      if (res.data?.success) {
        setPhotoFeedback({ type: 'success', message: 'Profile photo updated successfully!' });
        if (res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('nx_user', JSON.stringify(res.data.user));
        }
        setTimeout(() => {
          setShowPhotoModal(false);
          setPhotoFeedback({ type: '', message: '' });
        }, 1000);
      }
    } catch (err) {
      setPhotoFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile picture'
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback({ type: '', message: '' });

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (res.data?.success) {
        setPasswordFeedback({ type: 'success', message: 'Password updated successfully!' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordFeedback({ type: '', message: '' });
        }, 1200);
      }
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Password update failed'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Format date of joining dynamically
  const rawJoinDate = emp.joiningDate || emp.createdAt || new Date();
  const formattedJoiningDate = new Date(rawJoinDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const shiftDisplay = emp.assignedShift?.startTime && emp.assignedShift?.endTime
    ? `${emp.assignedShift.startTime} - ${emp.assignedShift.endTime}`
    : '10:00 AM - 6:00 PM';

  return (
    <div className="max-w-md mx-auto space-y-4 pb-6">
      {/* 1. Header Profile Card (Matching Screen 10 of EppanelM.png) */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1">
        <div className="relative w-24 h-24 min-w-[96px] min-h-[96px] max-w-[96px] max-h-[96px] shrink-0">
          <div className="w-24 h-24 min-w-[96px] min-h-[96px] max-w-[96px] max-h-[96px] rounded-full overflow-hidden border-3 border-white shadow-md shadow-slate-200 bg-slate-100 flex items-center justify-center">
            <img
              src={currentDisplayPhoto}
              alt={emp.fullName || 'Rahul Sharma'}
              className="w-full h-full min-w-full min-h-full max-w-full max-h-full object-cover rounded-full"
            />
          </div>

          {/* Pencil edit badge -> Opens direct photo upload modal */}
          <button
            type="button"
            onClick={() => {
              setSelectedPhoto(currentDisplayPhoto);
              setPhotoFeedback({ type: '', message: '' });
              setShowPhotoModal(true);
            }}
            className="absolute bottom-0 right-0 w-7 h-7 bg-white text-blue-600 rounded-full border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition cursor-pointer active:scale-95 z-10"
            title="Update Profile Photo"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mt-3 tracking-tight">
          {emp.fullName || 'Rahul Sharma'}
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-0.5 tracking-wider">
          {emp.employeeId || 'NX001'}
        </p>
      </div>

      {/* 2. Employee Details Card (Matching Screen 10 of EppanelM.png) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-500 font-medium">Department</span>
          <span className="font-semibold text-slate-900">{emp.department || 'Development'}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-500 font-medium">Designation</span>
          <span className="font-semibold text-slate-900">{emp.designation || 'Developer'}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-500 font-medium">Email</span>
          <span className="font-semibold text-slate-900">{emp.officialEmail || user?.email || 'rahul@nxworkos.com'}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-500 font-medium">Phone</span>
          <span className="font-semibold text-slate-900">{emp.mobileNumber || '9876543210'}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-500 font-medium">Date of Joining</span>
          <span className="font-semibold text-slate-900">{formattedJoiningDate}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-500 font-medium">Shift</span>
          <span className="font-semibold text-slate-900">{shiftDisplay}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs">
          <span className="text-slate-500 font-medium">Employee Type</span>
          <span className="font-semibold text-slate-900">{emp.employmentType || 'Full-time'}</span>
        </div>
      </div>

      {/* 3. Settings Menu Card (Matching Screen 10 of EppanelM.png) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        <div className="w-full flex items-center justify-between px-4 py-3.5 text-xs text-left bg-slate-50/50">
          <div className="flex items-center gap-3 text-slate-800 font-medium">
            <Lock className="w-4 h-4 text-slate-500" />
            <div>
              <span className="block font-semibold">Account Password</span>
              <span className="text-[10px] text-slate-400">Strictly managed by HR Admin</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            HR Only
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-xs text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 text-slate-800 font-medium">
            <HelpCircle className="w-4 h-4 text-slate-600" />
            <span>Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => setShowAboutModal(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-xs text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 text-slate-800 font-medium">
            <Info className="w-4 h-4 text-slate-600" />
            <span>About NX Work OS</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* 4. Logout Action (Matching Screen 10 of EppanelM.png) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-xs font-bold text-red-600 hover:bg-red-50/50 transition cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4 text-red-600" />
          <span>Logout</span>
        </button>
      </div>

      {/* PHOTO UPDATE MODAL -> Direct Employee Photo Update */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Update Profile Photo</h3>
              </div>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {photoFeedback.message && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                    photoFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {photoFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{photoFeedback.message}</span>
                </div>
              )}

              {/* Preview Circle */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative w-20 h-20 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] shrink-0">
                  <div className="w-20 h-20 min-w-[80px] min-h-[80px] max-w-[80px] max-h-[80px] rounded-full overflow-hidden border-2 border-blue-600 shadow-sm bg-slate-100 flex items-center justify-center">
                    <img
                      src={selectedPhoto}
                      alt="Preview"
                      className="w-full h-full min-w-full min-h-full max-w-full max-h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs z-10">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Live Preview</span>
              </div>

              {/* Upload from Device Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Upload From Device / Camera</span>
                </button>
              </div>

              {/* Or Select from Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-2">Or Choose from Preset Avatars</label>
                <div className="grid grid-cols-6 gap-2">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedPhoto(preset);
                        setPhotoFeedback({ type: '', message: '' });
                      }}
                      className={`relative w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-full overflow-hidden p-0.5 border-2 transition cursor-pointer shrink-0 flex items-center justify-center ${
                        selectedPhoto === preset
                          ? 'border-blue-600 ring-2 ring-blue-500/30'
                          : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full min-w-full min-h-full max-w-full max-h-full rounded-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={photoLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {photoLoading ? 'SAVING...' : 'SAVE PHOTO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Help & Support</h3>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>Need assistance with attendance, leave requests, or your shift assignments? Reach out to HR operations.</p>
              
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">hr@nxworkos.com</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">+91 98765 43200 (HR Desk)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Building className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>HQ Floor 3, People Operations</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* About NX Work OS Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  NX
                </div>
                <h3 className="font-bold text-slate-900 text-sm">About NX Work OS</h3>
              </div>
              <button onClick={() => setShowAboutModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="font-bold text-slate-900 text-sm">NX Work OS v2.4.0</p>
              <p>Next-Generation Workforce Operations, Attendance, Tasks, & Leave Management Platform.</p>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-[11px] text-slate-500 border border-slate-200">
                <div>Client Build: Progressive Web App (PWA)</div>
                <div>Status: Online & Synchronized</div>
                <div>Push Notifications: Active</div>
                <div>Security: End-to-End Enterprise Auth</div>
              </div>
            </div>

            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
