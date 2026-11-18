import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Clock,
  History,
  AlertTriangle,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import Header from '../common/Header';
import { useAuth } from '../../context/AuthContext';

export default function ManagerLayout() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Students', path: '/manager/students', icon: Users },
    { name: 'Task Management', path: '/manager/tasks', icon: ClipboardList },
    { name: 'Deadline Tracker', path: '/manager/deadlines', icon: Clock },
    { name: 'Task History', path: '/manager/history', icon: History }
  ];

  const primaryMobileNav = [
    { name: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
    { name: 'Students', path: '/manager/students', icon: Users },
    { name: 'Tasks', path: '/manager/tasks', icon: ClipboardList },
    { name: 'Deadlines', path: '/manager/deadlines', icon: Clock },
    { name: 'History', path: '/manager/history', icon: History }
  ];

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#f8f9fa] flex flex-col md:flex-row pb-16 md:pb-0 w-full max-w-full">
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:sticky top-0 left-0 z-40 h-screen w-60 bg-[#0f172a] text-slate-300 flex-col border-r border-slate-800 shrink-0">
        {/* Brand Logo */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 font-black text-sm">
              M
            </div>
            <div>
              <div className="text-white font-extrabold text-sm tracking-tight leading-tight">
                NX Work OS
              </div>
              <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                Manager Panel
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
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
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Manager Mode</div>
            <div className="font-semibold text-slate-200 truncate mt-0.5">
              {user?.employee?.fullName || user?.email}
            </div>
            {user?.role === 'HR' && (
              <Link
                to="/hr/dashboard"
                className="mt-2 block text-center text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/40 p-1.5 rounded-lg border border-blue-800/50"
              >
                Switch to HR Panel
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 w-full h-full md:h-screen md:overflow-hidden">
        <Header onToggleMobileNav={() => setMobileDrawerOpen(!mobileDrawerOpen)} searchPlaceholder="Search tasks, students..." />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 w-full max-w-full">
          <Outlet />
        </main>
      </div>

      {/* Fixed Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {primaryMobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition text-[10px] font-bold ${
                isActive ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
