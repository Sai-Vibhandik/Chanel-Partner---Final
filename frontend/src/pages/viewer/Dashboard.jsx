import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

const ViewerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = sidebarConfig.viewer;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPartners: 0,
    totalProperties: 0,
    totalVisits: 0,
    activeCurrencies: ['INR'],
    commissionByCurrency: {}
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch partner stats
      const partnerRes = await api.get('/partners/stats');
      const partnerData = partnerRes.data.data || {};

      // Fetch property stats
      const propertyRes = await api.get('/properties/stats');
      const propertyData = propertyRes.data.data || {};

      // Fetch visit stats
      const visitRes = await api.get('/visits/stats');
      const visitData = visitRes.data.data || {};

      // Fetch commission stats
      const commissionRes = await api.get('/commissions/stats');
      const commissionData = commissionRes.data.data || {};

      // Get all active currencies
      const activeCurrencies = commissionData.activeCurrencies || ['INR'];
      const statusCountsByCurrency = commissionData.statusCountsByCurrency || {};

      // Calculate commission totals for each currency
      const commissionByCurrency = {};
      activeCurrencies.forEach(currency => {
        const currencyStats = statusCountsByCurrency[currency] || {};
        commissionByCurrency[currency] = {
          total: (currencyStats.pending?.amount || 0) +
            (currencyStats.approved?.amount || 0) +
            (currencyStats.paid?.amount || 0),
          pending: currencyStats.pending || { count: 0, amount: 0 },
          approved: currencyStats.approved || { count: 0, amount: 0 },
          paid: currencyStats.paid || { count: 0, amount: 0 }
        };
      });

      setStats({
        totalPartners: partnerData.overview?.total || 0,
        totalProperties: propertyData.overview?.total || propertyData.total || 0,
        totalVisits: visitData.total || 0,
        activeCurrencies,
        commissionByCurrency
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const res = await api.get('/activity-logs/recent?limit=5');
      setRecentActivities(res.data.data || []);
    } catch (error) {
    }
  };

  // Format activity for display
  const formatActivity = (activity) => {
    const actionLabels = {
      commission_approved: 'Commission Approved',
      commission_paid: 'Commission Paid',
      partner_status_approved: 'Partner Approved',
      partner_kyc_approved: 'KYC Approved',
      visit_completed: 'Visit Completed',
      property_published: 'Property Published',
      agreement_signed: 'Agreement Signed'
    };

    const actionIcons = {
      commission_approved: { bg: 'bg-green-100', color: 'text-green-600', icon: '✓' },
      commission_paid: { bg: 'bg-blue-100', color: 'text-blue-600', icon: '$' },
      partner_status_approved: { bg: 'bg-emerald-100', color: 'text-emerald-600', icon: '👤' },
      partner_kyc_approved: { bg: 'bg-teal-100', color: 'text-teal-600', icon: '✓' },
      visit_completed: { bg: 'bg-purple-100', color: 'text-purple-600', icon: '📅' },
      property_published: { bg: 'bg-indigo-100', color: 'text-indigo-600', icon: '🏠' },
      agreement_signed: { bg: 'bg-amber-100', color: 'text-amber-600', icon: '📝' }
    };

    const icon = actionIcons[activity.action] || { bg: 'bg-gray-100', color: 'text-gray-600', icon: '•' };

    return {
      ...activity,
      label: actionLabels[activity.action] || activity.action,
      icon
    };
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Viewer Dashboard" subtitle="View-only access to analytics" color={config.color}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">Here's an overview of your analytics and reports.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Partners */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Partners</p>
              <p className="text-3xl font-bold mt-2">{loading ? '...' : stats.totalPartners}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Properties */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Total Properties</p>
              <p className="text-3xl font-bold mt-2">{loading ? '...' : stats.totalProperties}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Visits */}
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm font-medium">Total Visits</p>
              <p className="text-3xl font-bold mt-2">{loading ? '...' : stats.totalVisits}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Commission Volume */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Commission Volume</p>
              <div className="mt-2">
                {loading ? (
                  <p className="text-3xl font-bold">...</p>
                ) : (
                  stats.activeCurrencies.map(currency => (
                    <div key={currency} className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{formatCurrency(stats.commissionByCurrency[currency]?.total || 0, currency)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/viewer/reports?tab=partners')}
            className="p-4 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Partner Analytics</p>
                <p className="text-sm text-gray-600">View partner performance</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/viewer/reports?tab=overview')}
            className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Commission Reports</p>
                <p className="text-sm text-gray-600">Financial overview</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/viewer/reports?tab=visits')}
            className="p-4 border border-orange-200 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Visit Reports</p>
                <p className="text-sm text-gray-600">Visit statistics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
        {recentActivities.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No recent activities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => {
              const formatted = formatActivity(activity);
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 ${formatted.icon.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className={formatted.icon.color}>{formatted.icon.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{formatted.label}</p>
                    <p className="text-sm text-gray-500 truncate">{formatted.resourceTitle || formatted.userName}</p>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {formatRelativeTime(formatted.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ViewerDashboard;