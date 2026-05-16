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
    const symbols = { INR: '₹', USD: '$', AED: 'د.إ', EUR: '€', GBP: '£' };
    if (!amount) return `${symbols[currency] || currency}0`;
    const symbol = symbols[currency] || currency;
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

  // Export to CSV
  const exportToCSV = (data, filename, columns) => {
    if (!data || data.length === 0) return;

    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const value = col.key.split('.').reduce((obj, key) => obj?.[key], row);
        // Escape commas and quotes
        const cellValue = value ?? '';
        return typeof cellValue === 'string' && (cellValue.includes(',') || cellValue.includes('"'))
          ? `"${cellValue.replace(/"/g, '""')}"`
          : cellValue;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPerformanceReport = () => {
    if (!performanceData?.partners) return;

    const activeCurrencies = performanceData.activeCurrencies || ['INR'];
    const isMultiCurrency = activeCurrencies.length > 1;

    // Build columns based on currencies
    const baseColumns = [
      { key: 'partnerName', label: 'Partner Name' },
      { key: 'partnerEmail', label: 'Email' },
      { key: 'tier', label: 'Tier' },
      { key: 'totalVisits', label: 'Total Visits' },
      { key: 'completedVisits', label: 'Completed Visits' },
      { key: 'conversionRate', label: 'Conversion Rate (%)' }
    ];

    // Add currency-specific columns
    if (isMultiCurrency) {
      activeCurrencies.forEach(currency => {
        baseColumns.push({ key: `commissionsByCurrency.${currency}.total`, label: `Total (${currency})` });
        baseColumns.push({ key: `commissionsByCurrency.${currency}.paid`, label: `Paid (${currency})` });
      });
    } else {
      baseColumns.push({ key: 'totalCommissions', label: 'Total Commissions' });
      baseColumns.push({ key: 'paidCommissions', label: 'Paid Commissions' });
    }

    baseColumns.push({ key: 'kycStatus', label: 'KYC Status' });

    // Transform data for multi-currency export
    const exportData = performanceData.partners.map(partner => {
      if (isMultiCurrency && partner.commissionsByCurrency) {
        const transformed = { ...partner };
        // Flatten commissionsByCurrency for CSV
        Object.entries(partner.commissionsByCurrency).forEach(([currency, amounts]) => {
          transformed[`commissionsByCurrency.${currency}.total`] = amounts.total || 0;
          transformed[`commissionsByCurrency.${currency}.paid`] = amounts.paid || 0;
        });
        return transformed;
      }
      return partner;
    });

    exportToCSV(exportData, 'partner-performance-report', baseColumns);
  };

  const exportCommissionReport = () => {
    if (!commissionData?.byPartner) return;

    const activeCurrencies = commissionData.activeCurrencies || ['INR'];
    const isMultiCurrency = activeCurrencies.length > 1;

    // Build columns based on currencies
    const baseColumns = [
      { key: 'partnerName', label: 'Partner Name' },
      { key: 'tier', label: 'Tier' }
    ];

    // Add currency-specific columns
    if (isMultiCurrency) {
      activeCurrencies.forEach(currency => {
        baseColumns.push({ key: `commissionsByCurrency.${currency}.total`, label: `Total (${currency})` });
        baseColumns.push({ key: `commissionsByCurrency.${currency}.paid`, label: `Paid (${currency})` });
        baseColumns.push({ key: `commissionsByCurrency.${currency}.pending`, label: `Pending (${currency})` });
      });
    } else {
      baseColumns.push({ key: 'totalCommissions', label: 'Total Commissions' });
      baseColumns.push({ key: 'paidCommissions', label: 'Paid Commissions' });
      baseColumns.push({ key: 'pendingCommissions', label: 'Pending Commissions' });
    }

    baseColumns.push({ key: 'commissionCount', label: 'Sales Count' });

    // Transform data for multi-currency export
    const exportData = commissionData.byPartner.map(partner => {
      if (isMultiCurrency && partner.commissionsByCurrency) {
        const transformed = { ...partner };
        // Flatten commissionsByCurrency for CSV
        Object.entries(partner.commissionsByCurrency).forEach(([currency, amounts]) => {
          transformed[`commissionsByCurrency.${currency}.total`] = amounts.total || 0;
          transformed[`commissionsByCurrency.${currency}.paid`] = amounts.paid || 0;
          transformed[`commissionsByCurrency.${currency}.pending`] = amounts.pending || 0;
        });
        return transformed;
      }
      return partner;
    });

    exportToCSV(exportData, 'commission-report', baseColumns);
  };

  // Performance Report Component
  const PerformanceReport = () => {
    if (!performanceData) return null;

    const { partners, summary, summaryByCurrency, activeCurrencies, tierBreakdown, pagination } = performanceData;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {(activeCurrencies || ['INR']).map((currency) => {
              const currStats = summaryByCurrency?.[currency] || {};
              return (
                <div key={currency} className="flex items-center gap-2">
                  <p className="text-lg font-bold text-green-600">{formatCurrency(currStats.totalAmount || 0, currency)}</p>
                  {(activeCurrencies?.length || 1) > 1 && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{currency}</span>
                  )}
                </div>
              );
            })}
            <div className="mt-1">
              {(activeCurrencies || ['INR']).map((currency) => {
                const currStats = summaryByCurrency?.[currency] || {};
                return (
                  <span key={currency} className="text-xs text-gray-400 mr-2">
                    {formatCurrency(currStats.paidAmount || 0, currency)} paid
                    {(activeCurrencies?.length || 1) > 1 && ` (${currency})`}
                  </span>
                );
              })}
            </div>
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
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Partner Performance</h3>
              {(activeCurrencies?.length || 1) > 1 && (
                <p className="text-xs text-gray-400">Note: Commission amounts may include mixed currencies</p>
              )}
            </div>
            <button
              onClick={exportPerformanceReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Visits</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversion</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commissions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.map((partner, index) => (
                    <tr key={`perf-partner-${index}-${partner.partnershipId || 'unknown'}`} className="hover:bg-gray-50">
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
                          {partner.commissionsByCurrency && Object.keys(partner.commissionsByCurrency).length > 0 ? (
                            <div className="space-y-0.5">
                              {Object.entries(partner.commissionsByCurrency).map(([currency, amounts]) => (
                                <div key={`perf-total-${index}-${currency}`} className="flex items-center justify-end gap-1">
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(amounts.total || 0, currency)}
                                  </span>
                                  {Object.keys(partner.commissionsByCurrency).length > 1 && (
                                    <span className="text-xs text-gray-400">({currency})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900">
                              {formatCurrency(partner.totalCommissions, activeCurrencies?.[0] || 'INR')}
                            </span>
                          )}
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

    const { summary, summaryByCurrency, byStatusByCurrency, activeCurrencies, byStatus, byTier, byPartner, byPeriod, pagination } = commissionData;

    return (
      <div className="space-y-6">
        {/* Summary Cards - Per Currency */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Summary by Currency</h3>
          {(activeCurrencies || ['INR']).map((currency) => {
            const currStats = summaryByCurrency?.[currency] || {};
            return (
              <div key={currency} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-medium text-gray-700">{currency}</h4>
                  {(activeCurrencies?.length || 1) > 1 && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                      {currency}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(currStats.totalAmount || 0, currency)}</p>
                    <p className="text-xs text-gray-400">{currStats.count || 0} transactions</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(currStats.pendingAmount || 0, currency)}</p>
                    <p className="text-xs text-gray-400">{currStats.pendingCount || 0} pending</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Approved</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(currStats.approvedAmount || 0, currency)}</p>
                    <p className="text-xs text-gray-400">{currStats.approvedCount || 0} approved</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(currStats.paidAmount || 0, currency)}</p>
                    <p className="text-xs text-gray-400">{currStats.paidCount || 0} paid</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Cancelled</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(currStats.cancelledAmount || 0, currency)}</p>
                    <p className="text-xs text-gray-400">{currStats.cancelledCount || 0} cancelled</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Commission Trend */}
        {byPeriod && byPeriod.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Trend</h3>
            {(activeCurrencies?.length || 1) > 1 && (
              <p className="text-xs text-gray-400 mb-3">Note: Amounts may include mixed currencies</p>
            )}
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
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Partners by Commission</h3>
              <p className="text-sm text-gray-500">Top 20 partners by total commission earned</p>
              {(activeCurrencies?.length || 1) > 1 && (
                <p className="text-xs text-gray-400">Note: Amounts may include mixed currencies</p>
              )}
            </div>
            <button
              onClick={exportCommissionReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
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
                    <tr key={`partner-${index}-${partner.partnerId || 'unknown'}`} className="hover:bg-gray-50">
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
                      <td className="px-4 py-3 text-right">
                        {partner.commissionsByCurrency && Object.keys(partner.commissionsByCurrency).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(partner.commissionsByCurrency).map(([currency, amounts]) => (
                              <div key={`total-${currency}`} className="flex items-center justify-end gap-1">
                                <span className="font-medium text-gray-900">{formatCurrency(amounts.total || 0, currency)}</span>
                                {Object.keys(partner.commissionsByCurrency).length > 1 && (
                                  <span className="text-xs text-gray-400">({currency})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-medium text-gray-900">{formatCurrency(partner.totalCommissions, activeCurrencies?.[0] || 'INR')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {partner.commissionsByCurrency && Object.keys(partner.commissionsByCurrency).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(partner.commissionsByCurrency).map(([currency, amounts]) => (
                              <div key={`paid-${currency}`} className="flex items-center justify-end gap-1">
                                <span className="text-green-600">{formatCurrency(amounts.paid || 0, currency)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-green-600">{formatCurrency(partner.paidCommissions, activeCurrencies?.[0] || 'INR')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {partner.commissionsByCurrency && Object.keys(partner.commissionsByCurrency).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(partner.commissionsByCurrency).map(([currency, amounts]) => (
                              <div key={`pending-${currency}`} className="flex items-center justify-end gap-1">
                                <span className="text-amber-600">{formatCurrency(amounts.pending || 0, currency)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-amber-600">{formatCurrency(partner.pendingCommissions, activeCurrencies?.[0] || 'INR')}</span>
                        )}
                      </td>
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