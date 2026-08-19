import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('afba_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('afba_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then((res) => {
        setUser(res.user);
        localStorage.setItem('afba_user', JSON.stringify(res.user));
      })
      .catch(() => {
        localStorage.removeItem('afba_token');
        localStorage.removeItem('afba_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = (token, userData) => {
    localStorage.setItem('afba_token', token);
    localStorage.setItem('afba_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    persist(res.token, res.user);
    return res.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authService.register(payload);
    persist(res.token, res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignore — logging out is a client-side action regardless
    }
    localStorage.removeItem('afba_token');
    localStorage.removeItem('afba_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
