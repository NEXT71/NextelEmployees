import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import { authAPI, clearAuth } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (credentials) => {
    setIsLoading(true);
    setError(null);
        
    try {
      const response = await authAPI.login({
        email: credentials.email,
        password: credentials.password
      });
      
      if (response?.error) {
        setError(response.message || 'Login failed. Please try again.');
        return;
      }
      
      if (response?.success && response?.user) {
        // Update global auth context
        login(response.user);
        
        // Redirect based on role
        const redirectPath =
          response.user.role === 'superadmin' ? '/superadmindashboard'
          : ['admin', 'hr'].includes(response.user.role) ? '/admindashboard'
          : response.user.role === 'qa' ? '/qadashboard'
          : response.user.isCloser ? '/closerdashboard'
          : '/employeedashboard';
        navigate(redirectPath);
      } else {
        setError(response?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
      } else {
        errorMessage = err.message || 'Login failed. Please try again.';
      }
      
      setError(errorMessage);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md">
        {/* ERP Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#087f6e] mb-2">
            ERP
          </h1>
          <p className="text-base sm:text-lg text-[#1d2b27] font-medium mb-1">
            Enterprise Resource Planning
          </p>
          <p className="text-sm text-[#66736e]">
            Integrated Business Management Solution
          </p>
        </div>

        <div className="bg-white border border-[#dce5e1] rounded-xl shadow-lg shadow-[#1d2b27]/5 p-6 sm:p-8">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-center text-sm">{error}</p>
              </div>
            )}

            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-teal-700 rounded-xl mb-3 sm:mb-4 shadow-sm">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1d2b27] mb-1 sm:mb-2">
                NEXTEL PRIVATE
              </h2>
              <p className="text-[#66736e] text-xs sm:text-sm font-medium">ELEVATE TO THE NEXT</p>
            </div>

            {/* Login Form */}
            <LoginForm 
              onSubmit={handleSubmit}
              isLoading={isLoading}
              fields={[
                {
                  name: 'email',
                  type: 'email',
                  label: 'Email Address',
                  placeholder: 'your.email@nextel.com',
                  required: true
                },
                {
                  name: 'password',
                  type: 'password',
                  label: 'Access Key',
                  placeholder: 'Enter secure access key',
                  required: true
                }
              ]}
            />

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-2 text-xs text-[#66736e]">
                <div className="w-2 h-2 bg-teal-700 rounded-full"></div>
                <span>Secure Access Active</span>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;