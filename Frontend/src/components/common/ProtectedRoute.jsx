import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, adminOnly, superAdminOnly, qaOnly }) => {
  const navigate = useNavigate();
  const { user, isLoading, isLoggedIn } = useAuth();

  // Redirect if not logged in
  if (!isLoading && !isLoggedIn) {
    navigate('/login');
    return null;
  }

  // Super admin only routes
  if (!isLoading && superAdminOnly && user?.role !== 'superadmin') {
    navigate(user?.role === 'admin' ? '/admindashboard' : '/employeedashboard');
    return null;
  }

  // Admin-only routes (admin + superadmin both allowed)
  if (!isLoading && adminOnly && user?.role !== 'admin' && user?.role !== 'superadmin') {
    navigate('/employeedashboard');
    return null;
  }

  // QA-only routes (qa + admin + superadmin allowed)
  if (!isLoading && qaOnly && !['qa', 'admin', 'superadmin'].includes(user?.role)) {
    navigate('/employeedashboard');
    return null;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return isLoggedIn ? children : null;
};

export default ProtectedRoute;
