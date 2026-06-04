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
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  // Tokens are now stored in httpOnly cookies, so we just verify with the server
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get current user - cookies are sent automatically
        const response = await api.get('/auth/me');
        setUser(response.data.data.user);
        setCompany(response.data.data.company);
      } catch (error) {
        // Not authenticated - this is expected for users who haven't logged in
        // No need to show error, just set user to null
        setUser(null);
        setCompany(null);
        // Clear any stale localStorage data
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Login function
  // Tokens are now set in httpOnly cookies by the server
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, company } = response.data.data;
    // Token is automatically set in httpOnly cookie by the server
    // No need to store in localStorage
    setUser(user);
    setCompany(company);
    return { user, company };
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to blacklist token and clear cookies
      await api.post('/auth/logout');
    } catch (error) {
      // Silently fail - user will be logged out anyway
    } finally {
      setUser(null);
      setCompany(null);
      // Clear any stale localStorage data
      localStorage.removeItem('user');
    }
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
  const updateUser = (userData, companyData) => {
    setUser(userData);
    if (companyData) setCompany(companyData);
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

  // Refresh user data from server
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
      setCompany(response.data.data.company);
      return { user: response.data.data.user, company: response.data.data.company };
    } catch (error) {
      setUser(null);
      setCompany(null);
      throw error;
    }
  };

  const value = {
    user,
    company,
    loading,
    login,
    logout,
    registerCompany,
    registerPartner,
    updateUser,
    refreshUser,
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