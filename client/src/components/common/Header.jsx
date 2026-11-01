import React, { useState } from 'react';
import { Bell, Search, ChevronDown, LogOut, User, Shield, Menu, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDrawer from '../modals/NotificationDrawer';
import PwaInstallButton from './PwaInstallButton';

export default function Header({ onToggleMobileNav, searchPlaceholder = 'Search anything...' }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const emp = user?.employee;
  const isHR = user?.role === 'HR';

  const displayName = isHR ? 'HR Admin' : (emp?.fullName || 'Rahul Sharma');
  const displayRole = isHR ? 'HR Panel' : `${emp?.employeeId || 'NX001'} | ${emp?.designation || 'Developer'}`;
  const displayInitials = isHR ? 'HR' : (emp?.fullName ? emp.fullName.split(' ').map(n => n[0]).join('') : 'RS');

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

        {/* Right: PWA Download Button + Push Notifications + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* PWA Download / Install App Button */}
          <PwaInstallButton />

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
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/20 shrink-0">
                {displayInitials}
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
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">{displayName}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                </div>
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
    </>
  );
}
