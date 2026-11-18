import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Auth Pages
import Login from './pages/auth/Login';

// Layouts
import HRLayout from './components/layout/HRLayout';
import EmployeeLayout from './components/layout/EmployeeLayout';
import ManagerLayout from './components/layout/ManagerLayout';

// HR Pages
import HRDashboard from './pages/hr/HRDashboard';
import HREmployees from './pages/hr/HREmployees';
import HRManagers from './pages/hr/HRManagers';
import HRAttendance from './pages/hr/HRAttendance';
import HRTasksReports from './pages/hr/HRTasksReports';
import HRLeave from './pages/hr/HRLeave';
import HRPayroll from './pages/hr/HRPayroll';
import HRSettings from './pages/hr/HRSettings';
import HRBroadcast from './pages/hr/HRBroadcast';
import HRMoreMenu from './pages/hr/HRMoreMenu';
import HRHolidayCalendar from './pages/hr/HRHolidayCalendar';
import HRReports from './pages/hr/HRReports';

// Manager Pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerStudents from './pages/manager/ManagerStudents';
import ManagerTasks from './pages/manager/ManagerTasks';
import ManagerDeadlines from './pages/manager/ManagerDeadlines';
import ManagerHistory from './pages/manager/ManagerHistory';

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

  if (allowedRoles) {
    const isManager = user.role === 'Manager' || Boolean(user.employee?.isManager);
    const isHR = user.role === 'HR';
    const isEmployee = user.role === 'Employee' || Boolean(user.employee);

    const hasAccess =
      (allowedRoles.includes('HR') && isHR) ||
      (allowedRoles.includes('Manager') && (isManager || isHR)) ||
      (allowedRoles.includes('Employee') && (isEmployee || isManager || isHR));

    if (!hasAccess) {
      if (isHR) return <Navigate to="/hr/dashboard" replace />;
      if (isManager) return <Navigate to="/manager/dashboard" replace />;
      return <Navigate to="/employee/home" replace />;
    }
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
  if (user.role === 'Manager') return <Navigate to="/manager/dashboard" replace />;
  if (user.role === 'HR') return <Navigate to="/hr/dashboard" replace />;
  return <Navigate to="/employee/home" replace />;
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
              <Route path="managers" element={<HRManagers />} />
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

            {/* Manager Panel Routes */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={['Manager', 'HR']}>
                  <ManagerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/manager/dashboard" replace />} />
              <Route path="dashboard" element={<ManagerDashboard />} />
              <Route path="students" element={<ManagerStudents />} />
              <Route path="tasks" element={<ManagerTasks />} />
              <Route path="deadlines" element={<ManagerDeadlines />} />
              <Route path="history" element={<ManagerHistory />} />
            </Route>

            {/* Employee Panel Routes - Exactly 5 Sections */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={['Employee', 'HR', 'Manager']}>
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
