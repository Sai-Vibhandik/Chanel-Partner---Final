import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

const PartnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = sidebarConfig.partner;
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState([]);
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [recentCommissions, setRecentCommissions] = useState([]);
  const [stats, setStats] = useState({
    properties: 0,
    visits: 0,
    pendingCommissions: { INR: 0, AED: 0 },
    totalEarnings: { INR: 0, AED: 0 }
  });
  const [activeCurrencies, setActiveCurrencies] = useState(['INR']);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get partner's companies/partnerships
      const companiesRes = await api.get('/partner-company/my-companies');
      const partnershipsData = companiesRes.data.data?.partnerships || companiesRes.data.data?.companies || [];
      setPartnerships(partnershipsData);

      let totalProperties = 0;

      // Get properties for each partnership
      for (const partnership of partnershipsData) {
        try {
          const propsRes = await api.get(`/properties/partnership/${partnership._id}`);
          totalProperties += (propsRes.data.data?.properties || []).length;
        } catch (err) {
          // Ignore errors for individual partnerships
        }
      }

      // Get visits stats and upcoming visits
      let totalVisits = 0;
      try {
        const visitsRes = await api.get('/visits/my');
        const visits = visitsRes.data.data?.visits || [];
        // Count upcoming visits (only approved/scheduled)
        totalVisits = visits.filter(v => v.status === 'approved' || v.status === 'scheduled').length;
        // Get upcoming visits (only approved/scheduled - pending visits are not confirmed)
        const upcoming = visits
          .filter(v => v.status === 'approved' || v.status === 'scheduled')
          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
          .slice(0, 5);
        setUpcomingVisits(upcoming);
      } catch (err) {
        // Ignore
      }

      // Get commissions stats and recent commissions
      const pendingByCurrency = { INR: 0, AED: 0 };
      const earningsByCurrency = { INR: 0, AED: 0 };
      try {
        const commissionsRes = await api.get('/commissions/my');
        const commissionStats = commissionsRes.data.data?.stats || {};
        const currencies = commissionsRes.data.data?.activeCurrencies || ['INR'];
        setActiveCurrencies(currencies);

        // Calculate pending and earnings for each currency
        currencies.forEach(currency => {
          if (commissionStats[currency]) {
            pendingByCurrency[currency] = (commissionStats[currency].pending?.amount || 0) + (commissionStats[currency].approved?.amount || 0);
            earningsByCurrency[currency] = commissionStats[currency].paid?.amount || 0;
          }
        });

        // Get recent commissions
        const allCommissions = commissionsRes.data.data?.commissions || [];
        const recent = allCommissions
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentCommissions(recent);
      } catch (err) {
        // Ignore
      }

      setStats({
        properties: totalProperties,
        visits: totalVisits,
        pendingCommissions: pendingByCurrency,
        totalEarnings: earningsByCurrency
      });
    } catch (error) {
      // Error fetching stats
    } finally {
      setLoading(false);
    }
  };

  const getCurrencyLabel = (currency) => {
    return currency === 'INR' ? '₹ (INR)' : 'AED';
  };

  const tierColors = {
    bronze: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800', emoji: '🥉' },
    silver: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', badge: 'bg-gray-200 text-gray-800', emoji: '🥈' },
    gold: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800', emoji: '🥇' },
    platinum: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800', emoji: '💎' }
  };

  const getTierCommission = (tier, company) => {
    const percentages = {
      bronze: company?.settings?.tierPercentages?.bronze || 25,
      silver: company?.settings?.tierPercentages?.silver || 35,
      gold: company?.settings?.tierPercentages?.gold || 50,
      platinum: company?.settings?.tierPercentages?.platinum || 75
    };
    return `${percentages[tier] || percentages.bronze}%`;
  };

  const formatTimeDisplay = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Partner Portal" subtitle="Your channel partner dashboard" color={config.color}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">Manage your partnerships and track your earnings.</p>
      </div>

      {/* My Partnerships Section - Shows tier per company */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">My Partnerships</h3>
          <button
            onClick={() => navigate('/partner/my-companies')}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : partnerships.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 mb-2">No partnerships yet</p>
            <button
              onClick={() => navigate('/partner/my-companies')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Apply to partner with companies →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerships.map((partnership) => {
              const tier = partnership.tier || 'bronze';
              const tierStyle = tierColors[tier] || tierColors.bronze;
              const company = partnership.companyId || partnership.company;

              return (
                <div
                  key={partnership._id}
                  className={`rounded-xl border ${tierStyle.bg} ${tierStyle.border} p-4 hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={() => navigate('/partner/my-companies')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">
                        {tierStyle.emoji}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{company?.name || 'Unknown Company'}</h4>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tierStyle.badge}`}>
                          {tier.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Commission Rate</span>
                      <span className="font-semibold text-gray-900">{getTierCommission(tier, company)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">Status</span>
                      <span className={`font-medium ${partnership.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {partnership.status?.charAt(0).toUpperCase() + partnership.status?.slice(1) || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Available Properties</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.properties}</p>
              <p className="text-sm text-cyan-600 mt-1">Ready to promote</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Upcoming Visits</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.visits}</p>
              <p className="text-sm text-yellow-600 mt-1">Scheduled visits</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Commissions</p>
              {loading ? (
                <p className="text-2xl font-bold text-gray-900 mt-1">...</p>
              ) : (
                <div className="mt-1">
                  {activeCurrencies.map(currency => (
                    stats.pendingCommissions[currency] > 0 && (
                      <p key={currency} className="text-xl font-bold text-green-600">
                        {formatCurrency(stats.pendingCommissions[currency] || 0, currency)}
                      </p>
                    )
                  ))}
                  {activeCurrencies.filter(c => stats.pendingCommissions[c] > 0).length === 0 && (
                    <p className="text-xl font-bold text-green-600">{formatCurrency(0)}</p>
                  )}
                </div>
              )}
              <p className="text-sm text-green-600 mt-1">Awaiting payout</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Earnings</p>
              {loading ? (
                <p className="text-2xl font-bold text-gray-900 mt-1">...</p>
              ) : (
                <div className="mt-1">
                  {activeCurrencies.map(currency => (
                    stats.totalEarnings[currency] > 0 && (
                      <p key={currency} className="text-xl font-bold text-purple-600">
                        {formatCurrency(stats.totalEarnings[currency] || 0, currency)}
                      </p>
                    )
                  ))}
                  {activeCurrencies.filter(c => stats.totalEarnings[c] > 0).length === 0 && (
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(0)}</p>
                  )}
                </div>
              )}
              <p className="text-sm text-purple-600 mt-1">All time</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/partner/properties')}
            className="btn btn-primary bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Browse Properties
          </button>
          <button
            onClick={() => navigate('/partner/visits')}
            className="btn btn-secondary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book a Visit
          </button>
          <button
            onClick={() => navigate('/partner/commissions')}
            className="btn btn-secondary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Commissions
          </button>
          <button
            onClick={() => navigate('/partner/chat')}
            className="btn btn-secondary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat with Admin
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Visits</h3>
            <button
              onClick={() => navigate('/partner/visits')}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View All →
            </button>
          </div>
          {upcomingVisits.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No upcoming visits</p>
              <button
                onClick={() => navigate('/partner/visits')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-2"
              >
                Schedule a visit →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingVisits.map((visit) => (
                <div
                  key={visit._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/partner/visits/${visit._id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {visit.property?.name || 'Property'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {visit.property?.location?.city || ''} {visit.property?.location?.state || ''}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(visit.scheduledDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimeDisplay(visit.scheduledTime || visit.time)}
                    </p>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${
                      visit.status === 'approved' || visit.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                      visit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      visit.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      visit.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      visit.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {visit.status === 'approved' ? 'Confirmed' : visit.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Commissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Commissions</h3>
            <button
              onClick={() => navigate('/partner/commissions')}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View All →
            </button>
          </div>
          {recentCommissions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No commissions yet</p>
              <p className="text-xs text-gray-400 mt-1">Complete visits to earn commissions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCommissions.map((commission) => {
                const amount = commission.commission?.calculatedAmount || 0;
                const currency = commission.commission?.currency || commission.currency || 'INR';

                return (
                  <div
                    key={commission._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate('/partner/commissions')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {commission.property?.name || 'Property'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {commission.visit?.clientDetails?.name || commission.visit?.visitType || 'Visit'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(amount, currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(commission.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${
                        commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                        commission.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {commission.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PartnerDashboard;