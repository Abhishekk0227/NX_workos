import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('nx_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('nx_token'));
  const [loading, setLoading] = useState(() => {
    const storedToken = localStorage.getItem('nx_token');
    const savedUser = localStorage.getItem('nx_user');
    return !(storedToken && savedUser);
  });

  // Validate session on mount in background
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('nx_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('nx_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session verification note:', err.message);
          // Only logout if token is explicitly rejected as unauthorized (401)
          if (err.response?.status === 401) {
            logout();
          }
          // Otherwise, retain cached session during transient network/cold-start issues
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('nx_token', receivedToken);
      localStorage.setItem('nx_user', JSON.stringify(receivedUser));
      return receivedUser;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('nx_token');
    localStorage.removeItem('nx_user');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('nx_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
