import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authAPI, isAuthenticated, clearAuth } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check auth only once when app loads
  const checkAuth = useCallback(async () => {
    try {
      if (!isAuthenticated()) {
        setIsLoggedIn(false);
        setUser(null);
        return;
      }

      const response = await authAPI.getCurrentUser();
      
      if (response?.error || !response?.data) {
        clearAuth();
        setIsLoggedIn(false);
        setUser(null);
        return;
      }

      setUser(response.data);
      setIsLoggedIn(true);
    } catch (err) {
      console.error('Auth check failed:', err);
      clearAuth();
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth only on mount
  useEffect(() => {
    checkAuth();
  }, []); // Empty dependency array - runs only once

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
      setIsLoggedIn(false);
    }
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  }, []);

  const value = {
    user,
    isLoggedIn,
    isLoading,
    logout,
    login,
    reCheckAuth: checkAuth, // Expose for manual refresh if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
