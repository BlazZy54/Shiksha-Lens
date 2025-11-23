// React imports for context, state, memoization, etc.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';

// Creating authentication context
const AuthContext = createContext();

// Keys for storing user & token in localStorage
const STORAGE_KEYS = {
  user: 'attendance_user',
  token: 'attendance_token'
};

// Labels for user roles
const ROLE_LABELS = {
  teacher: 'Teacher',
  admin: 'Administrator',
  gov: 'Officer',
  student: 'Student'
};

// Decodes a JWT token (payload only)
const decodeToken = (token) => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1])); // decode JWT payload
    return payload;
  } catch (err) {
    console.warn('Failed to decode token', err);
    return null;
  }
};

// Builds a user object from decoded token data
const buildUserFromToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) return null;

  const role = decoded.role;
  const roleLabel = ROLE_LABELS[role] || role || 'User';
  const displayName = decoded.name || decoded.email?.split('@')[0] || roleLabel;

  return {
    id: decoded.id,
    email: decoded.email,
    name: displayName,
    role,
    roleLabel,
    token
  };
};

// Hook to access auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // logged-in user state
  const [isLoading, setIsLoading] = useState(true); // loading state during startup
  const [error, setError] = useState(null);     // login error

  // On component mount: load user/token from localStorage
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);

    // Try rebuilding user from token
    if (token) {
      const rebuilt = buildUserFromToken(token);
      if (rebuilt) {
        setUser(rebuilt);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(rebuilt));
        setIsLoading(false);
        return;
      }
    }

    // If token invalid, try stored user fallback
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (err) {
        console.warn('Failed to parse stored user', err);
      }
    }

    setIsLoading(false);
  }, []);

  // Login function
  const login = async ({ email, password }) => {
    setError(null);
    try {
      const { token } = await apiClient.login({ email, password }); // API call
      const userData = buildUserFromToken(token);
      if (!userData) {
        throw new Error('Invalid token payload');
      }
      // Save token & user locally
      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.token);
  };

  // Memoized context value to prevent unnecessary renders
  const value = useMemo(() => ({
    user,
    login,
    logout,
    isLoading,
    error,
    clearError: () => setError(null)
  }), [user, isLoading, error]);

  // Provide authentication context to the app
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
