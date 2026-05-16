import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const Commissions = () => {
  const { user } = useAuth();
  const config = sidebarConfig.partner;
  const navigate = useNavigate();

  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeCurrencies, setActiveCurrencies] = useState(['INR']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCommissions();
  }, [statusFilter]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/commissions/my?${params.toString()}`);
      setCommissions(response.data.data.commissions);
      setStats(response.data.data.stats);
      setActiveCurrencies(response.data.data.activeCurrencies || ['INR']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending Approval',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled'
    };
    return texts[status] || status;
  };

  const formatCurrency = (amount, currency = 'INR') => {
    const symbol = currency === 'INR' ? '₹' : 'AED ';
    if (amount >= 10000000) {
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `${symbol}${(amount / 100000).toFixed(2)} Lac`;
    }
    return `${symbol}${amount?.toLocaleString() || '0'}`;
  };

  const getCurrencyLabel = (currency) => {
    return currency === 'INR' ? '₹ (INR)' : 'AED';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && commissions.length === 0) {
    return (
      <DashboardLayout sidebarLinks={config.links} title="Commissions" subtitle="Loading..." color={config.color}>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarLinks={config.links} title="My Commissions" subtitle="Track your earned commissions" color={config.color}>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Commission Dashboard</h2>
        <p className="text-gray-600 mt-1">Track and manage your earned commissions</p>
      </div>

      {/* Stats Cards by Currency */}
      {activeCurrencies.map(currency => (
        <div key={currency} className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            {getCurrencyLabel(currency)}
            <span className="text-sm font-normal text-gray-500">(Commissions in {currency === 'INR' ? 'Indian Rupees' : 'UAE Dirhams'})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Earned</p>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    {formatCurrency(stats?.[currency]?.paid?.amount || 0, currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stats?.[currency]?.paid?.count || 0} payouts</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-xl font-bold text-yellow-600 mt-1">
                    {formatCurrency(stats?.[currency]?.pending?.amount || 0, currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stats?.[currency]?.pending?.count || 0} requests</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">
                    {formatCurrency(stats?.[currency]?.approved?.amount || 0, currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Awaiting payout</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Commissions</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {commissions.filter(c => c.commission?.currency === currency).length}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Total records</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Commission Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How Commission Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-yellow-700">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Pending Approval</p>
              <p className="text-sm text-gray-500">Deal submitted, awaiting verification</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-blue-700">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Approved</p>
              <p className="text-sm text-gray-500">Commission approved, ready for payout</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-700">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">Paid Out</p>
              <p className="text-sm text-gray-500">Amount transferred to your bank</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Commissions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {commissions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 mb-2">No commissions yet</p>
            <p className="text-sm text-gray-400">Your earned commissions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {commissions.map((commission) => (
              <div key={commission._id} className="p-6 hover:bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Amount Box */}
                    <div className="bg-green-50 rounded-lg p-4 text-center min-w-[120px]">
                      <p className="text-sm text-green-600 font-medium">
                        {commission.commission?.currency || 'INR'}
                      </p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(
                          commission.commission?.calculatedAmount,
                          commission.commission?.currency
                        )}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {commission.property?.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(commission.status)}`}>
                          {getStatusText(commission.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {commission.property?.location?.city} • Sale: {formatCurrency(
                          commission.saleDetails?.salePrice,
                          commission.commission?.currency
                        )}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {commission.partnershipId?.companyId?.name} • {formatDate(commission.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/partner/commissions/${commission._id}`)}
                      className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Commissions;