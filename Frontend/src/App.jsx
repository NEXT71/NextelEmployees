import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import PerformanceMonitor from './components/common/PerformanceMonitor.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';

// Lazy load components for better performance
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const EmployeeDashboard = lazy(() => import('./pages/employees/Dashboard.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const EmployeeManagement = lazy(() => import('./pages/admin/EmployeeManagement.jsx'));
const AdminAttendance = lazy(() => import('./pages/admin/AdminAttendance.jsx'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Employee routes */}
            <Route
              path="/employeedashboard"
              element={
                <ProtectedRoute>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes */}
            <Route
              path="/admindashboard"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admindashboard/attendance"
              element={
                <ProtectedRoute adminOnly>
                  <AdminAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admindashboard/employees"
              element={
                <ProtectedRoute adminOnly>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admindashboard/stats"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
        
        {/* Performance Monitor - only show in development */}
        <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
      </Router>
    </ToastProvider>
  );
};

export default App;
