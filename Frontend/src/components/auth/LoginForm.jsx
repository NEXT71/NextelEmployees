import { useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const LoginForm = ({ onSubmit, isLoading, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(credentials);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#1d2b27] mb-2">
          Username or Email
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#66736e]" />
          <input
            type="text"
            value={credentials.email}
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-[#dce5e1] rounded-lg text-[#1d2b27] placeholder-[#87948e] focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 text-sm sm:text-base transition-all"
            placeholder="Enter your username or email"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1d2b27] mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#66736e]" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-white border border-[#dce5e1] rounded-lg text-[#1d2b27] placeholder-[#87948e] focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 text-sm sm:text-base transition-all"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#66736e] hover:text-[#087f6e] transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-700 text-xs sm:text-sm bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">{error}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-teal-700 hover:bg-teal-800 text-white py-2.5 sm:py-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm sm:text-base"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Authenticating...</span>
          </div>
        ) : (
          'Access System'
        )}
      </button>
    </form>
  );
};

export default LoginForm;