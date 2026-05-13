import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Track if we're refreshing the token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // IMPORTANT: Enable sending cookies with requests
  withCredentials: true
});

// Request interceptor
// Note: Tokens are now stored in httpOnly cookies, so we don't need to add Authorization header
// The cookies are sent automatically with withCredentials: true
api.interceptors.request.use(
  (config) => {
    // Don't set Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh for auth endpoints (login, register, etc.)
      const authEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/auth/resend-verification', '/auth/refresh-token'];
      const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));

      if (isAuthEndpoint) {
        // For auth endpoints, just reject - user needs to login/register
        return Promise.reject(error);
      }

      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        await api.post('/auth/refresh-token');

        // Process queued requests
        processQueue(null);

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to login
        processQueue(refreshError, null);

        // Clear any stale data
        localStorage.removeItem('user');

        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login') &&
            !window.location.pathname.includes('/register') &&
            !window.location.pathname.includes('/forgot-password') &&
            !window.location.pathname.includes('/reset-password') &&
            !window.location.pathname.includes('/verify-email')) {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

/**
 * Helper function to get viewable URL for documents (especially PDFs)
 * Cloudinary raw files are served with attachment disposition by default.
 * This function adds the attachment=false flag to allow inline viewing.
 */
export const getDocumentViewUrl = (url) => {
  if (!url) return url;

  // Check if it's a Cloudinary URL and a PDF
  if (url.includes('cloudinary.com') && url.toLowerCase().endsWith('.pdf')) {
    // Check if URL already has query parameters
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}attachment=false`;
  }

  return url;
};

/**
 * Logout helper - call logout endpoint and clear local storage
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};