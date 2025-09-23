import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage.jsx';
import EmployeeDashboard from './pages/employees/Dashboard.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import EmployeeManagement from './pages/admin/EmployeeManagement.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import AdminAttendance from './pages/admin/AdminAttendance.jsx';

const App = () => {
  return (
    <Router>
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
    </Router>
  );
};

export default App;
