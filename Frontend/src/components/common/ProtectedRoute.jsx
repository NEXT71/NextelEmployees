import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user'); 

    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      navigate('/');
    }
  }, [navigate, allowedRoles]);

  return children;
};

export default ProtectedRoute;
