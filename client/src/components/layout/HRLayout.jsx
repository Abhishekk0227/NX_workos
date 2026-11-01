import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarOff,
  ClipboardList,
  CreditCard,
  Settings,
  MoreHorizontal,
  Bell,
  Megaphone,
  LayoutGrid
} from 'lucide-react';
import Header from '../common/Header';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDrawer from '../modals/NotificationDrawer';

export default function HRLayout() {
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  // Navigation Items matching hrpanelD.png + Broadcast
  const navItems = [
    { name: 'Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/hr/employees', icon: Users },
    { name: 'Attendance', path: '/hr/attendance', icon: CalendarCheck },
    { name: 'Leave Management', path: '/hr/leave', icon: CalendarOff },
    { name: 'Tasks & Reports', path: '/hr/tasks-reports', icon: ClipboardList },
    { name: 'Payroll', path: '/hr/payroll', icon: CreditCard },
    { name: 'Broadcast / Notice', path: '/hr/broadcast', icon: Megaphone },
    { name: 'Roles & Settings', path: '/hr/settings', icon: Settings },
  ];

  // Exact 4 Tabs from HrpanelMui.png: Dashboard, Employees, Attendance, More
  const primaryMobileNav = [
    { name: 'Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/hr/employees', icon: Users },
    { name: 'Attendance', path: '/hr/attendance', icon: CalendarCheck },
    { name: 'More', path: '/hr/more', icon: LayoutGrid },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Desktop Left Sidebar (Matching hrpanelD.png) */}
      <aside
        className="hidden md:sticky md:flex top-0 left-0 z-50 h-screen w-60 bg-[#0f172a] text-slate-300 flex-col border-r border-slate-800"
      >
        {/* Brand Logo */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-sm">
              NX
            </div>
            <div>
              <div className="text-white font-extrabold text-sm tracking-tight leading-tight">
                NX Work OS
              </div>
            </div>
          </div>

        </div>

        {/* Navigation Links - Exactly 7 sections */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
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

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header (matching HrpanelMui.png) */}
        <div className="md:hidden sticky top-0 z-30 bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <Link to="/hr/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              NX
            </div>
            <div className="text-left">
              <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">NX Work OS</span>
              <span className="text-[10px] text-slate-400 leading-none">HR Panel</span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-1 text-slate-300 hover:text-white cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <Link
              to="/hr/more"
              className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] ring-1 ring-white/20 hover:opacity-90 transition"
              title="HR Profile / Menu"
            >
              HR
            </Link>
          </div>
        </div>

        {/* Desktop Top Header matching hrpanelD.png */}
        <div className="hidden md:block">
          <Header
            searchPlaceholder="Search..."
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-2.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Fixed Nav matching HrpanelMui.png (4 Tabs: Dashboard, Employees, Attendance, More) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 py-1 px-2 flex items-center justify-around shadow-lg">
        {primaryMobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/hr/dashboard' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
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
