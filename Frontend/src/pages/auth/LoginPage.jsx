import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoginForm from '../../components/auth/LoginForm';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for existing user session on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.data?.success && response.data.data?.isLoggedIn) {
          navigate(response.data.data.role === 'admin' ? '/admindashboard' : '/employeedashboard');
        }
      } catch (err) {
        // Clear any existing token if unauthorized
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
        }
      } finally {
        setIsLoading(false);
      }
    };
        
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (credentials) => {
    setIsLoading(true);
    setError(null);
        
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: credentials.email,
        password: credentials.password
      });
      
      if (response.data?.success) {
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        navigate(response.data.user.role === 'admin' ? '/admindashboard' : '/employeedashboard');
      } else {
        setError(response.data?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'Login failed. Please try again.';
      setError(errorMessage);
      
      // Clear token on error
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism container */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 relative">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-sm"></div>
          
          <div className="relative z-10">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                <p className="text-red-200 text-center text-sm">{error}</p>
              </div>
            )}

            {/* Logo/Brand section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent mb-2">
                NEXTEL PRIVATE
              </h1>
              <p className="text-blue-200/80 text-sm font-light">Welcome to the future of business operations</p>
            </div>

            {/* Login Form */}
            <LoginForm 
              onSubmit={handleSubmit}
              isLoading={isLoading}
              fields={[
                {
                  name: 'email',
                  type: 'email',
                  label: 'Email',
                  placeholder: 'Enter your email',
                  required: true
                },
                {
                  name: 'password',
                  type: 'password',
                  label: 'Password',
                  placeholder: 'Enter your password',
                  required: true
                }
              ]}
            />

            {/* Additional links */}
            <div className="mt-6 text-center space-y-2">
              <button 
                onClick={() => navigate('/forgot-password')}
                className="text-purple-300 hover:text-purple-200 text-sm font-medium transition-colors duration-200"
              >
                Forgot your password?
              </button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-full blur-xl"></div>
      </div>
    </div>
  );
};

export default LoginPage;