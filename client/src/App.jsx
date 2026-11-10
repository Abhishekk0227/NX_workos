import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Auth Pages
import Login from './pages/auth/Login';

// Layouts
import HRLayout from './components/layout/HRLayout';
import EmployeeLayout from './components/layout/EmployeeLayout';

// HR Pages
import HRDashboard from './pages/hr/HRDashboard';
import HREmployees from './pages/hr/HREmployees';
import HRAttendance from './pages/hr/HRAttendance';
import HRTasksReports from './pages/hr/HRTasksReports';
import HRLeave from './pages/hr/HRLeave';
import HRPayroll from './pages/hr/HRPayroll';
import HRSettings from './pages/hr/HRSettings';
import HRBroadcast from './pages/hr/HRBroadcast';
import HRMoreMenu from './pages/hr/HRMoreMenu';
import HRHolidayCalendar from './pages/hr/HRHolidayCalendar';
import HRReports from './pages/hr/HRReports';

// Employee Pages (5 Sections)
import EmployeeHome from './pages/employee/EmployeeHome';
import EmployeeTasks from './pages/employee/EmployeeTasks';
import EmployeeAttendance from './pages/employee/EmployeeAttendance';
import EmployeeHolidays from './pages/employee/EmployeeHolidays';
import EmployeeLeave from './pages/employee/EmployeeLeave';
import EmployeeProfile from './pages/employee/EmployeeProfile';
import EmployeeNotices from './pages/employee/EmployeeNotices';
import { FullScreenLoader } from './components/common/Shimmer';

// Route Guard Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized for HR, redirect to Employee home
    if (user.role === 'Employee') {
      return <Navigate to="/employee/home" replace />;
    }
    return <Navigate to="/hr/dashboard" replace />;
  }

  return children;
};

// Root Router Redirector
const RootRedirector = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'HR' ? <Navigate to="/hr/dashboard" replace /> : <Navigate to="/employee/home" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* HR Panel Routes - Exactly 7 Sections */}
            <Route
              path="/hr"
              element={
                <ProtectedRoute allowedRoles={['HR']}>
                  <HRLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/hr/dashboard" replace />} />
              <Route path="dashboard" element={<HRDashboard />} />
              <Route path="employees" element={<HREmployees />} />
              <Route path="attendance" element={<HRAttendance />} />
              <Route path="holidays" element={<HRHolidayCalendar />} />
              <Route path="reports" element={<HRReports />} />
              <Route path="tasks-reports" element={<HRTasksReports />} />
              <Route path="leave" element={<HRLeave />} />
              <Route path="payroll" element={<HRPayroll />} />
              <Route path="broadcast" element={<HRBroadcast />} />
              <Route path="settings" element={<HRSettings />} />
              <Route path="more" element={<HRMoreMenu />} />
            </Route>

            {/* Employee Panel Routes - Exactly 5 Sections */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={['Employee', 'HR']}>
                  <EmployeeLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/employee/home" replace />} />
              <Route path="home" element={<EmployeeHome />} />
              <Route path="tasks" element={<EmployeeTasks />} />
              <Route path="attendance" element={<EmployeeAttendance />} />
              <Route path="holidays" element={<EmployeeHolidays />} />
              <Route path="leave" element={<EmployeeLeave />} />
              <Route path="notices" element={<EmployeeNotices />} />
              <Route path="profile" element={<EmployeeProfile />} />
            </Route>

            {/* Default / Fallback Routes */}
            <Route path="/" element={<RootRedirector />} />
            <Route path="*" element={<RootRedirector />} />
          </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
