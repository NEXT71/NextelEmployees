import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, isAuthenticated, clearAuth } from '../../utils/api';

const ProtectedRoute = ({ children, adminOnly }) => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!isAuthenticated()) {
          navigate('/login');
          return;
        }

        // Get current user info to check role
        const response = await authAPI.getCurrentUser();
        
        if (response?.error || !response?.data) {
          clearAuth();
          navigate('/login');
          return;
        }

        const user = response.data;
        
        // Check if admin-only route and user is not admin
        if (adminOnly && user.role !== 'admin') {
          navigate('/employeedashboard');
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error('Auth check failed:', err);
        clearAuth();
        navigate('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate, adminOnly]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? children : null;
};

export default ProtectedRoute;
