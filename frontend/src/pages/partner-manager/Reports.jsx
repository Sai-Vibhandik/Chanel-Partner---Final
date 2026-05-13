import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const Reports = () => {
  const config = sidebarConfig.partner_manager;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('performance');
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [commissionData, setCommissionData] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [tierFilter, setTierFilter] = useState('');
  const [sortBy, setSortBy] = useState('totalVisits');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceReport();
    } else {
      fetchCommissionReport();
    }
  }, [activeTab, dateRange.startDate, dateRange.endDate, tierFilter, sortBy, sortOrder, page]);

  const fetchPerformanceReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (tierFilter) params.append('tier', tierFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page);
      params.append('limit', limit);

      const response = await api.get(`/partner-company/reports/performance?${params.toString()}`);
      setPerformanceData(response.data?.data);
    } catch (error) {
      console.error('Failed to fetch performance report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      params.append('page', page);
      params.append('limit', limit);

      const response = await api.get(`/partner-company/reports/commissions?${params.toString()}`);
      setCommissionData(response.data?.data);
    } catch (error) {
      console.error('Failed to fetch commission report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (!amount) return currency === 'INR' ? '₹0' : 'AED 0';
    const symbol = currency === 'INR' ? '₹' : 'AED ';
    if (amount >= 10000000) {
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `${symbol}${(amount / 100000).toFixed(2)} Lac`;
    }
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
    setTierFilter('');
    setSortBy('totalVisits');
    setSortOrder('desc');
    setPage(1);
  };

  // Performance Report Component
  const PerformanceReport = () => {
    if (!performanceData) return null;

    const { partners, summary, tierBreakdown, pagination } = performanceData;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Partners</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalPartners}</p>
            <p className="text-xs text-gray-400 mt-1">Active partners</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Visits</p>
            <p className="text-2xl font-bold text-blue-600">{summary.totalVisits}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.completedVisits} completed</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Commissions</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCommissions)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary.paidCommissions)} paid</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Avg. Conversion</p>
            <p className="text-2xl font-bold text-purple-600">{summary.avgConversionRate?.toFixed(1) || 0}%</p>
            <p className="text-xs text-gray-400 mt-1">Visit to completion</p>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Partners by Tier</h3>
          <div className="grid grid-cols-4 gap-4">
            {['bronze', 'silver', 'gold', 'platinum'].map((tier) => (
              <div key={tier} className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-2xl font-bold text-gray-900">{tierBreakdown?.[tier] || 0}</p>
                <p className="text-sm text-gray-500 capitalize">{tier}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Performance Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Partner Performance</h3>
            <p className="text-sm text-gray-500">Click on a partner to view details</p>
          </div>
          {partners.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No partners found for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Visits</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversion</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commissions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.map((partner) => (
                    <tr
                      key={partner.partnershipId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/partner-manager/partners/${partner.partnershipId}`)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{partner.partnerName}</p>
                          <p className="text-sm text-gray-500">{partner.partnerEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          partner.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                          partner.tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                          partner.tier === 'silver' ? 'bg-gray-200 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {partner.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">{partner.totalVisits}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{partner.completedVisits}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${partner.conversionRate >= 50 ? 'text-green-600' : partner.conversionRate >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                          {partner.conversionRate?.toFixed(1) || 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="font-medium text-gray-900">{formatCurrency(partner.totalCommissions)}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(partner.paidCommissions)} paid</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          partner.kycStatus === 'verified' ? 'bg-green-100 text-green-700' :
                          partner.kycStatus === 'submitted' ? 'bg-amber-100 text-amber-700' :
                          partner.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {partner.kycStatus || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * limit) + 1} to {Math.min(pagination.page * limit, pagination.total)} of {pagination.total} partners
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Commission Report Component
  const CommissionReport = () => {
    if (!commissionData) return null;

    const { summary, byStatus, byTier, byPartner, byPeriod, pagination } = commissionData;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Commissions</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.totalCount} transactions</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.pendingAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.pendingCount} pending</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.approvedAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.approvedCount} approved</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.paidAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.paidCount} paid</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.cancelledAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.cancelledCount} cancelled</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commissions by Status</h3>
            <div className="space-y-3">
              {byStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      item.status === 'paid' ? 'bg-green-500' :
                      item.status === 'approved' ? 'bg-blue-500' :
                      item.status === 'pending' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}></span>
                    <span className="text-gray-700 capitalize">{item.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-gray-500">{item.count} records</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Tier */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commissions by Tier</h3>
            <div className="space-y-3">
              {byTier.map((item) => (
                <div key={item.tier} className="flex items-center justify-between">
                  <span className="text-gray-700 capitalize">{item.tier}</span>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-gray-500">{item.count} commissions</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commission Trend */}
        {byPeriod && byPeriod.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Trend</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byPeriod.map((item) => (
                    <tr key={item.period}>
                      <td className="px-4 py-2 text-gray-900">{item.period}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{item.count}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-2 text-right text-green-600">{formatCurrency(item.paidAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Partners by Commission */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top Partners by Commission</h3>
            <p className="text-sm text-gray-500">Top 20 partners by total commission earned</p>
          </div>
          {byPartner.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No commission data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Commissions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byPartner.map((partner, index) => (
                    <tr key={partner.partnerId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{partner.partnerName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          partner.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                          partner.tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                          partner.tier === 'silver' ? 'bg-gray-200 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {partner.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(partner.totalCommissions)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(partner.paidCommissions)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(partner.pendingCommissions)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{partner.commissionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * limit) + 1} to {Math.min(pagination.page * limit, pagination.total)} of {pagination.total} partners
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout sidebarLinks={config.links} title="Reports" subtitle="Partner performance and commission analytics" color={config.color}>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => { setDateRange({ ...dateRange, startDate: e.target.value }); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => { setDateRange({ ...dateRange, endDate: e.target.value }); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {activeTab === 'performance' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Tier</label>
                <select
                  value={tierFilter}
                  onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">All Tiers</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              {/* <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="totalVisits">Total Visits</option>
                  <option value="completedVisits">Completed Visits</option>
                  <option value="totalCommissions">Commissions</option>
                  <option value="conversionRate">Conversion Rate</option>
                </select>
              </div> */}
            </>
          )}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setActiveTab('performance'); setPage(1); }}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'performance'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Partner Performance
          </button>
          <button
            onClick={() => { setActiveTab('commissions'); setPage(1); }}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'commissions'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Commission Report
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'performance' && <PerformanceReport />}
          {activeTab === 'commissions' && <CommissionReport />}
        </>
      )}
    </DashboardLayout>
  );
};

export default Reports;