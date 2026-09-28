import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('campus_token') || null);
  const [loading, setLoading] = useState(true);

  // Check current user session on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('campus_token');
      if (storedToken) {
        try {
          const res = await api.auth.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Session validation failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const setSession = (token, user) => {
    localStorage.setItem('campus_token', token);
    localStorage.setItem('campus_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const sendOtp = async (email, forLogin = false) => {
    return await api.auth.sendOtp(email, forLogin);
  };

  const resendOtp = async (email) => {
    return await api.auth.resendOtp(email);
  };

  // Used during LOGIN via OTP
  const loginWithOtp = async (email, otp) => {
    const data = await api.auth.verifyOtp(email, otp, { forLogin: true });
    setSession(data.token, data.user);
    return data.user;
  };

  // Used during LOGIN via Password (student, teacher, or admin)
  const loginWithPassword = async (email, password) => {
    const data = await api.auth.login({ email, password });
    setSession(data.token, data.user);
    return data.user;
  };

  // Used during SIGNUP (Step 2 OTP verification for student/teacher)
  const verifySignupOtp = async (email, otp, profile = {}) => {
    return await api.auth.verifyOtp(email, otp, { ...profile, forLogin: false });
  };

  // Used during SIGNUP (Step 3 Set Password for student/teacher)
  const completeSignup = async (email, password) => {
    const data = await api.auth.setPassword(email, password);
    setSession(data.token, data.user);
    return data.user;
  };

  // Used during ADMIN SIGNUP (direct domain + password)
  const adminSignup = async (adminData) => {
    const data = await api.auth.adminSignup(adminData);
    setSession(data.token, data.user);
    return data.user;
  };

  // Backwards compatibility for existing verifyOtp calls
  const verifyOtp = async (email, otp, extra = {}) => {
    const data = await api.auth.verifyOtp(email, otp, extra);
    if (data.token && data.user) {
      setSession(data.token, data.user);
    }
    return data.user || data;
  };

  const logout = () => {
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: Boolean(user && token),
        loading,
        sendOtp,
        resendOtp,
        verifyOtp,
        loginWithOtp,
        loginWithPassword,
        verifySignupOtp,
        completeSignup,
        adminSignup,
        setSession,
        logout,
        isSupabaseMode: false
      }}
    >
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
