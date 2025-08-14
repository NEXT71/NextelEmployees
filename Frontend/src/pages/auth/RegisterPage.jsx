import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import RegisterForm from '../../components/auth/RegisterForm';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Direct Axios request to the register endpoint
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        setSuccess(true);
        // Auto-redirect to login after 3 seconds
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      // Handle different types of errors
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/2 w-60 h-60 bg-indigo-400/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism container */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 relative">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 blur-sm"></div>
          
          <div className="relative z-10">
            {/* Success message */}
            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
                <p className="text-green-200 text-center">
                  Registration successful! Redirecting to login...
                </p>
              </div>
            )}

            {/* Logo/Brand section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-500 rounded-xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent mb-2">
                NEXTEL PRIVATE
              </h1>
              <p className="text-purple-200/80 text-sm font-light">Create your account and step into the future</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                <p className="text-red-200 text-center text-sm">{error}</p>
              </div>
            )}

            {/* Register Form */}
            <RegisterForm 
              onSubmit={handleSubmit}
              isLoading={isLoading}
              fields={[
                {
                  name: 'username',
                  type: 'text',
                  label: 'Username',
                  placeholder: 'Enter your username',
                  required: true
                },
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
                  placeholder: 'Create a password',
                  required: true
                },
                {
                  name: 'confirmPassword',
                  type: 'password',
                  label: 'Confirm Password',
                  placeholder: 'Repeat your password',
                  required: true
                }
              ]}
            />

            {/* Additional links */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-blue-200/70 text-xs">
                By creating an account, you agree to our{' '}
                <button className="text-blue-300 hover:text-blue-200 underline transition-colors duration-200">
                  Terms of Service
                </button>
                {' '}and{' '}
                <button className="text-blue-300 hover:text-blue-200 underline transition-colors duration-200">
                  Privacy Policy
                </button>
              </p>
              <button 
                onClick={() => navigate('/')}
                className="text-purple-300 hover:text-purple-200 text-sm font-medium transition-colors duration-200 block w-full"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-blue-500/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-4 -right-4 w-18 h-18 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-xl"></div>
      </div>
    </div>
  );
};

export default RegisterPage;