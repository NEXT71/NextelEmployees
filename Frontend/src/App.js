import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import EmployeeDashboard from './pages/employees/Dashboard.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx'; // Adjust path if needed
import ForgotPasswordPage from './pages/auth/ForgotPassword.jsx';
import AdminAttendance from './pages/admin/AdminAttendance.jsx';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        <Route
          path="/employeedashboard"
          element={
              <EmployeeDashboard />          }
        />
        <Route
          path="/admindashboard"
          element={
              <AdminDashboard />
          }
        />
        <Route
          path="/admindashboard/attendance"
          element={
              <AdminAttendance />
          }
        />

      </Routes>
    </Router>
  );
};

export default App;
