import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  CheckSquare,
  Clock,
  CalendarDays,
  User,
  X,
  Menu,
  Bell,
  Megaphone
} from 'lucide-react';
import Header from '../common/Header';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDrawer from '../modals/NotificationDrawer';

export default function EmployeeLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  // Bottom Fixed Mobile Navigation (Exactly 5 items matching EppanelM.png)
  const bottomNavItems = [
    { name: 'Home', path: '/employee/home', icon: Home },
    { name: 'Tasks', path: '/employee/tasks', icon: CheckSquare },
    { name: 'Attendance', path: '/employee/attendance', icon: Clock },
    { name: 'Leave', path: '/employee/leave', icon: CalendarDays },
    { name: 'Profile', path: '/employee/profile', icon: User },
  ];

  // Sidebar Menu Navigation (Includes Notices / Announcements)
  const sidebarNavItems = [
    { name: 'Home', path: '/employee/home', icon: Home },
    { name: 'Tasks', path: '/employee/tasks', icon: CheckSquare },
    { name: 'Attendance', path: '/employee/attendance', icon: Clock },
    { name: 'Leave', path: '/employee/leave', icon: CalendarDays },
    { name: 'Notice Board', path: '/employee/notices', icon: Megaphone },
    { name: 'Profile', path: '/employee/profile', icon: User },
  ];

  const emp = user?.employee;
  const displayInitials = emp?.fullName ? emp.fullName.split(' ').map(n => n[0]).join('') : 'RS';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Desktop Left Sidebar (Matching EppanelD.png) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-60 bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Logo */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-sm">
              NX
            </div>
            <div className="text-white font-extrabold text-sm tracking-tight">
              NX Work OS
            </div>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (Sidebar with Notice Board) */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Mobile Bar matching EppanelM.png */}
        <div className="md:hidden sticky top-0 z-30 bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              NX
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">NX Work OS</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-1 text-slate-300 hover:text-white"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <NavLink to="/employee/profile" className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] ring-1 ring-white/20 overflow-hidden">
              {emp?.profilePicture ? (
                <img src={emp.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                displayInitials
              )}
            </NavLink>
          </div>
        </div>

        {/* Desktop Top Header (Search + Profile) */}
        <div className="hidden md:block">
          <Header
            searchPlaceholder="Search anything..."
            onToggleMobileNav={() => setMobileDrawerOpen(true)}
          />
        </div>

        {/* Content Area */}
        <main className="flex-1 p-2.5 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Fixed Navigation (Matching EppanelM.png) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 py-1.5 px-2 flex items-center justify-around shadow-lg">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
}
