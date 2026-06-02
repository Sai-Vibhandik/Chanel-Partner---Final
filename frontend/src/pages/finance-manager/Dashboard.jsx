import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

const FinanceManagerDashboard = () => {
  const { user } = useAuth();
  const config = sidebarConfig.finance_manager;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    activeCurrencies: ['INR'],
    statusCountsByCurrency: {},
    monthlyPaidByCurrency: {},
    recentTransactions: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/commissions/stats');
      const data = res.data.data || {};

      setStats({
        total: data.overview?.total || 0,
        activeCurrencies: data.activeCurrencies || ['INR'],
        statusCountsByCurrency: data.statusCountsByCurrency || {},
        monthlyPaidByCurrency: data.monthlyPaidByCurrency || {},
        recentTransactions: data.recentTransactions || []
      });
    } catch (error) {
      console.error('Error fetching commission stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get totals for a status across all currencies
  const getStatusTotals = (status) => {
    const currencies = stats.activeCurrencies;
    return currencies.map(currency => {
      const data = stats.statusCountsByCurrency[currency] || {};
      return {
        currency,
        amount: data[status]?.amount || 0,
        count: data[status]?.count || 0
      };
    });
  };

  // Get monthly paid for all currencies
  const getMonthlyPaidTotals = () => {
    const currencies = stats.activeCurrencies;
    return currencies.map(currency => {
      const data = stats.monthlyPaidByCurrency[currency] || { monthlyPaidAmount: 0, monthlyPaidCount: 0 };
      return {
        currency,
        ...data
      };
    });
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Finance Management" subtitle="Manage commissions and payouts" color={config.color}>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h2>
        <p className="text-gray-600 mt-1">Track and manage financial operations.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Pending Approval */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Approval</p>
              <div className="mt-1">
                {loading ? (
                  <p className="text-2xl font-bold text-gray-900">...</p>
                ) : (
                  getStatusTotals('pending').map(({ currency, amount, count }) => (
                    <div key={currency} className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold text-yellow-600">{formatCurrency(amount, currency)}</p>
                      <span className="text-xs text-gray-400">({count})</span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-yellow-600 mt-1">Awaiting review</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Approved</p>
              <div className="mt-1">
                {loading ? (
                  <p className="text-2xl font-bold text-gray-900">...</p>
                ) : (
                  getStatusTotals('approved').map(({ currency, amount, count }) => (
                    <div key={currency} className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(amount, currency)}</p>
                      <span className="text-xs text-gray-400">({count})</span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-blue-600 mt-1">Ready for payout</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Paid */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Paid</p>
              <div className="mt-1">
                {loading ? (
                  <p className="text-2xl font-bold text-gray-900">...</p>
                ) : (
                  getStatusTotals('paid').map(({ currency, amount, count }) => (
                    <div key={currency} className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(amount, currency)}</p>
                      <span className="text-xs text-gray-400">({count})</span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-green-600 mt-1">Successfully processed</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Paid This Month */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Paid This Month</p>
              <div className="mt-1">
                {loading ? (
                  <p className="text-2xl font-bold text-gray-900">...</p>
                ) : (
                  getMonthlyPaidTotals().map(({ currency, monthlyPaidAmount, monthlyPaidCount }) => (
                    <div key={currency} className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(monthlyPaidAmount, currency)}</p>
                      <span className="text-xs text-gray-400">({monthlyPaidCount})</span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-sm text-purple-600 mt-1">Current month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Total Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Commission Records</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.total}</p>
          </div>
          <button
            onClick={() => navigate('/finance-manager/commissions')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View All Commissions
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button
            onClick={() => navigate('/finance-manager/commissions')}
            className="text-sm text-green-600 hover:text-green-700"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : stats.recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No transactions yet</p>
            <p className="text-sm mt-1">Commission transactions will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{transaction.partnerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600">{transaction.propertyName || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(transaction.amount, transaction.currency)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-500 text-sm">{formatDate(transaction.createdAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinanceManagerDashboard;