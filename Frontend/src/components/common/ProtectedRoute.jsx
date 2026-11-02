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
  if (!isLoading && adminOnly && user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'hr') {
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
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-line border-t-ink rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted">Signing you in…</p>
        </div>
      </div>
    );
  }

  return isLoggedIn ? children : null;
};

export default ProtectedRoute;
