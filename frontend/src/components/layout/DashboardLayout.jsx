import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const DashboardLayout = ({ children, sidebarLinks: propSidebarLinks, title, subtitle, color: propColor }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const notificationRef = useRef(null);
  const sidebarRef = useRef(null);
  const { user, company, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Automatically get sidebar config based on user role
  const userConfig = user?.role ? sidebarConfig[user.role] : null;
  const sidebarLinks = propSidebarLinks || userConfig?.links || [];
  const color = propColor || userConfig?.color || 'indigo';

  // Get unread chat count from socket context
  const { unreadCount: chatUnreadCount, toastNotification, dismissToast } = useSocket() || { unreadCount: 0, toastNotification: null, dismissToast: () => {} };

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification, dismissToast]);

  // Store sidebar scroll position using sessionStorage for persistence
  const sidebarScrollKey = 'sidebar-scroll-position';

  // Save scroll position on scroll event
  const handleSidebarScroll = () => {
    if (sidebarRef.current) {
      sessionStorage.setItem(sidebarScrollKey, sidebarRef.current.scrollTop.toString());
    }
  };

  // Restore scroll position after navigation using useLayoutEffect for synchronous restoration
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(sidebarScrollKey);
    if (sidebarRef.current && savedPosition) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        sidebarRef.current.scrollTop = parseInt(savedPosition, 10);
      });
    }
  }, [location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications based on user role
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);
      const notificationsList = [];

      // Fetch notifications from notifications API
      try {
        const notifRes = await api.get('/notifications?limit=10');
        const dbNotifications = notifRes.data.data.notifications || [];
        dbNotifications.forEach(n => {
          notificationsList.push({
            id: n._id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            time: new Date(n.createdAt).toLocaleDateString(),
            unread: !n.isRead
          });
        });
      } catch (err) {
        // Notifications API might not be available for all roles
      }

      // Fetch role-specific notifications
      if (user.role === 'finance_manager') {
        try {
          const res = await api.get('/commissions/stats');
          if (res.data.data.statusCounts?.pending?.count > 0) {
            notificationsList.push({
              id: 'pending-commissions',
              type: 'commission',
              message: `${res.data.data.statusCounts.pending.count} commission(s) pending payment`,
              link: '/finance-manager/commissions',
              time: 'Recently',
              unread: true
            });
          }
        } catch (err) {
        }
      } else if (user.role === 'partner') {
        try {
          const visitsRes = await api.get('/visits/my?status=approved');
          const approvedVisits = visitsRes.data.data.visits?.length || 0;
          if (approvedVisits > 0) {
            notificationsList.push({
              id: 'approved-visits',
              type: 'visit',
              message: `You have ${approvedVisits} approved visit(s) - mark as completed after the visit`,
              link: '/partner/visits',
              time: 'Recently',
              unread: false
            });
          }
        } catch (err) {
        }

        try {
          const commissionsRes = await api.get('/commissions/my');
          const pendingLegal = commissionsRes.data.data.stats?.pending_legal_review?.count || 0;
          const pendingFinance = commissionsRes.data.data.stats?.pending_approval?.count || 0;
          if (pendingLegal > 0) {
            notificationsList.push({
              id: 'pending-legal',
              type: 'commission',
              message: `${pendingLegal} commission(s) under legal review`,
              link: '/partner/commissions',
              time: 'Recently',
              unread: true
            });
          }
          if (pendingFinance > 0) {
            notificationsList.push({
              id: 'pending-finance',
              type: 'commission',
              message: `${pendingFinance} commission(s) pending finance approval`,
              link: '/partner/commissions',
              time: 'Recently',
              unread: true
            });
          }
        } catch (err) {
        }
      }

      setNotifications(notificationsList);
    } catch (err) {
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    setNotificationOpen(false);

    // Mark as read if it has an id (from database)
    if (notification.id && !notification.id.startsWith('pending-') && !notification.id.startsWith('approved-')) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
      } catch (err) {
      }
    }

    if (notification.link) {
      navigate(notification.link);
    }

    // Refresh notifications
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      // Update local state to mark all as read
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (err) {
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'commission':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'visit':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'payment':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'agreement_update':
      case 'agreement_sign_required':
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'kyc_approved':
      case 'kyc_rejected':
        return (
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'partnership_approved':
      case 'partnership_rejected':
        return (
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const colorClasses = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    teal: 'bg-teal-600 hover:bg-teal-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    red: 'bg-red-600 hover:bg-red-700',
    cyan: 'bg-cyan-600 hover:bg-cyan-700',
    gray: 'bg-gray-600 hover:bg-gray-700'
  };

  const sidebarBgClasses = {
    indigo: 'bg-gradient-to-b from-indigo-700 to-indigo-900',
    blue: 'bg-gradient-to-b from-blue-700 to-blue-900',
    teal: 'bg-gradient-to-b from-teal-700 to-teal-900',
    orange: 'bg-gradient-to-b from-orange-600 to-orange-800',
    green: 'bg-gradient-to-b from-green-600 to-green-800',
    purple: 'bg-gradient-to-b from-purple-700 to-purple-900',
    red: 'bg-gradient-to-b from-red-600 to-red-800',
    cyan: 'bg-gradient-to-b from-cyan-600 to-cyan-800',
    gray: 'bg-gradient-to-b from-gray-700 to-gray-900'
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      platform_admin: 'Platform Admin',
      company_superadmin: 'Company Admin',
      partner_manager: 'Partner Manager',
      property_manager: 'Property Manager',
      finance_manager: 'Finance Manager',
      viewer: 'Viewer',
      partner: 'Channel Partner'
    };
    return roleNames[role] || role;
  };

  const getInitials = () => {
    return `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const isActiveLink = (linkPath) => {
    const isExactMatch = location.pathname === linkPath;
    const isParentPath = location.pathname.startsWith(`${linkPath}/`);
    const hasExactMatchInLinks = sidebarLinks.some(l => location.pathname === l.path);
    return isExactMatch || (isParentPath && !hasExactMatchInLinks);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col ${sidebarBgClasses[color]} text-white transition-all duration-300 ease-in-out w-64
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0 ${sidebarOpen ? 'lg:justify-between' : 'lg:justify-center'} justify-between`}>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className={`font-bold text-lg ${sidebarOpen ? 'lg:block' : 'lg:hidden'} ${mobileSidebarOpen ? 'block' : 'hidden'}`}>Portal</span>
          </Link>
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Toggle button for desktop - only show when expanded */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden p-2 rounded-lg hover:bg-white/10 transition-colors ${sidebarOpen ? 'lg:block' : 'lg:hidden'}`}
            title="Collapse sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Expand button for desktop - only show when collapsed */}
        {!sidebarOpen && (
          <div className="hidden lg:flex justify-center py-3 border-b border-white/5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav
          ref={sidebarRef}
          onScroll={handleSidebarScroll}
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0 scrollbar-hide"
        >
          {sidebarLinks.map((link) => {
            const isActive = isActiveLink(link.path);
            const isChatLink = link.path.includes('/chat');
            const showChatBadge = isChatLink && chatUnreadCount > 0;

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                } ${sidebarOpen ? 'lg:justify-start' : 'lg:justify-center'}`}
                title={!sidebarOpen ? link.label : ''}
              >
                <span className="flex-shrink-0 relative">
                  {link.icon}
                  {showChatBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                      {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                    </span>
                  )}
                </span>
                <span className={`${sidebarOpen ? 'lg:block' : 'lg:hidden'} ${mobileSidebarOpen ? 'block' : 'hidden'}`}>
                  {link.label}
                </span>
                {showChatBadge && sidebarOpen && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {chatUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className={`flex items-center ${sidebarOpen ? 'lg:gap-3' : 'lg:justify-center'} gap-3`}>
            <Link
              to="/profile"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0"
            >
              {getInitials()}
            </Link>
            <div className={`flex-1 min-w-0 ${sidebarOpen ? 'lg:block' : 'lg:hidden'} ${mobileSidebarOpen ? 'block' : 'hidden'}`}>
              <Link
                to="/profile"
                onClick={() => setMobileSidebarOpen(false)}
                className="text-sm font-medium truncate hover:text-white/80 transition-colors block"
              >
                {user?.firstName} {user?.lastName}
              </Link>
              <p className="text-xs text-white/70 truncate">{getRoleDisplayName(user?.role)}</p>
              {company && (
                <p className="text-xs text-white/50 truncate mt-0.5">{company.name}</p>
              )}
            </div>
          </div>
          <div className={`mt-3 space-y-1 ${sidebarOpen ? 'lg:block' : 'lg:hidden'} ${mobileSidebarOpen ? 'block' : 'hidden'}`}>
            <Link
              to="/profile"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Mobile Menu Button + Title */}
              <div className="flex items-center gap-3">
                {/* Hamburger menu for mobile */}
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden flex-shrink-0"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">{title}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {subtitle && <p className="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p>}
                    {company && subtitle && <span className="text-gray-300">•</span>}
                    {company && (
                      <p className="text-xs sm:text-sm text-indigo-600 font-medium truncate">{company.name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Profile Link - Hidden on very small screens */}
                <Link
                  to="/profile"
                  className="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Profile Settings"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
                    title="Notifications"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {notificationOpen && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                              Mark all read
                            </button>
                          )}
                          <button
                            onClick={fetchNotifications}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="max-h-80 sm:max-h-96 overflow-y-auto">
                        {notificationLoading ? (
                          <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-6 sm:p-8 text-center">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-gray-500 text-sm">No notifications</p>
                            <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                              <button
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full p-3 sm:p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${
                                  notification.unread ? 'bg-indigo-50/50' : ''
                                }`}
                              >
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${notification.unread ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                                </div>
                                {notification.unread && (
                                  <span className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-2"></span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* Chat Notification Toast */}
      {toastNotification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm flex items-start gap-3 transform transition-all duration-300 ease-out">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{toastNotification.senderName}</p>
              <p className="text-gray-600 text-sm truncate">{toastNotification.message}...</p>
              <button
                onClick={() => {
                  const chatPath = user?.role === 'partner' ? '/partner/chat' :
                                   user?.role === 'company_superadmin' ? '/company/chat' :
                                   '/partner-manager/chat';
                  navigate(chatPath);
                  dismissToast();
                }}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View message →
              </button>
            </div>
            <button
              onClick={dismissToast}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;