import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await api.get('/me');
          if (response.data && response.data.status) {
            setUser(response.data.user);
            localStorage.setItem('auth_user', JSON.stringify(response.data.user));
            setIsAuthenticated(true);
          } else {
            clearAuth();
          }
        } catch (error) {
          if (error.response && error.response.status === 401) {
            clearAuth();
          }
        }
      } else {
        clearAuth();
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const clearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      if (response.data && (response.data.status === true || response.data.status === 'success')) {
        const token = response.data.access_token;
        const userData = response.data.user;

        if (token) {
          localStorage.setItem('auth_token', token);
        }
        if (userData) {
          localStorage.setItem('auth_user', JSON.stringify(userData));
        }

        setUser(userData);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: response.data?.message || 'Invalid credentials' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check credentials.'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      // Ignore logout API error
    }
    clearAuth();
  };

  const role = user?.role || '';
  const userPermissions = user?.permissions || [];
  const normalizedRole = role.toLowerCase().replace(/\s+/g, '_');

  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadministrator';
  const isAdmin = isSuperAdmin || normalizedRole === 'admin' || normalizedRole === 'administrator';
  const isManager = normalizedRole === 'manager';
  const isStaff = normalizedRole === 'staff';
  const isKarigar = normalizedRole === 'karigar' || normalizedRole === 'master_karigar' || !!user?.karigar;

  const hasPermission = (permKey) => {
    if (isSuperAdmin) return true;
    if (!permKey) return true;
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permKey);
  };

  const hasAnyPermission = (permKeys = []) => {
    if (isSuperAdmin) return true;
    if (!permKeys || permKeys.length === 0) return true;
    return permKeys.some(key => hasPermission(key));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      role,
      userPermissions,
      isSuperAdmin,
      isAdmin,
      isManager,
      isStaff,
      isKarigar,
      hasPermission,
      hasAnyPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
