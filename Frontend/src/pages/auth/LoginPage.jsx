import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import { authAPI, clearAuth } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../../components/ui/Alert';

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
        errorMessage = "Can't reach the server. Check your internet connection and try again.";
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
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <img src="/nextel-logo-wide.png" alt="Nextel BPO" className="h-14 w-auto mx-auto mb-8 mix-blend-multiply" />

        <div className="bg-surface border border-line rounded-xl p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-ink">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Use the email or username HR set up for you.</p>

          {error && <Alert className="mb-5">{error}</Alert>}

          <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Forgot your password? Ask HR or an admin to reset it.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;