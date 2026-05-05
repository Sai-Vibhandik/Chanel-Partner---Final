import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { StatCard } from '../../components/common';

const CompanyDashboard = () => {
  const { user } = useAuth();
  const config = sidebarConfig.company_superadmin;
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    partners: { total: 0, active: 0 },
    properties: { total: 0, active: 0 },
    visits: { pending: 0, approved: 0 },
    commissions: { total: 0, pending: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [partnersRes, propertiesRes, visitsRes, commissionsRes] = await Promise.all([
        api.get('/partners/stats').catch(() => ({ data: { data: { overview: { total: 0, active: 0 } } } })),
        api.get('/properties/stats').catch(() => ({ data: { data: { overview: { total: 0, active: 0 } } } })),
        api.get('/visits/stats').catch(() => ({ data: { data: { pendingApprovals: 0, approved: 0 } } })),
        api.get('/commissions/stats').catch(() => ({ data: { data: { overview: { total: 0, pending: 0 } } } }))
      ]);

      setStats({
        partners: {
          total: partnersRes.data?.data?.overview?.total || 0,
          active: partnersRes.data?.data?.overview?.active || 0
        },
        properties: {
          total: propertiesRes.data?.data?.overview?.total || 0,
          active: propertiesRes.data?.data?.overview?.active || 0
        },
        visits: {
          pending: visitsRes.data?.data?.pendingApprovals || 0,
          approved: visitsRes.data?.data?.approved || 0
        },
        commissions: {
          total: commissionsRes.data?.data?.overview?.total || 0,
          pending: commissionsRes.data?.data?.pending?.count || 0
        }
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const response = await api.get('/login-logs/recent?limit=10');
      setRecentActivity(response.data?.data?.logs || []);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (status) => {
    if (status === 'success') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getDeviceIcon = (deviceType) => {
    if (deviceType === 'mobile') {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  const formatCurrency = (amount) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lac`;
    }
    return `₹${(amount || 0).toLocaleString()}`;
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Company Dashboard" subtitle="Manage your company's partner network" color={config.color}>
      {/* Welcome Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Here's your company overview for today.</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-48 sm:min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Total Partners"
            value={stats.partners.total}
            subtitle={`${stats.partners.active} active`}
            color="blue"
            onClick={() => navigate('/company/partners')}
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <StatCard
            title="Total Properties"
            value={stats.properties.total}
            subtitle={`${stats.properties.active} active listings`}
            color="green"
            onClick={() => navigate('/company/properties')}
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
          />

          <StatCard
            title="Pending Visits"
            value={stats.visits.pending}
            subtitle={`${stats.visits.approved} approved`}
            color="yellow"
            onClick={() => navigate('/company/visits')}
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />

          <StatCard
            title="Total Commissions"
            value={formatCurrency(stats.commissions.total)}
            subtitle={`${stats.commissions.pending} pending`}
            color="purple"
            onClick={() => navigate('/finance-manager/commissions')}
            icon={
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button onClick={() => navigate('/company/properties/new?fresh=true')} className="btn btn-primary text-sm sm:text-base">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Add Property</span>
            <span className="sm:hidden">Add</span>
          </button>
          <button onClick={() => navigate('/company/partners')} className="btn btn-secondary text-sm sm:text-base">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="hidden sm:inline">View Partners</span>
            <span className="sm:hidden">Partners</span>
          </button>
          <button onClick={() => navigate('/company/visits')} className="btn btn-secondary text-sm sm:text-base">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">View Visits</span>
            <span className="sm:hidden">Visits</span>
          </button>
          <button onClick={() => navigate('/company/settings')} className="btn btn-secondary text-sm sm:text-base">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Settings</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button
            onClick={() => navigate('/company/login-logs')}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View All
          </button>
        </div>

        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm sm:text-base">No recent activity to display</p>
            <p className="text-xs sm:text-sm mt-1 text-gray-400">Activity will appear here as users log in</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentActivity.map((log) => (
              <div key={log._id} className="py-3 flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(log.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">
                      {log.userId?.firstName || 'Unknown'} {log.userId?.lastName || ''}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status === 'success' ? 'Login' : 'Failed'}
                    </span>
                    <span className="text-xs text-gray-400">{log.userId?.role || 'user'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      {getDeviceIcon(log.device?.type)}
                      <span>{log.browser?.name || 'Unknown'} on {log.os?.name || 'Unknown OS'}</span>
                    </span>
                    {log.location?.city && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{log.location.city}{log.location.country ? `, ${log.location.country}` : ''}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-400">
                  {formatTimeAgo(log.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CompanyDashboard;