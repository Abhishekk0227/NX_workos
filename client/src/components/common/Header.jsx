import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Search, ChevronDown, LogOut, User, Shield, Menu, Radio, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDrawer from '../modals/NotificationDrawer';
import ReminderModal from '../modals/ReminderModal';
import PwaInstallButton from './PwaInstallButton';

export default function Header({ onToggleMobileNav, searchPlaceholder = 'Search anything...' }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const emp = user?.employee;
  const isHR = user?.role === 'HR';
  const isManager = user?.role === 'Manager' || Boolean(emp?.isManager);
  const onManagerRoute = location.pathname.startsWith('/manager');
  const onEmployeeRoute = location.pathname.startsWith('/employee');
  const onHRRoute = location.pathname.startsWith('/hr');

  const displayName = isHR ? 'HR Admin' : isManager ? (emp?.fullName || 'Manager') : (emp?.fullName || 'Rahul Sharma');
  const displayRole = isHR
    ? 'HR Panel'
    : isManager
    ? `Manager • ${emp?.department || 'Supervisor'}`
    : `${emp?.employeeId || 'NX001'} | ${emp?.designation || 'Developer'}`;
  const displayInitials = isHR
    ? 'HR'
    : isManager
    ? (emp?.fullName ? emp.fullName.split(' ').map(n => n[0]).join('') : 'MG')
    : (emp?.fullName ? emp.fullName.split(' ').map(n => n[0]).join('') : 'RS');

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger & Search bar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
          {onToggleMobileNav && (
            <button
              onClick={onToggleMobileNav}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="relative flex-1 w-full max-w-md hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Right: Portal Switch + PWA Download Button + Push Notifications + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Portal Switch Button for Managers & HR */}
          {isManager && onEmployeeRoute && (
            <Link
              to="/manager/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
              title="Open Manager Panel"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Manager Panel</span>
            </Link>
          )}
          {(isManager || isHR) && onManagerRoute && (
            <Link
              to="/employee/home"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-2xs border border-slate-200 transition active:scale-95"
              title="Open Employee Portal"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Employee Portal</span>
            </Link>
          )}

          {/* PWA Download / Install App Button */}
          <PwaInstallButton />

          {/* Reminders & Alarms */}
          <button
            onClick={() => setShowReminders(true)}
            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition cursor-pointer"
            title="Reminders & Alarms"
          >
            <Clock className="w-5 h-5" />
          </button>

          {/* Notification Bell with Badge */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
            title="Notifications & Push Alerts"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Pill with dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/20 shrink-0 overflow-hidden">
                {emp?.profilePicture ? (
                  <img src={emp.profilePicture} alt={displayName} className="w-full h-full min-w-full min-h-full max-w-full max-h-full object-cover rounded-full" />
                ) : (
                  displayInitials
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {displayName}
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                  {displayRole}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">{displayName}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                  {isManager && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-50 text-purple-700 font-bold text-[9px] rounded-full border border-purple-200 uppercase tracking-wider">
                      Manager Role Active
                    </span>
                  )}
                </div>

                {/* Role / Portal Switcher */}
                {(isManager || isHR) && (
                  <div className="py-1 border-b border-slate-100">
                    <Link
                      to="/manager/dashboard"
                      onClick={() => setShowUserMenu(false)}
                      className={`w-full text-left px-3.5 py-2 flex items-center gap-2 font-semibold transition ${
                        onManagerRoute ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-purple-600" /> Manager Panel
                    </Link>
                    <Link
                      to="/employee/home"
                      onClick={() => setShowUserMenu(false)}
                      className={`w-full text-left px-3.5 py-2 flex items-center gap-2 font-semibold transition ${
                        onEmployeeRoute ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-4 h-4 text-blue-600" /> Employee Portal
                    </Link>
                    {isHR && (
                      <Link
                        to="/hr/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className={`w-full text-left px-3.5 py-2 flex items-center gap-2 font-semibold transition ${
                          onHRRoute ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Shield className="w-4 h-4 text-emerald-600" /> HR Panel
                      </Link>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <ReminderModal
        isOpen={showReminders}
        onClose={() => setShowReminders(false)}
      />
    </>
  );
}
