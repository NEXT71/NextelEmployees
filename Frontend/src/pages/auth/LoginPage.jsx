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
      
      {/* ERP Header */}
      <div className="relative z-10 w-full max-w-2xl mb-6">
        <div className="text-center">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4 tracking-wide">
            ERP
          </h1>
          <p className="text-xl md:text-2xl text-blue-200/90 font-light tracking-wider mb-2">
            Enterprise Resource Planning
          </p>
          <p className="text-sm text-blue-300/70 font-medium">
            Integrated Business Management Solution
          </p>
        </div>
      </div>

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
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent mb-2">
                NEXTEL PRIVATE
              </h2>
              <p className="text-blue-200/80 text-sm font-dark">ELEVATE TO THE NEXT</p>
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

            {/* Additional links with futuristic styling */}
            <div className="mt-8 text-center space-y-4">
              
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Quantum Encryption Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-cyan-400/30 to-purple-500/30 rounded-full blur-2xl animate-float"></div>
        <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-gradient-to-br from-purple-400/30 to-blue-500/30 rounded-full blur-2xl animate-float-delayed"></div>
        
        {/* Side accent lines */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 w-1 h-32 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-60"></div>
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 w-1 h-32 bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-60"></div>
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        
        @keyframes scan {
          0% { transform: translateY(-100px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(400px); opacity: 0; }
          animation-duration: 3s;
          animation-iteration-count: infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-3deg); }
        }
        
        .animate-scan {
          animation: scan 4s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite 2s;
        }
        
        .glow-cyan:hover {
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
};

export default LoginPage;