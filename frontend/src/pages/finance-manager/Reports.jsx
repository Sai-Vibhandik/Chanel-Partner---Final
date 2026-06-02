import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { sidebarConfig } from '../../config/sidebar';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/currency';
import Pagination from '../../components/common/Pagination';

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
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  }, [tierFilter, statusFilter, page, itemsPerPage]);

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
      params.append('limit', itemsPerPage);

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

  const getCurrencyLabel = (currency) => {
    return currency === 'INR' ? '₹ (INR)' : 'AED';
  };

  const clearFilters = () => {
    setPeriod('month');
    setTierFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setPage(1);
  };

  // Commission Overview Component
  const CommissionOverview = () => {
    if (!overviewData) return null;

    const { byStatus, byTier, byCurrency, statusTotalsByCurrency, monthlyTrend, topPartners, activeCurrencies } = overviewData;

    // Calculate max for trend chart (per currency)
    const getMaxTrendValue = (currency) => {
      const values = (monthlyTrend || []).map(t => t.byCurrency?.[currency]?.amount || 0);
      return Math.max(...values, 1);
    };

    return (
      <div className="space-y-6">
        {/* Stats by Currency */}
        {(activeCurrencies || ['INR']).map(currency => {
          const currencyData = byCurrency?.[currency] || { count: 0, amount: 0 };
          const statusData = statusTotalsByCurrency?.[currency] || { paid: 0, approved: 0, pending: 0 };

          return (
            <div key={currency} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {getCurrencyLabel(currency)}
                <span className="text-sm font-normal text-gray-500">(Commissions in {currency === 'INR' ? 'Indian Rupees' : 'UAE Dirhams'})</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Total Commissions</p>
                  <p className="text-xl font-bold text-gray-900">{currencyData.count}</p>
                  <p className="text-sm text-gray-400">{formatCurrency(currencyData.amount, currency)}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Paid</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(statusData.paid, currency)}</p>
                  <p className="text-xs text-gray-400">Completed payouts</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(statusData.approved, currency)}</p>
                  <p className="text-xs text-gray-400">Ready for payment</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(statusData.pending, currency)}</p>
                  <p className="text-xs text-gray-400">Awaiting approval</p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Status - Show per currency */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commissions by Status</h3>
            {(activeCurrencies || ['INR']).map(currency => (
              <div key={currency} className="mb-4 last:mb-0">
                <p className="text-xs font-medium text-gray-500 mb-2">{getCurrencyLabel(currency)}</p>
                <div className="space-y-2">
                  {(byStatus || []).map((item) => {
                    const currencyAmount = item.byCurrency?.[currency]?.amount || 0;
                    const currencyCount = item.byCurrency?.[currency]?.count || 0;
                    return (
                      <div key={`${item.status}-${currency}`} className="flex items-center justify-between">
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
                          <p className="font-medium text-gray-900">{formatCurrency(currencyAmount, currency)}</p>
                          <p className="text-xs text-gray-500">{currencyCount} records</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {(byStatus || []).length === 0 && (
              <p className="text-gray-500 text-center py-4">No status data available</p>
            )}
          </div>

          {/* By Tier - Show per currency */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commissions by Tier</h3>
            {(activeCurrencies || ['INR']).map(currency => (
              <div key={currency} className="mb-4 last:mb-0">
                <p className="text-xs font-medium text-gray-500 mb-2">{getCurrencyLabel(currency)}</p>
                <div className="space-y-2">
                  {(byTier || []).sort((a, b) => {
                    const order = { platinum: 1, gold: 2, silver: 3, bronze: 4 };
                    return (order[a.tier] || 5) - (order[b.tier] || 5);
                  }).map((item) => {
                    const currencyData = item.byCurrency?.[currency] || { totalAmount: 0, paidAmount: 0 };
                    return (
                      <div key={`${item.tier}-${currency}`} className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          item.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                          item.tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                          item.tier === 'silver' ? 'bg-gray-200 text-gray-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {item.tier}
                        </span>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(currencyData.totalAmount, currency)}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(currencyData.paidAmount, currency)} paid</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {(byTier || []).length === 0 && (
              <p className="text-gray-500 text-center py-4">No tier data available</p>
            )}
          </div>
        </div>

        {/* Monthly Trend - Per Currency - Smooth Area Chart */}
        {(activeCurrencies || ['INR']).map(currency => {
          const maxTrendValue = getMaxTrendValue(currency);
          const trendData = (monthlyTrend || []).map(t => ({
            period: t.period,
            amount: t.byCurrency?.[currency]?.amount || 0,
            count: t.byCurrency?.[currency]?.count || 0
          }));

          // Chart dimensions
          const chartWidth = 600;
          const chartHeight = 200;
          const padding = { top: 20, right: 20, bottom: 30, left: 80 };
          const innerWidth = chartWidth - padding.left - padding.right;
          const innerHeight = chartHeight - padding.top - padding.bottom;

          // Generate smooth curve path
          const generateSmoothPath = (data, isArea = false) => {
            if (data.length === 0) return '';

            const xStep = innerWidth / Math.max(data.length - 1, 1);
            const points = data.map((d, i) => ({
              x: padding.left + i * xStep,
              y: padding.top + innerHeight - (d.amount / maxTrendValue) * innerHeight
            }));

            if (points.length === 1) {
              const p = points[0];
              return isArea
                ? `M ${p.x} ${padding.top + innerHeight} L ${p.x} ${p.y} L ${p.x} ${padding.top + innerHeight}`
                : `M ${p.x} ${p.y}`;
            }

            // Create smooth curve using bezier
            let path = `M ${points[0].x} ${points[0].y}`;

            for (let i = 0; i < points.length - 1; i++) {
              const p0 = points[Math.max(0, i - 1)];
              const p1 = points[i];
              const p2 = points[i + 1];
              const p3 = points[Math.min(points.length - 1, i + 2)];

              // Catmull-Rom to Bezier conversion
              const cp1x = p1.x + (p2.x - p0.x) / 6;
              const cp1y = p1.y + (p2.y - p0.y) / 6;
              const cp2x = p2.x - (p3.x - p1.x) / 6;
              const cp2y = p2.y - (p3.y - p1.y) / 6;

              path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
            }

            if (isArea) {
              path += ` L ${points[points.length - 1].x} ${padding.top + innerHeight}`;
              path += ` L ${points[0].x} ${padding.top + innerHeight} Z`;
            }

            return path;
          };

          const xStep = innerWidth / Math.max(trendData.length - 1, 1);
          const points = trendData.map((d, i) => ({
            x: padding.left + i * xStep,
            y: padding.top + innerHeight - (d.amount / maxTrendValue) * innerHeight,
            ...d
          }));

          const chartColor = currency === 'INR' ? '#10b981' : '#3b82f6';
          const gradientId = `gradient-${currency}`;

          return (
            trendData.length > 0 && (
              <div key={currency} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Trend - {getCurrencyLabel(currency)}</h3>
                <div className="overflow-x-auto">
                  <svg width="100%" height={chartHeight + 40} viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="min-w-[500px]">
                    {/* Definitions for gradient */}
                    <defs>
                      <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={chartColor} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={chartColor} stopOpacity="0.02"/>
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <g className="text-gray-200">
                      <line x1={padding.left} y1={padding.top} x2={chartWidth - padding.right} y2={padding.top} stroke="currentColor" strokeDasharray="4"/>
                      <line x1={padding.left} y1={padding.top + innerHeight / 2} x2={chartWidth - padding.right} y2={padding.top + innerHeight / 2} stroke="currentColor" strokeDasharray="4"/>
                      <line x1={padding.left} y1={padding.top + innerHeight} x2={chartWidth - padding.right} y2={padding.top + innerHeight} stroke="currentColor"/>
                    </g>

                    {/* Y-axis labels */}
                    <text x={padding.left - 10} y={padding.top + 4} textAnchor="end" className="text-xs fill-gray-500">
                      {formatCurrency(maxTrendValue, currency)}
                    </text>
                    <text x={padding.left - 10} y={padding.top + innerHeight / 2 + 4} textAnchor="end" className="text-xs fill-gray-500">
                      {formatCurrency(Math.round(maxTrendValue / 2), currency)}
                    </text>
                    <text x={padding.left - 10} y={padding.top + innerHeight + 4} textAnchor="end" className="text-xs fill-gray-500">
                      {currency === 'INR' ? '₹0' : 'AED 0'}
                    </text>

                    {/* Area fill */}
                    <path
                      d={generateSmoothPath(trendData, true)}
                      fill={`url(#${gradientId})`}
                    />

                    {/* Line */}
                    <path
                      d={generateSmoothPath(trendData)}
                      fill="none"
                      stroke={chartColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {points.map((point, index) => (
                      <g key={index} className="group cursor-pointer">
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="5"
                          fill="white"
                          stroke={chartColor}
                          strokeWidth="2"
                          className="transition-all group-hover:r-6"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="3"
                          fill={chartColor}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                        {/* Tooltip */}
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <rect
                            x={point.x - 50}
                            y={point.y - 35}
                            width="100"
                            height="28"
                            rx="4"
                            fill="#1f2937"
                            className="text-xs"
                          />
                          <text
                            x={point.x}
                            y={point.y - 22}
                            textAnchor="middle"
                            fill="white"
                            fontSize="10"
                          >
                            {formatCurrency(point.amount, currency)}
                          </text>
                          <text
                            x={point.x}
                            y={point.y - 12}
                            textAnchor="middle"
                            fill="#9ca3af"
                            fontSize="9"
                          >
                            {point.count} transactions
                          </text>
                        </g>
                      </g>
                    ))}

                    {/* X-axis labels */}
                    {trendData.length > 0 && (
                      <>
                        <text x={padding.left} y={chartHeight + 15} textAnchor="middle" className="text-xs fill-gray-500">
                          {trendData[0].period}
                        </text>
                        {trendData.length > 1 && (
                          <text x={chartWidth - padding.right} y={chartHeight + 15} textAnchor="middle" className="text-xs fill-gray-500">
                            {trendData[trendData.length - 1].period}
                          </text>
                        )}
                      </>
                    )}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColor }}></div>
                    <span>{currency === 'INR' ? 'Indian Rupees' : 'UAE Dirhams'}</span>
                  </div>
                  <span>|</span>
                  <span>{trendData.length} months of data</span>
                </div>
              </div>
            )
          );
        })}

        {/* Top Partners - Per Currency */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top Partners by Commission</h3>
          </div>
          {(!topPartners || topPartners.length === 0) ? (
            <div className="p-8 text-center text-gray-500">No partner data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    {(activeCurrencies || ['INR']).map(currency => (
                      <th key={currency} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total ({currency})
                      </th>
                    ))}
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
                          {partner.tier || 'N/A'}
                        </span>
                      </td>
                      {(activeCurrencies || ['INR']).map(currency => {
                        const currData = partner.commissionsByCurrency?.find(c => c.currency === currency) || { totalCommission: 0 };
                        return (
                          <td key={currency} className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(currData.totalCommission, currency)}
                          </td>
                        );
                      })}
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

    const { summaryByCurrency, activeCurrencies, partners, pagination } = payoutData;

    return (
      <div className="space-y-6">
        {/* Summary Cards - Per Currency */}
        {(activeCurrencies || ['INR']).map(currency => {
          const summary = summaryByCurrency?.[currency] || { pendingPayouts: 0, approvedPayouts: 0, totalPayouts: 0 };
          return (
            <div key={currency} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {getCurrencyLabel(currency)}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Pending Approvals</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.pendingPayouts, currency)}</p>
                  <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Approved for Payment</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.approvedPayouts, currency)}</p>
                  <p className="text-xs text-gray-400 mt-1">Ready to pay</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Total Commissions</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalPayouts, currency)}</p>
                  <p className="text-xs text-gray-400 mt-1">All time</p>
                </div>
              </div>
            </div>
          );
        })}

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
                    {(activeCurrencies || ['INR']).map(currency => (
                      <th key={currency} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total ({currency})
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.map((partner) => (
                    <tr
                      key={partner.partnerId}
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
                      {(activeCurrencies || ['INR']).map(currency => {
                        const currData = partner.commissionsByCurrency?.find(c => c.currency === currency) || { totalCommission: 0 };
                        return (
                          <td key={currency} className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(currData.totalCommission, currency)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right text-gray-500">{partner.commissionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              total={pagination.total}
              itemsPerPage={itemsPerPage}
              onPageChange={setPage}
              onItemsPerPageChange={(newLimit) => { setItemsPerPage(newLimit); setPage(1); }}
            />
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