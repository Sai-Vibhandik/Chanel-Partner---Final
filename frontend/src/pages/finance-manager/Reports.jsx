import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';

const Reports = () => {
  const config = sidebarConfig.finance_manager;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [payoutData, setPayoutData] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters
  const [period, setPeriod] = useState('month');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
    } else {
      fetchPayouts();
    }
  }, [activeTab, period]);

  useEffect(() => {
    if (activeTab === 'payouts') {
      fetchPayouts();
    }
  }, [tierFilter, statusFilter, page]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('period', period);

      const response = await api.get(`/commissions/reports/overview?${params.toString()}`);
      setOverviewData(response.data?.data);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (tierFilter) params.append('tier', tierFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', limit);

      const response = await api.get(`/commissions/reports/payouts?${params.toString()}`);
      setPayoutData(response.data?.data);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      setExportLoading(true);
      const params = new URLSearchParams();
      params.append('period', period);

      const response = await api.get(`/commissions/reports/export?${params.toString()}`);
      const { report } = response.data?.data;

      if (report && report.length > 0) {
        const headers = Object.keys(report[0]);
        const csvContent = [
          headers.join(','),
          ...report.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `commission-report-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lac`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const clearFilters = () => {
    setPeriod('month');
    setTierFilter('');
    setStatusFilter('');
    setPage(1);
  };

  // Commission Overview Component
  const CommissionOverview = () => {
    if (!overviewData) return null;

    const { summary, byStatus, byTier, monthlyTrend, topPartners } = overviewData;

    // Calculate max for trend chart
    const maxTrendValue = Math.max(...monthlyTrend.map(t => t.totalAmount), 1);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Commissions</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.totalCount} records</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-xs text-gray-400 mt-1">Completed payouts</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalApproved)}</p>
            <p className="text-xs text-gray-400 mt-1">Ready for payment</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalPending)}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Liability</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalApproved + summary.totalPending)}</p>
            <p className="text-xs text-gray-400 mt-1">Total outstanding</p>
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
              {byTier.sort((a, b) => {
                const order = { platinum: 1, gold: 2, silver: 3, bronze: 4 };
                return (order[a.tier] || 5) - (order[b.tier] || 5);
              }).map((item) => (
                <div key={item.tier} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    item.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                    item.tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                    item.tier === 'silver' ? 'bg-gray-200 text-gray-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {item.tier}
                  </span>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(item.totalAmount)}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.paidAmount)} paid</p>
                  </div>
                </div>
              ))}
              {byTier.length === 0 && (
                <p className="text-gray-500 text-center py-4">No tier data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        {monthlyTrend.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Trend</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <div className="h-48 relative">
                  <div className="absolute left-0 top-0 bottom-6 w-20 flex flex-col justify-between text-xs text-gray-500">
                    <span>{formatCurrency(maxTrendValue)}</span>
                    <span>{formatCurrency(maxTrendValue / 2)}</span>
                    <span>₹0</span>
                  </div>
                  <div className="ml-20 h-full flex items-end gap-2">
                    {monthlyTrend.map((trend, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors relative group"
                          style={{ height: `${(trend.totalAmount / maxTrendValue) * 150}px`, minHeight: '2px' }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatCurrency(trend.totalAmount)} ({trend.count})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="ml-20 flex justify-between text-xs text-gray-500 mt-2">
                  {monthlyTrend.length > 0 && (
                    <>
                      <span>{monthlyTrend[0].period}</span>
                      <span>{monthlyTrend[monthlyTrend.length - 1].period}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Partners */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top Partners by Commission</h3>
          </div>
          {topPartners.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No partner data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topPartners.map((partner, index) => (
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
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(partner.totalCommission)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(partner.paidCommission)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(partner.pendingCommission)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{partner.commissionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Partner Payout Report Component
  const PartnerPayoutReport = () => {
    if (!payoutData) return null;

    const { summary, partners, pagination } = payoutData;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.pendingPayouts)}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Approved for Payment</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.approvedPayouts)}</p>
            <p className="text-xs text-gray-400 mt-1">Ready to pay</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Commissions</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalPayouts)}</p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>
        </div>

        {/* Partner Payout Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Partner Payout Summary</h3>
              <p className="text-sm text-gray-500">Click on a partner to view their commission history</p>
            </div>
            <button
              onClick={exportReport}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {exportLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Export CSV
            </button>
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Earned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.map((partner) => (
                    <tr
                      key={partner.partnershipId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/finance-manager/commissions?partnerId=${partner.partnerId}`)}
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
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(partner.totalCommission)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(partner.paidCommission)}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(partner.approvedCommission)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(partner.pendingCommission)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{partner.commissionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * limit) + 1} to {Math.min(pagination.page * limit, pagination.total)} of {pagination.total} partners
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
    <DashboardLayout sidebarLinks={config.links} title="Reports" subtitle="Commission and payout analytics" color={config.color}>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {activeTab === 'overview' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          )}
          {activeTab === 'payouts' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Tier</label>
                <select
                  value={tierFilter}
                  onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="">All Tiers</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
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
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'overview'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Commission Overview
          </button>
          {/* <button
            onClick={() => setActiveTab('payouts')}
            className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-colors ${
              activeTab === 'payouts'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Partner Payouts
          </button> */}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <CommissionOverview />}
          {activeTab === 'payouts' && <PartnerPayoutReport />}
        </>
      )}
    </DashboardLayout>
  );
};

export default Reports;