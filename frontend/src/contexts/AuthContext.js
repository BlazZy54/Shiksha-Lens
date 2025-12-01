import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext();

const STORAGE_KEYS = {
  user: 'attendance_user',
  token: 'attendance_token'
};

const ROLE_LABELS = {
  teacher: 'Teacher',
  admin: 'Administrator',
  gov: 'Officer',
  student: 'Student'
};

const decodeToken = (token) => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (err) {
    console.warn('Failed to decode token', err);
    return null;
  }
};

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);

    if (token) {
      const rebuilt = buildUserFromToken(token);
      if (rebuilt) {
        setUser(rebuilt);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(rebuilt));
        setIsLoading(false);
        return;
      }
    }

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

  const login = async ({ email, password }) => {
    setError(null);
    try {
      const { token } = await apiClient.login({ email, password });
      const userData = buildUserFromToken(token);
      if (!userData) {
        throw new Error('Invalid token payload');
      }
      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.token);
  };

  const value = useMemo(() => ({
    user,
    login,
    logout,
    isLoading,
    error,
    clearError: () => setError(null)
  }), [user, isLoading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
