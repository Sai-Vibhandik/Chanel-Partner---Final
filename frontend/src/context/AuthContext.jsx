import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data.user);
        } catch (error) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    localStorage.setItem('token', token);
    setUser(user);
    return { token, user };
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Register company
  const registerCompany = async (data) => {
    const response = await api.post('/auth/register/company', data);
    // No token returned - user must verify email first
    return response.data;
  };

  // Register partner
  const registerPartner = async (data) => {
    const response = await api.post('/auth/register/partner', data);
    // No token returned - user must verify email first
    return response.data;
  };

  // Update user
  const updateUser = (userData) => {
    setUser(userData);
  };

  // Get dashboard path based on role
  const getDashboardPath = () => {
    if (!user) return '/login';

    switch (user.role) {
      case 'platform_admin':
        return '/platform/dashboard';
      case 'company_superadmin':
        return '/company/dashboard';
      case 'partner_manager':
        return '/partner-manager/dashboard';
      case 'property_manager':
        return '/property-manager/dashboard';
      case 'finance_manager':
        return '/finance-manager/dashboard';
      case 'viewer':
        return '/viewer/dashboard';
      case 'partner':
        return '/partner/dashboard';
      default:
        return '/login';
    }
  };

  // Check if user has specific role
  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    registerCompany,
    registerPartner,
    updateUser,
    getDashboardPath,
    hasRole,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;